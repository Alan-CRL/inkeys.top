// 对生产页做无窗口验收。所有截图写入本次专用目录。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const httpServer = require('http-server')
const { PNG } = require('pngjs')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))
const dist = path.resolve(__dirname, '../../../docs/.vuepress/dist')
const output = fs.mkdtempSync(path.join(os.tmpdir(), 's5b-screens-'))
const mobileOnly = process.argv.includes('--mobile')

async function checkGlass(card, result) {
  // 只切换窗后的黑白底，真实像素的差值就是该处透过的背景量。
  // 主栏的模糊会把上方窗口的像素晕进来，测底板透出量时暂时关掉主栏模糊。
  await card.evaluate(el => el.querySelectorAll('.nh3-craft-bar-glass').forEach(glass => glass.style.setProperty('backdrop-filter', 'none')))
  const frames = []
  for (const color of ['black', 'white']) {
    await card.evaluate((el, color) => el.style.setProperty('--wallpaper', `linear-gradient(${color}, ${color})`), color)
    frames.push(PNG.sync.read(await card.screenshot({ animations: 'disabled' })))
  }
  await card.evaluate(el => el.style.removeProperty('--wallpaper'))
  await card.evaluate(el => el.querySelectorAll('.nh3-craft-bar-glass').forEach(glass => glass.style.removeProperty('backdrop-filter')))
  const samples = {}
  for (const [name, x, y] of [['sidebar', .21, .52], ['banner', .3, .5], ['wordmark', .405, .4]]) {
    const col = Math.round(result.window.x - result.card.x + x * result.window.width)
    const row = Math.round(result.window.y - result.card.y + y * result.window.height)
    const offset = 4 * (row * frames[0].width + col)
    samples[name] = (frames[1].data[offset] - frames[0].data[offset]) / 255
  }
  // 主栏底板上图标之间、位于窗口下沿以下的一点。
  const barCol = Math.round(result.bar.x - result.card.x + .8754 * result.bar.width)
  const barRow = Math.round(result.bar.y - result.card.y + .69 * result.bar.height)
  const barOffset = 4 * (barRow * frames[0].width + barCol)
  samples.bar = (frames[1].data[barOffset] - frames[0].data[barOffset]) / 255
  // 窗底与主栏底板统一为 60% 不透明（透出 102/255），横幅卡片保持原生的 15/255。
  assert.ok(Math.abs(samples.sidebar - 102 / 255) < .015 && Math.abs(samples.bar - 102 / 255) < .015, `window and bar surfaces share the lighter web backdrop ${JSON.stringify(samples)}`)
  assert.ok(Math.abs(samples.banner - 15 / 255) < .015, 'the banner card keeps its native transmission')
  assert.ok(Math.abs(samples.wordmark) < .02, 'the same background change preserves opaque Inkeys lettering')
  return samples
}

async function verifyForest(page, locale, theme, width) {
  const card = page.locator('.nh3-ink')
  await card.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
  const result = await card.evaluate(async panel => {
    const style = getComputedStyle(panel)
    const source = new Image()
    source.src = style.backgroundImage.match(/url\("([^"]+)"\)/)[1]
    await source.decode()
    const title = panel.querySelector('h2').getBoundingClientRect()
    const lead = panel.querySelector('.nh3-lead').getBoundingClientRect()
    const media = panel.querySelector('.nh3-ink-media').getBoundingClientRect()
    return { src: source.src, width: source.naturalWidth, height: source.naturalHeight,
      cover: style.backgroundSize, area: media.width / media.height,
      contentOrder: title.bottom <= lead.top && lead.bottom < media.top,
      demo: panel.querySelector('.nh3-media-placeholder').textContent.trim() }
  })
  assert.match(result.src, /\/performance-forest\.webp$/)
  assert.deepEqual([result.width, result.height, result.cover], [1536, 1024, 'cover'])
  assert.ok(result.contentOrder && result.demo && Math.abs(result.area - (width > 880 ? 21 / 9 : 16 / 10)) < .01)
  await card.screenshot({ path: path.join(output, `forest-${locale}-${theme}-${width}.png`), animations: 'disabled' })
  return result
}

