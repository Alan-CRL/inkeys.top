// 仅本地生产产物＋隔离临时profile的无窗口Edge验证，不访问用户浏览器会话。
const fs = require('node:fs')
const assert = require('node:assert/strict')
const path = require('node:path')
const http = require('node:http')
const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))
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
    browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, chromiumSandbox: true, timeout: 20000, args: ['--no-first-run', '--no-default-browser-check'] })
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.addInitScript(forceCoarse => {
      if (forceCoarse) {
        const originalMatchMedia = window.matchMedia.bind(window)
        window.matchMedia = query => {
          const result = originalMatchMedia(query)
          if (query.includes('pointer') || query.includes('hover')) Object.defineProperty(result, 'matches', { value: false })
          return result
        }
      }
      window.__parallaxProbe = { moves: 0, resizeCallbacks: 0, resizeEvents: 0 }
      addEventListener('pointermove', () => window.__parallaxProbe.moves++, true)
      addEventListener('resize', () => window.__parallaxProbe.resizeEvents++)
      const Observer = ResizeObserver
      window.ResizeObserver = class extends Observer {
        constructor(callback) { super((entries, observer) => { window.__parallaxProbe.resizeCallbacks++; callback(entries, observer) }) }
      }
    }, process.env.PARALLAX_FORCE_COARSE === '1')
    await page.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort())
    await page.goto(process.env.PARALLAX_URL || 'http://127.0.0.1:' + server.address().port + '/new-index3.html', { waitUntil: 'networkidle', timeout: 20000 })
    const read = () => page.evaluate(() => {
      const outer = document.querySelector('.nh3-plane'), inner = document.querySelector('.nh3-surface'), canvas = document.querySelector('.nh3-mark'), root = document.querySelector('.nh3-root')
      const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height } }
      return { reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, fine: matchMedia('(any-hover: hover) and (any-pointer: fine)').matches, outer: rect(outer), inner: rect(inner), root: rect(root), transform: getComputedStyle(inner).transform, perspective: getComputedStyle(outer).perspective, canvasPixels: [canvas.width, canvas.height], visibility: document.visibilityState, events: window.__parallaxProbe }
    })
    console.log('before', JSON.stringify(await read()))
    const box = await page.locator('.nh3-plane').boundingBox()
    await page.mouse.move(box.x + box.width * .93, box.y + box.height * .82)
    await page.waitForTimeout(1600)
    const tilted = await read()
    console.log('after', JSON.stringify(tilted))
    assert.match(tilted.transform, /^matrix3d/,'真实鼠标必须触发视差')
    assert.deepEqual(tilted.outer, (await read()).outer)
    await page.dispatchEvent('body', 'pointermove', { pointerType: 'touch', clientX: box.x, clientY: box.y })
    await page.waitForTimeout(600)
    assert.equal((await read()).transform, tilted.transform, '触摸不改变鼠标视差目标')
    await page.mouse.move(0, 0)
    await page.waitForTimeout(1500)
    console.log('returned', JSON.stringify(await read()))
    const returned = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.nh3-surface')).transform).isIdentity)
    assert.ok(returned, '离开作用范围应回正')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.mouse.move(box.x + box.width * .93, box.y + box.height * .82)
    await page.waitForTimeout(300)
    assert.ok(await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.nh3-surface')).transform).isIdentity), '减少动态效果禁止视差')
    console.log('PASS mouse/touch/return/reduced-motion')
    console.log('errors', JSON.stringify(errors))
  } finally {
    if (browser) await Promise.race([browser.close({ reason: 'parallax verification complete' }), new Promise(resolve => setTimeout(resolve, 10000))])
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
  }
})().then(() => process.exit(0), error => { console.error(error); process.exit(1) })
