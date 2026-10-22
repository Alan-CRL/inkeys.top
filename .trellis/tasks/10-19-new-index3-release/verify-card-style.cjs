// 对生产构建进行无窗口检查；截图和录制帧保存在临时目录，不进入产品。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const http = require('node:http')
const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))
const root = path.resolve('docs/.vuepress/dist')
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'inkeys-shell-'))
const smoke = process.argv.includes('--smoke')
const revision = process.argv.includes('--ambient-revision')
const navOnly = process.argv.includes('--nav-only')
const ambientOnly = process.argv.includes('--ambient')
const sockets = new Set()
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  let file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`)
  if (file === root || fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return res.writeHead(404).end()
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream')
  let body = fs.readFileSync(file)
  if (path.extname(file) === '.html' && url.searchParams.has('theme')) body = body.toString().replace('<html ', `<html data-theme="${url.searchParams.get('theme') === 'dark' ? 'dark' : 'light'}" `)
  res.end(body)
})
server.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)) })

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  const bs = await chromium.launchServer({ channel: 'msedge', headless: true })
  const browser = await chromium.connect(bs.wsEndpoint())
  const report = []
  console.log(`Artifacts: ${output}`)
  try {
    for (const js of (smoke ? [true] : [true, false])) for (const theme of (smoke ? ['light'] : ['light', 'dark'])) for (const width of (smoke ? [1280] : revision ? [320, 900, 1280] : [320, 390, 768, 900, 1280, 1920])) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, javaScriptEnabled: js })
      if (revision && js) await context.addInitScript(() => { Math.random = () => 0.6 })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', e => errors.push(e.message))
      await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort())
      await page.goto(`${origin}/new-index3.html?theme=${theme}`, { waitUntil: 'load' })
      await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
      const name = `${theme}-${width}-${js ? 'js' : 'nojs'}`
      const glass = page.locator('.nh3-release .nh-main-glass')
      for (const delay of js ? [500, 1000, 3500] : [500]) {
        await page.waitForTimeout(delay)
        const corners = await glass.evaluate(n => ({ radius: getComputedStyle(n).borderRadius, overflow: getComputedStyle(n).overflow }))
        assert.equal(corners.radius, '9%')
        assert.equal(corners.overflow, 'hidden')
        if (width === 1280) await page.screenshot({ path: path.join(output, `${name}-${delay}.png`) })
      }
      const layout = await page.evaluate(async () => {
        await document.fonts.ready
        const title = document.querySelector('.nh3-release-title')
        const range = document.createRange(); range.selectNodeContents(title)
        const a = range.getBoundingClientRect(), b = document.querySelector('.nh3-release-stage').getBoundingClientRect()
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          fonts: [...document.fonts].filter(f => /Release/.test(f.family)).map(f => ({ family: f.family, status: f.status })),
          overlap: a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom,
          rotation: getComputedStyle(document.querySelector('.nh3-release-subtitle')).transform,
        }
      })
      assert.equal(layout.overflow, false, name)
      assert.equal(layout.overlap, false, `${name}: title overlaps stage`)
      assert.equal(layout.fonts.length, 1)
      assert.ok(layout.fonts.every(f => f.status === 'loaded'), `${name}: fonts not loaded`)
      assert.equal(layout.rotation, 'none', `${name}: plain subtitle`)
      if (revision && js && width === 1280) {
        const ink = page.locator('.nh3-ambient-canvas').first()
        await ink.waitFor({ state: 'visible', timeout: 22000 })
        await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')) })
        const pixels = await ink.evaluate(n => n.toDataURL())
        await page.waitForTimeout(500)
        assert.equal(await ink.evaluate(n => n.toDataURL()), pixels, 'hidden ink pixels freeze')
        const themeToggle = page.locator('.vp-switch-appearance').first()
        if (await themeToggle.count()) {
          await themeToggle.evaluate(n => n.click()); await page.waitForTimeout(1500)
          assert.notEqual(await ink.evaluate(n => n.toDataURL()), pixels, 'paused ink repaints theme')
          await themeToggle.evaluate(n => n.click()); await page.waitForTimeout(1500)
        } else throw new Error('theme toggle not found')
        await page.screenshot({ path: path.join(output, `${name}-ambient-actual-size.png`) })
        await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')) })
        await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
        await page.waitForTimeout(100)
        const offscreen = await ink.evaluate(n => n.toDataURL())
        await page.waitForTimeout(500)
        assert.equal(await ink.evaluate(n => n.toDataURL()), offscreen, 'offscreen ink pixels freeze')
        await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
      }
      if (js && width === 1280) {
        const main = page.locator('.nh3-release .nh-main-btn')
        const before = await glass.evaluate(n => getComputedStyle(n).backgroundColor)
        await main.hover(); await page.waitForTimeout(300)
        assert.equal(await glass.evaluate(n => getComputedStyle(n).backgroundColor), before)
        await page.mouse.down(); await page.waitForTimeout(150)
        await page.screenshot({ path: path.join(output, `${name}-pressed.png`) })
        await page.mouse.up(); await page.mouse.move(0, 0)
        const tool = page.locator('.nh3-release .nh-bb').first()
        await tool.hover(); await page.waitForTimeout(300)
        assert.match(await tool.evaluate(n => getComputedStyle(n).transitionDuration), /0\.24s/)
        await page.mouse.move(0, 0); await page.waitForTimeout(300)
        assert.match(await tool.evaluate(n => getComputedStyle(n).transitionDuration), /0\.24s/)
        if (theme === 'light' && !revision) {
          const client = await context.newCDPSession(page)
          const frames = []
          client.on('Page.screencastFrame', event => {
            frames.push({ data: event.data, timestamp: event.metadata.timestamp })
            client.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {})
          })
          await client.send('Page.startScreencast', { format: 'jpeg', quality: 65, maxWidth: 960, maxHeight: 675, everyNthFrame: 10 })
          await page.locator('.nh3-release-wallpaper.is-entering').waitFor({ state: 'attached', timeout: 35000 })
          await page.waitForTimeout(500)
          await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')) })
          const frozen = await page.locator('.nh3-release-wallpaper.is-entering').evaluate(n => getComputedStyle(n).opacity)
          await page.waitForTimeout(500)
          assert.equal(await page.locator('.nh3-release-wallpaper.is-entering').evaluate(n => getComputedStyle(n).opacity), frozen)
          await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')) })
          await page.locator('.nh3-release-wallpaper.is-entering').waitFor({ state: 'detached', timeout: 8000 })
          await client.send('Page.stopScreencast')
          const dir = path.join(output, 'motion'); fs.mkdirSync(dir)
          frames.forEach((f, i) => fs.writeFileSync(path.join(dir, `${String(i).padStart(4, '0')}.jpg`), Buffer.from(f.data, 'base64')))
          fs.writeFileSync(path.join(dir, 'timestamps.json'), JSON.stringify(frames.map(f => f.timestamp)))
          assert.ok(frames.length > 5)
        }
      }
      await page.screenshot({ path: path.join(output, `${name}.png`) })
      assert.deepEqual(errors, [])
      report.push({ name, layout })
      await context.close()
    }
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2))
    console.log(JSON.stringify({ passed: true, cases: report.length, output }))
  } finally {
    for (const socket of sockets) socket.destroy()
    server.close()
    await Promise.race([browser.close(), new Promise(r => setTimeout(r, 3000))])
    await Promise.race([bs.kill(), new Promise(r => setTimeout(r, 3000))])
    if (bs.process().exitCode === null) bs.process().kill('SIGKILL')
  }
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
