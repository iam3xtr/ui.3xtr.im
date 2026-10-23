// @vitest-environment node
//
// Regression tests for scripts/release-packages.ps1 (S1-06: Vue releases are
// decoupled from same-number UI versions; S1-07: release:all with unequal
// targets and safe resume).
//
// The script runs against a throwaway copy of the repository layout: temporary
// git repositories whose "origin" remotes are local bare repositories, and
// PATH shims that replace `npm` and `gh`. Nothing here contacts a registry,
// GitHub, or the real submodules; the version numbers exist only in fixtures.
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Each case spawns Windows PowerShell and several git processes.
vi.setConfig({ testTimeout: 120000, hookTimeout: 120000 });

const scriptSource = resolve(__dirname, "../../../scripts/release-packages.ps1");
const hasPowerShell =
    process.platform === "win32" &&
    spawnSync("powershell.exe", ["-NoProfile", "-Command", "exit 0"]).status === 0;

const gitEnv = {
    GIT_AUTHOR_NAME: "Release Test",
    GIT_AUTHOR_EMAIL: "release@example.invalid",
    GIT_COMMITTER_NAME: "Release Test",
    GIT_COMMITTER_EMAIL: "release@example.invalid",
};

function git(cwd, ...args) {
    return execFileSync("git", args, {
        cwd,
        encoding: "utf8",
        env: { ...process.env, ...gitEnv },
    }).trim();
}

function writeJson(path, value) {
    writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
}

const mockNpm = `
import { appendFileSync, readFileSync, writeFileSync, existsSync } from "node:fs";
const args = process.argv.slice(2);
appendFileSync(process.env.MOCK_LOG, "npm " + args.join(" ") + "\\n");
if (args[0] === "view") {
    if (process.env.MOCK_NPM_DENY === "1") {
        console.error("401 Unauthorized token=ghp_SECRET_TOKEN_VALUE");
        process.exit(1);
    }
    const version = args[1].split("@").pop();
    const published = (process.env.MOCK_UI_PUBLISHED || "").split(",");
    if (!published.includes(version)) {
        console.error("404 Not Found");
        process.exit(1);
    }
    console.log(JSON.stringify(version));
} else if (args[0] === "install" && args.includes("--package-lock-only")) {
    // Emulate npm's peer resolution for the kit root only: the pinned
    // @iam3xtr/vue must peer-accept the pinned @iam3xtr/ui (caret, node-semver).
    const manifest = JSON.parse(readFileSync("package.json", "utf8"));
    if (manifest.name === "kit") {
        const uiPin = manifest.dependencies["@iam3xtr/ui"];
        const vuePin = manifest.dependencies["@iam3xtr/vue"];
        const vueManifest = JSON.parse(readFileSync("packages/vue/package.json", "utf8"));
        // Only a pin of the older, already published Vue is emulated: its
        // peer range is fixed at ^0.1.4. A pin of the freshly released Vue
        // peers the UI it was released against, which always resolves here.
        if (vuePin !== vueManifest.version) {
            const parse = (v) => v.split("-")[0].split(".").map(Number);
            const [ua, ub, uc] = parse(uiPin);
            const ok = !uiPin.includes("-") && ua === 0 && ub === 1 && uc >= 4;
            if (!ok) {
                console.error("npm error code ERESOLVE: @iam3xtr/vue@" + vuePin + " peer @iam3xtr/ui@^0.1.4 conflicts with " + uiPin);
                process.exit(1);
            }
        }
    }
} else if (args[0] === "version") {
    const manifest = JSON.parse(readFileSync("package.json", "utf8"));
    manifest.version = args[1];
    writeFileSync("package.json", JSON.stringify(manifest, null, 2) + "\\n");
}
`;

const mockGh = `
import { appendFileSync } from "node:fs";
const args = process.argv.slice(2);
appendFileSync(process.env.MOCK_LOG, "gh " + args.join(" ") + "\\n");
if (args[0] === "run" && args[1] === "list") console.log('[{"databaseId":1}]');
if (args[0] === "run" && args[1] === "watch" && process.env.MOCK_GH_FAIL_WATCH &&
    args.join(" ").includes("--repo " + process.env.MOCK_GH_FAIL_WATCH)) {
    console.error("workflow failed");
    process.exit(1);
}
`;

let workDir;

