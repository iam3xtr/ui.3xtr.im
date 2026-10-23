#!/usr/bin/env node
// Task A11.5 consumer matrix: proves the @iam3xtr/ui + @iam3xtr/vue pair
// works for a downstream project that only ever sees `npm pack` tarballs
// (or, for the two `npm view` scenarios, the public registry) — never a
// git checkout, a workspace symlink, or this repo's own node_modules.
//
// Usage (from the UI Kit repo root):
//   node packages/consumers/scripts/run-matrix.mjs
//
// Requires packages/ui and packages/vue to already have their own
// node_modules installed (`npm ci` inside each) so `npm run build`/`npm
// pack` work standalone — this script does not install submodule
// devDependencies for you.
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Build/test tooling policy: Node 24 LTS (see devEngines in the root package.json).
// Fail early instead of producing results from an unsupported toolchain.
if (Number(process.versions.node.split(".")[0]) !== 24) {
  console.error(`Consumer matrix requires Node 24 (found ${process.versions.node}).`);
  process.exit(1);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const consumersRoot = path.dirname(here);
const kitRoot = path.dirname(path.dirname(consumersRoot));
const uiPkgDir = path.join(kitRoot, "packages", "ui");
const vuePkgDir = path.join(kitRoot, "packages", "vue");

const results = [];

// Matrix output is shared in CI logs: never echo registry credentials that
// npm may print back in an error (".npmrc" lines, bearer tokens, GitHub PATs).
function redact(text) {
  return String(text)
    .replace(/(_authToken\s*=\s*)\S+/gi, "$1[redacted]")
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[redacted]")
    .replace(/(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]+/g, "[redacted]");
}

function record(name, ok, detail) {
  const safeDetail = detail ? redact(detail) : detail;
  results.push({ name, ok, detail: safeDetail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${safeDetail ? " — " + safeDetail : ""}`);
}

// Peer conflicts must surface as ERESOLVE exactly as a consumer would see them:
// neutralize user/CI npm settings that would hide or bypass them.
const STRICT_NPM_ENV = {
  npm_config_force: "false",
  npm_config_legacy_peer_deps: "false",
  npm_config_strict_peer_deps: "false",
};

function run(cmd, args, cwd, env) {
  return spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
    env: { ...process.env, ...STRICT_NPM_ENV, ...env },
  });
}

function toFileSpec(absTarballPath) {
  // npm accepts forward slashes in file: specs on every platform.
  return `file:${absTarballPath.split(path.sep).join("/")}`;
}

// ---------------------------------------------------------------------
// 1. Pack both libraries once, exactly like a release would, into an
//    isolated "registry cache" outside both this repo and the temp
//    consumer working directories.
// ---------------------------------------------------------------------
const workRoot = mkdtempSync(path.join(tmpdir(), "trickster-consumer-matrix-"));
const packCache = path.join(workRoot, "pack-cache");
mkdirSync(packCache, { recursive: true });
process.on("exit", () => {
  try {
    rmSync(workRoot, { recursive: true, force: true, maxRetries: 3 });
  } catch {
    // Best-effort: the directory lives under the OS temp root, outside the repository.
  }
});

function packOne(pkgDir, label) {
  const buildRes = run("npm", ["run", "build", "--if-present"], pkgDir);
  if (buildRes.status !== 0) {
    console.error(buildRes.stdout, buildRes.stderr);
    throw new Error(`${label}: npm run build failed`);
  }
  const packOut = execFileSync("npm", ["pack", "--pack-destination", packCache, "--json"], {
    cwd: pkgDir,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  // `prepack` output may contain ANSI sequences such as `[1m` before npm's
  // final JSON payload. Match the array that starts with an object on its
  // own line instead of taking the first `[` in the full output.
  const jsonPayload = packOut.match(/(?:^|\r?\n)(\[\s*\{[\s\S]*\}\s*\])\s*$/);
  if (!jsonPayload) {
    throw new Error(`${label}: npm pack did not return a JSON package array`);
  }
  const [info] = JSON.parse(jsonPayload[1]);
  return path.join(packCache, info.filename);
}

// The primary artifacts are packed from the checked-out sources unless known
// artifacts are supplied (absolute .tgz paths), e.g. to exercise a pair that was
// packed or downloaded elsewhere. Supplied artifacts are used verbatim.
function resolveArtifact(envName, pkgDir, label) {
  const supplied = process.env[envName];
  if (!supplied) return packOne(pkgDir, label);
  if (!path.isAbsolute(supplied) || !supplied.endsWith(".tgz")) {
    throw new Error(`${envName} must be an absolute path to a .tgz tarball`);
  }
  return supplied;
}

const uiTarball = resolveArtifact("MATRIX_UI_TARBALL", uiPkgDir, "@iam3xtr/ui");
const vueTarball = resolveArtifact("MATRIX_VUE_TARBALL", vuePkgDir, "@iam3xtr/vue");

function readTarballManifest(tarball) {
  const label = path.basename(tarball, ".tgz");
  const dir = path.join(workRoot, "inspect", label);
  mkdirSync(dir, { recursive: true });
  // Relative paths + cwd: a drive-letter path would be read as a remote host by GNU tar.
  const res = run("tar", ["-xzf", path.relative(dir, tarball), "package/package.json"], dir);
  if (res.status !== 0) throw new Error(`cannot read manifest of ${path.basename(tarball)}:
${res.stdout}${res.stderr}`);
  return JSON.parse(readFileSync(path.join(dir, "package", "package.json"), "utf8"));
}

const uiManifest = readTarballManifest(uiTarball);
const vueManifest = readTarballManifest(vueTarball);
record("pack @iam3xtr/ui", true, `${uiManifest.name}@${uiManifest.version} (${path.basename(uiTarball)})`);
record("pack @iam3xtr/vue", true, `${vueManifest.name}@${vueManifest.version} (${path.basename(vueTarball)})`);

// ---------------------------------------------------------------------
// 2. Install each fixture, from the tarballs only, into its own isolated
//    directory under the OS temp root — never under this repo, so there is
//    no way for module resolution to fall back to a workspace symlink or
//    an unpublished source path.
// ---------------------------------------------------------------------
const fixturesDir = path.join(consumersRoot, "fixtures");

// Buefy versions the `spa` fixture is installed against. The dropdown
// overlay and ModelSelect integrate with Buefy's dropdown/autocomplete DOM,
// which is version-sensitive, so each supported version gets its own
// isolated install instead of whatever `^3.0.8` resolves to today.
const BUEFY_VERSIONS = ["3.0.8", "3.0.11", "3.1.0"];

// Vue Router majors `@iam3xtr/vue/navigation` advertises beyond the default 4.x
// fixture pin. Router 5 requires Vite 7.3+/8 (its own optional peer), so each
// scenario carries the bundler pair it needs instead of loosening the peer
// interval or forcing the install. 4.6.0 is the advertised lower bound of the
// 4.x interval (the default fixture pin otherwise floats to the latest 4.x). 5.0.0 is the advertised lower bound of the
// 5.x interval; 5.4.0 is the latest stable at selection time.
const ROUTER_SCENARIOS = [
  { router: "4.6.0", buefy: "3.1.0", dev: {} },
  { router: "5.0.0", buefy: "3.1.0", dev: { vite: "8.3.5", "@vitejs/plugin-vue": "6.0.10" } },
  { router: "5.4.0", buefy: "3.1.0", dev: { vite: "8.3.5", "@vitejs/plugin-vue": "6.0.10" } },
];

function prepareFixture(name, { buefy, router, dev, label = name, ui = uiTarball, vue = vueTarball } = {}) {
  const src = path.join(fixturesDir, name);
  const dest = path.join(workRoot, label);
  cpSync(src, dest, { recursive: true });
  const pkgJsonPath = path.join(dest, "package.json");
  let pkgJson = readFileSync(pkgJsonPath, "utf8");
  pkgJson = pkgJson.replace(/__UI_TARBALL__/g, toFileSpec(ui)).replace(/__VUE_TARBALL__/g, toFileSpec(vue));
  if (buefy || router) {
    const parsed = JSON.parse(pkgJson);
    if (buefy) parsed.dependencies.buefy = buefy;
    if (router) parsed.dependencies["vue-router"] = router;
    Object.assign(parsed.devDependencies, dev);
    pkgJson = JSON.stringify(parsed, null, 2) + "\n";
  }
  writeFileSync(pkgJsonPath, pkgJson);
  return dest;
}

function assertInstalledBuefy(fixtureDir, expected) {
  const installed = JSON.parse(readFileSync(path.join(fixtureDir, "node_modules", "buefy", "package.json"), "utf8")).version;
  if (installed !== expected) {
    throw new Error(`expected buefy ${expected} to be installed, found ${installed}`);
  }
}

function assertNoSymlinkOrLocalSource(fixtureDir) {
  // Only check packages this fixture actually declares — checking a package
  // it doesn't depend on can't tell "correctly not applicable" apart from "a
  // real dependency silently failed to install" (both look like a missing
  // node_modules entry).
  const pkgJson = JSON.parse(readFileSync(path.join(fixtureDir, "package.json"), "utf8"));
  const declared = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
  const names = ["@iam3xtr/ui", "@iam3xtr/vue"].filter((name) => name in declared);
  for (const name of names) {
    const installed = path.join(fixtureDir, "node_modules", ...name.split("/"));
    const st = spawnSync(process.execPath, ["-e", `console.log(require('fs').lstatSync(${JSON.stringify(installed)}).isSymbolicLink())`], {
      encoding: "utf8",
    });
    if (st.status !== 0) {
      throw new Error(
        `${name} is a declared dependency of this fixture but ${installed} could not be inspected — npm install may have failed to install it:\n${st.stdout}${st.stderr}`
      );
    }
    if (st.stdout.trim() === "true") {
      throw new Error(`${installed} was installed as a symlink — tarball install must extract real files`);
    }
  }
}

function assertInstalledVersion(fixtureDir, pkgName, expected) {
  const installed = JSON.parse(readFileSync(path.join(fixtureDir, "node_modules", ...pkgName.split("/"), "package.json"), "utf8")).version;
  if (installed !== expected) {
    throw new Error(`expected ${pkgName} ${expected} to be installed, found ${installed}`);
  }
}

// Every physical copy of a package in the installed tree (top level and nested
// node_modules). A second copy of a runtime package is a second runtime instance.
function findInstalledCopies(fixtureDir, pkgName) {
  const copies = [];
  const walk = (nodeModulesDir) => {
    let entries;
    try {
      entries = readdirSync(nodeModulesDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const rels = entry.name.startsWith("@")
        ? readdirSync(path.join(nodeModulesDir, entry.name)).map((n) => `${entry.name}/${n}`)
        : [entry.name];
      for (const rel of rels) {
        const dir = path.join(nodeModulesDir, ...rel.split("/"));
        if (rel === pkgName) {
          try {
            copies.push({ dir, version: JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8")).version });
          } catch {
            // not a package directory
          }
        }
        walk(path.join(dir, "node_modules"));
      }
    }
  };
  walk(path.join(fixtureDir, "node_modules"));
  return copies;
}

const RUNTIME_PACKAGES = ["vue", "vue-router", "buefy", "@iam3xtr/ui", "@iam3xtr/vue"];

// Exactly one installed copy of every declared runtime package, in addition to
// (not instead of) the bundle banner heuristic in verifySpa.
function assertSingleRuntime(fixtureDir) {
  const pkgJson = JSON.parse(readFileSync(path.join(fixtureDir, "package.json"), "utf8"));
  const declared = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
  for (const name of RUNTIME_PACKAGES.filter((n) => n in declared)) {
    const copies = findInstalledCopies(fixtureDir, name);
    if (copies.length !== 1) {
      throw new Error(`expected exactly one installed ${name}, found ${copies.length}: ${copies.map((c) => c.version).join(", ") || "none"}`);
    }
  }
}

function assertNotInstalled(fixtureDir, names) {
  for (const name of names) {
    const copies = findInstalledCopies(fixtureDir, name);
    if (copies.length > 0) throw new Error(`${name} must not be installed for this scenario, found ${copies[0].version}`);
  }
}

// Synthetic mixed-version artifact: the real tarball re-packed with only the
// manifest `version` changed, in an isolated directory. This exercises npm
// dependency resolution for a version pair; it is NOT evidence that such a
// version exists in the registry or that historical package code behaves so.
function makeSyntheticTarball(srcTarball, version, label) {
  const dir = path.join(workRoot, "synthetic", label);
  mkdirSync(dir, { recursive: true });
  // Relative paths + cwd: a drive-letter path would be read as a remote host by GNU tar.
  const extract = run("tar", ["-xzf", path.relative(dir, srcTarball)], dir);
  if (extract.status !== 0) throw new Error(`cannot extract ${path.basename(srcTarball)}:\n${extract.stdout}${extract.stderr}`);
  const manifestPath = path.join(dir, "package", "package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.version = version;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  const out = path.join(workRoot, "synthetic-out", label);
  mkdirSync(out, { recursive: true });
  const pack = run("npm", ["pack", "--ignore-scripts", "--pack-destination", out, "--json"], path.join(dir, "package"));
  if (pack.status !== 0) throw new Error(`synthetic pack failed:\n${pack.stdout}${pack.stderr}`);
  const [info] = JSON.parse(pack.stdout);
  return path.join(out, info.filename);
}

function runFixture(name, verify, { buefy, router, dev, ui, vue, tag, expectUi = uiManifest.version, expectVue = vueManifest.version, absent } = {}) {
  const label = tag ?? (router ? `${name}-router-${router}` : buefy ? `${name}-buefy-${buefy}` : name);
  const axes = [];
  if (router) axes.push(`vue-router ${router}`);
  if (buefy) axes.push(`buefy ${buefy}`);
  if (tag) axes.push(`ui ${expectUi}`, `vue ${expectVue}`);
  const title = `consumer: ${name}${axes.length ? ` (${axes.join(", ")})` : ""}`;
  const dir = prepareFixture(name, { buefy, router, dev, label, ui, vue });
  const install = run("npm", ["install", "--no-audit", "--no-fund"], dir);
  if (install.status !== 0) {
    record(title, false, "npm install failed:\n" + install.stdout + install.stderr);
    return;
  }
  try {
    assertNoSymlinkOrLocalSource(dir);
    if (buefy) assertInstalledBuefy(dir, buefy);
    if (router) assertInstalledVersion(dir, "vue-router", router);
    const declared = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8")).dependencies;
    if ("@iam3xtr/ui" in declared) assertInstalledVersion(dir, "@iam3xtr/ui", expectUi);
    if ("@iam3xtr/vue" in declared) assertInstalledVersion(dir, "@iam3xtr/vue", expectVue);
    assertSingleRuntime(dir);
    if (absent) assertNotInstalled(dir, absent);
  } catch (err) {
    record(title, false, err.message);
    return;
  }
  try {
    verify(dir);
    record(title, true);
  } catch (err) {
    record(title, false, err.message);
  }
}

function verifySpa(dir) {
  const build = run("npm", ["run", "build"], dir);
  if (build.status !== 0) throw new Error("vite build failed:\n" + build.stdout + build.stderr);
  // No duplicate Vue runtime bundled twice under different chunk names.
  const distDir = path.join(dir, "dist", "assets");
  const bundled = readdirSync(distDir)
    .filter((f) => f.endsWith(".js"))
    .map((f) => readFileSync(path.join(distDir, f), "utf8"))
    .join("\n");
  const vueRuntimeHits = (bundled.match(/Vue\.js v3\.\d/g) || []).length;
  if (vueRuntimeHits > 1) {
    throw new Error(`expected at most one bundled Vue runtime banner, found ${vueRuntimeHits}`);
  }
  const test = run("npm", ["test"], dir);
  if (test.status !== 0) throw new Error("vitest smoke test failed:\n" + test.stdout + test.stderr);
}

// Chat-target SPA: one Vue/Buefy app built for standalone and iframe use, with
// no Router and no Nuxt. Static output only; browser geometry/focus/first-paint
// checks are NOT performed here (jsdom cannot prove them).
function verifyChatSpa(dir) {
  const build = run("npm", ["run", "build"], dir);
  if (build.status !== 0) throw new Error("vite build failed:\n" + build.stdout + build.stderr);
  for (const page of ["index.html", "host.html"]) {
    if (!readdirSync(path.join(dir, "dist")).includes(page)) throw new Error(`build did not emit ${page}`);
  }
  const host = readFileSync(path.join(dir, "dist", "host.html"), "utf8");
  if (!/<iframe\b/.test(host)) throw new Error("host.html lost its iframe element");
  const distDir = path.join(dir, "dist", "assets");
  const assets = readdirSync(distDir);
  const bundled = assets
    .filter((f) => f.endsWith(".js"))
    .map((f) => readFileSync(path.join(distDir, f), "utf8"))
    .join("\n");
  const vueRuntimeHits = (bundled.match(/Vue\.js v3\.\d/g) || []).length;
  if (vueRuntimeHits > 1) throw new Error(`expected at most one bundled Vue runtime banner, found ${vueRuntimeHits}`);
  const css = assets
    .filter((f) => f.endsWith(".css"))
    .map((f) => readFileSync(path.join(distDir, f), "utf8"))
    .join("\n");
  if (!/data-theme/.test(css)) throw new Error("bundled CSS does not carry the @iam3xtr/ui theme selectors");
  if (!/materialdesignicons/i.test(css)) throw new Error("bundled CSS does not carry the MDI font stylesheet");
  const test = run("npm", ["test"], dir);
  if (test.status !== 0) throw new Error("vitest smoke test failed:\n" + test.stdout + test.stderr);
}

function verifyCheckScript(dir) {
  const check = run("npm", ["run", "check"], dir);
  if (check.status !== 0) throw new Error("check script failed:\n" + check.stdout + check.stderr);
}

for (const buefy of BUEFY_VERSIONS) {
  runFixture("spa", verifySpa, { buefy });
}
for (const scenario of ROUTER_SCENARIOS) {
  runFixture("spa", verifySpa, scenario);
}
// Chat-target standalone/iframe SPA: core exports only, so Router is not installed.
for (const buefy of BUEFY_VERSIONS) {
  runFixture("chat-spa", verifyChatSpa, { buefy, absent: ["vue-router"] });
}
// Tokens/icons carry no transitive Vue/Bulma/Buefy/Router runtime requirement.
runFixture("tokens-only", verifyCheckScript, { absent: ["vue", "buefy", "bulma", "vue-router"] });
// Core + generic library SSR/hydration needs no Router (optional peer).
runFixture("ssr-hydration", verifyCheckScript, { absent: ["vue-router"] });

// Negative scenarios: npm install must fail with a genuine ERESOLVE peer
// conflict (not an auth/network failure) and must not succeed via fallbacks.
function expectPeerConflict(title, install, peerPattern) {
  const combined = install.stdout + install.stderr;
  if (install.status === 0) {
    record(title, false, "npm install unexpectedly succeeded with an incompatible pair");
  } else if (/E401|E403|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNREFUSED|ECONNRESET/.test(combined)) {
    record(title, false, "install failed for an auth/network reason, not a peer conflict:\n" + combined);
  } else if (!/ERESOLVE/.test(combined) || (peerPattern && !peerPattern.test(combined))) {
    record(title, false, "install failed but not with the expected ERESOLVE peer conflict:\n" + combined);
  } else {
    record(title, true, "npm install correctly refused the incompatible pair (ERESOLVE)");
  }
}

// Peer-mismatch is a *negative* fixture: npm install must fail with
// ERESOLVE, and it must not leave a broken @iam3xtr/vue install behind.
{
  const dir = prepareFixture("peer-mismatch");
  const install = run("npm", ["install", "--no-audit", "--no-fund"], dir);
  expectPeerConflict("consumer: peer-mismatch (negative)", install);
}

// Mixed UI/Vue versions. Real tarballs are one pair, so the other versions are
// synthetic re-packs (dependency-resolution tests only, see makeSyntheticTarball).
// The version arithmetic below assumes a 0.x caret peer; fail loudly if the
// real peer interval changes shape so the expectations get revisited.
{
  const uiPeer = vueManifest.peerDependencies?.["@iam3xtr/ui"];
  const [major, minor, patch] = uiManifest.version.split(".").map(Number);
  const peerMatch = /^\^0\.(\d+)\.(\d+)$/.exec(uiPeer ?? "");
  if (!peerMatch || major !== 0 || Number(peerMatch[1]) !== minor) {
    record("mixed-version matrix: UI peer shape", false, `unsupported @iam3xtr/ui peer ${uiPeer} for ui ${uiManifest.version}; update the mixed-version scenarios`);
  } else {
    const newer = `0.${minor}.${patch + 1}`;
    const outsideAbove = `0.${minor + 1}.0`;
    const floorPatch = Number(peerMatch[2]);
    const belowFloor = floorPatch > 0 ? `0.${minor}.${floorPatch - 1}` : null;

    // UI newer than Vue, inside the peer interval (synthetic).
    const uiNewer = makeSyntheticTarball(uiTarball, newer, "ui-newer");
    runFixture("spa", verifySpa, { buefy: "3.1.0", ui: uiNewer, tag: "spa-mixed-ui-newer", expectUi: newer });
    // Vue newer than UI: allowed because the peer is a minimum interval, not an equality (synthetic).
    const vueNewer = makeSyntheticTarball(vueTarball, newer, "vue-newer");
    runFixture("spa", verifySpa, { buefy: "3.1.0", vue: vueNewer, tag: "spa-mixed-vue-newer", expectVue: newer });

    // UI outside the Vue peer interval must be refused with a peer conflict.
    const outside = [["above", outsideAbove, "ui-above"]];
    if (belowFloor) outside.push(["below", belowFloor, "ui-below"]);
    for (const [kind, version, label] of outside) {
      const uiOutside = makeSyntheticTarball(uiTarball, version, label);
      const dir = prepareFixture("ui-peer-mismatch", { label: `ui-peer-mismatch-${kind}`, ui: uiOutside });
      const install = run("npm", ["install", "--no-audit", "--no-fund"], dir);
      expectPeerConflict(`consumer: ui-peer-mismatch (negative, synthetic ui ${version} ${kind} peer ${uiPeer})`, install, /peer @iam3xtr\/ui/);
    }
  }
}

// Every advertised peer floor (vue, buefy, vue-router) must be exercised by a
// matrix scenario or be listed here as a named known gap with a rationale.
// Keys are "<peer>@<floor>", so widening a peer range yields an uncovered floor
// that fails the ledger until a scenario or a new known-gap entry is added.
// A known gap that is now covered or no longer advertised also fails (stale).
const KNOWN_PEER_FLOOR_GAPS = {
  "vue@3.5.0": "fixtures resolve vue to the latest ^3.5.x; the 3.5.0 minimum is not pinned or installed in any scenario",
  "buefy@3.0.0": "spa/chat-spa scenarios start at buefy 3.0.8; 3.0.0 through 3.0.7 are advertised but not exercised",
};
{
  const peers = vueManifest.peerDependencies ?? {};
  const floors = (range) => [...range.matchAll(/\^(\d+\.\d+\.\d+)/g)].map((m) => m[1]);
  const exercised = {
    // No scenario pins the vue version today.
    vue: new Set(),
    buefy: new Set(BUEFY_VERSIONS),
    "vue-router": new Set(ROUTER_SCENARIOS.map((s) => s.router)),
  };
  const advertised = new Set();
  const uncovered = [];
  const knownGaps = [];
  for (const peer of ["vue", "buefy", "vue-router"]) {
    for (const floor of floors(peers[peer] ?? "")) {
      const key = `${peer}@${floor}`;
      advertised.add(key);
      if (exercised[peer].has(floor)) continue;
      if (KNOWN_PEER_FLOOR_GAPS[key]) knownGaps.push(`${key} (${KNOWN_PEER_FLOOR_GAPS[key]})`);
      else uncovered.push(key);
    }
  }
  const stale = Object.keys(KNOWN_PEER_FLOOR_GAPS).filter((key) => {
    const [peer, floor] = [key.slice(0, key.lastIndexOf("@")), key.slice(key.lastIndexOf("@") + 1)];
    return !advertised.has(key) || exercised[peer]?.has(floor);
  });
  record(
    "ledger: advertised peer floors exercised or named known gaps",
    uncovered.length === 0 && stale.length === 0,
    (uncovered.length ? `not covered and not a known gap: ${uncovered.join(", ")}; ` : "") +
      (stale.length ? `stale known-gap entries: ${stale.join(", ")}; ` : "") +
      (knownGaps.length ? `known gaps: ${knownGaps.join("; ")}` : "all floors exercised"),
  );
}

// ---------------------------------------------------------------------
// 3. Missing package / missing version / no access — proven against real
//    registries without needing GitHub Packages credentials in this
//    environment (see README.md "Scope notes"): the public npm registry
//    404s a nonexistent version, and GitHub Packages refuses an
//    unauthenticated request (401 for an existing private package, 404 for
//    a nonexistent one) — either way a clean failure that yields no package
//    data, not a partial or corrupting one, which is the property under test.
// ---------------------------------------------------------------------
function checkNpmViewFails(name, args, expectCodes, env) {
  const res = run("npm", ["view", ...args], workRoot, env);
  if (res.status === 0) {
    record(name, false, "expected npm view to fail, it succeeded");
    return;
  }
  const combined = res.stdout + res.stderr;
  const matched = expectCodes.find((code) => combined.includes(code));
  if (!matched) {
    record(name, false, `expected one of ${expectCodes.join("/")} in output, got:\n${combined}`);
    return;
  }
  record(name, true, `${matched} as expected`);
}

// The private-registry check must not depend on whether the developer's own
// user/global .npmrc carries a GitHub Packages token: with one, the package
// is readable and this negative check would falsely fail. Point npm at an
// empty config so the request is always unauthenticated. npm refuses to load
// one file as both user and global config, hence two separate files.
const emptyUserNpmrc = path.join(workRoot, "empty-user.npmrc");
const emptyGlobalNpmrc = path.join(workRoot, "empty-global.npmrc");
writeFileSync(emptyUserNpmrc, "");
writeFileSync(emptyGlobalNpmrc, "");
const unauthenticatedNpm = { npm_config_userconfig: emptyUserNpmrc, npm_config_globalconfig: emptyGlobalNpmrc };

checkNpmViewFails("missing version (existing public package)", ["vue@0.0.0-does-not-exist"], ["404"]);
checkNpmViewFails(
  "missing/inaccessible private package",
  ["@iam3xtr/ui", "--registry", "https://npm.pkg.github.com", "--prefer-online"],
  ["E401", "404"],
  unauthenticatedNpm,
);

// ---------------------------------------------------------------------
rmSync(workRoot, { recursive: true, force: true });

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} scenarios passed.`);
if (failed.length > 0) {
  process.exitCode = 1;
}
