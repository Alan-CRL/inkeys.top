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

async function sample(page) {
  return page.evaluate(() => {
    const shell = document.querySelector('.new-home3-page')
    const nav = document.querySelector('.vp-nav')
    const bar = document.querySelector('.vp-navbar')
    const style = getComputedStyle(nav)
    const rect = nav.getBoundingClientRect()
    const aperture = document.querySelector('.nh3-frame-aperture')?.getBoundingClientRect()
    return {
      y: scrollY, max: document.documentElement.scrollHeight - innerHeight,
      overflow: document.documentElement.scrollWidth > innerWidth,
      stage: shell?.getAttribute('data-nh3-frame'),
      amount: Number(shell?.style.getPropertyValue('--nh3-frame-amount')),
      navVisible: style.visibility !== 'hidden' && Number(style.opacity) > .95 && rect.bottom > 0,
      inert: nav.inert, barColor: getComputedStyle(bar).backgroundColor,
      aperture: aperture && { x: aperture.x, y: aperture.y, right: aperture.right, bottom: aperture.bottom },
    }
  })
}
async function scroll(page, y) {
  await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y)
  await page.waitForTimeout(420)
  return sample(page)
}
async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  const browserServer = await chromium.launchServer({ channel: 'msedge', headless: true, timeout: 30000 })
  const browser = await chromium.connect(browserServer.wsEndpoint())
  const report = []
  console.log(`Artifacts: ${output}`)
  try {
    for (const js of (ambientOnly ? [] : smoke || navOnly ? [true] : [true, false])) for (const theme of (smoke ? ['light'] : ['light', 'dark'])) for (const width of (smoke || navOnly ? [390, 1280] : [320, 390, 768, 900, 960, 1280, 1920])) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, javaScriptEnabled: js })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort())
      await page.goto(`${origin}/new-index3.html?theme=${theme}`, { waitUntil: 'load' })
      await page.waitForTimeout(js ? 300 : 0)
      const name = `${theme}-${width}-${js ? 'js' : 'nojs'}`
      const top = await sample(page)
      assert.equal(top.overflow, false, `${name}: horizontal overflow`)
      assert.ok(top.max > 100, `${name}: document can scroll`)
      const middleY = Math.max(30, Math.min(900 * .14, top.max * .22) + 10)
      const middle = await scroll(page, middleY)
      if (js) {
        assert.equal(top.y, 0, `${name}: entry starts at top`)
        assert.equal(top.aperture, undefined, `${name}: no viewport frame`)
        assert.ok(middle.navVisible, `${name}: framed nav ${JSON.stringify(middle)}`)
        await page.screenshot({ path: path.join(output, `${name}-framed.png`) })
        const deep = await scroll(page, top.max)
        assert.ok(!deep.navVisible && deep.inert, `${name}: expanded ${JSON.stringify(deep)}`)
        const recalled = await scroll(page, top.max - 40)
        assert.ok(recalled.navVisible && !recalled.inert, `${name}: recall ${JSON.stringify(recalled)}`)
        await page.screenshot({ path: path.join(output, `${name}-recalled.png`) })
        const expanded = await scroll(page, top.max)
        assert.ok(expanded.inert, `${name}: hides again`)
        if (theme === 'light' && width === 1280) {
          await scroll(page, top.max - 40)
          await page.locator('.vp-navbar-title a').focus()
          const focused = await scroll(page, top.max)
          assert.ok(focused.navVisible && !focused.inert, 'focused navbar stays available')
          await page.evaluate(() => document.activeElement.blur())
        }
        if (theme === 'light' && width === 390) {
          await scroll(page, top.max - 40)
          await page.getByRole('button', { name: 'mobile navigation' }).click()
          await page.waitForTimeout(400)
          assert.equal(await page.getByRole('button', { name: 'mobile navigation' }).getAttribute('aria-expanded'), 'true')
          const menu = await sample(page)
          assert.ok(menu.navVisible && !menu.inert, 'mobile open menu stays available')
          await page.getByRole('button', { name: 'mobile navigation' }).click()
        }
        // 深处刷新必须归零，随后正常滚动不能再被重置。
        await scroll(page, top.max)
        await page.reload({ waitUntil: 'load' })
        await page.waitForTimeout(700)
        assert.equal((await sample(page)).y, 0, `${name}: reload resets scroll`)
        const afterReload = await scroll(page, top.max)
        assert.ok(afterReload.y > 100, `${name}: scrolling remains usable`)
        if (theme === 'light' && [390, 1280].includes(width)) {
          await scroll(page, top.max - 40)
          await page.locator('.vp-navbar-title a').click()
          await page.waitForURL(url => url.pathname === '/')
          assert.equal(await page.locator('.vp-nav').evaluate(node => node.inert), false)
          await page.goBack({ waitUntil: 'load' })
          await page.waitForTimeout(700)
          assert.equal((await sample(page)).y, 0, `${name}: SPA history entry resets scroll`)
          assert.ok((await scroll(page, top.max)).y > 100, `${name}: SPA entry allows subsequent scroll`)
        }
        const returned = await scroll(page, 0)
        assert.ok(returned.navVisible && !returned.inert, `${name}: top restored`)
      }
      else {
        assert.ok(middle.navVisible && !/rgba\([^)]*,\s*0\)|transparent/.test(middle.barColor), `${name}: readable noJS nav`)
        await page.screenshot({ path: path.join(output, `${name}.png`) })
      }
      assert.deepEqual(errors, [], `${name}: browser errors`)
      report.push({ name, top, middle, errors })
      await context.close()
    }
    if (ambientOnly) {
      for (const [random, kind, width, theme] of [[.2, 'pen', 1280, 'light'], [.4, 'laser', 1280, 'dark'], [.6, 'digits', 1280, 'light'], [.8, 'shape', 1280, 'dark'], [.2, 'pen', 390, 'dark']]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme })
        await context.addInitScript(value => { Math.random = () => value }, random)
        const page = await context.newPage()
        await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort())
        await page.goto(`${origin}/new-index3.html?theme=${theme}`, { waitUntil: 'load' })
        const maximum = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
        await scroll(page, maximum)
        const tile = page.locator(`.nh3-ambient-tile[data-kind="${kind}"]`).first()
        await tile.waitFor({ state: 'attached', timeout: 7000 })
        await page.waitForTimeout(700)
        const before = await tile.evaluate(node => ({ top: node.style.top, left: node.style.left }))
        await scroll(page, maximum - 40)
        assert.deepEqual(await tile.evaluate(node => ({ top: node.style.top, left: node.style.left })), before, 'ink anchors to document')
        assert.ok(await page.locator('.nh3-ambient-tile').count() <= (width < 900 ? 1 : 2))
        assert.equal(await page.locator('.nh3-ambient').getAttribute('aria-hidden'), 'true')
        const pointer = await page.locator('.nh3-ambient').evaluate(node => getComputedStyle(node).pointerEvents)
        assert.equal(pointer, 'none')
        await page.screenshot({ path: path.join(output, `ambient-${kind}-${width}.png`) })
        // 页面的真实背景隐藏事件冻结当前帧，恢复后不补播。
        await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')) })
        const frozen = await tile.innerHTML()
        await page.waitForTimeout(450)
        assert.equal(await tile.innerHTML(), frozen)
        await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')) })
        if (kind !== 'laser') {
          await page.locator('.nh3-ambient-eraser').first().waitFor({ state: 'attached', timeout: 6000 })
          await page.screenshot({ path: path.join(output, `ambient-${kind}-${width}-erase.png`) })
        }
        await page.waitForFunction(() => !document.querySelector('.nh3-ambient-tile'), undefined, { timeout: 6000 })
        if (kind === 'shape') {
          // 录制完整滚动和背景轮次，CDP 只捕获本测试页面。
          const framesDir = path.join(output, 'motion-frames')
          fs.mkdirSync(framesDir)
          const client = await context.newCDPSession(page)
          let serial = 0
          const captured = []
          client.on('Page.screencastFrame', event => {
            const file = `${String(serial++).padStart(5, '0')}.jpg`
            fs.writeFileSync(path.join(framesDir, file), Buffer.from(event.data, 'base64'))
            captured.push({ file, timestamp: event.metadata.timestamp })
            client.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {})
          })
          await client.send('Page.startScreencast', { format: 'jpeg', quality: 75, maxWidth: 960, maxHeight: 675, everyNthFrame: 4 })
          await scroll(page, 0)
          await scroll(page, 130)
          await scroll(page, maximum)
          await scroll(page, maximum - 40)
          await page.waitForTimeout(19000)
          await client.send('Page.stopScreencast')
          await client.detach()
          fs.writeFileSync(path.join(framesDir, 'frames.json'), JSON.stringify(captured))
          assert.ok(captured.length > 10, 'captured animation frames')
          // 用原生 VuePress 链接离开路由，检查状态不会泄漏到旧主页。
          await scroll(page, maximum - 80)
          await page.locator('.vp-navbar-title a').click()
          await page.waitForURL(url => url.pathname === '/')
          assert.equal(await page.locator('.nh3-frame-aperture, .nh3-ambient').count(), 0)
          assert.equal(await page.locator('.vp-nav').evaluate(node => node.inert), false)
        }
        report.push({ kind, width, theme, anchored: true, hiddenFrozen: true, erased: true })
        await context.close()
      }
    }
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2))
    console.log(JSON.stringify({ passed: true, cases: report.length, output }))
  }
  finally {
    for (const socket of sockets) socket.destroy()
    server.close()
    // Windows 自动化管道偶尔延迟确认关闭；只结束本次创建的测试浏览器。
    const close = browser.close()
    await Promise.race([close, new Promise(resolve => setTimeout(resolve, 3000))])
    const kill = browserServer.kill()
    await Promise.race([kill, new Promise(resolve => setTimeout(resolve, 3000))])
    const process = browserServer.process()
    if (process.exitCode === null) process.kill('SIGKILL')
  }
}
main().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1) })
