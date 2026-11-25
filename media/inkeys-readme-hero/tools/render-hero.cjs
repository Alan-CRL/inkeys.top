// README 头图合成：官网 new-index3 首屏背景 + 彩虹手写字标 + 标语 + 原生离屏主栏 + 品牌/版权/平台信息。
// 用法：node media/inkeys-readme-hero/tools/render-hero.cjs [--only light-en-US]
// 输出：output/master/hero-{theme}-{locale}.png（2560×1280）与 output/hero-{theme}-{locale}.png（1280×640）。
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')

const here = path.resolve(__dirname, '..')
const sources = path.join(here, 'sources')
// Edge 在 file:// 页面中不加载 @font-face，统一经虚拟 http 源 + page.route 从本地磁盘供给页面、字体与素材。
const ORIGIN = 'http://hero.local'
const url = p => `${ORIGIN}/fs/${encodeURIComponent(path.resolve(p))}`
const mime = { '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml' }
const W = 1280, H = 640
const fonts = 'C:/Windows/Fonts'

// 背景取自 NewHome3.vue:578-609；径向渐变的 vw/svh 按 1280×640 画布换算为百分比。
const themes = {
  light: { bg: '#f6f9fb', mint: 'rgba(136,218,195,.24)', lavender: 'rgba(173,163,232,.23)', pearl: 'rgba(255,236,214,.18)',
    text: '#1f2933', sub: '#55606d', faint: '#7a8591', pill: 'rgba(255,255,255,.55)', pillBorder: 'rgba(73,99,120,.16)',
    wordShadow: 'drop-shadow(0 3px 3px rgba(40,46,70,.14)) drop-shadow(0 14px 24px rgba(40,46,70,.10))' },
  dark: { bg: '#111820', mint: 'rgba(36,102,100,.23)', lavender: 'rgba(80,65,137,.22)', pearl: 'rgba(91,76,111,.09)',
    text: '#e6ebf1', sub: '#aab4c0', faint: '#7f8a97', pill: 'rgba(178,204,231,.07)', pillBorder: 'rgba(186,207,230,.16)',
    wordShadow: 'drop-shadow(0 3px 3px rgba(2,6,12,.45)) drop-shadow(0 14px 26px rgba(2,6,12,.35))' },
}

// 文案：标语为用户指定（中文按官网首屏在逗号处分两行）；版权严格照搬 Inkeys/src/i18n/*.jsonc 的 HomeCopyright；品牌名按 i18n LnkName。
const locales = {
  'zh-CN': { brand: 'Inkeys', lines: ['让屏幕上的书写行云流水，', '让每一次操作都赏心悦目。'],
    copyright: 'Copyright © 2023-2026 AlanCRL(陈润林) 工作室', lang: 'zh-CN', cjk: true },
  'zh-TW': { brand: 'Inkeys', lines: ['讓螢幕上的書寫行雲流水，', '讓每一次操作都賞心悅目。'],
    copyright: 'Copyright © 2023-2026 AlanCRL(陳潤林) 工作室', lang: 'zh-TW', cjk: true },
  'en-US': { brand: 'Inkeys', lines: ['Fluid ink. Beautiful motion.', 'Screen annotation that feels as good as it looks.'],
    copyright: 'Copyright © 2023-2026 AlanCRL (Chen Runlin / Chen Yunlam) Studio', lang: 'en', cjk: false },
}

// 错落版式（1280×640 CSS 像素）：字标放大偏右上；下方左侧标语，右侧主栏从 x=BAR_X 起向右超出画布被截断。
const WORD = { left: 292, top: 30, width: 900 }
const BAR_X = 608, BAR_Y = 468, BAR_BODY_WIDTH = 900

