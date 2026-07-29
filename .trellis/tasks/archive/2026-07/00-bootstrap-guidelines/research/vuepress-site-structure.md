# Research: VuePress and Plume Site Structure

- **Query**: Inspect VuePress/Plume configuration, documentation structure, theme integration, components, public assets, and related directories.
- **Scope**: internal
- **Date**: 2026-07-29

## Findings

### Files Found

| File Path | Description |
|---|---|
| `docs/.vuepress/config.ts` | Main VuePress, Vite bundler, Plume theme, Markdown, asset, and redirect configuration. |
| `docs/.vuepress/plume.config.ts` | Plume navigation, sidebar mapping, collections, footer, social links, and transitions. |
| `docs/.vuepress/client.ts` | Client enhancement, global component registration, global CSS, and layout override. |
| `docs/.vuepress/navbar.ts` | Top navigation definition. |
| `docs/.vuepress/sidebar.ts` | Download, version, tutorial, and wiki sidebars. |
| `docs/.vuepress/theme/components/Layout.vue` | Wrapper around the Plume layout. |
| `docs/.vuepress/theme/components/*.vue` | Eight local Vue components. |
| `docs/.vuepress/theme/styles/custom.css` | Site-wide Plume variable and layout overrides. |
| `docs/.vuepress/public/` | Root-served static images and GIFs. |
| `docs/**/*.md` | Site pages, tutorials, product docs, changelogs, terms, and format specifications. |

### Directory Layout

The repository has no application `src/` directory. Authored website content and frontend code are colocated under `docs/`:

```text
docs/
├── .vuepress/
│   ├── client.ts
│   ├── config.ts
│   ├── navbar.ts
│   ├── plume.config.ts
│   ├── sidebar.ts
│   ├── public/
│   └── theme/
│       ├── components/
│       ├── shim.d.ts
│       └── styles/custom.css
├── standard/
├── tos/
├── tutorial/
├── version/
├── wiki/
├── community.md
├── download.md
├── index.md
├── jabber.md
└── link.md
```

Observed content groupings are:

- `docs/version/`: release landing page, introductions, and dated changelogs.
- `docs/wiki/`: user tutorials and guides.
- `docs/tutorial/`: technical/knowledge-base articles.
- `docs/standard/`: the UInk file-format specification, organized into block and file subdirectories.
- `docs/tos/`: Chinese and English terms of service.
- `docs/.vuepress/public/`: product images, tutorial screenshots, and animated guide assets, served from root paths such as `/Inkeys.svg`.

### Main VuePress Configuration

`docs/.vuepress/config.ts:1-4` uses VuePress's config helper, Vite bundler, Plume, and the redirect plugin:

```ts
import { viteBundler } from '@vuepress/bundler-vite'
import { defineUserConfig } from 'vuepress'
import { plumeTheme } from 'vuepress-theme-plume'
import { redirectPlugin } from '@vuepress/plugin-redirect'
```

Site-level values are Chinese locale, root base path, product title, and product description (`docs/.vuepress/config.ts:43-48`). Vite is selected with `bundler: viteBundler()` and prefetching is disabled (`docs/.vuepress/config.ts:85-86`).

Plume behavior configured in the same file includes:

- Production hostname and GitHub edit-link repository metadata (`config.ts:88-95`).
- LLM text output enabled (`config.ts:97`).
- Filesystem compile cache (`config.ts:104-108`).
- Local search (`config.ts:120-123`).
- Markdown field, Bilibili, YouTube, ArtPlayer, Iconify icons, KaTeX math, Mermaid, image enhancements, lazy marking, and timelines (`config.ts:154-196`).
- Image URL replacement to a 123 Cloud CDN (`config.ts:220-226`).
- PhotoSwipe with scroll-to-close disabled (`config.ts:234-239`).
- Legacy-to-current route redirects (`config.ts:242-256`).

The image CDN replacement has a client-side local fallback script injected through `head` (`config.ts:7-41`, `config.ts:50-83`). It recognizes CDN URLs, converts them back to local root-relative paths, and retries failed `HTMLImageElement` loads once.

### Plume Navigation and Collections

