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

    [switch]$Beta,

    [switch]$ReleaseCurrent,

    [switch]$Resume,

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
        [string]$Prerelease
    )

    # Computed directly (semver's own `inc` arithmetic for the plain
    # major/minor/patch release types), never by shelling out to
    # `npm version ... --dry-run`: on this environment's npm (11.14.1) that
    # command writes the bumped version into package.json/package-lock.json
    # on disk despite `--dry-run`, which would leave the submodule dirty for
    # every plain (non `-Execute`) `release:ui`/`release:vue`/`release:all`
    # run and break the next `Assert-CleanMain`.
    $current = Get-PackageVersion -Path $Path
    if ($current -notmatch "^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$") {
        throw "Cannot parse version '$current' in $Path."
    }
    $major = [int]$Matches[1]
    $minor = [int]$Matches[2]
    $patch = [int]$Matches[3]
    $hasPrerelease = [bool]$Matches[4]

    switch ($ReleaseBump) {
        "major" {
            if ($patch -ne 0 -or $minor -ne 0 -or -not $hasPrerelease) { $major++ }
            $minor = 0
            $patch = 0
        }
        "minor" {
            if ($patch -ne 0 -or -not $hasPrerelease) { $minor++ }
            $patch = 0
        }
        "patch" {
            if (-not $hasPrerelease) { $patch++ }
        }
        default {
            throw "Unsupported release bump '$ReleaseBump'."
        }
    }

    $version = "$major.$minor.$patch"
    if ($Prerelease) {
        return "$version-$Prerelease"
    }
    return $version
}

function Get-ReleaseVersion {
    param([string]$Path)

    $currentVersion = Get-PackageVersion -Path $Path
    if ($Alpha -and $Beta) {
        throw "Choose either -Alpha or -Beta, not both."
    }
    if (($Alpha -or $Beta) -and $Bump -ne "patch") {
        throw "-Alpha and -Beta currently support only the default patch bump."
    }

    $prerelease = if ($Alpha) { "alpha" } elseif ($Beta) { "beta" } else { $null }

    if ($ReleaseCurrent) {
        if ($prerelease) {
            if ($currentVersion -notmatch "^\d+\.\d+\.\d+$") {
                throw "-$prerelease -ReleaseCurrent requires a stable current version; found '$currentVersion'."
            }
            return "$currentVersion-$prerelease"
        }
        return $currentVersion
    }

    return Get-NextVersion -Path $Path -ReleaseBump $Bump -Prerelease $prerelease
}