function createFixture() {
    workDir = mkdtempSync(join(tmpdir(), "release-script-"));
    const root = join(workDir, "kit");
    const bin = join(workDir, "bin");
    mkdirSync(join(root, "scripts"), { recursive: true });
    mkdirSync(bin);

    copyFileSync(scriptSource, join(root, "scripts", "release-packages.ps1"));
    writeJson(join(root, "package.json"), {
        name: "kit",
        dependencies: { "@iam3xtr/ui": "0.1.4", "@iam3xtr/vue": "0.1.4" },
    });
    writeJson(join(root, "package-lock.json"), { lockfileVersion: 3 });
    git(root, "init", "-b", "main");
    git(root, "add", ".");
    git(root, "commit", "-m", "kit");

    const makeRepo = (name) => {
        const origin = join(workDir, `${name}-origin.git`);
        const repo = join(root, "packages", name);
        mkdirSync(repo, { recursive: true });
        git(workDir, "init", "--bare", "-b", "main", origin);
        git(repo, "init", "-b", "main");
        git(repo, "remote", "add", "origin", origin);
        return repo;
    };

    // UI history: 0.1.4, a tag whose manifest disagrees (v0.1.9 -> 0.1.6),
    // 0.2.0, and finally 0.1.6 at main.
    const ui = makeRepo("ui");
    const uiCommit = (version, tag) => {
        writeJson(join(ui, "package.json"), { name: "@iam3xtr/ui", version });
        writeJson(join(ui, "package-lock.json"), { lockfileVersion: 3, version });
        git(ui, "add", ".");
        git(ui, "commit", "-m", `ui ${version}`);
        git(ui, "tag", "-a", tag, "-m", tag);
        return git(ui, "rev-parse", "HEAD");
    };
    const uiShas = {};
    uiShas["0.1.4"] = uiCommit("0.1.4", "v0.1.4");
    uiShas["0.1.9"] = uiCommit("0.1.6", "v0.1.9");
    uiShas["0.2.0"] = uiCommit("0.2.0", "v0.2.0");
    uiShas["0.1.6"] = uiCommit("0.1.6", "v0.1.6");
    git(ui, "push", "origin", "main", "--tags");

    const vue = makeRepo("vue");
    writeJson(join(vue, "package.json"), {
        name: "@iam3xtr/vue",
        version: "0.1.4",
        peerDependencies: { "@iam3xtr/ui": "^0.1.4" },
    });
    writeJson(join(vue, "package-lock.json"), { lockfileVersion: 3 });
    writeFileSync(join(vue, ".ui-compat-ref"), uiShas["0.1.4"] + "\n");
    git(vue, "add", ".");
    git(vue, "commit", "-m", "vue 0.1.4");
    git(vue, "push", "origin", "main");

    writeFileSync(join(bin, "mock-npm.mjs"), mockNpm);
    writeFileSync(join(bin, "mock-gh.mjs"), mockGh);
    writeFileSync(join(bin, "npm.cmd"), '@node "%~dp0mock-npm.mjs" %*\r\n');
    writeFileSync(join(bin, "gh.cmd"), '@node "%~dp0mock-gh.mjs" %*\r\n');

    return { root, bin, ui, vue, uiShas, log: join(workDir, "commands.log") };
}

function runScript(fx, args, env = {}) {
    writeFileSync(fx.log, "");
    const result = spawnSync(
        "powershell.exe",
        ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(fx.root, "scripts", "release-packages.ps1"), ...args],
        {
            encoding: "utf8",
            env: {
                ...process.env,
                ...gitEnv,
                PATH: fx.bin + delimiter + process.env.PATH,
                MOCK_LOG: fx.log,
                MOCK_UI_PUBLISHED: "0.1.4,0.1.6,0.1.9,0.2.0",
                ...env,
            },
        },
    );
    return {
        status: result.status,
        // PowerShell wraps error text at the console width; rejoin it.
        output: `${result.stdout}\n${result.stderr}`.replace(/\r?\n(\+\s*)?/g, ""),
        commands: readFileSync(fx.log, "utf8"),
    };
}

function snapshot(repo) {
    return {
        head: git(repo, "rev-parse", "HEAD"),
        tags: git(repo, "tag", "--list"),
        remote: git(repo, "ls-remote", "origin"),
        status: git(repo, "status", "--porcelain"),
    };
}

const readVue = (fx) => JSON.parse(readFileSync(join(fx.vue, "package.json"), "utf8"));

