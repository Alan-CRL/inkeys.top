# Directory Structure

## Site Layout

There is no root `src/` directory. Authored content and frontend code live under `docs/`:

```text
docs/
|-- .vuepress/
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

No standalone hooks, composables, utility directory, or shared type directory currently exists. Add one only when a task establishes a concrete shared use case and location.

## Naming

- Vue component files and registration names use PascalCase: `GitHubCard.vue`, `SiteVisitCounter.vue`, and `VideoPlayerAmbilight.vue`.
- A public Markdown name may intentionally differ from the file name; `Swiper.vue` is registered as `SwiperSelf` in `client.ts`.
- CSS classes use descriptive kebab-case, such as `download-info-wrapper`, `site-visit-counter`, and `swiper-slide-img`.
- Follow the existing content area's page naming. Dated changelogs belong under `docs/version/changelog/`.

## Generated Output and Public Assets

Do not author or commit `docs/.vuepress/.cache/`, `docs/.vuepress/.temp/`, or `docs/.vuepress/dist/`. They are generated, ignored outputs; `dist/` is recreated by `pnpm docs:build`.

Files in `docs/.vuepress/public/` are release inputs, not generated output. Whenever a task adds or changes one, the final response must remind the user to upload the file or update its corresponding 123pan direct link.
