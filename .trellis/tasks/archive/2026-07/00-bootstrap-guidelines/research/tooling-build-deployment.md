# Research: Tooling, Build, and Deployment

- **Query**: Inspect package metadata, lockfiles, package manager, scripts, configs, build/check/test/deploy commands, and deployment configuration.
- **Scope**: internal
- **Date**: 2026-07-29

## Findings

### Files Found

| File Path | Description |
|---|---|
| `package.json` | Project identity, runtime requirements, scripts, and dependencies. |
| `pnpm-lock.yaml` | Current pnpm lockfile using lockfile format 9.0. |
| `pnpm-workspace.yaml` | pnpm 11 project-level install and peer-dependency settings. |
| `package-lock.json` | npm lockfile containing an older, different root manifest snapshot. |
| `README.md` | Installation and local command documentation. |
| `.gitignore` | Excludes dependencies and VuePress generated directories. |
| `.gitattributes` | Repository line-ending and binary-file attributes. |

### Technology and Package Management

The package is an ESM project (`"type": "module"`) named `inkeys.top` (`package.json:2-4`). The manifest explicitly selects pnpm 11.11.0 and Node.js 22.13.0 or newer (`package.json:6-10`):

```json
"packageManager": "pnpm@11.11.0+sha512...",
"engines": {
  "node": ">=22.13.0"
}
```

The README also documents pnpm as the install and command runner (`README.md:5-21`). `pnpm-lock.yaml:1-59` agrees with the current dependency declarations and resolves Vue 3.5.39, TypeScript 5.9.3, VuePress 2.0.0-rc.30, and Plume 1.0.0-rc.204.

`pnpm-workspace.yaml:1-13` holds pnpm 11 settings even though no `packages:` workspace list is defined:

```yaml
shamefullyHoist: true
shellEmulator: true
peerDependencyRules:
  allowedVersions:
    '@vuepress/plugin-markdown-math@2.0.0-rc.131>katex': ^0.17.0
allowBuilds:
  esbuild: true
  vue-demi: true
```

The repository also contains `package-lock.json`. Its root package is `stickyhomeworks-docs`, uses older VuePress/Plume versions, and declares a different Node range (`package-lock.json:1-21`). This file does not represent the current `package.json` manifest. No current documentation names npm as the package manager.

After this source inspection, the developer confirmed pnpm as the only package manager and chose `pnpm-lock.yaml` as the only dependency lockfile. The stale `package-lock.json` is therefore deleted by the bootstrap task.

### Scripts and Commands

The complete current script set is at `package.json:12-19`:

| Purpose | Command | Underlying action |
|---|---|---|
| Start development | `pnpm start` | `vuepress dev docs` |
| Develop documentation | `pnpm docs:dev` | `vuepress dev docs` |
| Develop with clean state | `pnpm docs:dev-clean` | `vuepress dev docs --clean-cache --clean-temp` |
| Production build | `pnpm docs:build` | `vuepress build docs --clean-cache --clean-temp` |
| Preview generated output | `pnpm docs:preview` | `http-server docs/.vuepress/dist` |
| Update VuePress ecosystem | `pnpm vp-update` | `pnpm dlx vp-update` |

`README.md:11-21` documents `docs:dev`, `docs:build`, `docs:preview`, and `vp-update`. It does not mention `start` or `docs:dev-clean`.

No lint, format, type-check, check, unit-test, integration-test, end-to-end-test, or deploy script is declared. No test files or test configuration were found by repository-wide filename search.

### Build Inputs and Outputs

VuePress uses `docs/` as its source root (`package.json:13-17`). The production output directory is `docs/.vuepress/dist`, inferred directly from the preview script and observed as an existing generated directory. `.gitignore:3-5` excludes `.cache`, `.temp`, and `dist`:

```gitignore
docs/.vuepress/.cache
docs/.vuepress/.temp
docs/.vuepress/dist
```

The generated `dist/` directory currently exists in the working tree but is ignored. It includes rendered HTML, copied Markdown, and public assets. It is not authored source.

### Deployment Evidence

No `netlify.toml`, `vercel.json`, GitHub Actions workflow, Docker configuration, Wrangler configuration, or other repository-level deployment configuration was found. No deploy script exists in `package.json`.

The site configuration declares the production hostname as `https://www.inkeys.top` for SEO/sitemap generation (`docs/.vuepress/config.ts:88-95`). This establishes the public site URL but not the deployment provider or release process.

The developer subsequently confirmed that Netlify publishing is configured outside this repository. The repository-local boundary is a successful `pnpm docs:build`; no local deploy command or provider configuration should be inferred.

### Formatting and Repository Attributes

No `.editorconfig`, Prettier configuration, ESLint configuration, Stylelint configuration, Markdownlint configuration, or TypeScript `tsconfig` was found.

`.gitattributes:1-11` establishes LF for text by default, CRLF for `.txt`, and marks common fonts/images as binary. `.gitignore:1-8` ignores `node_modules`, VuePress build state, `.DS_Store`, and logs.

### External References

- [VuePress documentation](https://vuepress.vuejs.org/) — linked by `README.md:26`; repository build framework.
- [VuePress Theme Plume documentation](https://theme-plume.vuejs.press/) — linked by `README.md:27`; repository theme framework.

### Related Specs

- `.trellis/spec/frontend/quality-guidelines.md` — candidate location for observed build verification and the absence of lint/test commands.
- `.trellis/spec/frontend/type-safety.md` — candidate location for the observed TypeScript setup and absence of a project `tsconfig`.
- `.trellis/spec/frontend/directory-structure.md` — candidate location for build inputs, generated directories, and public assets.

## Caveats / Not Found

- Netlify and lockfile policy are explicit developer decisions recorded after repository inspection; they are not derivable from repository-local deployment configuration.
- No enforced formatter, linter, type-check command, test runner, coverage rule, or CI quality gate was found.
- No Node version file such as `.nvmrc` or `.node-version` was found; the only version contract is `package.json:9-10`.