async function verify(page, locale, theme, width, fallback = false) {
  const card = page.locator('.nh3-craft')
  await card.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await page.waitForFunction(({ locale, theme }) =>
    document.documentElement.dataset.theme === theme &&
    getComputedStyle(document.querySelector('.nh3-craft-bar'), '::after').backgroundImage.includes(`toolbar-${locale}-${theme}.png`), { locale, theme })
  const result = await card.evaluate(async (panel, { locale, theme, width }) => {
    const geometry = el => {
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }
    }
    const settings = panel.querySelector('.nh3-craft-window')
    const bar = panel.querySelector('.nh3-craft-bar')
    const native = getComputedStyle(settings, '::after').backgroundImage
    const toolbar = getComputedStyle(bar, '::after').backgroundImage
    const wall = getComputedStyle(panel).backgroundImage
    const layers = [toolbar, wall]
    if (width > 560) layers.push(native)
    for (const layer of layers) {
      const img = new Image()
      img.src = layer.match(/^url\("(.*)"\)$/)[1]
      await img.decode()
    }
    const copy = getComputedStyle(settings, '::before')
    return { locale, theme, width, card: geometry(panel), text: geometry(panel.querySelector('.nh3-craft-text')),
      window: geometry(settings), bar: geometry(bar), native, wall, toolbar,
      fallback: { width: parseFloat(copy.width), height: parseFloat(copy.height), x: parseFloat(copy.left),
        y: parseFloat(copy.top), src: copy.backgroundImage, position: copy.backgroundPosition },
      position: getComputedStyle(panel).backgroundPosition,
      blur: getComputedStyle(settings).backdropFilter, alt: [settings.ariaLabel, bar.ariaLabel],
      overflow: document.documentElement.scrollWidth > window.innerWidth }
  }, { locale, theme, width })
  assert.match(result.wall, new RegExp(`wallpaper-${theme}\\.webp`))
  assert.match(result.native, new RegExp(`settings-${locale}-${theme}\\.png`))
  assert.deepEqual(result.alt, { 'zh-CN': ['设置界面', '主栏'], 'zh-TW': ['設定介面', '主欄'], 'en-US': ['Settings window', 'Main bar'] }[locale])
  assert.ok(!result.overflow && result.bar.x >= result.card.x && result.bar.right <= result.card.right + 1)
  if (width > 560) {
    if (fallback) {
      const tile = result.fallback
      assert.match(tile.src, new RegExp(`wallpaper-${theme}-blur\\.webp`))
      assert.equal(tile.position, result.position)
      assert.ok(Math.abs(tile.width - result.card.width) <= 1 && Math.abs(tile.height - result.card.height) <= 1)
      assert.ok(Math.abs(tile.x + result.window.x - result.card.x) <= 1 && Math.abs(tile.y + result.window.y - result.card.y) <= 1)
    } else assert.equal(result.blur, 'blur(18px)')
    assert.ok(result.window.right > result.card.right && result.window.y >= result.card.y)
    const nativeMargin = result.bar.width * 60.5 / 2431
    // 主栏实体压住窗口下沿四成实体高，并位于窗口之上。
    const overlap = .4 * result.bar.width * 240 / 2431
    assert.ok(Math.abs(result.bar.y + nativeMargin - (result.window.bottom - overlap)) < 1)
    assert.ok(Math.abs(result.window.width / result.window.height - 960 / 700) < .01)
    if (width > 880) {
      // 主栏向左错出窗口宽度的 10%，仍在文字栏右侧。
      assert.ok(result.text.right <= result.bar.x + nativeMargin && Math.abs(result.bar.x + nativeMargin - (result.window.x - .1 * result.window.width)) < 1)
    } else {
      assert.ok(result.window.y > result.text.bottom)
    }
  } else assert.equal(result.window.width, 0)
  if (width <= 880) assert.ok(Math.abs(result.bar.x + result.bar.width / 2 - result.card.x - result.card.width / 2) < 1)
  await card.screenshot({ path: path.join(output, `${locale}-${theme}-${width}${fallback ? '-fallback' : ''}.png`), animations: 'disabled' })
  if (locale === 'zh-CN' && width === 1440 && !fallback) result.transmission = await checkGlass(card, result)
  return result
}