`docs/.vuepress/plume.config.ts:10-34` defines the logo, appearance switch, social destinations, and inline SVG icons for services not represented by a built-in icon name. Footer HTML and year interpolation are at `plume.config.ts:48-51`.

The navbar is separated into `docs/.vuepress/navbar.ts`; it uses `defineNavbarConfig` and exports a single array (`navbar.ts:7-16`). Sidebars are plain exported arrays in `docs/.vuepress/sidebar.ts:1-59`, then mapped to route prefixes in `plume.config.ts:53-65`.

Two Plume collections are observed (`plume.config.ts:66-134`):

- `/version/` is a `post` collection with post listing, tags in metadata, and archives/categories disabled.
- `/standard/` is a `doc` collection with an explicit nested sidebar and automatic titles.

Page, post-list, and appearance transitions are enabled at `plume.config.ts:172-177`.

### Client and Layout Integration

`docs/.vuepress/client.ts:1-21` imports local components and global CSS, globally registers five Markdown-facing components, and replaces the default layout:

```ts
enhance({ app }) {
  app.component('DownloadCard', DownloadCard)
  app.component('GitHubCard', GitHubCard)
  app.component('SiteVisitCounter', SiteVisitCounter)
  app.component('SwiperSelf', SwiperSelf)
  app.component('VideoPlayerAmbilight', VideoPlayerAmbilight)
},
layouts: { Layout },
```

`Layout.vue:8-19` composes the Plume client layout, adds `AsideNav` after the outline, adds `PageContextMenu` after document titles, and mounts `SiteVisitTracker` globally.

### Markdown Page Patterns

Most pages begin with YAML frontmatter containing at least a title, for example `docs/download.md:1-5`. The homepage uses Plume's structured `config` frontmatter for a document hero and feature list (`docs/index.md:1-61`), followed by ordinary Markdown and globally registered Vue components (`docs/index.md:65-96`).

Markdown pages use:

- Plume/VuePress containers such as `::: tip` (`docs/download.md:7-13`).
- Theme components such as `<Card>`, `<CardGrid>`, `<LinkCard>`, and `<Badge>` (`docs/wiki/wiki.md:9-28`, `docs/community.md:9-37`).
- Globally registered local components such as `<DownloadCard />`, `<SwiperSelf>`, `<VideoPlayerAmbilight>`, and `<SiteVisitCounter />` (`docs/download.md:5`, `docs/tutorial/pptx-video-processing.md:18-21`, `docs/index.md:66-96`).
- Inline scoped CSS in Markdown where page-specific presentation is needed (`docs/community.md:80-110`).
- Root-relative references to `docs/.vuepress/public`, such as `/Inkeys.svg` (`docs/index.md:11-13`).

### Public Assets

`docs/.vuepress/public/` contains top-level branding/product files and topic subdirectories. Observed formats are SVG, PNG, and GIF. Subdirectories mirror content routes, including `tutorial/ppt-com`, `tutorial/ppt-flash`, `tutorial/pptx-video-processing`, `wiki/start`, and `wiki/basic-guide`.

### External References

- [VuePress configuration reference](https://vuepress.vuejs.org/) — framework linked by the repository README.
- [Plume configuration reference](https://theme-plume.vuejs.press/) — theme linked by the repository README and source comments.

### Related Specs

- `.trellis/spec/frontend/directory-structure.md` — candidate for the `docs/`, `.vuepress/`, theme, public, and generated-output layout.
- `.trellis/spec/frontend/component-guidelines.md` — candidate for client registration, layout composition, and Markdown component usage.
- `.trellis/spec/frontend/state-management.md` — candidate for route-derived and component-local state boundaries.

## Caveats / Not Found

- No separate `src/`, `components/`, `theme/`, `public/`, or `assets/` directory exists at repository root; their equivalents are under `docs/.vuepress/`.
- `docs/.vuepress/dist/` and `.temp/` exist locally but are generated and ignored, so they are not evidence of authored conventions.
- No locale directory structure is configured even though both Chinese and English terms pages exist.
- Automatic frontmatter is globally commented out in `config.ts:110-118`; collection-specific behavior is configured in `plume.config.ts`.
