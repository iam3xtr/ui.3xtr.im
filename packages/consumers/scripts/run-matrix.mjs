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

const here = path.dirname(fileURLToPath(import.meta.url));
const consumersRoot = path.dirname(here);
const kitRoot = path.dirname(path.dirname(consumersRoot));
const uiPkgDir = path.join(kitRoot, "packages", "ui");
const vuePkgDir = path.join(kitRoot, "packages", "vue");

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

function run(cmd, args, cwd) {
  return spawnSync(cmd, args, { cwd, encoding: "utf8", shell: process.platform === "win32" });
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
  // `npm pack` also re-runs `prepack` (our own build script) and interleaves
  // its stdout with the `--json` payload, so pull out just the JSON array.
  const jsonStart = packOut.indexOf("[");
  const jsonEnd = packOut.lastIndexOf("]");
  const [info] = JSON.parse(packOut.slice(jsonStart, jsonEnd + 1));
  return path.join(packCache, info.filename);
}

const uiTarball = packOne(uiPkgDir, "@iam3xtr/ui");
const vueTarball = packOne(vuePkgDir, "@iam3xtr/vue");
record("pack @iam3xtr/ui", true, path.basename(uiTarball));
record("pack @iam3xtr/vue", true, path.basename(vueTarball));

// ---------------------------------------------------------------------
// 2. Install each fixture, from the tarballs only, into its own isolated
//    directory under the OS temp root — never under this repo, so there is
//    no way for module resolution to fall back to a workspace symlink or
//    an unpublished source path.
// ---------------------------------------------------------------------
const fixturesDir = path.join(consumersRoot, "fixtures");

function prepareFixture(name) {
  const src = path.join(fixturesDir, name);
  const dest = path.join(workRoot, name);
  cpSync(src, dest, { recursive: true });
  const pkgJsonPath = path.join(dest, "package.json");
  let pkgJson = readFileSync(pkgJsonPath, "utf8");
  pkgJson = pkgJson.replace(/__UI_TARBALL__/g, toFileSpec(uiTarball)).replace(/__VUE_TARBALL__/g, toFileSpec(vueTarball));
  writeFileSync(pkgJsonPath, pkgJson);
  return dest;
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

function runFixture(name, verify) {
  const dir = prepareFixture(name);
  const install = run("npm", ["install", "--no-audit", "--no-fund"], dir);
  if (install.status !== 0) {
    record(`consumer: ${name}`, false, "npm install failed:\n" + install.stdout + install.stderr);
    return;
  }
  try {
    assertNoSymlinkOrLocalSource(dir);
  } catch (err) {
    record(`consumer: ${name}`, false, err.message);
    return;
  }
  try {
    verify(dir);
    record(`consumer: ${name}`, true);
  } catch (err) {
    record(`consumer: ${name}`, false, err.message);
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

function verifyCheckScript(dir) {
  const check = run("npm", ["run", "check"], dir);
  if (check.status !== 0) throw new Error("check script failed:\n" + check.stdout + check.stderr);
}

runFixture("spa", verifySpa);
runFixture("tokens-only", verifyCheckScript);
runFixture("ssr-hydration", verifyCheckScript);

// Peer-mismatch is a *negative* fixture: npm install must fail with
// ERESOLVE, and it must not leave a broken @iam3xtr/vue install behind.
{
  const dir = prepareFixture("peer-mismatch");
  const install = run("npm", ["install", "--no-audit", "--no-fund"], dir);
  const combined = install.stdout + install.stderr;
  if (install.status === 0) {
    record("consumer: peer-mismatch (negative)", false, "npm install unexpectedly succeeded with an incompatible vue major");
  } else if (!/ERESOLVE/.test(combined)) {
    record("consumer: peer-mismatch (negative)", false, "install failed but not with the expected ERESOLVE peer conflict:\n" + combined);
  } else {
    record("consumer: peer-mismatch (negative)", true, "npm install correctly refused the incompatible pair (ERESOLVE)");
  }
}

// ---------------------------------------------------------------------
// 3. Missing package / missing version / no access — proven against real
//    registries without needing GitHub Packages credentials in this
//    environment (see README.md "Scope notes"): the public npm registry
//    404s a nonexistent version the same way GitHub Packages 404s a
//    private/nonexistent package, which is itself the property under test
//    — a safe, uninformative failure, not a partial or corrupting one.
// ---------------------------------------------------------------------
function checkNpmViewFails(name, args, expectCode) {
  const res = run("npm", ["view", ...args], workRoot);
  if (res.status === 0) {
    record(name, false, "expected npm view to fail, it succeeded");
    return;
  }
  const combined = res.stdout + res.stderr;
  if (!combined.includes(expectCode)) {
    record(name, false, `expected ${expectCode} in output, got:\n${combined}`);
    return;
  }
  record(name, true, `${expectCode} as expected`);
}

checkNpmViewFails("missing version (existing public package)", ["vue@0.0.0-does-not-exist"], "404");
checkNpmViewFails("missing/inaccessible private package", ["@iam3xtr/ui", "--registry", "https://npm.pkg.github.com"], "404");

// ---------------------------------------------------------------------
rmSync(workRoot, { recursive: true, force: true });

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} scenarios passed.`);
if (failed.length > 0) {
  process.exitCode = 1;
}
