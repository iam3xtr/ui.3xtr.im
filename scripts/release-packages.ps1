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
#   npm run release:vue -- -UiVersion 0.1.6 -Execute
#
# release:vue selects an already published UI version with -UiVersion (default:
# the version in packages/ui). It must satisfy the Vue peer interval for
# @iam3xtr/ui; -RaisePeerFloor raises that interval's minimum to the selected
# UI version and is only for a proven new UI contract. release:ui never
# touches the Vue package.
#
# release:all gives each package its own target version, computed from its own
# manifest with the same bump/prerelease flags; the versions need not match.
# UI is published first. The Vue peer range stays unchanged (the new UI must be
# inside it, else the run is rejected before UI publication) unless
# -RaisePeerFloor is passed, which raises the minimum to the new UI version.
# Pass the same flags again with -Resume.
# After an interruption, re-run the same command with -Resume -Execute: each
# package continues from its own release commit and tag, and a Vue release that
# was never started is begun after the already published UI.
#
# The script never rolls back an already published UI package. If Vue fails
# after UI has published, it stops with the UI version intact and leaves the
# kit's package.json and package-lock.json untouched; the exact UI and Vue pins
# are updated together once Vue has published (also on -Resume).

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

    [string]$UiVersion,

    [switch]$RaisePeerFloor,

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

function ConvertTo-SemVer {
    param([string]$Version)

    if ($Version -notmatch "^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$") {
        throw "'$Version' is not a valid semantic version (expected X.Y.Z or X.Y.Z-prerelease)."
    }
    $pre = @()
    if ($Matches[4]) { $pre = $Matches[4].Split(".") }
    return [pscustomobject]@{
        Major = [int64]$Matches[1]
        Minor = [int64]$Matches[2]
        Patch = [int64]$Matches[3]
        Pre   = $pre
    }
}

function Compare-SemVer {
    param($Left, $Right)

    foreach ($part in @("Major", "Minor", "Patch")) {
        if ($Left.$part -ne $Right.$part) {
            return [Math]::Sign($Left.$part - $Right.$part)
        }
    }
    # A version without prerelease identifiers is greater than one with them.
    if ($Left.Pre.Count -eq 0 -and $Right.Pre.Count -eq 0) { return 0 }
    if ($Left.Pre.Count -eq 0) { return 1 }
    if ($Right.Pre.Count -eq 0) { return -1 }

    $length = [Math]::Min($Left.Pre.Count, $Right.Pre.Count)
    for ($i = 0; $i -lt $length; $i++) {
        $a = $Left.Pre[$i]
        $b = $Right.Pre[$i]
        $aNumeric = $a -match "^\d+$"
        $bNumeric = $b -match "^\d+$"
        if ($aNumeric -and $bNumeric) {
            $diff = [int64]$a - [int64]$b
            if ($diff -ne 0) { return [Math]::Sign($diff) }
        } elseif ($aNumeric) {
            return -1
        } elseif ($bNumeric) {
            return 1
        } else {
            $diff = [string]::CompareOrdinal($a, $b)
            if ($diff -ne 0) { return [Math]::Sign($diff) }
        }
    }
    return [Math]::Sign($Left.Pre.Count - $Right.Pre.Count)
}

function Test-CaretRange {
    param(
        [string]$Range,
        [string]$Version
    )

    # Only the single caret range the Vue manifest uses for @iam3xtr/ui is
    # supported, with node-semver semantics: ^0.1.4 means >=0.1.4 <0.2.0, and
    # a prerelease only satisfies a range whose floor has the same X.Y.Z tuple
    # and its own prerelease tag.
    if ($Range -notmatch "^\^(\S+)$") {
        throw "Unsupported @iam3xtr/ui peer range '$Range'; only a single caret range is supported."
    }
    $floor = ConvertTo-SemVer -Version $Matches[1]
    $candidate = ConvertTo-SemVer -Version $Version

    if ($floor.Major -gt 0) {
        $upper = [pscustomobject]@{ Major = $floor.Major + 1; Minor = 0; Patch = 0; Pre = @() }
    } elseif ($floor.Minor -gt 0) {
        $upper = [pscustomobject]@{ Major = 0; Minor = $floor.Minor + 1; Patch = 0; Pre = @() }
    } else {
        $upper = [pscustomobject]@{ Major = 0; Minor = 0; Patch = $floor.Patch + 1; Pre = @() }
    }

    if ((Compare-SemVer -Left $candidate -Right $floor) -lt 0) { return $false }
    if ((Compare-SemVer -Left $candidate -Right $upper) -ge 0) { return $false }
    if ($candidate.Pre.Count -gt 0) {
        $sameTuple = $candidate.Major -eq $floor.Major -and $candidate.Minor -eq $floor.Minor -and $candidate.Patch -eq $floor.Patch
        if (-not ($sameTuple -and $floor.Pre.Count -gt 0)) { return $false }
    }
    return $true
}

