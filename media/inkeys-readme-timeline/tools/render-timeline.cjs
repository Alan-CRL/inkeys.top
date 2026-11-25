// README 时间线卡片图：年份轴 2022→2026 + 四个版本节点卡片（浅色 / 深色）。
// 用法：node media/inkeys-readme-timeline/tools/render-timeline.cjs [--only light-zh-CN]
// 输出：output/timeline-{theme}-{locale}.png（1280 宽，2x 像素）。
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')

const here = path.resolve(__dirname, '..')
const W = 1280, H_DEFAULT = 500
// 英文要点较长会折行，按语言单独设定画布高度。
const heightOf = locale => locales[locale].height || H_DEFAULT

// 配色沿用 Hero 背景与彩虹字标的色相。
const themes = {
  light: { bg: '#f4f7f8', mint: 'rgba(120,205,190,.22)', lavender: 'rgba(170,150,230,.20)', text: '#1f2933', sub: '#55606d',
    faint: '#8a95a1', card: 'rgba(255,255,255,.78)', cardBorder: 'rgba(73,99,120,.14)', axis: 'rgba(73,99,120,.22)',
    shadow: '0 1px 2px rgba(40,46,70,.06), 0 10px 28px rgba(40,46,70,.08)' },
  dark: { bg: '#111820', mint: 'rgba(36,102,100,.25)', lavender: 'rgba(80,65,137,.24)', text: '#e6ebf1', sub: '#aab4c0',
    faint: '#7f8a97', card: 'rgba(178,204,231,.06)', cardBorder: 'rgba(186,207,230,.14)', axis: 'rgba(186,207,230,.22)',
    shadow: '0 1px 2px rgba(0,0,0,.25), 0 10px 28px rgba(0,0,0,.25)' },
}

// 节点颜色取彩虹字标的 I / k / e / s 段。
const accents = ['#14a394', '#f0a019', '#ef4f73', '#4a6fe0']
const accentsDark = ['#5fd0c0', '#f3c55a', '#f58aa2', '#8fa6f5']

const locales = {
  'zh-CN': {
    lang: 'zh-CN',
    nodes: [
      { date: '2022.05', title: '项目立项', items: ['基于 EasyX / HiEasyX 起步', '主栏与画布双程序 IPC 协作', '合并为单程序多线程多窗口', '画板恢复，告别墨迹丢失'] },
      { date: '2023.09', title: 'Inkeys1', items: ['GitHub 开源，免费发布', '自动直线与端点吸附', 'C++ / C# 跨语言 PPT 联动', 'RealTimeStylus 多指绘图', '撤销重做与墨迹恢复'] },
      { date: '2024.10', title: 'Inkeys2', items: ['画布预分配，绘制更高效', '设备识别与高分屏适配', 'Fluent 2 风格设置界面', 'PPT 演示助手 3（ROT 连接）', '自动更新与校验机制'] },
      { date: '2026.10', title: 'Inkeys3', items: ['UI3 主栏与 Draw3 绘图引擎', '无限画布多页白板', '智能形状与手掌橡皮', 'UInk 墨迹文件规范', '20 种界面语言'] },
    ],
  },
  'zh-TW': {
    lang: 'zh-TW',
    nodes: [
      { date: '2022.05', title: '專案立項', items: ['以 EasyX / HiEasyX 起步', '主欄與畫布雙程式 IPC 協作', '合併為單一程式多視窗架構', '畫板復原，告別筆跡遺失'] },
      { date: '2023.09', title: 'Inkeys1', items: ['GitHub 開源，免費發布', '自動直線與端點吸附', 'C++ / C# 跨語言 PPT 連動', 'RealTimeStylus 多指繪圖', '復原、重做與筆跡還原'] },
      { date: '2024.10', title: 'Inkeys2', items: ['畫布預先配置，繪製更高效', '裝置識別與高 DPI 螢幕適配', 'Fluent 2 風格設定介面', 'PPT 簡報助手 3（ROT 連線）', '自動更新與校驗機制'] },
      { date: '2026.10', title: 'Inkeys3', items: ['UI3 主欄與 Draw3 繪圖引擎', '無限畫布多頁白板', '智慧形狀與手掌橡皮擦', 'UInk 筆跡檔案規範', '20 種介面語言'] },
    ],
  },
  'en-US': {
    lang: 'en',
    height: 590,
    nodes: [
      { date: '2022.05', title: 'Project Start', items: ['Built on EasyX / HiEasyX', 'Toolbar and canvas as two IPC processes', 'Merged into one multi-threaded, multi-window app', 'Canvas recovery, no more lost ink'] },
      { date: '2023.09', title: 'Inkeys1', items: ['Open source on GitHub, free to use', 'Auto straight lines and endpoint snapping', 'C++ / C# cross-language PPT integration', 'Multi-touch drawing via RealTimeStylus', 'Undo, redo and ink recovery'] },
      { date: '2024.10', title: 'Inkeys2', items: ['Preallocated canvas for faster drawing', 'Device detection and high-DPI support', 'Fluent 2 style settings', 'PPT Assistant 3 (ROT connection)', 'Auto-update with verification'] },
      { date: '2026.10', title: 'Inkeys3', items: ['UI3 toolbar and Draw3 engine', 'Infinite multi-page whiteboard', 'Smart shapes and palm eraser', 'UInk ink file standard', '20 UI languages'] },
    ],
  },
}

