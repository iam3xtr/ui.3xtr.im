# Releases @iam3xtr/ui, @iam3xtr/vue, or one ordered pair.
#
# Dry run:
#   npm run release:ui
#   npm run release:vue
#   npm run release:all -- -Alpha
# Release:
#   npm run release:ui -- -ReleaseCurrent -Execute
#   npm run release:vue -- -ReleaseCurrent -Execute
#   npm run release:all -- -Alpha -Execute
#
# The script never rolls back an already published UI package. If Vue fails
# after UI has published, it stops with the UI version intact.

[CmdletBinding()]
param(
    [ValidateSet("ui", "vue", "all")]
    [string]$Package = "all",

    [ValidateSet("patch", "minor", "major")]
    [string]$Bump = "patch",

    [switch]$Alpha,

    [switch]$ReleaseCurrent,

    [switch]$Execute
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$uiPath = Join-Path $root "packages/ui"
$vuePath = Join-Path $root "packages/vue"

function Invoke-External {
    param(
        [string]$File,
        [string[]]$Arguments,
        [string]$WorkingDirectory
    )

    Push-Location $WorkingDirectory
    try {
        & $File @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "$File $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
        }
    } finally {
        Pop-Location
    }
}

function Get-PackageVersion {
    param([string]$Path)

    return (Get-Content (Join-Path $Path "package.json") -Raw | ConvertFrom-Json).version
}

function Get-NextVersion {
    param(
        [string]$Path,
        [string]$ReleaseBump,
        [switch]$AlphaRelease
    )

    Push-Location $Path
    try {
        $next = & npm version $ReleaseBump --no-git-tag-version --ignore-scripts --dry-run
        if ($LASTEXITCODE -ne 0) {
            throw "Cannot calculate the next version for $Path."
        }
        $version = ($next | Select-Object -Last 1).TrimStart("v")
        if ($AlphaRelease) {
            if ($version -notmatch "^\d+\.\d+\.\d+$") {
                throw "Alpha release requires a stable patch base; calculated version was '$version'."
            }
            return "$version-alpha"
        }
        return $version
    } finally {
        Pop-Location
    }
}

function Get-ReleaseVersion {
    param([string]$Path)

    $currentVersion = Get-PackageVersion -Path $Path
    if ($Alpha -and $Bump -ne "patch") {
        throw "-Alpha currently supports only the default patch bump."
    }

    if ($ReleaseCurrent) {
        if ($Alpha) {
            if ($currentVersion -notmatch "^\d+\.\d+\.\d+$") {
                throw "-Alpha -ReleaseCurrent requires a stable current version; found '$currentVersion'."
            }
            return "$currentVersion-alpha"
        }
        return $currentVersion
    }

    return Get-NextVersion -Path $Path -ReleaseBump $Bump -AlphaRelease:$Alpha
}

function Assert-CleanMain {
    param(
        [string]$Path,
        [string]$Label
    )

    $branch = (& git -C $Path branch --show-current).Trim()
    if ($branch -ne "main") {
        throw "$Label must be on main; current branch is '$branch'."
    }

    $status = & git -C $Path status --porcelain
    if ($status) {
        throw "$Label has uncommitted changes. Commit, stash, or discard them before releasing."
    }

    # Fetching just "origin main" updates FETCH_HEAD but may leave the local
    # origin/main tracking ref stale. Update that exact ref because the next
    # comparison is deliberately against it.
    Invoke-External -File git -Arguments @("fetch", "origin", "+refs/heads/main:refs/remotes/origin/main", "--tags") -WorkingDirectory $Path
    $aheadBehind = (& git -C $Path rev-list --left-right --count "main...refs/remotes/origin/main").Trim() -split "\s+"
    if ($aheadBehind.Count -ne 2 -or $aheadBehind[0] -ne "0" -or $aheadBehind[1] -ne "0") {
        throw "$Label main must exactly match origin/main before releasing."
    }
}

function Assert-TagAvailable {
    param(
        [string]$Path,
        [string]$Tag
    )

    $existing = & git -C $Path ls-remote --tags origin "refs/tags/$Tag"
    if ($existing) {
        throw "Tag $Tag already exists in $Path. Choose a new version; published versions are immutable."
    }
}