function Get-VueUiPeerRange {
    $package = Get-Content (Join-Path $vuePath "package.json") -Raw | ConvertFrom-Json
    return [string]$package.peerDependencies.'@iam3xtr/ui'
}

function Resolve-VuePeerRange {
    param(
        [string]$SelectedUiVersion,
        [switch]$RaiseFloor
    )

    # Pure validation, run before any file, tag or commit changes. Returns the
    # @iam3xtr/ui peer range the Vue release will carry.
    $current = Get-VueUiPeerRange
    if ($RaiseFloor) {
        if ($current -notmatch "^\^(\S+)$") {
            throw "Unsupported @iam3xtr/ui peer range '$current'; only a single caret range is supported."
        }
        $currentFloor = ConvertTo-SemVer -Version $Matches[1]
        $selected = ConvertTo-SemVer -Version $SelectedUiVersion
        if ((Compare-SemVer -Left $selected -Right $currentFloor) -lt 0) {
            throw "Selected @iam3xtr/ui@$SelectedUiVersion is below the current Vue peer minimum $current; -RaisePeerFloor never lowers the minimum."
        }
        return "^$SelectedUiVersion"
    }
    if (-not (Test-CaretRange -Range $current -Version $SelectedUiVersion)) {
        throw "@iam3xtr/ui@$SelectedUiVersion is outside the Vue peer interval $current. Select a version inside it, or pass -RaisePeerFloor only when the Vue release needs a new UI contract."
    }
    return $current
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

function Test-LocalReleaseTag {
    param(
        [string]$Path,
        [string]$Tag
    )

    # A paired resume can legitimately be interrupted after UI has published
    # but before Vue has a release commit.  Check the local tag without
    # treating its absence as an error, then choose between a Vue resume and
    # a new Vue release below.
    & git -C $Path rev-parse --verify --quiet "refs/tags/$Tag" *> $null
    return $LASTEXITCODE -eq 0
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

function Test-PinOnlyChange {
    # True when package.json differs from HEAD only in the two exact
    # @iam3xtr pins, i.e. the state an earlier partial release sync leaves.
    $headJson = (& git -C $root show "HEAD:package.json") -join "`n"
    if ($LASTEXITCODE -ne 0) { return $false }
    $head = $headJson | ConvertFrom-Json
    $work = Get-Content (Join-Path $root "package.json") -Raw | ConvertFrom-Json
    foreach ($name in @("@iam3xtr/ui", "@iam3xtr/vue")) {
        if ($work.dependencies.$name) { $head.dependencies.$name = $work.dependencies.$name }
    }
    return ($head | ConvertTo-Json -Depth 100 -Compress) -eq ($work | ConvertTo-Json -Depth 100 -Compress)
}

function Test-LockPinOnlyChange {
    # True when package-lock.json differs from HEAD only where the pin sync
    # rewrites it: the root record's two @iam3xtr dependency specs and the
    # node_modules/@iam3xtr/{ui,vue} entries. Any other edit is unrelated work.
    # Windows PowerShell 5.1 ConvertFrom-Json rejects the lockfile's "" root key,
    # so parse with JavaScriptSerializer instead.
    Add-Type -AssemblyName System.Web.Extensions
    $serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
    $serializer.MaxJsonLength = [int]::MaxValue
    $serializer.RecursionLimit = 1000
    $headJson = (& git -C $root show "HEAD:package-lock.json") -join "`n"
    if ($LASTEXITCODE -ne 0) { return $false }
    $strip = {
        param($json)
        $lock = $serializer.DeserializeObject($json)
        $packages = $lock["packages"]
        if ($packages) {
            foreach ($key in @($packages.Keys)) {
                if ($key -match "(^|/)node_modules/@iam3xtr/(ui|vue)$") {
                    $packages.Remove($key) | Out-Null
                } elseif ($key -eq "" -and $packages[$key]["dependencies"]) {
                    foreach ($dep in @("@iam3xtr/ui", "@iam3xtr/vue")) {
                        $packages[$key]["dependencies"].Remove($dep) | Out-Null
                    }
                }
            }
        }
        return $serializer.Serialize($lock)
    }
    $workJson = Get-Content (Join-Path $root "package-lock.json") -Raw
    return (& $strip $headJson) -ceq (& $strip $workJson)
}

function Assert-UiKitSyncTarget {
    param([switch]$AllowPinOnly)

    # The kit may remain on its work branch while its source dependencies are
    # unpublished. Preserve unrelated work, but never overwrite local edits
    # to the two files that the post-release sync regenerates. A resumed or
    # second-step sync may find only our own earlier pin update there.
    $pinChanges = @(& git -C $root status --porcelain -- package.json package-lock.json)
    if ($LASTEXITCODE -ne 0) {
        throw "Cannot inspect UI Kit dependency files before release."
    }
    if ($AllowPinOnly -and @($pinChanges | Where-Object { $_ -match "package\.json$" -and $_ -notmatch "package-lock\.json$" }).Count -gt 0 -and (Test-PinOnlyChange) -and (Test-LockPinOnlyChange)) {
        return
    }
    if ($pinChanges.Count -gt 0) {
        throw "UI Kit package.json or package-lock.json has local changes. Reconcile them before releasing packages; the post-release sync updates these files."
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

    Assert-UiKitSyncTarget -AllowPinOnly
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
    Write-Host "Updated local UI Kit exact dependency pin(s): $($labels -join ', '). Review and commit package.json, package-lock.json, and the released submodule pointer(s) on the kit work branch."
}

function Set-VueCompatibility {
    param(
        [string]$PeerRange,
        [string]$UiSha
    )

    # The peer minimum changes only when the caller proved a new UI contract;
    # .ui-compat-ref always records the immutable UI commit the release was
    # tested against.
    $packagePath = Join-Path $vuePath "package.json"
    $package = Get-Content $packagePath -Raw | ConvertFrom-Json
    $peerChanged = $package.peerDependencies.'@iam3xtr/ui' -ne $PeerRange
    if ($peerChanged) {
        $package.peerDependencies.'@iam3xtr/ui' = $PeerRange
        $json = $package | ConvertTo-Json -Depth 100
        [System.IO.File]::WriteAllText($packagePath, $json + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
    }
    [System.IO.File]::WriteAllText((Join-Path $vuePath ".ui-compat-ref"), $UiSha + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))

    if ($peerChanged) {
        Invoke-External -File npm -Arguments @("install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund") -WorkingDirectory $vuePath
    }
}

function Get-RemoteUiTagCommit {
    param([string]$Tag)

    # Read-only: no fetch, so a dry run leaves refs untouched.
    $commit = Get-RemoteTagCommit -Path $uiPath -Tag $Tag
    if (-not $commit) {
        throw "UI release tag $Tag does not exist on origin of packages/ui. Vue records an immutable UI tag commit as .ui-compat-ref; select a released UI version."
    }
    return $commit
}

function Get-UiReleaseSha {
    param(
        [string]$Tag,
        [string]$Version
    )

    $remoteSha = Get-RemoteUiTagCommit -Tag $Tag
    Invoke-External -File git -Arguments @("fetch", "origin", "tag", $Tag) -WorkingDirectory $uiPath
    $sha = (& git -C $uiPath rev-parse "$Tag^{commit}").Trim()
    if ($LASTEXITCODE -ne 0 -or -not $sha) {
        throw "Cannot resolve UI release tag $Tag to a commit."
    }
    if ($sha -ne $remoteSha) {
        throw "Local UI tag $Tag ($sha) differs from origin ($remoteSha). Published tags are immutable; reconcile packages/ui manually."
    }
    $taggedManifest = (& git -C $uiPath show "${sha}:package.json") -join "`n"
    if ($LASTEXITCODE -ne 0 -or ($taggedManifest | ConvertFrom-Json).version -ne $Version) {
        throw "UI tag $Tag does not contain package version $Version. Refusing to record it as the compatibility ref."
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

function Test-VueReleaseInProgress {
    param([string]$UiVersion)

    # A Vue release started by an interrupted paired run has a local tag on
    # HEAD whose committed compatibility ref is the UI tag of this run. A
    # finished earlier Vue release recorded another UI commit, so it does not
    # qualify and a new Vue release is started instead.
    $manifestVersion = Get-PackageVersion -Path $vuePath
    $tag = "v$manifestVersion"
    if (-not (Test-LocalReleaseTag -Path $vuePath -Tag $tag)) { return $false }
    $head = (& git -C $vuePath rev-parse HEAD).Trim()
    $tagCommit = (& git -C $vuePath rev-parse "$tag^{commit}").Trim()
    if ($tagCommit -ne $head) { return $false }
    $refPath = Join-Path $vuePath ".ui-compat-ref"
    if (-not (Test-Path $refPath)) { return $false }
    $uiCommit = Get-RemoteTagCommit -Path $uiPath -Tag "v$UiVersion"
    return [bool]$uiCommit -and ((Get-Content $refPath -Raw).Trim() -eq $uiCommit)
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

    if ((Get-PackageVersion -Path $uiPath) -ne $Version) {
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
    param(
        [string]$Version,
        [string]$SelectedUiVersion,
        [switch]$RaiseFloor,
        [switch]$ContinueRelease
    )

    $tag = "v$Version"
    $uiTag = "v$SelectedUiVersion"
    if ($ContinueRelease) {
        Assert-UiPublished -Version $SelectedUiVersion
        Assert-ResumeRelease -Path $vuePath -Label "@iam3xtr/vue" -Tag $tag
        $committedRange = Get-VueUiPeerRange
        if (-not (Test-CaretRange -Range $committedRange -Version $SelectedUiVersion)) {
            throw "@iam3xtr/ui@$SelectedUiVersion is outside the committed Vue peer interval $committedRange. Pass the -UiVersion used by the interrupted release."
        }
        $recordedRef = (Get-Content (Join-Path $vuePath ".ui-compat-ref") -Raw).Trim()
        if ($recordedRef -ne (Get-RemoteUiTagCommit -Tag $uiTag)) {
            throw "Committed .ui-compat-ref does not match UI tag $uiTag. Pass the -UiVersion used by the interrupted release."
        }
        Push-ReleaseRefs -Path $vuePath -Label "@iam3xtr/vue" -Tag $tag
        Write-Host "Waiting for the Vue release workflow and its environment approval."
        Wait-ForRelease -Repository "iam3xtr/vue" -Commit ((& git -C $vuePath rev-parse HEAD).Trim())
        return
    }
    Assert-TagAvailable -Path $vuePath -Tag $tag
    $currentRange = Get-VueUiPeerRange
    $peerRange = Resolve-VuePeerRange -SelectedUiVersion $SelectedUiVersion -RaiseFloor:$RaiseFloor
    if (-not $Execute) {
        if ($Package -eq "vue") {
            Assert-UiPublished -Version $SelectedUiVersion
            $plannedUiSha = Get-RemoteUiTagCommit -Tag $uiTag
            Write-Host "UI $uiTag resolves to $plannedUiSha; it would be recorded in .ui-compat-ref."
        }
        $rangeNote = if ($peerRange -eq $currentRange) { " (unchanged)" } else { "" }
        Write-Host "Planned Vue release: @iam3xtr/vue@$Version against @iam3xtr/ui@$SelectedUiVersion."
        Write-Host "Vue peer @iam3xtr/ui: $currentRange -> $peerRange$rangeNote."
        Write-Host "Prerequisite: @iam3xtr/ui@$SelectedUiVersion must already be published to npm.pkg.github.com."
        return
    }

    Assert-UiPublished -Version $SelectedUiVersion
    $uiSha = Get-UiReleaseSha -Tag $uiTag -Version $SelectedUiVersion
    Write-Host "Planned Vue release: @iam3xtr/vue@$Version against published @iam3xtr/ui@$SelectedUiVersion (peer $peerRange)."
    Set-VueCompatibility -PeerRange $peerRange -UiSha $uiSha
    if ((Get-PackageVersion -Path $vuePath) -ne $Version) {
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
    if ($UiVersion -and $Package -ne "vue") {
        throw "-UiVersion applies only to -Package vue."
    }
    if ($RaisePeerFloor -and $Package -notin @("vue", "all")) {
        throw "-RaisePeerFloor applies only to -Package vue or all."
    }
    if ($UiVersion) {
        ConvertTo-SemVer -Version $UiVersion | Out-Null
    }
    if ($Package -eq "ui") {
        if (-not $Resume) {
            Assert-CleanMain -Path $uiPath -Label "@iam3xtr/ui"
        }
        Assert-UiKitSyncTarget
        $uiReleaseVersion = Get-RequestedReleaseVersion -Path $uiPath
        Release-Ui -Version $uiReleaseVersion
        if ($Execute) { Sync-UiKitDependencies -UiVersion $uiReleaseVersion }
    } elseif ($Package -eq "vue") {
        if (-not $Resume) {
            Assert-CleanMain -Path $vuePath -Label "@iam3xtr/vue"
        }
        Assert-UiKitSyncTarget
        $vueReleaseVersion = Get-RequestedReleaseVersion -Path $vuePath
        $selectedUiVersion = if ($UiVersion) { $UiVersion } else { Get-PackageVersion -Path $uiPath }
        Release-Vue -Version $vueReleaseVersion -SelectedUiVersion $selectedUiVersion -RaiseFloor:$RaisePeerFloor -ContinueRelease:$Resume
        if ($Execute) { Sync-UiKitDependencies -VueVersion $vueReleaseVersion }
    } else {
        if (-not $Resume) {
            Assert-CleanMain -Path $uiPath -Label "@iam3xtr/ui"
            Assert-CleanMain -Path $vuePath -Label "@iam3xtr/vue"
        }
        Assert-UiKitSyncTarget -AllowPinOnly:$Resume
        $nextUiVersion = Get-RequestedReleaseVersion -Path $uiPath
        $continueVueRelease = $Resume -and (Test-VueReleaseInProgress -UiVersion $nextUiVersion)
        if ($continueVueRelease) {
            $nextVueVersion = Get-PackageVersion -Path $vuePath
        } else {
            if ($Resume) {
                Write-Host "Vue has no pending release for UI v$nextUiVersion; it will start after the published UI package."
                Assert-CleanMain -Path $vuePath -Label "@iam3xtr/vue"
            }
            $nextVueVersion = Get-ReleaseVersion -Path $vuePath
            if (-not $Resume) {
                # Reject predictable Vue failures before the irreversible UI publication.
                Assert-TagAvailable -Path $vuePath -Tag "v$nextVueVersion"
                Resolve-VuePeerRange -SelectedUiVersion $nextUiVersion -RaiseFloor:$RaisePeerFloor | Out-Null
            }
        }
        Write-Host "Planned release: @iam3xtr/ui@$nextUiVersion, then @iam3xtr/vue@$nextVueVersion."
        Release-Ui -Version $nextUiVersion
        # No UI-only sync here: the pinned published Vue peers an older UI, so
        # pinning the new UI alone would fail npm's peer resolution after UI
        # is already published. One combined sync follows the Vue release; if
        # Vue fails, the kit manifest stays untouched and -Resume completes it.
        Release-Vue -Version $nextVueVersion -SelectedUiVersion $nextUiVersion -RaiseFloor:$RaisePeerFloor -ContinueRelease:$continueVueRelease
        if ($Execute) {
            Sync-UiKitDependencies -UiVersion $nextUiVersion -VueVersion $nextVueVersion
            Write-Host "Published @iam3xtr/ui@$nextUiVersion and @iam3xtr/vue@$nextVueVersion. Run the documented exact-version registry gate before declaring them recommended for consumers."
        }
    }

    if (-not $Execute) {
        Write-Host "Dry run only. Re-run with -Execute to create commits, tags, and push them."
    }
} catch {
    Write-Error ("Release failed: {0}" -f $_.Exception.Message)
    if ($Package -eq "all" -and $nextUiVersion -and (& git -C $uiPath tag --list "v$nextUiVersion")) {
        Write-Error "UI tag v$nextUiVersion may already be pushed or published. Do not delete or reuse it; re-run the same command with -Resume -Execute to finish the remaining steps."
    }
    exit 1
}