function Get-RequestedReleaseVersion {
    param([string]$Path)

    # A resume must address the tag already created by the interrupted
    # release, never calculate another version from that bumped manifest.
    if ($Resume) {
        return Get-PackageVersion -Path $Path
    }
    return Get-ReleaseVersion -Path $Path
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

function Get-RemoteTagCommit {
    param(
        [string]$Path,
        [string]$Tag
    )

    # Release tags are annotated. The peeled ^{} reference is the commit the
    # tag names, which is what must match HEAD during a safe resume.
    # `git ls-remote` emits no output when the tag does not exist remotely.
    # That is the expected state before the first push, so normalize an empty
    # command result before trimming it.
    $output = @(& git -C $Path ls-remote origin "refs/tags/$Tag^{}")
    if ($LASTEXITCODE -ne 0) {
        throw "Cannot query remote tag $Tag in $Path."
    }
    $line = ($output -join [Environment]::NewLine).Trim()
    if (-not $line) {
        return $null
    }
    return ($line -split "\s+")[0]
}

function Assert-ResumeRelease {
    param(
        [string]$Path,
        [string]$Label,
        [string]$Tag
    )

    $branch = (& git -C $Path branch --show-current).Trim()
    if ($branch -ne "main") {
        throw "$Label resume must be on main; current branch is '$branch'."
    }
    $status = & git -C $Path status --porcelain
    if ($status) {
        throw "$Label has uncommitted changes. Resume requires the previously created release commit unchanged."
    }

    Invoke-External -File git -Arguments @("fetch", "origin", "+refs/heads/main:refs/remotes/origin/main", "--tags") -WorkingDirectory $Path
    $head = (& git -C $Path rev-parse HEAD).Trim()
    $tagCommit = (& git -C $Path rev-parse "$Tag^{commit}" 2>$null).Trim()
    if ($LASTEXITCODE -ne 0 -or -not $tagCommit -or $tagCommit -ne $head) {
        throw "$Label resume requires local tag $Tag to point exactly to HEAD. Do not create a new bump or retag a different commit."
    }

    $aheadBehind = (& git -C $Path rev-list --left-right --count "main...refs/remotes/origin/main").Trim() -split "\s+"
    if ($aheadBehind.Count -ne 2 -or $aheadBehind[1] -ne "0") {
        throw "$Label origin/main contains commits not in the release commit. Reconcile main manually; resume will not overwrite remote history."
    }

    $remoteTagCommit = Get-RemoteTagCommit -Path $Path -Tag $Tag
    if ($remoteTagCommit -and $remoteTagCommit -ne $head) {
        throw "$Label remote tag $Tag points to a different commit. Published tags are immutable; choose a new version."
    }
}

function Push-ReleaseRefs {
    param(
        [string]$Path,
        [string]$Label,
        [string]$Tag
    )

    $head = (& git -C $Path rev-parse HEAD).Trim()
    $remoteMain = (& git -C $Path rev-parse "refs/remotes/origin/main" 2>$null).Trim()
    $remoteTagCommit = Get-RemoteTagCommit -Path $Path -Tag $Tag

    if ($remoteTagCommit -and $remoteTagCommit -ne $head) {
        throw "$Label remote tag $Tag points to a different commit. Published tags are immutable; choose a new version."
    }
    if ($remoteMain -eq $head -and $remoteTagCommit -eq $head) {
        Write-Host "$Label release commit and tag are already present on origin; continuing with workflow verification."
        return
    }

    if ($remoteTagCommit) {
        # An earlier non-atomic push may have sent the tag but not main. The
        # resume guard already proved origin/main is not ahead, so only finish
        # the missing branch ref; never force-push or recreate the tag.
        Invoke-External -File git -Arguments @("push", "origin", "main") -WorkingDirectory $Path
        return
    }

    # GitHub supports --atomic: main and the annotated release tag either
    # arrive together or neither does, avoiding a remotely half-created
    # release when a network/policy failure occurs during push.
    Invoke-External -File git -Arguments @("push", "--atomic", "origin", "main", "refs/tags/$Tag") -WorkingDirectory $Path
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

function Assert-UiKitMainAtOrigin {
    param([string[]]$AllowedSubmodules)
    # The package release may wait for an environment approval. Do not commit
    # a dependency pin on top of kit commits made by somebody else while that
    # approval was pending; leave the published package immutable and ask the
    # operator to reconcile the kit branch before retrying/resuming.
    Invoke-External -File git -Arguments @("fetch", "origin", "+refs/heads/main:refs/remotes/origin/main") -WorkingDirectory $root
    $aheadBehind = (& git -C $root rev-list --left-right --count "main...refs/remotes/origin/main").Trim() -split "\s+"
    if ($aheadBehind.Count -ne 2 -or $aheadBehind[0] -ne "0" -or $aheadBehind[1] -ne "0") {
        throw "UI Kit main changed while the package release was pending. Reconcile the kit branch, then update its exact package pins manually or rerun the matching -Resume command."
    }

    $unexpectedChanges = @(
        (& git -C $root status --porcelain --untracked-files=all) |
            Where-Object {
                $path = $_.Substring(3)
                $AllowedSubmodules -notcontains $path
            }
    )
    if ($unexpectedChanges.Count -gt 0) {
        throw "UI Kit has changes unrelated to the released submodule pointers. Do not mix them into the dependency-pin commit."
    }
}

function Sync-UiKitDependencies {
    param(
        [string]$UiVersion,
        [string]$VueVersion
    )

    if (-not $UiVersion -and -not $VueVersion) {
        return
    }

    $files = @("package.json", "package-lock.json")
    $allowedSubmodules = @()
    if ($UiVersion) {
        $allowedSubmodules += "packages/ui"
        $files += "packages/ui"
    }
    if ($VueVersion) {
        $allowedSubmodules += "packages/vue"
        $files += "packages/vue"
    }
    Assert-UiKitMainAtOrigin -AllowedSubmodules $allowedSubmodules
    $packagePath = Join-Path $root "package.json"
    $package = Get-Content $packagePath -Raw | ConvertFrom-Json
    if ($UiVersion) {
        $package.dependencies.'@iam3xtr/ui' = $UiVersion
    }
    if ($VueVersion) {
        $package.dependencies.'@iam3xtr/vue' = $VueVersion
    }
    $json = $package | ConvertTo-Json -Depth 100
    [System.IO.File]::WriteAllText($packagePath, $json + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
    Invoke-External -File npm -Arguments @("install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund") -WorkingDirectory $root

    $labels = @()
    if ($UiVersion) { $labels += "@iam3xtr/ui@$UiVersion" }
    if ($VueVersion) { $labels += "@iam3xtr/vue@$VueVersion" }
    Commit-ReleaseChanges -Path $root -Message "chore(deps): update $($labels -join ' and ')" -Files $files | Out-Null
    Invoke-External -File git -Arguments @("push", "origin", "main") -WorkingDirectory $root
    Write-Host "Updated UI Kit exact dependency pin(s): $($labels -join ', ')."
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
    Write-Host "Planned UI release: @iam3xtr/ui@$Version."
    if ($Resume) {
        Assert-ResumeRelease -Path $uiPath -Label "@iam3xtr/ui" -Tag $tag
        Push-ReleaseRefs -Path $uiPath -Label "@iam3xtr/ui" -Tag $tag
        Write-Host "Waiting for the UI release workflow and its environment approval."
        Wait-ForRelease -Repository "iam3xtr/ui" -Commit ((& git -C $uiPath rev-parse HEAD).Trim())
        Assert-UiPublished -Version $Version
        return
    }
    Assert-TagAvailable -Path $uiPath -Tag $tag
    if (-not $Execute) {
        return
    }

    if (-not $ReleaseCurrent -or $Alpha) {
        Invoke-External -File npm -Arguments @("version", $Version, "--no-git-tag-version", "--ignore-scripts") -WorkingDirectory $uiPath
    }
    Commit-ReleaseChanges -Path $uiPath -Message "chore(release): $tag" -Files @("package.json", "package-lock.json") | Out-Null
    $uiSha = (& git -C $uiPath rev-parse HEAD).Trim()
    Invoke-External -File git -Arguments @("tag", "-a", $tag, "-m", "release: $tag") -WorkingDirectory $uiPath
    Push-ReleaseRefs -Path $uiPath -Label "@iam3xtr/ui" -Tag $tag
    Write-Host "Waiting for the UI release workflow and its environment approval."
    Wait-ForRelease -Repository "iam3xtr/ui" -Commit $uiSha
    Assert-UiPublished -Version $Version
}

function Release-Vue {
    param([string]$Version)

    $tag = "v$Version"
    if ($Resume) {
        Assert-UiPublished -Version $Version
        Assert-ResumeRelease -Path $vuePath -Label "@iam3xtr/vue" -Tag $tag
        Push-ReleaseRefs -Path $vuePath -Label "@iam3xtr/vue" -Tag $tag
        Write-Host "Waiting for the Vue release workflow and its environment approval."
        Wait-ForRelease -Repository "iam3xtr/vue" -Commit ((& git -C $vuePath rev-parse HEAD).Trim())
        return
    }
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
    Push-ReleaseRefs -Path $vuePath -Label "@iam3xtr/vue" -Tag $tag
    Write-Host "Waiting for the Vue release workflow and its environment approval."
    Wait-ForRelease -Repository "iam3xtr/vue" -Commit $vueSha
}

foreach ($command in @("git", "npm", "gh")) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "Required command '$command' is not available on PATH."
    }
}

try {
    if ($Resume -and -not $Execute) {
        throw "-Resume only performs the pending push/workflow verification; pass -Execute to confirm it."
    }
    if ($Package -eq "ui") {
        if (-not $Resume) {
            Assert-CleanMain -Path $root -Label "UI Kit"
            Assert-CleanMain -Path $uiPath -Label "@iam3xtr/ui"
        }
        $uiReleaseVersion = Get-RequestedReleaseVersion -Path $uiPath
        Release-Ui -Version $uiReleaseVersion
        if ($Execute) { Sync-UiKitDependencies -UiVersion $uiReleaseVersion }
    } elseif ($Package -eq "vue") {
        if (-not $Resume) {
            Assert-CleanMain -Path $root -Label "UI Kit"
            Assert-CleanMain -Path $vuePath -Label "@iam3xtr/vue"
        }
        $vueReleaseVersion = Get-RequestedReleaseVersion -Path $vuePath
        Release-Vue -Version $vueReleaseVersion
        if ($Execute) { Sync-UiKitDependencies -VueVersion $vueReleaseVersion }
    } else {
        if (-not $Resume) {
            Assert-CleanMain -Path $root -Label "UI Kit"
            Assert-CleanMain -Path $uiPath -Label "@iam3xtr/ui"
            Assert-CleanMain -Path $vuePath -Label "@iam3xtr/vue"
        }
        $uiVersion = Get-PackageVersion -Path $uiPath
        $vueVersion = Get-PackageVersion -Path $vuePath
        if ($uiVersion -ne $vueVersion) {
            throw "Package versions differ ($uiVersion vs $vueVersion). Align them before releasing a paired version."
        }
        $nextVersion = Get-RequestedReleaseVersion -Path $uiPath
        Write-Host "Planned paired release: @iam3xtr/ui@$nextVersion, then @iam3xtr/vue@$nextVersion."
        Release-Ui -Version $nextVersion
        Release-Vue -Version $nextVersion
        if ($Execute) {
            Sync-UiKitDependencies -UiVersion $nextVersion -VueVersion $nextVersion
            Write-Host "Published pair v$nextVersion. Run the documented exact-version registry gate before declaring it recommended for consumers."
        }
    }

    if (-not $Execute) {
        Write-Host "Dry run only. Re-run with -Execute to create commits, tags, and push them."
    }
} catch {
    Write-Error ("Release failed: {0}" -f $_.Exception.Message)
    if ($Package -eq "all" -and $nextVersion -and (& git -C $uiPath tag --list "v$nextVersion")) {
        Write-Error "UI tag v$nextVersion may already be pushed or published. Do not delete or reuse it; release Vue separately after confirming the UI package is available."
    }
    exit 1
}