describe.skipIf(!hasPowerShell)("release-packages.ps1 independent Vue/UI selection", () => {
    let fx;
    beforeEach(() => {
        fx = createFixture();
    });
    afterEach(() => {
        rmSync(workDir, { recursive: true, force: true });
    });

    it("releases Vue 0.1.5 against a different published UI 0.1.6 and leaves UI untouched", () => {
        const uiBefore = snapshot(fx.ui);
        const rootPackage = readFileSync(join(fx.root, "package.json"), "utf8");

        const result = runScript(fx, ["-Package", "vue", "-UiVersion", "0.1.6", "-Execute"]);

        expect(result.output).toContain("@iam3xtr/vue@0.1.5");
        expect(result.status).toBe(0);
        expect(readVue(fx).version).toBe("0.1.5");
        expect(readVue(fx).peerDependencies["@iam3xtr/ui"]).toBe("^0.1.4");
        expect(readFileSync(join(fx.vue, ".ui-compat-ref"), "utf8").trim()).toBe(fx.uiShas["0.1.6"]);
        expect(git(fx.vue, "ls-remote", "origin", "refs/tags/v0.1.5")).not.toBe("");
        expect(snapshot(fx.ui)).toEqual(uiBefore);

        const pins = JSON.parse(readFileSync(join(fx.root, "package.json"), "utf8")).dependencies;
        expect(pins["@iam3xtr/vue"]).toBe("0.1.5");
        expect(pins["@iam3xtr/ui"]).toBe("0.1.4");
        expect(readFileSync(join(fx.root, "package.json"), "utf8")).not.toBe(rootPackage);
    });

    it("rejects a UI version outside the peer interval before any mutation", () => {
        const before = snapshot(fx.vue);
        const result = runScript(fx, ["-Package", "vue", "-UiVersion", "0.2.0", "-Execute"]);

        expect(result.status).not.toBe(0);
        expect(result.output).toContain("outside the Vue peer interval ^0.1.4");
        expect(snapshot(fx.vue)).toEqual(before);
        expect(result.commands).not.toContain("npm version");
    });

    it("rejects prerelease and below-floor UI versions with semver interval rules", () => {
        for (const version of ["0.1.5-beta", "0.1.3"]) {
            const before = snapshot(fx.vue);
            const result = runScript(fx, ["-Package", "vue", "-UiVersion", version, "-Execute"], {
                MOCK_UI_PUBLISHED: version,
            });
            expect(result.status).not.toBe(0);
            expect(result.output).toContain("outside the Vue peer interval");
            expect(snapshot(fx.vue)).toEqual(before);
        }
    });

    it("raises the peer floor only with -RaisePeerFloor", () => {
        const result = runScript(fx, ["-Package", "vue", "-UiVersion", "0.2.0", "-RaisePeerFloor", "-Execute"]);

        expect(result.status).toBe(0);
        expect(readVue(fx).peerDependencies["@iam3xtr/ui"]).toBe("^0.2.0");
        expect(readFileSync(join(fx.vue, ".ui-compat-ref"), "utf8").trim()).toBe(fx.uiShas["0.2.0"]);
    });

    it("never lowers the peer floor", () => {
        writeJson(join(fx.vue, "package.json"), {
            name: "@iam3xtr/vue",
            version: "0.1.4",
            peerDependencies: { "@iam3xtr/ui": "^0.1.6" },
        });
        git(fx.vue, "commit", "-am", "raise floor");
        git(fx.vue, "push", "origin", "main");
        const before = snapshot(fx.vue);

        const result = runScript(fx, ["-Package", "vue", "-UiVersion", "0.1.4", "-RaisePeerFloor", "-Execute"]);

        expect(result.status).not.toBe(0);
        expect(result.output).toContain("never lowers the minimum");
        expect(snapshot(fx.vue)).toEqual(before);
    });

    it("fails before mutation when the selected UI version is not published", () => {
        const before = snapshot(fx.vue);
        const result = runScript(fx, ["-Package", "vue", "-UiVersion", "0.1.7", "-Execute"]);

        expect(result.status).not.toBe(0);
        expect(result.output).toContain("Cannot read @iam3xtr/ui@0.1.7");
        expect(snapshot(fx.vue)).toEqual(before);
    });

    it("reports registry access failures without leaking credentials", () => {
        const before = snapshot(fx.vue);
        const result = runScript(fx, ["-Package", "vue", "-UiVersion", "0.1.6", "-Execute"], { MOCK_NPM_DENY: "1" });

        expect(result.status).not.toBe(0);
        expect(result.output).toContain("packages:read");
        expect(result.output).not.toContain("ghp_SECRET_TOKEN_VALUE");
        expect(snapshot(fx.vue)).toEqual(before);
    });

    it("refuses a UI tag that is missing or names a different manifest version", () => {
        const before = snapshot(fx.vue);

        const missing = runScript(fx, ["-Package", "vue", "-UiVersion", "0.1.8", "-Execute"], {
            MOCK_UI_PUBLISHED: "0.1.8",
        });
        expect(missing.status).not.toBe(0);
        expect(missing.output).toContain("UI release tag v0.1.8 does not exist");

        const mismatch = runScript(fx, ["-Package", "vue", "-UiVersion", "0.1.9", "-Execute"]);
        expect(mismatch.status).not.toBe(0);
        expect(mismatch.output).toContain("does not contain package version 0.1.9");

        expect(snapshot(fx.vue)).toEqual(before);
    });

    it("dry run reports both targets and the peer decision without mutating anything", () => {
        const before = {
            ui: snapshot(fx.ui),
            vue: snapshot(fx.vue),
            root: git(fx.root, "status", "--porcelain") + git(fx.root, "rev-parse", "HEAD"),
            rootPackage: readFileSync(join(fx.root, "package.json"), "utf8"),
        };

        const result = runScript(fx, ["-Package", "vue", "-UiVersion", "0.1.6"]);

        expect(result.status).toBe(0);
        expect(result.output).toContain("@iam3xtr/vue@0.1.5 against @iam3xtr/ui@0.1.6");
        expect(result.output).toContain("Vue peer @iam3xtr/ui: ^0.1.4 -> ^0.1.4 (unchanged)");
        expect(result.output).toContain("must already be published");
        expect(result.output).toContain("Dry run only");
        expect(snapshot(fx.ui)).toEqual(before.ui);
        expect(snapshot(fx.vue)).toEqual(before.vue);
        expect(git(fx.root, "status", "--porcelain") + git(fx.root, "rev-parse", "HEAD")).toEqual(before.root);
        expect(readFileSync(join(fx.root, "package.json"), "utf8")).toBe(before.rootPackage);
        expect(result.commands).not.toContain("npm version");
    });

    it("dry run rejects an out-of-peer UI version", () => {
        const result = runScript(fx, ["-Package", "vue", "-UiVersion", "0.2.0"]);
        expect(result.status).not.toBe(0);
        expect(result.output).toContain("outside the Vue peer interval");
    });

    it("UI-only release leaves the Vue repository, manifest and compat ref unchanged", () => {
        const vueBefore = snapshot(fx.vue);
        const compatRef = readFileSync(join(fx.vue, ".ui-compat-ref"), "utf8");

        const result = runScript(fx, ["-Package", "ui", "-Execute"], { MOCK_UI_PUBLISHED: "0.1.7" });

        expect(result.status).toBe(0);
        expect(git(fx.ui, "ls-remote", "origin", "refs/tags/v0.1.7")).not.toBe("");
        expect(snapshot(fx.vue)).toEqual(vueBefore);
        expect(readFileSync(join(fx.vue, ".ui-compat-ref"), "utf8")).toBe(compatRef);
        const pins = JSON.parse(readFileSync(join(fx.root, "package.json"), "utf8")).dependencies;
        expect(pins["@iam3xtr/ui"]).toBe("0.1.7");
        expect(pins["@iam3xtr/vue"]).toBe("0.1.4");
    });

    it("rejects -UiVersion outside the Vue-only entry point", () => {
        const result = runScript(fx, ["-Package", "ui", "-UiVersion", "0.1.6"]);
        expect(result.status).not.toBe(0);
        expect(result.output).toContain("-UiVersion applies only to -Package vue");
    });

    it("keeps the paired release working when both versions are equal", () => {
        writeJson(join(fx.ui, "package.json"), { name: "@iam3xtr/ui", version: "0.1.4" });
        git(fx.ui, "commit", "-am", "align");
        git(fx.ui, "push", "origin", "main");

        const result = runScript(fx, ["-Package", "all", "-Execute"], { MOCK_UI_PUBLISHED: "0.1.5" });

        expect(result.status).toBe(0);
        expect(readVue(fx).version).toBe("0.1.5");
        expect(readVue(fx).peerDependencies["@iam3xtr/ui"]).toBe("^0.1.4");
        expect(readFileSync(join(fx.vue, ".ui-compat-ref"), "utf8").trim()).toBe(git(fx.ui, "rev-parse", "v0.1.5^{commit}"));
    });

    describe("release:all with unequal package targets", () => {
        const rootPins = () => JSON.parse(readFileSync(join(fx.root, "package.json"), "utf8")).dependencies;
        const remoteTags = (repo) => git(repo, "ls-remote", "--tags", "origin");
        // State left by an interrupted run: release commit and tag exist locally only.
        const stageLocalUiRelease = (version) => {
            writeJson(join(fx.ui, "package.json"), { name: "@iam3xtr/ui", version });
            git(fx.ui, "commit", "-am", `chore(release): v${version}`);
            git(fx.ui, "tag", "-a", `v${version}`, "-m", `release: v${version}`);
        };

        it("dry run prints independent targets and the peer decision without mutating anything", () => {
            const before = { ui: snapshot(fx.ui), vue: snapshot(fx.vue), root: readFileSync(join(fx.root, "package.json"), "utf8") };

            const result = runScript(fx, ["-Package", "all"]);

            expect(result.status).toBe(0);
            expect(result.output).toContain("@iam3xtr/ui@0.1.7, then @iam3xtr/vue@0.1.5");
            expect(result.output).toContain("Vue peer @iam3xtr/ui: ^0.1.4 -> ^0.1.4 (unchanged)");
            expect(result.output).toContain("Dry run only");
            expect(snapshot(fx.ui)).toEqual(before.ui);
            expect(snapshot(fx.vue)).toEqual(before.vue);
            expect(readFileSync(join(fx.root, "package.json"), "utf8")).toBe(before.root);
            expect(result.commands).not.toContain("npm version");
        });

        it("releases UI and Vue to different versions without a dummy bump", () => {
            const result = runScript(fx, ["-Package", "all", "-Execute"], { MOCK_UI_PUBLISHED: "0.1.7" });

            expect(result.status).toBe(0);
            expect(git(fx.ui, "ls-remote", "origin", "refs/tags/v0.1.7")).not.toBe("");
            expect(git(fx.vue, "ls-remote", "origin", "refs/tags/v0.1.5")).not.toBe("");
            expect(git(fx.vue, "ls-remote", "origin", "refs/tags/v0.1.7")).toBe("");
            expect(readVue(fx).version).toBe("0.1.5");
            expect(readVue(fx).peerDependencies["@iam3xtr/ui"]).toBe("^0.1.4");
            expect(readFileSync(join(fx.vue, ".ui-compat-ref"), "utf8").trim()).toBe(git(fx.ui, "rev-parse", "v0.1.7^{commit}"));
            expect(rootPins()).toMatchObject({ "@iam3xtr/ui": "0.1.7", "@iam3xtr/vue": "0.1.5" });
        });

        it("raises the Vue peer minimum for a compatible UI patch only with -RaisePeerFloor", () => {
            const dry = runScript(fx, ["-Package", "all", "-RaisePeerFloor"]);
            expect(dry.status).toBe(0);
            expect(dry.output).toContain("Vue peer @iam3xtr/ui: ^0.1.4 -> ^0.1.7");

            const result = runScript(fx, ["-Package", "all", "-RaisePeerFloor", "-Execute"], { MOCK_UI_PUBLISHED: "0.1.7" });

            expect(result.status).toBe(0);
            expect(readVue(fx).peerDependencies["@iam3xtr/ui"]).toBe("^0.1.7");
        });

        it("rejects a UI outside the Vue peer interval before UI publication without -RaisePeerFloor", () => {
            const before = snapshot(fx.ui);

            const result = runScript(fx, ["-Package", "all", "-Bump", "major", "-Execute"], { MOCK_UI_PUBLISHED: "1.0.0" });

            expect(result.status).not.toBe(0);
            expect(result.output).toContain("outside the Vue peer interval ^0.1.4");
            expect(result.output).toContain("-RaisePeerFloor");
            expect(snapshot(fx.ui)).toEqual(before);
        });

        it("rejects a published Vue tag before publishing UI", () => {
            git(fx.vue, "tag", "-a", "v0.1.5", "-m", "x");
            git(fx.vue, "push", "origin", "refs/tags/v0.1.5");
            const before = snapshot(fx.ui);

            const result = runScript(fx, ["-Package", "all", "-Execute"], { MOCK_UI_PUBLISHED: "0.1.7" });

            expect(result.status).not.toBe(0);
            expect(result.output).toContain("Tag v0.1.5 already exists");
            expect(snapshot(fx.ui)).toEqual(before);
        });

        it("rejects an already published UI version without touching Vue", () => {
            const before = snapshot(fx.vue);
            const result = runScript(fx, ["-Package", "all", "-ReleaseCurrent", "-Execute"]);
            expect(result.status).not.toBe(0);
            expect(result.output).toContain("already exists");
            expect(snapshot(fx.vue)).toEqual(before);
            expect(rootPins()).toMatchObject({ "@iam3xtr/ui": "0.1.4", "@iam3xtr/vue": "0.1.4" });
        });

        it("refuses to start over unrelated root dependency edits and keeps them", () => {
            const edited = JSON.parse(readFileSync(join(fx.root, "package.json"), "utf8"));
            edited.dependencies.vue = "^3.5.0";
            writeJson(join(fx.root, "package.json"), edited);
            const before = snapshot(fx.ui);

            const result = runScript(fx, ["-Package", "all", "-Execute"], { MOCK_UI_PUBLISHED: "0.1.7" });

            expect(result.status).not.toBe(0);
            expect(result.output).toContain("UI Kit package.json or package-lock.json has local changes");
            expect(snapshot(fx.ui)).toEqual(before);
            expect(rootPins().vue).toBe("^3.5.0");
        });

        it("resumes after UI succeeded and the Vue workflow failed without extra bumps", () => {
            const failed = runScript(fx, ["-Package", "all", "-Execute"], {
                MOCK_UI_PUBLISHED: "0.1.7",
                MOCK_GH_FAIL_WATCH: "iam3xtr/vue",
            });
            expect(failed.status).not.toBe(0);
            // The kit manifest stays untouched until Vue publishes.
            expect(rootPins()).toMatchObject({ "@iam3xtr/ui": "0.1.4", "@iam3xtr/vue": "0.1.4" });
            expect(git(fx.root, "status", "--porcelain", "--", "package.json", "package-lock.json")).toBe("");
            const uiAfter = snapshot(fx.ui);
            const vueAfter = snapshot(fx.vue);

            const resumed = runScript(fx, ["-Package", "all", "-Resume", "-Execute"], { MOCK_UI_PUBLISHED: "0.1.7" });

            expect(resumed.status).toBe(0);
            expect(snapshot(fx.ui)).toEqual(uiAfter);
            expect(snapshot(fx.vue)).toEqual(vueAfter);
            expect(resumed.commands).not.toContain("npm version");
            expect(rootPins()).toMatchObject({ "@iam3xtr/ui": "0.1.7", "@iam3xtr/vue": "0.1.5" });
        });

        it.each([
            ["a major bump", ["-Bump", "major"], "1.0.0"],
            ["a prerelease", ["-Alpha"], "0.1.7-alpha"],
        ])("pins UI and Vue together for %s outside the pinned Vue peer range", (_label, flags, uiVersion) => {
            const result = runScript(fx, ["-Package", "all", ...flags, "-RaisePeerFloor", "-Execute"], { MOCK_UI_PUBLISHED: uiVersion });

            expect(result.output).not.toContain("ERESOLVE");
            expect(result.status).toBe(0);
            expect(rootPins()["@iam3xtr/ui"]).toBe(uiVersion);
            expect(rootPins()["@iam3xtr/vue"]).toBe(readVue(fx).version);
        });

        it("keeps the kit recoverable when Vue fails for a major UI bump and resume reaches Vue", () => {
            const failed = runScript(fx, ["-Package", "all", "-Bump", "major", "-RaisePeerFloor", "-Execute"], {
                MOCK_UI_PUBLISHED: "1.0.0",
                MOCK_GH_FAIL_WATCH: "iam3xtr/vue",
            });
            expect(failed.status).not.toBe(0);
            expect(git(fx.root, "status", "--porcelain", "--", "package.json", "package-lock.json")).toBe("");

            const resumed = runScript(fx, ["-Package", "all", "-RaisePeerFloor", "-Resume", "-Execute"], { MOCK_UI_PUBLISHED: "1.0.0" });

            expect(resumed.output).not.toContain("ERESOLVE");
            expect(resumed.status).toBe(0);
            expect(rootPins()).toMatchObject({ "@iam3xtr/ui": "1.0.0", "@iam3xtr/vue": "1.0.0" });
        });

        it("starts the missing Vue release when resuming after the UI workflow failed", () => {
            const failed = runScript(fx, ["-Package", "all", "-Execute"], {
                MOCK_UI_PUBLISHED: "0.1.7",
                MOCK_GH_FAIL_WATCH: "iam3xtr/ui",
            });
            expect(failed.status).not.toBe(0);
            expect(git(fx.ui, "ls-remote", "origin", "refs/tags/v0.1.7")).not.toBe("");
            expect(readVue(fx).version).toBe("0.1.4");
            expect(git(fx.vue, "tag", "--list")).toBe("");
            const uiAfter = snapshot(fx.ui);

            const resumed = runScript(fx, ["-Package", "all", "-Resume", "-Execute"], { MOCK_UI_PUBLISHED: "0.1.7" });

            expect(resumed.status).toBe(0);
            expect(snapshot(fx.ui)).toEqual(uiAfter);
            expect(readVue(fx).version).toBe("0.1.5");
            expect(readVue(fx).peerDependencies["@iam3xtr/ui"]).toBe("^0.1.4");
            expect(git(fx.vue, "ls-remote", "origin", "refs/tags/v0.1.5")).not.toBe("");
            expect(rootPins()).toMatchObject({ "@iam3xtr/ui": "0.1.7", "@iam3xtr/vue": "0.1.5" });
        });

        it("pushes a local release commit and tag that never reached origin", () => {
            stageLocalUiRelease("0.1.7");
            const tagCommit = git(fx.ui, "rev-parse", "v0.1.7^{commit}");

            const result = runScript(fx, ["-Package", "all", "-Resume", "-Execute"], { MOCK_UI_PUBLISHED: "0.1.7" });

            expect(result.status).toBe(0);
            expect(git(fx.ui, "ls-remote", "origin", "refs/tags/v0.1.7^{}")).toContain(tagCommit);
            expect(git(fx.ui, "tag", "--list", "v0.1.8")).toBe("");
            expect(readVue(fx).version).toBe("0.1.5");
        });

        it("never overwrites a divergent remote tag during resume", () => {
            stageLocalUiRelease("0.1.7");
            git(fx.ui, "tag", "-a", "other", "-m", "other", fx.uiShas["0.1.4"]);
            git(fx.ui, "push", "origin", "refs/tags/other:refs/tags/v0.1.7");
            git(fx.ui, "tag", "-d", "other");
            const remoteBefore = remoteTags(fx.ui);
            const vueBefore = snapshot(fx.vue);

            const result = runScript(fx, ["-Package", "all", "-Resume", "-Execute"], { MOCK_UI_PUBLISHED: "0.1.7" });

            expect(result.status).not.toBe(0);
            expect(remoteTags(fx.ui)).toBe(remoteBefore);
            expect(snapshot(fx.vue)).toEqual(vueBefore);
        });

        it("never overwrites a remote main that moved past the release commit", () => {
            stageLocalUiRelease("0.1.7");
            const clone = join(workDir, "ui-clone");
            git(workDir, "clone", join(workDir, "ui-origin.git"), clone);
            writeFileSync(join(clone, "extra.txt"), "x\n");
            git(clone, "add", ".");
            git(clone, "commit", "-m", "remote work");
            git(clone, "push", "origin", "main");
            const mainBefore = git(fx.ui, "ls-remote", "origin", "refs/heads/main");
            const vueBefore = snapshot(fx.vue);

            const result = runScript(fx, ["-Package", "all", "-Resume", "-Execute"], { MOCK_UI_PUBLISHED: "0.1.7" });

            expect(result.status).not.toBe(0);
            expect(result.output).toContain("origin/main contains commits");
            expect(git(fx.ui, "ls-remote", "origin", "refs/heads/main")).toBe(mainBefore);
            expect(snapshot(fx.vue)).toEqual(vueBefore);
        });

        // UI 0.1.7 is published and pushed; Vue holds a local-only release
        // commit (and optionally a tag) left by an interrupted run.
        const stageLocalVueRelease = ({ tag, compatTag }) => {
            const failed = runScript(fx, ["-Package", "all", "-Execute"], {
                MOCK_UI_PUBLISHED: "0.1.7",
                MOCK_GH_FAIL_WATCH: "iam3xtr/ui",
            });
            expect(failed.status).not.toBe(0);
            writeJson(join(fx.vue, "package.json"), {
                name: "@iam3xtr/vue",
                version: "0.1.5",
                peerDependencies: { "@iam3xtr/ui": "^0.1.7" },
            });
            writeFileSync(join(fx.vue, ".ui-compat-ref"), git(fx.ui, "rev-parse", `${compatTag}^{commit}`) + "\n");
            git(fx.vue, "commit", "-am", "chore(release): v0.1.5");
            if (tag) git(fx.vue, "tag", "-a", "v0.1.5", "-m", "release: v0.1.5");
        };

        it("stops safely when the Vue release commit has no tag and was not pushed", () => {
            stageLocalVueRelease({ tag: false, compatTag: "v0.1.7" });
            const before = { ui: snapshot(fx.ui), vue: snapshot(fx.vue), root: rootPins() };

            const result = runScript(fx, ["-Package", "all", "-Resume", "-Execute"], { MOCK_UI_PUBLISHED: "0.1.7" });

            expect(result.status).not.toBe(0);
            expect(result.output).toContain("main must exactly match origin/main");
            expect(result.commands).not.toContain("npm version");
            expect(snapshot(fx.ui)).toEqual(before.ui);
            expect(snapshot(fx.vue)).toEqual(before.vue);
            expect(rootPins()).toEqual(before.root);
        });

        it("pushes only main when the Vue tag reached origin but main did not", () => {
            stageLocalVueRelease({ tag: true, compatTag: "v0.1.7" });
            git(fx.vue, "push", "origin", "refs/tags/v0.1.5");
            const head = git(fx.vue, "rev-parse", "HEAD");
            const remoteTagBefore = git(fx.vue, "ls-remote", "origin", "refs/tags/v0.1.5^{}");

            const result = runScript(fx, ["-Package", "all", "-Resume", "-Execute"], { MOCK_UI_PUBLISHED: "0.1.7" });

            expect(result.status).toBe(0);
            expect(git(fx.vue, "ls-remote", "origin", "refs/heads/main")).toContain(head);
            expect(git(fx.vue, "ls-remote", "origin", "refs/tags/v0.1.5^{}")).toBe(remoteTagBefore);
            expect(git(fx.vue, "rev-parse", "HEAD")).toBe(head);
            expect(result.commands).not.toContain("npm version");
            expect(rootPins()).toMatchObject({ "@iam3xtr/ui": "0.1.7", "@iam3xtr/vue": "0.1.5" });
        });

        it("refuses a Vue tag on HEAD whose .ui-compat-ref differs from the UI tag", () => {
            stageLocalVueRelease({ tag: true, compatTag: "v0.1.4" });
            const before = { ui: snapshot(fx.ui), vue: snapshot(fx.vue), root: rootPins() };

            const result = runScript(fx, ["-Package", "all", "-Resume", "-Execute"], { MOCK_UI_PUBLISHED: "0.1.7" });

            expect(result.status).not.toBe(0);
            expect(result.commands).not.toContain("npm version");
            expect(snapshot(fx.ui)).toEqual(before.ui);
            expect(snapshot(fx.vue)).toEqual(before.vue);
            expect(rootPins()).toEqual(before.root);
        });

        it("is idempotent when rerun after everything was released and synced", () => {
            const first = runScript(fx, ["-Package", "all", "-Execute"], { MOCK_UI_PUBLISHED: "0.1.7" });
            expect(first.status).toBe(0);
            const uiAfter = snapshot(fx.ui);
            const vueAfter = snapshot(fx.vue);
            const pins = readFileSync(join(fx.root, "package.json"), "utf8");

            const again = runScript(fx, ["-Package", "all", "-Resume", "-Execute"], { MOCK_UI_PUBLISHED: "0.1.7" });

            expect(again.status).toBe(0);
            expect(snapshot(fx.ui)).toEqual(uiAfter);
            expect(snapshot(fx.vue)).toEqual(vueAfter);
            expect(readFileSync(join(fx.root, "package.json"), "utf8")).toBe(pins);
        });

        // Commit a realistic lockfile so lock edits can be told apart.
        const commitLock = () => {
            const lock = {
                lockfileVersion: 3,
                packages: {
                    "": { name: "kit", dependencies: { "@iam3xtr/ui": "0.1.4", "@iam3xtr/vue": "0.1.4", vue: "^3.4.0" } },
                    "node_modules/@iam3xtr/ui": { version: "0.1.4", resolved: "ui-0.1.4.tgz", integrity: "sha512-ui4" },
                    "node_modules/@iam3xtr/vue": { version: "0.1.4", resolved: "vue-0.1.4.tgz", integrity: "sha512-vue4" },
                    "node_modules/vue": { version: "3.4.0", resolved: "vue-3.4.0.tgz", integrity: "sha512-vue" },
                },
            };
            writeJson(join(fx.root, "package-lock.json"), lock);
            git(fx.root, "commit", "-am", "lock");
            return lock;
        };
        const pinWorktree = (lock, { tamper } = {}) => {
            const pkg = JSON.parse(readFileSync(join(fx.root, "package.json"), "utf8"));
            pkg.dependencies["@iam3xtr/ui"] = "0.1.7";
            writeJson(join(fx.root, "package.json"), pkg);
            const edited = JSON.parse(JSON.stringify(lock));
            edited.packages[""].dependencies["@iam3xtr/ui"] = "0.1.7";
            edited.packages["node_modules/@iam3xtr/ui"] = { version: "0.1.7", resolved: "ui-0.1.7.tgz", integrity: "sha512-ui7" };
            if (tamper) tamper(edited);
            writeJson(join(fx.root, "package-lock.json"), edited);
        };

        it("refuses to resume over unrelated package-lock edits next to pin changes and keeps them", () => {
            const lock = commitLock();
            stageLocalUiRelease("0.1.7");
            pinWorktree(lock, { tamper: (l) => { l.packages["node_modules/vue"].version = "3.5.0"; } });
            const lockBefore = readFileSync(join(fx.root, "package-lock.json"), "utf8");
            const before = snapshot(fx.ui);

            const result = runScript(fx, ["-Package", "all", "-Resume", "-Execute"], { MOCK_UI_PUBLISHED: "0.1.7" });

            expect(result.status).not.toBe(0);
            expect(result.output).toContain("has local changes");
            expect(snapshot(fx.ui)).toEqual(before);
            expect(readFileSync(join(fx.root, "package-lock.json"), "utf8")).toBe(lockBefore);
        });

        it("still resumes when package-lock.json holds only the pin sync state", () => {
            const lock = commitLock();
            stageLocalUiRelease("0.1.7");
            pinWorktree(lock);

            const result = runScript(fx, ["-Package", "all", "-Resume", "-Execute"], { MOCK_UI_PUBLISHED: "0.1.7" });

            expect(result.status).toBe(0);
            expect(rootPins()).toMatchObject({ "@iam3xtr/ui": "0.1.7", "@iam3xtr/vue": "0.1.5" });
        });

        it("refuses to resume over unrelated root dependency edits", () => {
            stageLocalUiRelease("0.1.7");
            const edited = JSON.parse(readFileSync(join(fx.root, "package.json"), "utf8"));
            edited.dependencies["@iam3xtr/ui"] = "0.1.7";
            edited.dependencies.vue = "^3.5.0";
            writeJson(join(fx.root, "package.json"), edited);
            const before = snapshot(fx.ui);

            const result = runScript(fx, ["-Package", "all", "-Resume", "-Execute"], { MOCK_UI_PUBLISHED: "0.1.7" });

            expect(result.status).not.toBe(0);
            expect(snapshot(fx.ui)).toEqual(before);
            expect(rootPins().vue).toBe("^3.5.0");
        });
    });
});
