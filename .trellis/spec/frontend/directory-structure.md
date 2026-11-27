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
|-- tos.md
|-- zh-tw/
|-- en-us/
|-- tutorial/
|-- version/
|-- wiki/
`-- *.md
```

- Put authored pages in `docs/`. Existing content groups define their scope: releases in `docs/version/`, user guides in `docs/wiki/`, technical articles in `docs/tutorial/`, the UInk specification in `docs/standard/`, and terms in `docs/tos.md`. zh-TW and en-US translations live in `docs/zh-tw/` and `docs/en-us/` at the same relative path; untranslated pages are mirrored at build time (see [i18n Guidelines](./i18n-guidelines.md)).
- Put VuePress and Plume configuration in `docs/.vuepress/`. Navigation and sidebar data are already separated into `navbar.ts` and `sidebar.ts`.
  - Sidebar spacing comes from Plume's grouping, not CSS. `getSidebarGroups` merges consecutive plain links into one untitled group, and every item with `items` becomes a group of its own (24px gap between groups). To separate links, wrap the later ones in an untitled `{ items: [...] }` group, as the download sidebars do after “使用条款”. Do not add separator lines or margin CSS for this.
- Put custom Vue components in `docs/.vuepress/theme/components/`. Examples include `DownloadCard.vue`, `AsideNav.vue`, and `SiteVisitTracker.vue`.
- Put site-wide theme overrides in `docs/.vuepress/theme/styles/custom.css`. Page-specific CSS may stay in its Markdown page, as in `docs/community.md`.
- Put root-served static files in `docs/.vuepress/public/`. Content-specific subdirectories mirror page areas, such as `public/dist-tutorial/pptx-video-processing/` and `public/dist-showcase/`; reference them with root-relative URLs such as `/Inkeys.svg`.
  - Every public subdirectory carries the `dist-` prefix (`dist-download/`, `dist-new-index3/`, `dist-pptcom3/`, `dist-showcase/`, `dist-standard/`, `dist-tutorial/`; renamed 2026-11-25). A public folder named like a page (`public/download/` next to `/download`, `public/tutorial/ppt-com/` next to `/tutorial/ppt-com`) makes static servers treat the page URL as the folder. Keep the prefix for new folders, and keep the 123pan mirrors in the same layout.
- Put local VuePress plugins in `docs/.vuepress/plugins/` and register them in the `plugins` array of `config.ts`. `uinkSpecBundle.ts` is the current example.
- Put repository scripts outside `docs/` in `scripts/`. UInk sample generation lives in `scripts/uink-fixtures/`; see [UInk Spec Guidelines](./uink-spec-guidelines.md).

## Component Scope

Markdown-facing components are globally registered in `docs/.vuepress/client.ts`. Theme internals are imported by their owner: `Layout.vue` locally imports `AsideNav.vue` and `SiteVisitTracker.vue`. Keep this distinction when adding components instead of registering layout-only helpers globally.

The only shared composable is `docs/.vuepress/cdn/useAssetUrl.ts` (see below). No general hooks, utility, or shared type directory exists. Add one only when a task establishes a concrete shared use case and location.

## Naming

- Vue component files and registration names use PascalCase: `GitHubCard.vue`, `SiteVisitCounter.vue`, and `VideoPlayerAmbilight.vue`.
- Page file names are all lowercase (kebab-case when several words). Netlify 301-redirects any URL with an uppercase letter to its lowercase form, so `headerExtension.md` produced a canonical and sitemap URL that always redirected (renamed to `headerextension.md` on 2026-11-27).
- Netlify `_headers` and `_redirects` are written into `dist/` by the `inkeys-netlify-rules` plugin in `config.ts`, not placed in `public/` (that would add them to the backup-mirror file list). `_headers` marks every page `.md` copy `X-Robots-Tag: noindex`, except files under `dist-*` (the `/dist-standard/**/spec.md` bundles stay indexable); `.txt` files such as `llms.txt` stay indexable. `_redirects` maps the pre-`dist-` UInk release paths `/standard/uink-v10/*` and `/standard/uink-v11/*` to `/dist-standard/`.
- A public Markdown name may intentionally differ from the file name; `Swiper.vue` is registered as `SwiperSelf` in `client.ts`.
- CSS classes use descriptive kebab-case, such as `download-info-wrapper`, `site-visit-counter`, and `swiper-slide-img`.
- Follow the existing content area's page naming. Dated changelogs belong under `docs/version/changelog/`.

## Generated Output and Public Assets

Do not author or commit `docs/.vuepress/.cache/`, `docs/.vuepress/.temp/`, or `docs/.vuepress/dist/`. They are generated, ignored outputs; `dist/` is recreated by `pnpm docs:build`.

Files in `docs/.vuepress/public/` are release inputs, not generated output. Whenever a task adds or changes one, the final response must remind the user to upload the file or update its corresponding 123pan direct link.

## Remote Asset Bases (`docs/.vuepress/cdn/`)

Production pages load public files from this site first and switch to the 123pan mirrors only on failure or stalls. Order: this site, then `ASSET_BASES` (`.cn`, then `.com`).

- `cdn/bases.ts` holds `ASSET_BASES`, the ordered backup prefixes. Each prefix is followed directly by the public-relative path, so a new mirror (e.g. S3) is one more line with the same directory layout. `PROBE_PATH` (`/Inkeys.svg`) must exist on this site and every mirror.
- `config.ts` sets Plume `replaceAssets: false` (no build-time rewriting; HTML keeps local paths) and passes the list of files under `public/` to `createAssetRuntimeScript`, injected only when `NODE_ENV === 'production'`. Only listed files are ever switched, so page links and external images are untouched.
- `cdn/runtime.ts` (`window.__INKEYS_ASSETS__`):
  - A failed `<img>` moves to the next channel it has not tried.
  - Watchdog: every second it checks unfinished `<img>` elements and component CSS backgrounds within 800px of the viewport. Backgrounds are observed through an `Image` with the same URL. A resource unfinished for 6 s triggers one parallel timed GET of `PROBE_PATH` on every channel, at most once per 15 s. If the stalled channel failed, or a channel takes less than half its time, the first such channel in default order wins (never "fastest"): the whole site switches if the stalled channel is the current one, otherwise only that image moves. If the channel answered within 2 s, only the stalled image moves. If every channel is slow, nothing moves.
  - A site-wide switch is remembered in `sessionStorage`, rewrites `src`/`href`/`poster`/`srcset`/`style` values in the DOM, and starts a MutationObserver for later SPA content.
  - The script text must stay identical between HTML and JS (VuePress takes over head tags by exact text) and guards against re-running.
- Elements without layout (`display: none`) are skipped. Do not test proximity by size: loading images without width/height are 0×0.
- Paths built at runtime (template literals) and CSS backgrounds must come from `useAssetUrl()`, which returns local paths until mount and then follows the runtime. Pass backgrounds as inline CSS variables, as `SectionAbilities.vue` and `SectionCraft.vue` do; do not put `url('/...')` for public files in `<style>` blocks.
- CSS backgrounds have no error event and cannot fall back per file, so keep the mirrors in sync with `public/`.
- Browser verification: `.trellis/tasks/11-24-cdn-asset-fallback/verify-cdn-fallback.cjs` (or its archived copy) simulates a 404, a slow site and a single stalled file with Playwright and checks which host each image, background and download link uses.