function Commit-ReleaseChanges {
    param(
        [string]$Path,
        [string]$Message,
        [string[]]$Files
    )

    Invoke-External -File git -Arguments (@("add") + $Files) -WorkingDirectory $Path
    & git -C $Path diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
        return $false
    }
    if ($LASTEXITCODE -ne 1) {
        throw "Cannot inspect staged release changes in $Path."
    }
    Invoke-External -File git -Arguments @("commit", "-m", $Message) -WorkingDirectory $Path
    return $true
}

function Set-VueCompatibility {
    param(
        [string]$UiVersion,
        [string]$UiSha
    )

    $packagePath = Join-Path $vuePath "package.json"
    $package = Get-Content $packagePath -Raw | ConvertFrom-Json
    $package.peerDependencies.'@iam3xtr/ui' = "^$UiVersion"
    $json = $package | ConvertTo-Json -Depth 100
    [System.IO.File]::WriteAllText($packagePath, $json + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
    [System.IO.File]::WriteAllText((Join-Path $vuePath ".ui-compat-ref"), $UiSha + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))

    Invoke-External -File npm -Arguments @("install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund") -WorkingDirectory $vuePath
}

function Get-UiReleaseSha {
    param([string]$Tag)

    Invoke-External -File git -Arguments @("fetch", "origin", "tag", $Tag) -WorkingDirectory $uiPath
    $sha = (& git -C $uiPath rev-parse "$Tag^{commit}").Trim()
    if ($LASTEXITCODE -ne 0 -or -not $sha) {
        throw "Cannot resolve UI release tag $Tag to a commit."
    }
    return $sha
}

function Assert-UiPublished {
    param([string]$Version)

    # ErrorActionPreference=Stop can turn npm's non-zero exit into a generic
    # NativeCommandError before $LASTEXITCODE is examined. Capture it so the
    # caller gets an actionable distinction between missing publication and
    # missing packages:read credentials.
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $published = & npm view "@iam3xtr/ui@$Version" version --registry "https://npm.pkg.github.com" --json 2>$null
        $npmExitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    if ($npmExitCode -ne 0) {
        throw "Cannot read @iam3xtr/ui@$Version from npm.pkg.github.com. Configure a per-user GitHub Packages token with packages:read, then retry. The UI version may also be unpublished."
    }

    try {
        $publishedVersion = $published | ConvertFrom-Json
    } catch {
        throw "Could not verify @iam3xtr/ui@$Version in npm.pkg.github.com. Check npm authentication and registry access."
    }
    if ($publishedVersion -ne $Version) {
        throw "npm.pkg.github.com returned UI version '$publishedVersion' instead of '$Version'. Do not release Vue."
    }
}

function Wait-ForRelease {
    param(
        [string]$Repository,
        [string]$Commit
    )

    $runId = $null
    for ($attempt = 0; $attempt -lt 20 -and -not $runId; $attempt++) {
        $runs = & gh run list --repo $Repository --workflow Release --commit $Commit --limit 1 --json databaseId 2>$null | ConvertFrom-Json
        if ($runs.Count -gt 0) {
            $runId = $runs[0].databaseId
            break
        }
        Start-Sleep -Seconds 3
    }

    if (-not $runId) {
        throw "No Release workflow run was found for $Repository at $Commit."
    }

    & gh run watch $runId --repo $Repository --exit-status
    if ($LASTEXITCODE -ne 0) {
        throw "Release workflow failed for $Repository. Inspect the failed job; do not delete or reuse its release tag."
    }
}

