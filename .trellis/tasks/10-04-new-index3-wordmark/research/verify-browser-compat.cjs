// CLI 无窗口真实引擎检查；隔离配置，不读取用户浏览器数据。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const runtime = path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')
const { chromium, webkit } = require(process.env.PLAYWRIGHT_CORE_PATH || path.join(runtime, 'playwright'))
const { PNG } = require(path.join(runtime, 'pngjs'))
const root = path.resolve(__dirname, '../../../../docs/.vuepress/dist')
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' }
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname)
  const filename = path.resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname))
  if (!filename.startsWith(root + path.sep)) { res.writeHead(403).end(); return }
  fs.readFile(filename, (err, data) => {
    if (err) { res.writeHead(404).end(); return }
    res.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream' }).end(data)
  })
})

;(async () => {
  let browser
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    const engine = process.env.BROWSER_ENGINE || 'webkit'
    browser = await (engine === 'webkit' ? webkit : chromium).launch({
      ...(engine === 'edge' ? { executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' } : {}),
      headless: true, timeout: 25000,
    })
    const url = process.env.BROWSER_TEST_URL || `http://127.0.0.1:${server.address().port}/new-index3.html`
    const cases = process.env.BROWSER_QUICK ? [[768, 1024]] : [[320, 568], [768, 1024], [1440, 900], [1440, 500]]
    for (const [width, height] of cases) {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, reducedMotion: 'reduce' })
      const page = await context.newPage()
      page.setDefaultTimeout(15000)
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.route('**/*', route => ['127.0.0.1', 'localhost', new URL(url).hostname].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort())
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForFunction(() => {
        const canvas = document.querySelector('.nh3-mark')
        if (!canvas || !canvas.width || !canvas.height) return false
        const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
        return data.some((value, index) => index % 4 === 3 && value > 64)
      }, null, { timeout: 15000 })
      await page.waitForTimeout(700)
      const probe = await page.evaluate(() => {
        const canvas = document.querySelector('.nh3-mark')
        const plane = document.querySelector('.nh3-plane')
        const surface = document.querySelector('.nh3-surface') || canvas
        const box = plane.getBoundingClientRect()
        return { canvas: [canvas.width, canvas.height], plane: { x: box.x, y: box.y, width: box.width, height: box.height }, perspective: getComputedStyle(plane).perspective, transform: getComputedStyle(surface).transform, reduce: matchMedia('(prefers-reduced-motion: reduce)').matches }
      })
      assert.ok(probe.plane.width > 0 && probe.plane.height > 0)
      // 像素存在不代表合成后可见：截图与隐藏字层的背景作差。
      const clip = { x: Math.max(0, probe.plane.x), y: Math.max(0, probe.plane.y), width: Math.min(width, probe.plane.x + probe.plane.width) - Math.max(0, probe.plane.x), height: Math.min(height, probe.plane.y + probe.plane.height) - Math.max(0, probe.plane.y) }
      const pause = page.getByRole('button', { name: '暂停动画' })
      if (await pause.isEnabled()) await pause.click({ timeout: 3000 })
      await page.waitForTimeout(650)
      const visible = PNG.sync.read(await page.screenshot({ clip }))
      await page.locator('.nh3-plane').evaluate(node => { node.style.visibility = 'hidden' })
      const hidden = PNG.sync.read(await page.screenshot({ clip }))
      await page.locator('.nh3-plane').evaluate(node => { node.style.visibility = '' })
      let changed = 0
      for (let index = 0; index < visible.data.length; index += 4) {
        if (Math.abs(visible.data[index] - hidden.data[index]) + Math.abs(visible.data[index + 1] - hidden.data[index + 1]) + Math.abs(visible.data[index + 2] - hidden.data[index + 2]) > 16) changed++
      }
      assert.ok(changed > 100, `文字有Canvas像素但合成截图不可见 ${engine}/${width}`)
      console.log(JSON.stringify({ engine, viewport: [width, height], url, ...probe, visiblePixels: changed, errors }))
      const transitions = await page.evaluate(() => ({ button: getComputedStyle(document.querySelector('.nh3-playback')).transitionDuration, panel: getComputedStyle(document.querySelector('.nh3-style-panel')).transitionDuration }))
      assert.ok(transitions.button.split(',').some(value => parseFloat(value) > .1), '系统动画设置仍关闭按钮CSS过渡')
      assert.ok(transitions.panel.split(',').some(value => parseFloat(value) > .2), '系统动画设置仍关闭样式栏CSS过渡')
      // BROWSER_ART 仅在开发地址使用现有的定格入口；生产产物只检查外部可见行为。
      if (process.env.BROWSER_ART) {
        await page.getByRole('button', { name: '调整书写样式' }).click()
        await page.getByRole('button', { name: '硬笔', exact: true }).click()
        await page.keyboard.press('Escape')
        await page.getByRole('button', { name: '继续动画' }).click()
        await page.locator('.nh3-art').waitFor({ state: 'visible', timeout: 10000 })
        await page.waitForTimeout(350)
        const artPixels = async () => {
          await page.locator('.nh3-art-shine').evaluate(node => { node.style.visibility = 'hidden' })
          await page.locator('.nh3-eraser-cursor').evaluateAll(nodes => nodes.forEach(node => { node.style.visibility = 'hidden' }))
          const visible = PNG.sync.read(await page.screenshot({ clip }))
          await page.locator('.nh3-plane').evaluate(node => { node.style.visibility = 'hidden' })
          const background = PNG.sync.read(await page.screenshot({ clip }))
          await page.locator('.nh3-plane').evaluate(node => { node.style.visibility = '' })
          let result = 0
          for (let index = 0; index < visible.data.length; index += 4) {
            if (Math.abs(visible.data[index] - background.data[index]) + Math.abs(visible.data[index + 1] - background.data[index + 1]) + Math.abs(visible.data[index + 2] - background.data[index + 2]) > 16) result++
          }
          return result
        }
        const completeArt = await artPixels()
        assert.ok(completeArt > 100, '艺术字没有合成到画面')
        await page.getByRole('button', { name: '调整书写样式' }).click()
        await page.getByRole('button', { name: '橡皮', exact: true }).click()
        await page.keyboard.press('Escape')
        await page.waitForFunction(() => {
          const state = document.querySelector('.nh3-root').__vueParentComponent.setupState
          if ((state.eraserFrame?.paths.length || 0) < 150) return false
          state.frozen = state.clock.read(performance.now())
          state.clock.setRunning(false, performance.now())
          return true
        }, null, { timeout: 10000 })
        await page.waitForTimeout(50)
        const partialArt = await artPixels()
        const mask = await page.evaluate(() => {
          const state = document.querySelector('.nh3-root').__vueParentComponent.setupState
          const art = document.querySelector('.nh3-art')
          return { backend: state.cssCanvasMask ? 'named CSS Canvas' : 'SVG', paths: state.eraserFrame.paths.length, mask: getComputedStyle(art).webkitMaskImage || getComputedStyle(art).maskImage }
        })
        assert.ok(partialArt > 0 && partialArt < completeArt, '艺术字擦除未逐步移除像素')
        await page.locator('.nh3-art').evaluate(node => { node.style.opacity = '.5' })
        const fadedArt = await artPixels()
        assert.ok(fadedArt <= partialArt, '暂停淡出使被擦区域重新出现')
        await page.evaluate(() => {
          const state = document.querySelector('.nh3-root').__vueParentComponent.setupState
          state.clock.seek(state.frozen, performance.now())
          state.frozen = undefined
          state.clock.setRunning(true, performance.now())
          state.requestFrame()
        })
        await page.waitForFunction(() => {
          const state = document.querySelector('.nh3-root').__vueParentComponent.setupState
          if ((state.eraserFrame?.paths.length || 0) < 577) return false
          state.frozen = state.clock.read(performance.now())
          state.clock.setRunning(false, performance.now())
          return true
        }, null, { timeout: 8000 })
        await page.waitForTimeout(50)
        const residue = await artPixels()
        assert.equal(residue, 0, '真实浏览器艺术字遮罩擦除有残留')
        await page.mouse.move(probe.plane.x + probe.plane.width * .85, probe.plane.y + probe.plane.height * .75)
        await page.waitForTimeout(500)
        assert.equal(await artPixels(), 0, '视差时擦除区域恢复')
        await page.setViewportSize({ width: width - 20, height })
        await page.waitForTimeout(150)
        assert.equal(await artPixels(), 0, '缩放后擦除区域恢复')
        console.log(JSON.stringify({ engine, completeArt, partialArt, fadedArt, residue, ...mask, result: 'PASS art mask opacity/tilt/resize' }))
      }
      await context.close()
    }
    console.log('PASS actual browser Canvas pixels and composited lettering')
  } finally {
    if (browser) await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 10000))])
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
  }
})().then(() => process.exit(0), error => { console.error(error); process.exit(1) })
