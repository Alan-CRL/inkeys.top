# Type Safety

## Current TypeScript Boundary

The site uses TypeScript in VuePress configuration and selected Vue SFCs, but TypeScript is not universal. Typed and untyped `<script setup>` components coexist with a JavaScript Options API component. Match the existing feature boundary; converting unrelated files or requiring `lang="ts"` is outside normal task scope.

There is no project `tsconfig.json` or standalone type-check command. `docs/.vuepress/theme/shim.d.ts` supplies the ambient `.vue` module declaration used by the site tooling.

## Type Organization

Keep types local when they serve one component. `Swiper.vue` defines `SlideItem` and `Props` in the SFC and imports library types with `import type`:

```ts
import type { AutoplayOptions, SwiperModule } from 'swiper/types'

interface SlideItem {
  link: string
  href?: string
  alt?: string
}
```

`AsideNav.vue` likewise keeps its `Locale` interface and locale map local. No shared frontend type directory exists; add shared types only when a task has multiple real consumers.

For untyped components, use Vue runtime prop declarations to preserve runtime constraints and defaults. Do not replace useful object-form props with an unvalidated list of names.

## Runtime Validation

Static typing does not validate network responses. The project has no schema-validation dependency, so current code validates and normalizes external data with explicit object, array, and string checks. `DownloadCard.vue` follows this pattern:

```js
const getText = (value) => {
  return typeof value === 'string' ? value.trim() : ''
}

const rawChannels = Array.isArray(data.Channels) ? data.Channels : []
```

Validate required payload fields before assigning remote data to reactive state, and provide deliberate fallbacks or errors for missing data.

## Formatting

For new or modified TypeScript and JavaScript source, use single quotes, omit semicolons, and indent with 2 spaces. Existing mixed-style exceptions remain valid historical code; do not reformat untouched lines merely to enforce this convention.
