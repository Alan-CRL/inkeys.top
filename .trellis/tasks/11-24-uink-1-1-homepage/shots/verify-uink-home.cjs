// UInk 主页的无窗口验收：服务已构建的 dist，用 headless Edge 截图并检查交互；不打开任何可见窗口。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')

const root = path.resolve(__dirname, '../../../..')
const dist = path.join(root, 'docs/.vuepress/dist')
const output = __dirname
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8' }

const server = http.createServer((req, res) => {
  const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '')
  let file = path.resolve(dist, relative || 'index.html')
  if (file !== dist && !file.startsWith(dist + path.sep)) { res.writeHead(403).end(); return }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
  else if (!path.extname(file)) file += '.html'
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
})

const LEVELS = ['core', 'basic', 'standard', 'full', 'inkeys']

// 把首屏动画固定到某一时刻，截图可重复
async function freezeHero(page, ms) {
  await page.evaluate(ms => {
    for (const a of document.querySelector('.uink-hero').getAnimations({ subtree: true })) {
      a.pause()
      a.currentTime = ms
    }
  }, ms)
  await page.waitForTimeout(100)
}

// Plume 的侧边栏是 fixed，fullPage 截图会错位；改为把视口拉到文档高度后普通截图
async function fullShot(page, file) {
  const size = page.viewportSize()
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  await page.setViewportSize({ width: size.width, height })
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(output, file) })
  await page.setViewportSize(size)
  await page.waitForTimeout(200)
}

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}/standard/`
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.BROWSER_BIN || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  })
  const errors = []
  const log = {}
  const open = async (options) => {
    const context = await browser.newContext(options)
    const page = await context.newPage()
    page.on('pageerror', e => errors.push(`pageerror: ${e}`))
    page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })
    page.on('requestfailed', r => { if (r.url().startsWith('http://127.0.0.1')) errors.push(`requestfailed: ${r.url()}`) })
    await page.goto(url, { waitUntil: 'load' })
    await page.waitForSelector('.uink-hero[data-state]')
    await page.waitForTimeout(400)
    return { context, page }
  }

  try {
    // 1. 桌面浅色：播放状态、离开视口暂停、键盘切换、整页与分级截图
    {
      const { context, page } = await open({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' })
      const hero = page.locator('.uink-hero')
      log.desktopInitial = await hero.getAttribute('data-state')
      assert.equal(log.desktopInitial, 'playing')

      // 导航与侧边栏入口
      log.navbarLink = await page.locator('.vp-navbar a[href="/standard/"]').count()
      log.sidebarOverview = await page.locator('.vp-sidebar a[href="/standard/"]').count()
      assert.ok(log.navbarLink >= 1, 'navbar has UInk 规范')
      assert.ok(log.sidebarOverview >= 1, 'sidebar has 概览')

      // 首屏中途画面：9 s 一轮中 6.1 s 处于展开过程
      await freezeHero(page, 6100)
      await page.locator('.uink-hero').screenshot({ path: path.join(output, 'hero-mid-fan.png') })
      await freezeHero(page, 4900)
      await page.locator('.uink-hero').screenshot({ path: path.join(output, 'hero-collapsed.png') })
      // 恢复 CSS 动画控制
      await page.evaluate(() => { for (const a of document.querySelector('.uink-hero').getAnimations({ subtree: true })) a.play() })

      // 离开视口暂停，回到视口继续
      await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
      await page.waitForTimeout(500)
      log.offscreen = await hero.getAttribute('data-state')
      assert.equal(log.offscreen, 'paused')
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
      await page.waitForTimeout(500)
      log.backInView = await hero.getAttribute('data-state')
      assert.equal(log.backInView, 'playing')

      // 手动暂停
      await page.locator('.uink-hero__toggle').click()
      log.userPaused = await hero.getAttribute('data-state')
      log.toggleLabel = await page.locator('.uink-hero__toggle').getAttribute('aria-label')
      assert.equal(log.userPaused, 'paused')
      await page.locator('.uink-hero__toggle').click()

      // Tab 能到达分段按钮，方向键切换等级
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0) })
      let tabs = 0
      for (; tabs < 80; tabs++) {
        await page.keyboard.press('Tab')
        if (await page.evaluate(() => document.activeElement?.classList.contains('uink-tier__option'))) break
      }
      const tier = page.locator('.uink-tier')
      log.tabsToControl = tabs + 1
      assert.ok(tabs < 80, 'Tab reaches the segmented control')
      log.focusedLabel = await page.evaluate(() => document.activeElement.textContent.trim())
      const keys = []
      for (const key of ['ArrowRight', 'ArrowRight', 'ArrowLeft', 'End', 'Home', 'ArrowLeft']) {
        await page.keyboard.press(key)
        keys.push([key, await tier.getAttribute('data-level'), await page.evaluate(() => document.activeElement.textContent.trim())])
      }
      log.keyboard = keys
      assert.deepEqual(keys.map(k => k[1]), ['basic', 'standard', 'basic', 'inkeys', 'core', 'inkeys'])
      await tier.locator('.uink-tier__option').first().focus()
      await page.keyboard.press('Home')
      await tier.locator('.uink-tier__option').first().screenshot({ path: path.join(output, 'tier-focus-ring.png') })
      await page.evaluate(() => document.activeElement?.blur())

      // 五个等级逐个点击截图
      for (const [index, key] of LEVELS.entries()) {
        await tier.locator('.uink-tier__option').nth(index).click()
        await page.evaluate(() => document.activeElement?.blur())
        await page.waitForTimeout(350)
        assert.equal(await tier.getAttribute('data-level'), key)
        await tier.screenshot({ path: path.join(output, `tier-${index}-${key}.png`) })
      }
      await tier.locator('.uink-tier__option').first().click()
      await page.evaluate(() => document.activeElement?.blur())

      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(300)
      await freezeHero(page, 0)
      await fullShot(page, 'desktop-1440-light-full.png')
      log.desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      await context.close()
    }

    // 2. 桌面深色整页
    {
      const { context, page } = await open({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' })
      log.darkTheme = await page.evaluate(() => document.documentElement.dataset.theme || document.documentElement.className)
      await freezeHero(page, 0)
      await fullShot(page, 'desktop-1440-dark-full.png')
      await page.locator('.uink-tier .uink-tier__option').nth(4).click()
      await page.evaluate(() => document.activeElement?.blur())
      await page.waitForTimeout(350)
      await page.locator('.uink-tier').screenshot({ path: path.join(output, 'tier-4-inkeys-dark.png') })
      await context.close()
    }

    // 3. 手机浅色整页
    {
      const { context, page } = await open({ viewport: { width: 390, height: 844 }, colorScheme: 'light', isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
      log.mobileState = await page.locator('.uink-hero').getAttribute('data-state')
      await freezeHero(page, 0)
      await fullShot(page, 'mobile-390-light-full.png')
      log.mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      assert.ok(log.mobileOverflow <= 0, '390px has no horizontal overflow')
      await context.close()
    }

    // 4. 减少动态效果：首屏静态展开，无暂停按钮，无动画
    {
      const { context, page } = await open({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', reducedMotion: 'reduce' })
      log.reducedState = await page.locator('.uink-hero').getAttribute('data-state')
      log.reducedToggle = await page.locator('.uink-hero__toggle').count()
      log.reducedAnimations = await page.evaluate(() => document.querySelector('.uink-hero').getAnimations({ subtree: true }).length)
      assert.equal(log.reducedState, 'static')
      assert.equal(log.reducedToggle, 0)
      assert.equal(log.reducedAnimations, 0)
      await page.screenshot({ path: path.join(output, 'desktop-1440-reduced-motion-first-screen.png') })
      await context.close()
    }

    log.errors = errors
    fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(log, null, 2))
    console.log(JSON.stringify(log, null, 2))
    assert.deepEqual(errors, [])
    console.log('PASS')
  } finally {
    server.closeAllConnections()
    server.close()
    // headless Edge 的 close 偶尔不返回，最多等 5 秒
    await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 5000))])
  }
}

// Edge 关闭后偶尔残留句柄，结果已写出，显式退出
main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => process.exit())
