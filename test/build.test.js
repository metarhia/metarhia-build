'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const fixturesDir = path.join(__dirname, 'fixtures');
const buildPath = path.join(__dirname, '..', 'metarhia-build.js');
const packageJson = JSON.parse(
  fs.readFileSync(path.join(fixturesDir, 'package.json'), 'utf8'),
);
const packageName = packageJson.name.split('/').pop();
const outputFile = path.join(fixturesDir, `${packageName}.mjs`);

after(() => {
  if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
});

const run = (cwd, args = ['lib']) =>
  new Promise((resolve, reject) => {
    const proc = spawn('node', [buildPath, ...args], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}\n${stderr}`));
      } else {
        resolve({ stdout, stderr, code });
      }
    });
  });

test('build: creates bundle with correct structure', async () => {
  if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
  await run(fixturesDir);
  assert.ok(fs.existsSync(outputFile), 'Output file should be created');

  const output = fs.readFileSync(outputFile, 'utf8');
  const licensePath = path.join(fixturesDir, 'LICENSE');
  const licenseText = fs.readFileSync(licensePath, 'utf8');
  const licenseLines = licenseText.split('\n');

  // Check header
  assert.ok(output.includes(licenseLines[2])); // copyright line
  assert.ok(output.includes(`Version ${packageJson.version}`));
  assert.ok(output.includes(packageName)); // package name in header
  assert.ok(output.includes(licenseLines[0])); // license name

  // Check required libs
  assert.ok(
    // eslint-disable-next-line max-len
    output.includes(`import { TEST_PCKG_VAR, TEST_PCKG_VAR_1, TEST_PCKG_VAR_2, TEST_PCKG_VAR_3, TEST_PCKG_VAR_4 } from './test-package.js';
`),
  );

  // Check file comments
  assert.ok(output.includes('// test1.js'));
  assert.ok(output.includes('// test2.js'));
  assert.ok(output.includes('// test3.js'));
  assert.ok(output.includes('// test4.js'));

  // Check exports
  assert.ok(output.includes('export { test1 };'));
  assert.ok(output.includes('export { test2 };'));
  assert.ok(output.includes('export { test4 };'));
  assert.ok(output.includes('export {'));

  // Check that require() and node import calls are removed
  assert.ok(!output.includes('require('));
  assert.ok(!output.includes(`import fs from 'fs';`));

  // Check that 'use strict' is removed
  assert.ok(!output.includes(`'use strict'`));

  // Clean up
  fs.unlinkSync(outputFile);
});

test('build: processes files in correct order', async () => {
  if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
  await run(fixturesDir);
  const output = fs.readFileSync(outputFile, 'utf8');

  // Check that files appear in the correct order
  const test1Index = output.indexOf('// test1.js');
  const test2Index = output.indexOf('// test2.js');
  const test3Index = output.indexOf('// test3.js');
  const test4Index = output.indexOf('// test4.js');

  assert.ok(test1Index < test2Index, 'test1.js should come before test2.js');
  assert.ok(test2Index < test3Index, 'test2.js should come before test3.js');
  assert.ok(test3Index < test4Index, 'test3.js should come before test4.js');

  // Clean up
  fs.unlinkSync(outputFile);
});

test('build: converts single identifier module.exports', async () => {
  if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
  await run(fixturesDir);
  const output = fs.readFileSync(outputFile, 'utf8');

  // test2.js has module.exports = test2; (single identifier)
  assert.ok(output.includes('export { test2 };'));

  // Clean up
  fs.unlinkSync(outputFile);
});

test('build: converts single property module.exports', async () => {
  // Clean up any existing output file
  if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
  await run(fixturesDir);
  const output = fs.readFileSync(outputFile, 'utf8');

  // test1.js has module.exports = { test1 };
  assert.ok(output.includes('export { test1 };'));

  // Clean up
  fs.unlinkSync(outputFile);
});

test('build: converts multiple properties module.exports', async () => {
  if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
  await run(fixturesDir);
  const output = fs.readFileSync(outputFile, 'utf8');

  // test3.js has module.exports = { test3a, test3b, test3c };
  assert.ok(output.includes('test3a'));
  assert.ok(output.includes('test3b'));
  assert.ok(output.includes('test3c'));
  assert.ok(output.includes('export {'));

  // Clean up
  fs.unlinkSync(outputFile);
});

test('build: removes require() calls from output', async () => {
  if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
  await run(fixturesDir);
  const output = fs.readFileSync(outputFile, 'utf8');

  // test2.js has require('fs') which should be removed
  assert.ok(!output.includes('require('));
  assert.ok(!output.includes(`const fs = require('fs')`));

  // Clean up
  fs.unlinkSync(outputFile);
});

test('build: removes use strict from output', async () => {
  if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
  await run(fixturesDir);
  const output = fs.readFileSync(outputFile, 'utf8');

  // All test files have 'use strict' which should be removed
  assert.ok(!output.includes(`'use strict'`));

  // Clean up
  fs.unlinkSync(outputFile);
});

test('build: creates output file with package name', async () => {
  if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
  await run(fixturesDir);

  // Verify output file is named after package.json name
  assert.ok(fs.existsSync(outputFile), 'Output file should be created');
  assert.ok(
    outputFile.endsWith(`${packageName}.mjs`),
    `Output file should be named ${packageName}.mjs`,
  );

  // Clean up
  fs.unlinkSync(outputFile);
});

test('build: fails when build.json is missing', async () => {
  const tempDir = path.join(__dirname, 'temp');
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    await assert.rejects(
      () => run(tempDir, ['lib']),
      /ENOENT|Cannot find module/,
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('link: creates .js symlinks for packages with build.json', async () => {
  const appDir = path.join(__dirname, 'link-app');
  const nodeModules = path.join(appDir, 'node_modules');
  const pkgDir = path.join(nodeModules, 'test-package');
  const targetDir = path.join(appDir, 'application', 'static');

  fs.mkdirSync(pkgDir, { recursive: true });
  fs.copyFileSync(
    path.join(fixturesDir, 'build.json'),
    path.join(pkgDir, 'build.json'),
  );
  fs.copyFileSync(
    path.join(fixturesDir, 'package.json'),
    path.join(pkgDir, 'package.json'),
  );
  fs.writeFileSync(
    path.join(pkgDir, `${packageName}.mjs`),
    '// dummy bundle\n',
    'utf8',
  );

  try {
    await run(appDir, ['link', './application/static']);
    const linkPath = path.join(targetDir, `${packageName}.js`);
    assert.ok(fs.existsSync(linkPath), 'Link should be created as .js');
    const stat = fs.lstatSync(linkPath);
    assert.ok(stat.isSymbolicLink(), 'Should be a symlink');
    const resolved = fs.realpathSync(linkPath);
    assert.strictEqual(
      resolved,
      path.resolve(pkgDir, `${packageName}.mjs`),
      'Link should point to .mjs in node_modules',
    );
  } finally {
    fs.rmSync(appDir, { recursive: true, force: true });
  }
});

test('lib: default build runs when given lib argument', async () => {
  if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
  await run(fixturesDir, ['lib']);
  assert.ok(fs.existsSync(outputFile), 'Output file should be created');
  fs.unlinkSync(outputFile);
});