function html(theme, locale) {
  const t = themes[theme], l = locales[locale]
  const body = JSON.parse(fs.readFileSync(path.join(sources, `toolbar-${theme}-${locale}.body.json`), 'utf8')).body_rect
  // 主栏整张离屏图按比例缩放，使实体矩形左上角落在 (BAR_X, BAR_Y)；边缘光与投影随图保留，右侧由画布裁掉。
  const scale = BAR_BODY_WIDTH / (body[2] - body[0])
  const tagline = l.cjk
    ? `<div class="tag cjk">${l.lines[0]}</div><div class="tag cjk second">${l.lines[1]}</div>`
    : `<div class="tag main">${l.lines[0]}</div><div class="tag sub">${l.lines[1]}</div>`
  return `<!doctype html><html lang="${l.lang}"><head><meta charset="utf-8"><style>
@font-face { font-family: HeroSerif; src: url('${url(fonts + '/NotoSerifSC-VF.ttf')}'); font-weight: 200 900; }
@font-face { font-family: Brand; src: url('${url(fonts + '/HarmonyOS_Sans_SC_Medium.ttf')}'); font-weight: 500; }
@font-face { font-family: Brand; src: url('${url(fonts + '/HarmonyOS_Sans_SC_Regular.ttf')}'); font-weight: 400; }
* { margin: 0; box-sizing: border-box; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
body { position: relative; color: ${t.text}; font-family: Brand, sans-serif; background-color: ${t.bg};
  background-image:
    radial-gradient(ellipse 124.45% 120.21% at 12% 15%, ${t.mint}, transparent 60%),
    radial-gradient(ellipse 124.45% 77.78% at 88% 45%, ${t.lavender}, transparent 65%),
    radial-gradient(ellipse 77.78% 134.35% at 45% 95%, ${t.pearl}, transparent 60%); }
.brand { position: absolute; left: 44px; top: 36px; display: flex; align-items: center; gap: 12px; font-weight: 500; font-size: 22px; letter-spacing: .01em; }
.brand img { width: 40px; height: 40px; }
.word { position: absolute; left: ${WORD.left}px; top: ${WORD.top}px; width: ${WORD.width}px; filter: ${t.wordShadow}; }
.tags { position: absolute; left: 64px; top: ${BAR_Y - 16}px; font-family: HeroSerif, serif; }
.tag.cjk { font-size: 33px; font-weight: 600; letter-spacing: .06em; line-height: 1.5; }
.tag.cjk.second { padding-left: 1.5em; }
.tag.main { font-size: 33px; font-weight: 600; letter-spacing: .01em; line-height: 1.35; }
.tag.sub { margin-top: 10px; font-size: 19px; font-weight: 500; color: ${t.sub}; letter-spacing: .02em; }
.bar { position: absolute; left: ${BAR_X - body[0] * scale}px; top: ${BAR_Y - body[1] * scale}px; width: ${6186 * scale}px; }
.top-right { position: absolute; right: 44px; top: 41px; }
.foot { position: absolute; left: 64px; bottom: 30px; font-size: 14px; color: ${t.faint}; }
.pills { display: flex; gap: 8px; font-size: 14px; }
.pill { display: flex; align-items: center; gap: 7px; height: 30px; padding: 0 14px; border-radius: 15px; background: ${t.pill}; border: 1px solid ${t.pillBorder}; color: ${t.sub}; font-weight: 500; }
.pill svg { width: 13px; height: 13px; fill: currentColor; }
</style></head><body>
<div class="brand"><img src="${url(path.join(sources, 'Inkeys.svg'))}">${l.brand}</div>
<div class="top-right pills">
<span class="pill"><svg viewBox="0 0 16 16"><path d="M0 0h7.5v7.5H0zM8.5 0H16v7.5H8.5zM0 8.5h7.5V16H0zM8.5 8.5H16V16H8.5z"/></svg>Windows</span>
<span class="pill">GPL-3.0</span></div>
<img class="word" src="${url(path.join(sources, `wordmark-${theme}.png`))}">
<div class="tags">${tagline}</div>
<img class="bar" src="${url(path.join(sources, `toolbar-${theme}-${locale}.png`))}">
<div class="foot">${l.copyright}</div>
</body></html>`
}

async function main() {
  const onlyIndex = process.argv.indexOf('--only')
  const only = onlyIndex > 0 ? process.argv[onlyIndex + 1] : null
  fs.mkdirSync(path.join(here, 'output/master'), { recursive: true })
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_BIN || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
  try {
    for (const theme of Object.keys(themes)) for (const locale of Object.keys(locales)) {
      const name = `hero-${theme}-${locale}`
      if (only && only !== `${theme}-${locale}`) continue
      const page_html = html(theme, locale)
      for (const [dsf, out] of [[2, path.join(here, 'output/master', `${name}.png`)], [1, path.join(here, 'output', `${name}.png`)]]) {
        const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: dsf, colorScheme: theme })
        page.setDefaultTimeout(30000)
        await page.route(`${ORIGIN}/**`, route => {
          const pathname = new URL(route.request().url()).pathname
          if (pathname === '/index.html') return route.fulfill({ body: page_html, contentType: 'text/html; charset=utf-8' })
          const file = decodeURIComponent(pathname.replace(/^\/fs\//, ''))
          return route.fulfill({ body: fs.readFileSync(file), contentType: mime[path.extname(file).toLowerCase()] || 'application/octet-stream' })
        })
        await page.goto(`${ORIGIN}/index.html`, { waitUntil: 'load' })
        // 等字体与图片全部解码，并确认实际用到的字体都已加载，避免截到回退字体。
        await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode())) })
        const fontState = await page.evaluate(() => [...document.fonts].map(f => `${f.family}/${f.weight}:${f.status}`))
        const required = ['HeroSerif', 'Brand/500']
        const missing = required.filter(r => !fontState.some(s => s.startsWith(r) && s.endsWith(':loaded')))
        if (missing.length) throw new Error(`${name}: fonts not loaded ${missing} (${fontState})`)
        await page.screenshot({ path: out })
        await page.close()
      }
      console.log('wrote', name)
    }
  } finally {
    // 本机 Edge 无头实例 close() 偶发挂起 20+ 分钟（截图早已落盘）；限时 10 秒后直接退出进程。
    await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 10000))])
  }
}

main().then(() => process.exit(0), error => { console.error(error); process.exit(1) })
