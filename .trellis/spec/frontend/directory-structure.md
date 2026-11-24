# Directory Structure

## Site Layout

There is no root `src/` directory. Authored content and frontend code live under `docs/`:

```text
docs/
|-- .vuepress/
|   |-- cdn/
|   |-- client.ts
|   |-- config.ts
|   |-- navbar.ts
|   |-- plume.config.ts
|   |-- sidebar.ts
|   |-- public/
|   `-- theme/
|       |-- components/
|       |-- shim.d.ts
|       `-- styles/custom.css
|-- standard/
|-- tos/
|-- tutorial/
|-- version/
|-- wiki/
`-- *.md
```

- Put authored pages in `docs/`. Existing content groups define their scope: releases in `docs/version/`, user guides in `docs/wiki/`, technical articles in `docs/tutorial/`, the UInk specification in `docs/standard/`, and terms in `docs/tos/`.
- Put VuePress and Plume configuration in `docs/.vuepress/`. Navigation and sidebar data are already separated into `navbar.ts` and `sidebar.ts`.
- Put custom Vue components in `docs/.vuepress/theme/components/`. Examples include `DownloadCard.vue`, `AsideNav.vue`, and `SiteVisitTracker.vue`.
- Put site-wide theme overrides in `docs/.vuepress/theme/styles/custom.css`. Page-specific CSS may stay in its Markdown page, as in `docs/community.md`.
- Put root-served static files in `docs/.vuepress/public/`. Content-specific subdirectories mirror page areas, such as `public/wiki/start/` and `public/tutorial/pptx-video-processing/`; reference them with root-relative URLs such as `/Inkeys.svg`.

## Component Scope

Markdown-facing components are globally registered in `docs/.vuepress/client.ts`. Theme internals are imported by their owner: `Layout.vue` locally imports `AsideNav.vue` and `SiteVisitTracker.vue`. Keep this distinction when adding components instead of registering layout-only helpers globally.

The only shared composable is `docs/.vuepress/cdn/useAssetUrl.ts` (see below). No general hooks, utility, or shared type directory exists. Add one only when a task establishes a concrete shared use case and location.

## Naming

- Vue component files and registration names use PascalCase: `GitHubCard.vue`, `SiteVisitCounter.vue`, and `VideoPlayerAmbilight.vue`.
- A public Markdown name may intentionally differ from the file name; `Swiper.vue` is registered as `SwiperSelf` in `client.ts`.
- CSS classes use descriptive kebab-case, such as `download-info-wrapper`, `site-visit-counter`, and `swiper-slide-img`.
- Follow the existing content area's page naming. Dated changelogs belong under `docs/version/changelog/`.

## Generated Output and Public Assets

Do not author or commit `docs/.vuepress/.cache/`, `docs/.vuepress/.temp/`, or `docs/.vuepress/dist/`. They are generated, ignored outputs; `dist/` is recreated by `pnpm docs:build`.

Files in `docs/.vuepress/public/` are release inputs, not generated output. Whenever a task adds or changes one, the final response must remind the user to upload the file or update its corresponding 123pan direct link.

## Remote Asset Bases (`docs/.vuepress/cdn/`)

Production builds serve public files from remote mirrors and fall back to the site's own copy:

- `cdn/bases.ts` holds `ASSET_BASES`, the ordered mirror prefixes (123pan `.com` first, `.cn` second). Each prefix is followed directly by the public-relative path, so a new mirror (e.g. S3) is one more line with the same directory layout. The local site is always the implicit last level. `PROBE_PATH` (`/Inkeys.svg`) must exist on every mirror.
- `config.ts` enables Plume `replaceAssets` only when `NODE_ENV === 'production'`, with a custom rule that rewrites quoted root-relative paths to `ASSET_BASES[0]` **only if the file exists in `public/`**. `PROBE_PATH` is excluded because the `head` config (favicon, the runtime script) is bundled into JS and would be rewritten too. Dev builds never contain remote URLs.
- `cdn/runtime.ts` builds the inline head script (`window.__INKEYS_ASSETS__`). A failed `<img>` moves to the next mirror, then local, and triggers a HEAD probe of the failed mirror; a mirror is marked down for the session only when its probe fails or times out (5 s). Marking down rewrites `src`/`href`/`poster`/`srcset`/`style` values in the DOM and starts a MutationObserver for later SPA content. The script text must stay identical between HTML and JS (VuePress takes over head tags by exact text) and guards against re-running.
- Paths built at runtime (template literals) and CSS backgrounds are not rewritten at build time and never report load errors. Components must get them from `useAssetUrl()` and pass backgrounds as inline CSS variables, as `SectionAbilities.vue` and `SectionCraft.vue` do; do not put `url('/...')` for public files in `<style>` blocks.
- A file not yet uploaded to a mirror (403) falls back per image without marking the mirror down, but CSS backgrounds cannot fall back per file, so upload public changes before deploying.
- Browser verification: `.trellis/tasks/11-24-cdn-asset-fallback/verify-cdn-fallback.cjs` (or its archived copy) blocks mirrors with Playwright and checks which host each image, background and download link uses.
