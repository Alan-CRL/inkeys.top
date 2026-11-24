// Plume 升级回归截图：用已构建的 dist + 无头 Edge，不打开窗口。
// 用法：node shots.cjs <标签>，输出到 .claude/shots/plume-upgrade/<标签>/（git 忽略）。
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')

const label = process.argv[2] || 'run'
const root = path.resolve(__dirname, '../../..')
const dist = path.join(root, 'docs/.vuepress/dist')
const base = path.join(root, '.claude/shots/plume-upgrade')
const output = path.join(base, label)
fs.mkdirSync(output, { recursive: true })

const pages = {
  home: '/',
  uink: '/standard/',
  'uink-main': '/standard/file/main.html',
  download: '/download.html',
  wiki: '/wiki/wiki.html',
  start: '/wiki/start/start.html',
  version: '/version/',
  inkeys3: '/version/inkeys3.html',
  community: '/community.html',
}
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.woff2': 'font/woff2' }

const server = http.createServer((req, res) => {
  const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '')
  let file = path.resolve(dist, relative || 'index.html')
  if (!file.startsWith(dist)) { res.writeHead(403).end(); return }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
  if (!path.extname(file)) file += '.html'
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
})

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  // 设了 BASE_URL 时改为截正在运行的 dev server（例如机器内存不足、无法构建 dist 时）。
  const origin = process.env.BASE_URL || `http://127.0.0.1:${server.address().port}`
  // 浏览器配置目录放在 git 忽略的 .claude 下，不放进任务目录（Edge 锁文件会妨碍归档）。
  const persistent = await chromium.launchPersistentContext(path.join(base, 'browser-profile'), {
    headless: true,
    executablePath: process.env.BROWSER_BIN || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  })
  const browser = persistent.browser()
  const errors = []
  try {
    for (const theme of ['light', 'dark']) {
      for (const [device, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
        const context = await browser.newContext({ viewport, reducedMotion: 'reduce', colorScheme: theme })
        await context.addInitScript(value => localStorage.setItem('vuepress-theme-appearance', value), theme)
        const page = await context.newPage()
        page.on('pageerror', error => errors.push(`${theme}/${device}: ${error}`))
        for (const [name, url] of Object.entries(pages)) {
          const response = await page.goto(origin + url, { waitUntil: 'load', timeout: 120000 })
          if (!response || response.status() !== 200) errors.push(`${url} -> ${response?.status()}`)
          await page.waitForTimeout(400)
          await page.screenshot({ path: path.join(output, `${name}-${theme}-${device}.png`) })
        }
        // 手机菜单展开状态
        if (device === 'mobile') {
          await page.goto(origin + pages.wiki, { waitUntil: 'load', timeout: 120000 })
          await page.locator('.vp-navbar-hamburger').click().catch(error => errors.push(`hamburger: ${error.message}`))
          await page.waitForTimeout(400)
          await page.screenshot({ path: path.join(output, `menu-${theme}-mobile.png`) })
        }
        await context.close()
      }
    }
  } finally {
    await persistent.close()
    server.close()
  }
  console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'OK no page errors')
  console.log(output)
}

main().catch(error => { console.error(error); process.exit(1) })