// 年份轴：2022.0 → 2027.0 线性映射，节点圆点按真实月份定位。
const AX_L = 72, AX_R = W - 72, AX_Y = 92
const yearX = y => AX_L + (y - 2022) / 5 * (AX_R - AX_L)
const dateX = d => { const [y, m] = d.split('.').map(Number); return yearX(y + (m - 1) / 12) }
const CARD_W = 268, CARD_GAP = (W - 2 * 64 - 4 * CARD_W) / 3, CARD_TOP = 176
const cardX = i => 64 + i * (CARD_W + CARD_GAP)

function html(theme, locale) {
  const t = themes[theme], l = locales[locale], ac = theme === 'dark' ? accentsDark : accents, H = heightOf(locale)
  const years = [2022, 2023, 2024, 2025, 2026]
  const yearLabels = years.map(y => `<div class="year" style="left:${yearX(y + 0.5)}px">${y}</div>`).join('')
  const ticks = years.concat(2027).map(y => `<div class="tick" style="left:${yearX(y)}px"></div>`).join('')
  // 圆点到卡片顶部用折线连接：先竖直向下，再斜向卡片中心。
  let svg = ''
  l.nodes.forEach((n, i) => {
    const x0 = dateX(n.date), x1 = cardX(i) + CARD_W / 2
    svg += `<path d="M${x0} ${AX_Y} V${AX_Y + 30} L${x1} ${CARD_TOP - 18} V${CARD_TOP}" stroke="${ac[i]}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>`
    svg += `<circle cx="${x0}" cy="${AX_Y}" r="9" fill="${ac[i]}" opacity=".22"/><circle cx="${x0}" cy="${AX_Y}" r="5" fill="${ac[i]}"/>`
  })
  const cards = l.nodes.map((n, i) => `
    <div class="card" style="left:${cardX(i)}px; --ac:${ac[i]}">
      <div class="bar"></div>
      <div class="date">${n.date}</div>
      <div class="title">${n.title}</div>
      <ul>${n.items.map(s => `<li>${s}</li>`).join('')}</ul>
    </div>`).join('')
  return `<!doctype html><html lang="${l.lang}"><head><meta charset="utf-8"><style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
body { position: relative; font-family: 'HarmonyOS Sans SC', 'HarmonyOS Sans TC', 'Microsoft YaHei UI', sans-serif; color: ${t.text}; background: ${t.bg};
  background-image: radial-gradient(60% 70% at 8% 0%, ${t.mint}, transparent 70%), radial-gradient(55% 70% at 100% 100%, ${t.lavender}, transparent 70%); }
.axis { position: absolute; left: ${AX_L}px; width: ${AX_R - AX_L}px; top: ${AX_Y - 1}px; height: 2px; background: ${t.axis}; border-radius: 1px; }
.tick { position: absolute; top: ${AX_Y - 6}px; width: 2px; height: 12px; margin-left: -1px; background: ${t.axis}; border-radius: 1px; }
.year { position: absolute; top: ${AX_Y - 52}px; transform: translateX(-50%); font-size: 22px; font-weight: 500; color: ${t.sub}; letter-spacing: .5px; }
svg { position: absolute; left: 0; top: 0; }
.card { position: absolute; top: ${CARD_TOP}px; width: ${CARD_W}px; height: ${H - CARD_TOP - 36}px; padding: 26px 24px 20px; border-radius: 18px;
  background: ${t.card}; border: 1px solid ${t.cardBorder}; box-shadow: ${t.shadow}; overflow: hidden; }
.bar { position: absolute; left: 0; top: 0; right: 0; height: 4px; background: var(--ac); }
.date { font-size: 15px; font-weight: 500; color: var(--ac); letter-spacing: .5px; }
.title { margin-top: 4px; font-size: 28px; font-weight: 700; }
ul { list-style: none; margin-top: 18px; }
li { position: relative; padding-left: 16px; font-size: 15.5px; line-height: 1.5; color: ${t.sub}; margin-bottom: 10px; }
li::before { content: ''; position: absolute; left: 0; top: .62em; width: 6px; height: 6px; border-radius: 50%; background: var(--ac); opacity: .85; }
</style></head><body>
<div class="axis"></div>${ticks}${yearLabels}
<svg width="${W}" height="${H}">${svg}</svg>
${cards}
</body></html>`
}

async function main() {
  const onlyIndex = process.argv.indexOf('--only')
  const only = onlyIndex > 0 ? process.argv[onlyIndex + 1] : null
  fs.mkdirSync(path.join(here, 'output'), { recursive: true })
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_BIN || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
  try {
    for (const theme of Object.keys(themes)) for (const locale of Object.keys(locales)) {
      if (only && only !== `${theme}-${locale}`) continue
      const page = await browser.newPage({ viewport: { width: W, height: heightOf(locale) }, deviceScaleFactor: 2, colorScheme: theme })
      await page.setContent(html(theme, locale), { waitUntil: 'load' })
      await page.evaluate(() => document.fonts.ready)
      const out = path.join(here, 'output', `timeline-${theme}-${locale}.png`)
      await page.screenshot({ path: out })
      await page.close()
      console.log('wrote', path.basename(out))
    }
  } finally {
    // 无头 Edge 偶发 close 挂起，最多等 10 秒。
    await Promise.race([browser.close(), new Promise(r => setTimeout(r, 10000))])
  }
  process.exit(0)
}
main().catch(e => { console.error(e); process.exit(1) })