function Release-Ui {
    param([string]$Version)

    $tag = "v$Version"
    Assert-TagAvailable -Path $uiPath -Tag $tag
    Write-Host "Planned UI release: @iam3xtr/ui@$Version."
    if (-not $Execute) {
        return
    }

    if (-not $ReleaseCurrent -or $Alpha) {
        Invoke-External -File npm -Arguments @("version", $Version, "--no-git-tag-version", "--ignore-scripts") -WorkingDirectory $uiPath
    }
    Commit-ReleaseChanges -Path $uiPath -Message "chore(release): $tag" -Files @("package.json", "package-lock.json") | Out-Null
    $uiSha = (& git -C $uiPath rev-parse HEAD).Trim()
    Invoke-External -File git -Arguments @("tag", "-a", $tag, "-m", "release: $tag") -WorkingDirectory $uiPath
    Invoke-External -File git -Arguments @("push", "origin", "main", $tag) -WorkingDirectory $uiPath
    Write-Host "Waiting for the UI release workflow and its environment approval."
    Wait-ForRelease -Repository "iam3xtr/ui" -Commit $uiSha
    Assert-UiPublished -Version $Version
}

function Release-Vue {
    param([string]$Version)

    $tag = "v$Version"
    Assert-TagAvailable -Path $vuePath -Tag $tag
    if (-not $Execute) {
        if ($Package -eq "vue") {
            Assert-UiPublished -Version $Version
        }
        Write-Host "Planned Vue release: @iam3xtr/vue@$Version against @iam3xtr/ui@$Version."
        return
    }

    Assert-UiPublished -Version $Version
    $uiSha = Get-UiReleaseSha -Tag $tag
    Write-Host "Planned Vue release: @iam3xtr/vue@$Version against published @iam3xtr/ui@$Version."
    Set-VueCompatibility -UiVersion $Version -UiSha $uiSha
    if (-not $ReleaseCurrent -or $Alpha) {
        Invoke-External -File npm -Arguments @("version", $Version, "--no-git-tag-version", "--ignore-scripts") -WorkingDirectory $vuePath
    }
    Commit-ReleaseChanges -Path $vuePath -Message "chore(release): $tag" -Files @("package.json", "package-lock.json", ".ui-compat-ref") | Out-Null
    $vueSha = (& git -C $vuePath rev-parse HEAD).Trim()
    Invoke-External -File git -Arguments @("tag", "-a", $tag, "-m", "release: $tag") -WorkingDirectory $vuePath
    Invoke-External -File git -Arguments @("push", "origin", "main", $tag) -WorkingDirectory $vuePath
    Write-Host "Waiting for the Vue release workflow and its environment approval."
    Wait-ForRelease -Repository "iam3xtr/vue" -Commit $vueSha
}

foreach ($command in @("git", "npm", "gh")) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "Required command '$command' is not available on PATH."
    }
}

try {
    if ($Package -eq "ui") {
        Assert-CleanMain -Path $uiPath -Label "@iam3xtr/ui"
        Release-Ui -Version (Get-ReleaseVersion -Path $uiPath)
    } elseif ($Package -eq "vue") {
        Assert-CleanMain -Path $vuePath -Label "@iam3xtr/vue"
        Release-Vue -Version (Get-ReleaseVersion -Path $vuePath)
    } else {
        Assert-CleanMain -Path $uiPath -Label "@iam3xtr/ui"
        Assert-CleanMain -Path $vuePath -Label "@iam3xtr/vue"
        $uiVersion = Get-PackageVersion -Path $uiPath
        $vueVersion = Get-PackageVersion -Path $vuePath
        if ($uiVersion -ne $vueVersion) {
            throw "Package versions differ ($uiVersion vs $vueVersion). Align them before releasing a paired version."
        }
        $nextVersion = Get-ReleaseVersion -Path $uiPath
        Write-Host "Planned paired release: @iam3xtr/ui@$nextVersion, then @iam3xtr/vue@$nextVersion."
        Release-Ui -Version $nextVersion
        Release-Vue -Version $nextVersion
        if ($Execute) {
            Write-Host "Published pair v$nextVersion. Run the documented exact-version registry gate before declaring it recommended for consumers."
        }
    }

    if (-not $Execute) {
        Write-Host "Dry run only. Re-run with -Execute to create commits, tags, and push them."
    }
} catch {
    Write-Error $_
    if ($Package -eq "all" -and $nextVersion -and (& git -C $uiPath tag --list "v$nextVersion")) {
        Write-Error "UI tag v$nextVersion may already be pushed or published. Do not delete or reuse it; release Vue separately after confirming the UI package is available."
    }
    exit 1
}
