# i18n Guidelines

The site serves three languages: zh-CN (default, no URL prefix), zh-TW (`/zh-tw/`) and en-US (`/en-us/`). Language logic lives in `docs/.vuepress/i18n/`; everything else reads from it. Established by task `11-25-site-i18n`.

## 1. Scope / Trigger

Read this before you add a page, translate a page, add a navbar or sidebar entry, add user-visible text to a component, add a shortcut URL, or touch `config.ts` / `plume.config.ts` locales. The feature spans build time (plugin), the first page load (inline head script), SPA navigation (router guard) and rendering (components), so a change in one layer can silently break another.

## 2. Signatures

| File | Export | Role |
| --- | --- | --- |
| `i18n/locales.ts` | `Locale`, `LOCALES`, `LOCALE_PREFIX`, `LOCALE_NAME`, `LOCALE_STORAGE_KEY = 'inkeys-locale'`, `SHORTCUTS`, `BOT_PATTERN`, `localeFromPrefix()`, `normalizePathKey()` | Single source of truth. Add a language or shortcut here only. |
| `i18n/useLocale.ts` | `useLocale(): ComputedRef<Locale>` | Route-derived locale for components; identical on SSR and client. |
| `i18n/runtime.ts` | `createLocaleScript(base, translated)`, `createRedirectPage(script, fallback)` | Inline head script and static shortcut redirect pages (plain strings, like `cdn/runtime.ts`). |
| `i18n/mirror.ts` | `createMirrorPages(app)`, `writeMirrorChunks(app)`, `isMirrorPage(page)`, `MIRROR_FLAG = 'i18nMirror'` | Build-time mirrors of untranslated pages. |
| `i18n/plugin.ts` | `i18nPlugin()` | `onInitialized`: mirrors → collect translated paths → unshift head script. `onPrepared`: write mirror chunks. `onGenerated`: shortcut redirect pages. |
| `theme/components/LocaleSwitch.vue` | — | The only language switcher (inside `NavActions.vue`). Plume's own translation menus are hidden in `site.css`. |
| `client.ts` | `router.beforeEach` | In-site navigation to a shortcut resolves by the current page locale. |

## 3. Contracts