async function main() {
  const server = httpServer.createServer({ root: dist, cache: -1 })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.server.address().port}`
  let instance
  console.log(output)
  try {
    instance = await chromium.launchServer({ headless: true, channel: 'msedge' })
    const browser = await chromium.connect(instance.wsEndpoint())
    const results = []
    const failures = []
    const widths = mobileOnly ? [390, 560] : [1440, 881, 880, 768, 561, 560, 390]
    const context = await browser.newContext({ reducedMotion: 'reduce', colorScheme: 'light', viewport: { width: widths[0], height: 1120 } })
    // 页面允许远程图片/CDN；本地原生产品素材的验收不依赖外网。
    await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort())
    await context.addInitScript(() => localStorage.setItem('vuepress-theme-appearance', 'light'))
    const page = await context.newPage()
    page.on('pageerror', error => failures.push(String(error)))
    page.on('response', response => {
      if (response.url().includes('/new-index3/craft/') && !response.ok()) failures.push(`${response.status()} ${response.url()}`)
    })
    for (const locale of ['zh-CN', 'zh-TW', 'en-US']) {
      await page.goto(`${origin}/new-index3.html?lang=${locale}`, { waitUntil: 'load' })
      for (const theme of ['light', 'dark']) {
        if (theme === 'dark') await page.locator('.nh3-nav-theme').first().evaluate(el => el.click())
        for (const width of widths) {
          await page.setViewportSize({ width, height: 1120 })
          const result = await verify(page, locale, theme, width)
          if (!mobileOnly && [1440, 768, 390].includes(width)) result.forest = await verifyForest(page, locale, theme, width)
          results.push(result)
        }
      }
      console.log(`PASS ${locale}`)
    }
    if (!mobileOnly) {
      const context = await browser.newContext({ reducedMotion: 'reduce', colorScheme: 'light' })
      // 让引擎把这两个具体的 CSS 属性判为不支持，覆盖真实的 @supports 和尺寸回退分支。
      await context.addInitScript(() => {
        const supports = CSS.supports.bind(CSS)
        CSS.supports = (...args) => !args[0].includes('backdrop-filter') && supports(...args)
      })
      await context.route('**/*', async route => {
        if (!route.request().url().startsWith(origin)) return route.abort()
        if (route.request().resourceType() !== 'stylesheet') return route.continue()
        const response = await route.fetch()
        await route.fulfill({ response, body: (await response.text()).replaceAll('backdrop-filter', 'unavailable-backdrop') })
      })
      const page = await context.newPage()
      await page.goto(`${origin}/new-index3.html`, { waitUntil: 'load' })
      for (const [theme, width] of [['light', 1440], ['dark', 768]]) {
        await page.setViewportSize({ width, height: 1120 })
        if (theme === 'dark') await page.locator('.nh3-nav-theme').first().evaluate(el => el.click())
        results.push(await verify(page, 'zh-CN', theme, width, true))
      }
    }
    assert.deepEqual(failures, [])
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(results, null, 2))
    console.log(`PASS ${results.length} responsive settings/toolbar checks`)
  } finally {
    server.server.closeAllConnections()
    server.close()
    if (instance) {
      const child = instance.process()
      const exited = child.exitCode !== null || child.signalCode !== null ? Promise.resolve()
        : new Promise(resolve => child.once('exit', resolve))
      const cleanup = instance.kill()
      await exited
      // Windows 有时延迟释放临时配置目录；先确认本次浏览器进程已退出。
      await Promise.race([cleanup, new Promise(resolve => setTimeout(resolve, 3000))])
    }
  }
}
main().then(() => process.exit(0), error => { console.error(error); process.exit(1) })
