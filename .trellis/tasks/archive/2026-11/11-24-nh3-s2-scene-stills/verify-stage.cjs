// 无可见窗口的截图验收：用已构建的 dist，截三张场景卡片在深浅色、桌面与窄屏下的样子，以及出场中途一帧。
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const root = path.resolve(__dirname, '../../..')
const dist = path.join(root, 'docs/.vuepress/dist')
const output = path.join(__dirname, 'shots')
fs.mkdirSync(output, { recursive: true })
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' }
const server = http.createServer((req, res) => {
  const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '')
  let file = path.resolve(dist, relative || 'index.html')
  if (!file.startsWith(dist + path.sep) && file !== dist) { res.writeHead(403).end(); return }
  if (!path.extname(file)) file += '.html'
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
})

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const context = await chromium.launchPersistentContext(path.join(output, '.profile'), {
    headless: true,
    executablePath: process.env.BROWSER_BIN || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    deviceScaleFactor: 2,
  })
  const errors = []
  const report = []
  try {
    for (const [name, width, scheme, motion, route] of [
      ['light-1440', 1440, 'light', 'reduce', '/'], ['dark-1440', 1440, 'dark', 'reduce', '/'],
      ['light-390', 390, 'light', 'reduce', '/'], ['dark-1100', 1100, 'dark', 'reduce', '/'],
      ['light-1440-entering', 1440, 'light', 'no-preference', '/'],
    ]) {
      const page = await context.newPage()
      page.on('pageerror', error => errors.push(`${name}: ${error}`))
      page.on('response', response => { if (response.status() >= 400 && /new-index3\/s2/.test(response.url())) errors.push(`${name}: ${response.status()} ${response.url()}`) })
      await page.setViewportSize({ width, height: 1000 })
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: motion })
      await page.addInitScript(theme => localStorage.setItem('vuepress-theme-appearance', theme), scheme)
      await page.goto(base + route, { waitUntil: 'networkidle' })
      for (const id of ['screen', 'slides', 'board']) {
        const card = page.locator(`#nh3-scene-${id}`)
        await card.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }))
        if (motion === 'reduce') {
          await page.waitForFunction(id => [...document.querySelectorAll(`#nh3-scene-${id} img`)].every(img => img.complete && img.naturalWidth > 0), id)
          await page.waitForTimeout(300)
        } else {
          await page.waitForTimeout(420)
        }
        await card.screenshot({ path: path.join(output, `${id}-${name}.png`) })
        report.push({ id, name, theme: await page.evaluate(() => document.documentElement.dataset.theme), images: await card.locator('img').count() })
      }
      await page.close()
    }
  } finally {
    await context.close()
    server.close()
  }
  console.log(JSON.stringify({ report, errors }, null, 1))
  if (errors.length) process.exit(1)
}
main().catch(error => { console.error(error); process.exit(1) })