- **Pages**: a translation is a real file at `docs/zh-tw/<same path>.md` / `docs/en-us/<same path>.md` with the same frontmatter (`pageLayout`, `pageClass`, …). Every other zh-CN page automatically gets a mirror at the same prefixed path: Simplified text, a "not translated" tip on top, `canonical` to the zh-CN page, `robots: noindex, follow`, `sitemap: false`, `llmstxt: false`.
- **Links in translated pages and zh-TW / en-US config**: always point to the same-locale path (`/en-us/standard/intro`), never to the zh-CN path. Mirrors exist for every page, so the locale is never lost. Assets (`/dist-standard/uink-v11/spec.md`, `/standard/llms.txt`, `/dist-download/ink/…`) keep their root paths.
- **Plume sidebar keys inside `locales['/zh-tw/']` etc. are relative to the locale** (`'/download'` means `/zh-tw/download`); link values are absolute (`'/zh-tw/download'`).
- **Auto-matching (head script)**: runs once per full page load. Only unprefixed URLs are rewritten; prefixed URLs are shown as-is; bots are never redirected. Locale = valid `localStorage['inkeys-locale']`, else the first zh/en entry in `navigator.languages` (`zh-TW|HK|MO|Hant*` → zh-TW, other `zh*` → zh-CN, `en*` → en-US, none → en-US, empty → zh-CN). It redirects only if the target locale has a **real translation** (mirrors don't count). `search` and `hash` are kept.
- **Storage**: only `LocaleSwitch.vue` writes `inkeys-locale`. Clicking a link that changes locale must not write it.
- **Component text**: keep a `Record<Locale, …>` dictionary next to the component and read it through `useLocale()`. Never use a client-only signal (query string, `navigator`) to choose text: SSR must output the final language.
- **Terminology**: zh-TW uses Taiwan wording; product terms follow the app's language packs `Inkeys/src/i18n/{zh-CN,zh-TW,en-US}.jsonc` (glossary: `.trellis/tasks/archive/2026-11/11-25-site-i18n/research/app-glossary.tsv`). Brand: zh-CN "智绘教Inkeys", zh-TW and en-US "Inkeys".

## 4. Validation & Error Matrix

| Condition | Result |
| --- | --- |
| zh-TW / en-US file links to `/tutorial/x` (zh path) | Visitor drops into zh-CN UI. Use `/zh-tw/tutorial/x`. |
| Relative link to an untranslated page in a translated file (`../changelog/x`) | Works: resolves to the mirror. |
| New translated page added in dev | Head-script path list and mirrors are computed at dev start; restart `pnpm start`. Production builds are unaffected. |
| Mirror page given `filePath: null` | Plume drops it from post collections (version list loses changelogs). Keep the virtual `filePath`; chunks are written by `writeMirrorChunks`. |
| Mirror page whose route imports the virtual `.md` | Rolldown `UNRESOLVED_IMPORT`. `chunkFilePath` must point to `temp/pages/<html>.vue`. |
| `<any value>` (ASCII after `<`) in Markdown | Vue compile error "Element is missing end tag". Escape as `&lt;any value&gt;`. CJK text like `<任意值>` is safe. |
| Shortcut added to `redirectPlugin.config` | Bypasses language matching. Add it to `SHORTCUTS` instead. |
| Head script text differs between SSR and client | VuePress re-inserts the tag on navigation. Only build-time-fixed data, sorted. |

## 5. Good / Base / Bad Cases

- Good: en-US browser opens `/download` → `/en-us/download`; clicks Knowledge Base → `/en-us/tutorial/tutorial` (mirror, English UI, tip on top); clicks a link inside → `/en-us/tutorial/ppt-com`.
- Base: zh-TW browser opens `/standard/intro` (no translation) → stays on the zh-CN page; switching to 繁體中文 there → `/zh-tw/standard/intro` mirror.
- Bad: en-US navbar entry `{ text: 'Community', link: '/community' }` → the visitor lands in zh-CN UI and cannot get back to English.

## 6. Tests Required

`.trellis/tasks/archive/2026-11/11-25-site-i18n/verify-i18n.cjs <origin>` (headless Edge, Playwright). Run it against a production build served with clean URLs (`/x` → `x.html`); `http-server` 302s a page path to a same-named public folder, which is why every public folder now carries the `dist-` prefix. Assertion points:
- Redirect matrix: zh-TW/zh-HK/en-US/ja-JP/zh-CN × `/`, `/download`, untranslated page, prefixed URL, bot UA, stored choice.
- Shortcuts `/inkeys3`, `/win7`, `/tos/zh-cn#…`, `/tos/en-us` land on the right locale.
- `<html lang>` on `/zh-tw/` and `/en-us/download`.
- Switcher: Esc closes and returns focus, choice is stored, untranslated page → mirror with tip, navbar and in-mirror links stay in the locale, narrow viewport shows the button and no Plume translation menu.
- Build output: `dist/en-us/*.html` mirrors contain the tip, `canonical`, `noindex`; `sitemap.xml` lists no mirror.

## 7. Wrong vs Correct

#### Wrong

```ts
// copy.ts: the language comes from the query string on the client, so SSR always renders zh-CN
const locale = ref<Locale>('zh-CN')
onMounted(() => { locale.value = new URLSearchParams(location.search).get('lang') as Locale })
```

```ts
// sidebar.ts (en-US): untranslated target written as the zh-CN path
{ text: 'Versions', link: '/version/' }
```

#### Correct

```ts
const locale = useLocale() // from the route: SSR and client agree
const t = computed(() => COPY[locale.value])
```

```ts
{ text: 'Versions', link: '/en-us/version/' } // mirror or translation always exists
```
