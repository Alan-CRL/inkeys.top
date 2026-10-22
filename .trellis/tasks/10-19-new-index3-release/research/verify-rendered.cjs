// 仅命令行、隔离配置的无窗口渲染检查，不读取用户浏览器资料。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const { spawnSync } = require('node:child_process')

const task = path.resolve(__dirname, '..')
const root = path.resolve(task, '../../../docs/.vuepress/dist')
const temporary = path.resolve(task, '../../.runtime/release-browser-temp')
const output = path.resolve(task, '../../.runtime/release-rendered')
fs.mkdirSync(temporary, { recursive: true })
fs.mkdirSync(output, { recursive: true })
process.env.TEMP = temporary
process.env.TMP = temporary
const { chromium } = require('C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png' }
const results = []
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname)
  const filename = path.resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname))
  if (!filename.startsWith(root + path.sep)) { res.writeHead(403).end(); return }
  fs.readFile(filename, (error, data) => {
    if (error) { res.writeHead(404).end(); return }
    res.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream' }).end(data)
  })
})

async function main() {
  const html = fs.readFileSync(path.join(root, 'new-index3.html'), 'utf8')
  assert.ok(html.includes('Inkeys3 焕新发布'), 'production SSR must contain the release heading')
  let browser
  let browserServer
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    browserServer = await chromium.launchServer({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, host: '127.0.0.1', timeout: 25000 })
    browser = await chromium.connect(browserServer.wsEndpoint())
    const origin = `http://127.0.0.1:${server.address().port}`
    const cases = process.env.RENDER_QUICK ? [[1440, 900, 'light'], [1440, 900, 'dark'], [375, 812, 'dark']] : [[1440, 900, 'light'], [1440, 900, 'dark'], [375, 812, 'light'], [320, 568, 'dark'], [768, 1024, 'light'], [1920, 1080, 'dark']]
    for (const [width, height, colorScheme] of cases) {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, colorScheme, reducedMotion: 'reduce' })
      const page = await context.newPage()
      const pageErrors = []
      page.on('pageerror', error => pageErrors.push(error.message))
      page.setDefaultTimeout(10000)
      await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
      await page.addInitScript(() => {
        const raf = window.requestAnimationFrame.bind(window)
        window.__releaseRafRequests = 0
        window.requestAnimationFrame = callback => { window.__releaseRafRequests++; return raf(callback) }
      })
      await page.goto(`${origin}/new-index3.html`, { waitUntil: 'networkidle', timeout: 30000 })
      // 高屏可能同时看见首屏边缘，先通过原有暂停控件隔离本板块的空闲调度。
      await page.getByRole('button', { name: '暂停动画', exact: true }).click()
      const section = page.locator('.nh3-release')
      await section.waitFor()
      await section.scrollIntoViewIfNeeded()
      await page.waitForTimeout(2900)
      await page.mouse.move(0, 0)
      await page.waitForTimeout(900)
      const probe = await page.evaluate(() => {
        const section = document.querySelector('.nh3-release')
        const bar = section.querySelector('.nh-bar')
        const main = bar.querySelector('.nh-main-btn')
        const heading = section.querySelector('h2')
        const plane = section.querySelector('.nh3-release-plane')
        const surface = section.querySelector('.nh3-release-surface')
        const rect = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right } }
        const opacity = node => { let value = 1; while (node && section.contains(node)) { value *= Number(getComputedStyle(node).opacity); node = node.parentElement } return value }
        const toolbar = bar.querySelector('.nh-main-bar')
        const logo = main.querySelector('.nh-main-logo')
        return {
          theme: document.documentElement.getAttribute('data-theme'), reduce: matchMedia('(prefers-reduced-motion: reduce)').matches,
          viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
          bar: rect(bar), plane: rect(plane), main: rect(main), logo: logo && rect(logo),
          logoLoaded: logo && (logo.tagName !== 'IMG' || (logo.complete && logo.naturalWidth === 256 && logo.naturalHeight === 256)),
          visibleHeadingOpacity: opacity(heading), visibleBarOpacity: opacity(bar),
          headingOpacity: getComputedStyle(heading).opacity, headingColor: getComputedStyle(heading).color,
          inkCount: section.querySelectorAll('.nh3-release-ink').length,
          surfaceTransform: getComputedStyle(surface).transform,
          darkSurface: getComputedStyle(toolbar).backgroundColor,
          labels: [...bar.querySelectorAll('.nh-bb-label')].map(node => node.textContent.trim()),
          pressed: [...bar.querySelectorAll('[aria-pressed="true"]')].length,
          buttonCount: bar.querySelectorAll('button').length,
          download: [...bar.querySelectorAll('a')].map(node => ({ text: node.textContent.trim(), href: node.getAttribute('href'), target: node.getAttribute('target') })),
          raf: window.__releaseRafRequests,
        }
      })
      assert.equal(probe.theme, colorScheme)
      assert.ok(probe.reduce, 'the reduced-motion override must be exercised')
      assert.equal(Number(probe.headingOpacity), 1)
      assert.equal(probe.visibleHeadingOpacity, 1)
      assert.equal(probe.visibleBarOpacity, 1)
      assert.equal(probe.inkCount, 0, 'the release background strokes must be removed')
      assert.ok(probe.scrollWidth <= width + 1, `page overflow at ${width}: ${probe.scrollWidth}`)
      assert.ok(probe.bar.x >= -1 && probe.bar.right <= width + 1, `toolbar out of viewport at ${width}`)
      assert.ok(probe.bar.width > 200 && probe.bar.height > 20, 'the complete toolbar must be rendered')
      assert.deepEqual(probe.labels, ['选择', '绘制', '图形', '橡皮', '撤回', '白板', '定格'])
      assert.equal(probe.pressed, 0)
      assert.equal(probe.buttonCount, 8)
      assert.ok(probe.logo && Math.abs(probe.logo.width - probe.main.width) < 1, 'native Logo must keep its full 80px canvas')
      assert.ok(probe.logoLoaded, 'native SVG must finish loading with its original full canvas')
      assert.equal(probe.darkSurface, 'rgba(24, 24, 24, 0.8)')
      assert.ok(probe.download.some(link => link.href === 'https://1709404.share.123pan.cn/123pan/duk9-Gdr4d' && link.target === '_blank'))
      assert.equal(pageErrors.length, 0, pageErrors.join('\n'))
      const idleStart = await page.evaluate(() => window.__releaseRafRequests)
      await page.waitForTimeout(450)
      const idle = await page.evaluate(start => window.__releaseRafRequests - start, idleStart)
      assert.equal(idle, 0, 'the visible settled section must not schedule idle frames')
      const filename = path.join(output, `release-${width}-${colorScheme}.png`)
      await section.screenshot({ path: filename, timeout: 10000 })
      results.push({ ...probe, idleRafRequests: idle, screenshot: filename, errors: pageErrors })
      console.log(JSON.stringify({ viewport: [width, height], theme: colorScheme, toolbar: probe.bar, idleRafRequests: idle, screenshot: filename }))
      if (width === 1440 && colorScheme === 'light') {
        const before = await page.locator('.nh3-release-surface').evaluate(node => node.style.transform)
        const target = await page.locator('.nh3-release-plane').boundingBox()
        await page.mouse.move(target.x + target.width * .8, target.y + target.height * .7)
        await page.waitForTimeout(900)
        const after = await page.locator('.nh3-release-surface').evaluate(node => node.style.transform)
        assert.notEqual(after, before, 'real mouse input must tilt the toolbar')
        await page.locator('.nh3-release .nh-bb').first().click()
        await page.waitForTimeout(650)
        assert.equal(await page.locator('.nh3-release [aria-pressed="true"]').count(), 0, 'tool click must not select a tool')
        await page.mouse.move(0, 0)
        await page.waitForTimeout(1300)
        await page.evaluate(() => window.scrollTo(0, 0))
        await page.waitForTimeout(200)
        await section.scrollIntoViewIfNeeded()
        await page.waitForTimeout(150)
        assert.equal(await section.locator('h2').evaluate(node => getComputedStyle(node).opacity), '1', 're-entry must not hide/replay the heading')
      }
      await context.close()
    }
    for (const width of (process.env.RENDER_QUICK ? [320] : [320, 375, 768, 1440, 1920])) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, javaScriptEnabled: false, colorScheme: 'light' })
      const page = await context.newPage()
      await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
      await page.goto(`${origin}/new-index3.html`, { waitUntil: 'networkidle', timeout: 30000 })
      const section = page.locator('.nh3-release')
      await section.scrollIntoViewIfNeeded()
      const probe = await section.evaluate(node => {
        const bar = node.querySelector('.nh-bar').getBoundingClientRect()
        const heading = node.querySelector('h2')
        let opacity = 1
        for (let current = heading; current && node.contains(current); current = current.parentElement) opacity *= Number(getComputedStyle(current).opacity)
        return { width: bar.width, height: bar.height, left: bar.left, right: bar.right, scrollWidth: document.documentElement.scrollWidth, opacity }
      })
      assert.ok(probe.left >= -1 && probe.right <= width + 1, `JS-disabled toolbar clipped at ${width}: ${JSON.stringify(probe)}`)
      assert.ok(probe.width > 200 && probe.height > 20)
      assert.ok(probe.scrollWidth <= width + 1)
      assert.equal(probe.opacity, 1)
      results.push({ javaScriptEnabled: false, viewport: width, ...probe })
      console.log(JSON.stringify({ javaScriptEnabled: false, viewport: width, ...probe }))
      await context.close()
    }
    fs.writeFileSync(path.join(output, process.env.RENDER_QUICK ? 'quick-results.json' : 'results.json'), JSON.stringify({ engine: browser.version(), results }, null, 2))
    console.log('PASS: real headless layout, themes, reduced-motion, native dark shell, scaled complete toolbar, Logo canvas, idle scheduling and mouse/click/re-entry checks')
  } finally {
    // 隔离浏览器可能保留 HTTP keep-alive 连接，先关闭测试服务连接再等待退出。
    const serverClosed = new Promise(resolve => server.close(resolve))
    server.closeAllConnections()
    await serverClosed
    console.log('Local test server closed')
    // connect 客户端需先断开，否则 server.kill 会等待自身的 WebSocket 连接关闭。
    const bounded = async promise => {
      let timer
      try { await Promise.race([promise, new Promise(resolve => { timer = setTimeout(resolve, 3000) })]) }
      finally { clearTimeout(timer) }
    }
    if (browser) await bounded(browser.close())
    // 仅终止本脚本拥有的隔离实例，不接触用户的 Edge 窗口或配置。
    if (browserServer) {
      await bounded(browserServer.kill())
      const child = browserServer.process()
      if (child.exitCode === null && child.signalCode === null) {
        // runner 的 ChildProcess 退出事件可能未送达，用操作系统按确切 PID 再次只读确认。
        assert.ok(Number.isInteger(child.pid) && child.pid > 0 && child.pid !== process.pid)
        const probe = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `if (Get-Process -Id ${child.pid} -ErrorAction SilentlyContinue) { exit 3 } else { exit 0 }`], { windowsHide: true, timeout: 10000, encoding: 'utf8' })
        assert.equal(probe.status, 0, `owned browser PID ${child.pid} still exists: ${probe.stderr || ''}`)
      }
    }
    console.log('Headless browser closed')
  }
}

// Runner 偶尔留下已退出浏览器的客户端传输句柄；所有断言和进程退出检查完成后结束本 CLI。
main().then(() => process.exit(0)).catch(error => { console.error(error.stack); process.exit(1) })
