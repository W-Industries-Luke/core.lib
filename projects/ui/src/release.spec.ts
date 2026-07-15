import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The release contract.
 *
 * Publishing can only be verified by an actual release, so the pieces that have
 * to agree for `npm publish` to land — the package name, the scope the workflow
 * authenticates, and the registry — are asserted here instead. Each of these is
 * a rename away from a 403 or a package published under the wrong name, and none
 * of them are exercised by the build.
 */
describe('release contract', () => {
  const root = process.cwd();
  const read = (...segments: string[]) => readFileSync(join(root, ...segments), 'utf8');

  const pkg = JSON.parse(read('projects', 'ui', 'package.json'));
  const workflow = read('.github', 'pending-workflows', 'release.yml');
  const tsconfig = read('tsconfig.json');

  const NAME = '@w-industries/ui';
  const SCOPE = NAME.split('/')[0];
  const REGISTRY = 'https://npm.pkg.github.com';

  it('publishes under the scoped name the apps import', () => {
    expect(pkg.name).toBe(NAME);
  });

  it('targets GitHub Packages', () => {
    // Without this, `npm publish` from dist/ui would default to npmjs.com and
    // either fail or publish an internal library publicly.
    expect(pkg.publishConfig?.registry).toBe(REGISTRY);
  });

  it('carries a semver version for the tag to overwrite', () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('authenticates the same scope it publishes, against the same registry', () => {
    // setup-node writes the .npmrc from these two values; a scope mismatch means
    // the publish goes out unauthenticated.
    expect(workflow).toContain(`scope: "${SCOPE}"`);
    expect(workflow).toContain(`registry-url: "${REGISTRY}"`);
  });

  it('takes its token from the environment, never the repo', () => {
    expect(workflow).toContain('NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}');
    expect(workflow).not.toMatch(/_authToken\s*=\s*\S/);
  });

  it('resolves the library to dist/ui under its published name', () => {
    // Local builds import the library by the name consumers use, so a rename
    // that misses tsconfig fails loudly here rather than in an app.
    const json = JSON.parse(tsconfig.replace(/\/\*[\s\S]*?\*\//g, '')); // tsconfig allows comments, JSON.parse does not
    expect(json.compilerOptions.paths).toEqual({ [NAME]: ['./dist/ui'] });
  });

  it('keeps Material and CDK peers on the fleet-wide v21', () => {
    expect(pkg.peerDependencies['@angular/material']).toBe('^21.2.0');
    expect(pkg.peerDependencies['@angular/cdk']).toBe('^21.2.0');
  });
});
