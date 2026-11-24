// UInk 规范图示（第一批）的无窗口验收：服务已构建的 dist，用 headless Edge 截图并检查交互；不打开任何可见窗口。
// 运行：node .trellis/tasks/11-24-uink-1-1-visuals/shots/verify-visuals.cjs（先 pnpm docs:build）
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

// 图示 → 页面与定位方式（UInkFigure 的标题；分级演示用自身的类名）
const DIAGRAMS = [
  { name: 'UInkFileStream', page: '/standard/file/main.html', title: '对象流' },
  { name: 'UInkFileStream-intro', page: '/standard/intro.html', title: '对象流' },
  { name: 'UInkInkPoints', page: '/standard/blocks/ink.html', title: '笔迹的点' },
  { name: 'UInkNibShapes', page: '/standard/common/nib.html', title: '四种笔尖' },
  { name: 'UInkNibSize', page: '/standard/common/nib.html', title: '笔尖尺寸' },
  { name: 'UInkCapsJoins', page: '/standard/common/nib.html', title: '端帽与拐角' },
  { name: 'UInkShapeGeometry', page: '/standard/blocks/shape.html', title: '七种几何' },
  { name: 'UInkShapeStroke', page: '/standard/blocks/shape.html', title: '线型与端头' },
  { name: 'UInkViewportMapping', page: '/standard/blocks/canvas.html', title: 'viewport 映射' },
  { name: 'UInkClearIntervals', page: '/standard/blocks/clear.html', title: 'Clear 区间与撤回' },
  { name: 'UInkPageAppend', page: '/standard/incremental.html', title: '按页追加' },
  { name: 'UInkLevelsStack', page: '/standard/levels.html', title: '五个等级' },
  { name: 'UInkTierDemo', page: '/standard/compatibility.html', selector: '.uink-tier' },
  // 第二批
  { name: 'UInkHighlighterComposite', page: '/standard/blocks/ink.html', title: '荧光笔整体合成' },
  { name: 'UInkEraseOrder', page: '/standard/blocks/ink.html', title: 'Erase 只擦之前的内容' },
  { name: 'UInkRenderLatest', page: '/standard/blocks/ink.html', title: '末尾最新组' },
  { name: 'UInkExportBakeEraser', page: '/standard/compatibility.html', title: '导出时烘焙橡皮' },
  { name: 'UInkShapeObject', page: '/standard/blocks/shape.html', title: '图形对象层' },
  { name: 'UInkShapeCurves', page: '/standard/blocks/shape.html', title: '曲线写成折线' },
  { name: 'UInkPresetPlanar', page: '/standard/appendix/shape-presets.html', title: '平面预设' },
  { name: 'UInkPresetSolids', page: '/standard/appendix/shape-presets.html', title: '立体预设' },
  { name: 'UInkMediaFit', page: '/standard/blocks/media.html', title: 'fit 与 crop' },
  { name: 'UInkBackgroundPatterns', page: '/standard/blocks/canvas.html', title: '页面背景图案' },
  { name: 'UInkDeviceTree', page: '/standard/blocks/device.html', title: 'Device 的位置与尺寸' },
  { name: 'UInkRegistryTrees', page: '/standard/file/main.html', title: '两棵注册树' },
  { name: 'UInkHeaderBytes', page: '/standard/blocks/header.html', title: 'Header 的字节布局' },
  { name: 'UInkExtraCommit', page: '/standard/file/extra.html', title: '资源包的提交顺序' },
  { name: 'UInkSaveModes', page: '/standard/incremental.html', title: '三种保存方式' },
  { name: 'UInkColorFallback', page: '/standard/common/color.html', title: 'HDR 颜色与回退' },
]
const MOBILE_SHOTS = ['UInkViewportMapping', 'UInkClearIntervals', 'UInkPageAppend', 'UInkFileStream', 'UInkRenderLatest', 'UInkShapeObject', 'UInkShapeCurves', 'UInkPresetSolids', 'UInkMediaFit', 'UInkHeaderBytes', 'UInkExtraCommit', 'UInkSaveModes']

const figure = (page, d) => d.selector
  ? page.locator(d.selector).first()
  : page.locator('.uink-fig').filter({ has: page.locator('.uink-fig__title', { hasText: new RegExp(`^${d.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }) }).first()

// 截图时隐藏固定的顶栏，避免压住元素
async function hideChrome(page) {
  await page.addStyleTag({ content: '.vp-navbar, .vp-local-nav { visibility: hidden !important; }' })
}

// 在元素内测量：最小渲染字号（SVG 文字乘以缩放）与是否越出图示内容区
async function measure(locator) {
  return locator.evaluate(fig => {
    const body = fig.querySelector('.uink-fig__body, .uink-tier__board') || fig
    const box = body.getBoundingClientRect()
    let minFont = Infinity
    let minWhere = ''
    const overflow = []
    for (const el of fig.querySelectorAll('*')) {
      const style = getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden') continue
      const ownText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())
      const inSvg = el instanceof SVGElement && el.tagName !== 'svg'
      if (ownText) {
        let size = parseFloat(style.fontSize)
        // 旋转的文字 a 可能为 0，用矩阵第一列的长度作为缩放
        if (inSvg) { const m = el.getScreenCTM(); if (m) size *= Math.hypot(m.a, m.b) }
        if (size < minFont) { minFont = size; minWhere = `${el.tagName}: ${el.textContent.trim().slice(0, 24)}` }
      }
      // HTML 元素与 SVG 文字不得越出内容区（SVG 图形本身可以被裁剪）
      if (!inSvg || el.tagName === 'text') {
        const r = el.getBoundingClientRect()
        if (r.width && (r.right > box.right + 1 || r.left < box.left - 1)) overflow.push(`${el.tagName}.${el.getAttribute('class') || ''} ${Math.round(r.left)}–${Math.round(r.right)} / ${Math.round(box.left)}–${Math.round(box.right)}`)
      }
    }
    return { minFont: Math.round(minFont * 100) / 100, minWhere, overflow: overflow.slice(0, 5), width: Math.round(box.width) }
  })
}

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.BROWSER_BIN || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  })
  const errors = []
  const log = { metrics: {}, interactions: {} }
  const contexts = []
  const open = async (url, options) => {
    const context = await browser.newContext(options)
    contexts.push(context)
    const page = await context.newPage()
    page.on('pageerror', e => errors.push(`pageerror ${url}: ${e}`))
    page.on('console', m => { if (m.type() === 'error' || /hydration/i.test(m.text())) errors.push(`console ${url}: ${m.text()}`) })
    page.on('requestfailed', r => { if (r.url().startsWith(base)) errors.push(`requestfailed: ${r.url()}`) })
    await page.goto(base + url, { waitUntil: 'load' })
    await page.waitForTimeout(500)
    return page
  }
  // 每节结束关闭本节打开的页面，避免 headless Edge 同时开太多页面崩溃
  const closeAll = async () => {
    while (contexts.length) await contexts.pop().close()
  }

  try {
    // 1. 每张图：桌面浅色与深色截图、字号与溢出检查
    for (const scheme of ['light', 'dark']) {
      const pages = {}
      for (const d of DIAGRAMS) {
        pages[d.page] ??= await open(d.page, { viewport: { width: 1440, height: 1000 }, colorScheme: scheme })
        const page = pages[d.page]
        if (scheme === 'dark') log.darkTheme ??= await page.evaluate(() => document.documentElement.dataset.theme || document.documentElement.className)
        await hideChrome(page)
        const fig = figure(page, d)
        assert.equal(await fig.count(), 1, `${d.name} found on ${d.page}`)
        await fig.scrollIntoViewIfNeeded()
        await page.waitForTimeout(250)
        await fig.screenshot({ path: path.join(output, `${d.name}-desktop-${scheme}.png`) })
        if (scheme === 'light') {
          const m = await measure(fig)
          log.metrics[`${d.name}@1440`] = m
          assert.ok(m.minFont >= 12, `${d.name} desktop min font ${m.minFont} (${m.minWhere})`)
          assert.deepEqual(m.overflow, [], `${d.name} desktop overflow`)
        }
      }
      // 文档栏宽度（有右侧大纲）
      log.docWidth ??= await Object.values(pages)[0].evaluate(() => Math.round(document.querySelector('.vp-doc')?.getBoundingClientRect().width ?? 0))
      log.asideVisible ??= await Object.values(pages)[0].evaluate(() => { const a = document.querySelector('.vp-doc-aside, .aside'); return !!a && getComputedStyle(a).display !== 'none' })
      await closeAll()
    }

    // 2. 手机 390：字号、横向溢出、四张图截图
    {
      const pages = {}
      for (const d of DIAGRAMS) {
        pages[d.page] ??= await open(d.page, { viewport: { width: 390, height: 844 }, colorScheme: 'light', isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
        const page = pages[d.page]
        await hideChrome(page)
        const fig = figure(page, d)
        await fig.scrollIntoViewIfNeeded()
        const m = await measure(fig)
        log.metrics[`${d.name}@390`] = m
        assert.ok(m.minFont >= 12, `${d.name} mobile min font ${m.minFont} (${m.minWhere})`)
        assert.deepEqual(m.overflow, [], `${d.name} mobile overflow`)
        const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        assert.ok(pageOverflow <= 0, `${d.page} 390px horizontal overflow ${pageOverflow}`)
        if (MOBILE_SHOTS.includes(d.name)) await fig.screenshot({ path: path.join(output, `${d.name}-mobile-390.png`) })
      }
      await closeAll()
    }

    // 3. 交互：键盘操作与改变后的状态
    {
      const ctx = { viewport: { width: 1440, height: 1000 }, colorScheme: 'light' }

      // 3a. viewport：键盘把 scale 调到 2，再用鼠标拖动取景框
      const page = await open('/standard/blocks/canvas.html', ctx)
      await hideChrome(page)
      const fig = figure(page, { title: 'viewport 映射' })
      await fig.scrollIntoViewIfNeeded()
      const scale = fig.locator('input[aria-label="viewport.scale"]')
      await scale.focus()
      for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowRight')
      const readout = fig.locator('.uvm-readout')
      log.interactions.viewportAfterKeys = (await readout.innerText()).replace(/\s+/g, ' ')
      assert.match(log.interactions.viewportAfterKeys, /scale: 2 \}/)
      assert.match(log.interactions.viewportAfterKeys, /deviceX = \(240 − 60\) × 2 = 360/)
      const frame = fig.locator('.uvm-frame')
      const fb = await frame.boundingBox()
      await page.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2)
      await page.mouse.down()
      await page.mouse.move(fb.x + fb.width / 2 + 40, fb.y + fb.height / 2 + 10, { steps: 6 })
      await page.mouse.up()
      log.interactions.viewportAfterDrag = (await readout.innerText()).replace(/\s+/g, ' ')
      assert.doesNotMatch(log.interactions.viewportAfterDrag, /x: 60,/)
      // 读数中的换算必须与公式一致
      const [, x, y, s] = /x: (-?[\d.]+), y: (-?[\d.]+), scale: ([\d.]+)/.exec(log.interactions.viewportAfterDrag).map(Number)
      const dx = Math.round((240 - x) * s * 100) / 100
      assert.ok(log.interactions.viewportAfterDrag.includes(`= ${dx}`), `deviceX = ${dx}`)
      await page.evaluate(() => document.activeElement?.blur())
      await fig.screenshot({ path: path.join(output, 'UInkViewportMapping-changed.png') })
      const { focusRing } = await scale.evaluate(el => { el.focus(); return { focusRing: getComputedStyle(el).outlineStyle } })
      log.interactions.viewportSliderFocusOutline = focusRing

      // 3b. Clear：Tab 到“撤回”，Enter 两次；继续撤回检查整个序列
      const clear = await open('/standard/blocks/clear.html', ctx)
      await hideChrome(clear)
      const cfig = figure(clear, { title: 'Clear 区间与撤回' })
      await cfig.scrollIntoViewIfNeeded()
      await clear.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0) })
      let tabs = 0
      for (; tabs < 250; tabs++) {
        await clear.keyboard.press('Tab')
        if (await clear.evaluate(() => document.activeElement?.textContent?.trim() === '撤回' && !!document.activeElement.closest('.uink-fig'))) break
      }
      assert.ok(tabs < 250, 'Tab reaches 撤回')
      const summary = cfig.locator('.uci-readout')
      const seq = [await summary.innerText()]
      await clear.keyboard.press('Enter')
      seq.push(await summary.innerText())
      await clear.keyboard.press('Enter')
      seq.push(await summary.innerText())
      await clear.evaluate(() => document.activeElement?.blur())
      await cfig.scrollIntoViewIfNeeded()
      await cfig.screenshot({ path: path.join(output, 'UInkClearIntervals-changed.png') })
      const undoBtn = cfig.locator('button', { hasText: '撤回' })
      for (let i = 0; i < 3; i++) { await undoBtn.click(); seq.push(await summary.innerText()) }
      log.interactions.clearSequence = seq
      assert.match(seq[0], /显示 C/)
      assert.match(seq[1], /画布为空/)
      assert.match(seq[2], /显示 B/)
      assert.match(seq[3], /画布为空/)
      assert.match(seq[4], /显示 A/)
      assert.match(seq[5], /画布为空/)
      assert.equal(await undoBtn.getAttribute('aria-disabled'), 'true')

      // 3c. 按页追加：Tab 到“下一步”，Enter 两次到第 ③ 步；自动播放进入 / 离开视口
      const inc = await open('/standard/incremental.html', ctx)
      await hideChrome(inc)
      const pfig = figure(inc, { title: '按页追加' })
      const demo = pfig.locator('.upa')
      await pfig.locator('button', { hasText: '下一步' }).focus()
      await inc.keyboard.press('Enter')
      await inc.keyboard.press('Enter')
      log.interactions.pageAppendStep = await demo.getAttribute('data-step')
      assert.equal(log.interactions.pageAppendStep, '2')
      log.interactions.pageAppendView = await pfig.locator('.upa-page figcaption').allInnerTexts()
      assert.deepEqual(log.interactions.pageAppendView, ['P1', 'P2′', 'P3'])
      await inc.evaluate(() => document.activeElement?.blur())
      await pfig.scrollIntoViewIfNeeded()
      await inc.waitForTimeout(300)
      await pfig.screenshot({ path: path.join(output, 'UInkPageAppend-changed.png') })
      await pfig.locator('button', { hasText: '自动播放' }).click()
      await inc.waitForTimeout(300)
      log.interactions.autoplayInView = await demo.getAttribute('data-autoplay')
      await inc.waitForTimeout(2900)
      log.interactions.autoplayAdvancedTo = await demo.getAttribute('data-step')
      await inc.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
      await inc.waitForTimeout(500)
      log.interactions.autoplayOffscreen = await demo.getAttribute('data-autoplay')
      assert.equal(log.interactions.autoplayInView, 'playing')
      assert.equal(log.interactions.autoplayAdvancedTo, '3')
      assert.equal(log.interactions.autoplayOffscreen, 'paused')
      await closeAll()
    }

    // 3d–3h. 第二批交互：键盘或点击改变状态，记录读数并截“改变后”的图
    {
      const ctx = { viewport: { width: 1440, height: 1000 }, colorScheme: 'light' }
      const shot = async (page, fig, name) => {
        await page.evaluate(() => document.activeElement?.blur())
        await fig.scrollIntoViewIfNeeded()
        await page.waitForTimeout(250)
        await fig.screenshot({ path: path.join(output, `${name}-changed.png`) })
      }
      const text = async loc => (await loc.innerText()).replace(/\s+/g, ' ')

      // 3d. 末尾最新组：键盘按两次“下一步”到“撤回修正结果”
      const ink = await open('/standard/blocks/ink.html', ctx)
      await hideChrome(ink)
      const rfig = figure(ink, { title: '末尾最新组' })
      const rRead = rfig.locator('.uf-readout')
      const rSeq = [await text(rRead)]
      await rfig.locator('button', { hasText: '下一步' }).focus()
      await ink.keyboard.press('Enter')
      rSeq.push(await text(rRead))
      await ink.keyboard.press('Enter')
      rSeq.push(await text(rRead))
      log.interactions.renderLatest = rSeq
      assert.equal(new Set(rSeq).size, 3, 'renderLatest readout changes each step')
      await shot(ink, rfig, 'UInkRenderLatest')

      // 3e. 图形对象层：Tab 焦点落在部件上，方向键换到第 3 个部件
      const shape = await open('/standard/blocks/shape.html', ctx)
      await hideChrome(shape)
      const ofig = figure(shape, { title: '图形对象层' })
      const oCode = ofig.locator('.uso-code')
      const first = await text(oCode)
      await ofig.locator('.uso-hit[tabindex="0"]').focus()
      for (let i = 0; i < 3; i++) await shape.keyboard.press('ArrowRight')
      const later = await text(oCode)
      log.interactions.shapeObject = { first, later, readout: await text(ofig.locator('.uf-readout')) }
      assert.match(first, /partCount/)
      assert.match(later, /partIndex/)
      assert.doesNotMatch(later, /partCount/)
      await shot(shape, ofig, 'UInkShapeObject')

      // 3f. 曲线写成折线：滑块按 End 到最多点数，偏差必须降到 0.25 以内
      const cfig = figure(shape, { title: '曲线写成折线' })
      const cRead = cfig.locator('.uf-readout')
      const cBefore = await text(cRead)
      await cfig.locator('input[type=range]').focus()
      await shape.keyboard.press('End')
      const cAfter = await text(cRead)
      log.interactions.shapeCurves = { before: cBefore, after: cAfter }
      assert.match(cBefore, /大于 0\.25/)
      assert.match(cAfter, /已不超过 0\.25/)
      await shot(shape, cfig, 'UInkShapeCurves')

      // 3g. 立体预设：切到圆柱，键盘拖动 baseRotation，打开 mirrored
      const preset = await open('/standard/appendix/shape-presets.html', ctx)
      await hideChrome(preset)
      const sfig = figure(preset, { title: '立体预设' })
      const sRead = sfig.locator('.uf-readout')
      const sBefore = await text(sRead)
      await sfig.locator('button', { hasText: '圆柱' }).click()
      await sfig.locator('input[type=range]').focus()
      for (let i = 0; i < 40; i++) await preset.keyboard.press('ArrowRight')
      await sfig.locator('button', { hasText: 'mirrored' }).click()
      const sAfter = await text(sRead)
      log.interactions.presetSolids = { before: sBefore, after: sAfter, dashedParts: await sfig.locator('svg path[stroke-dasharray], svg .is-hidden, svg [class*="hidden"]').count() }
      assert.notEqual(sBefore, sAfter)
      assert.equal(await sfig.locator('button', { hasText: 'mirrored' }).getAttribute('aria-pressed'), 'true')
      await shot(preset, sfig, 'UInkPresetSolids')

      // 3h. fit 与 crop：切到 Cover 并打开 crop
      const media = await open('/standard/blocks/media.html', ctx)
      await hideChrome(media)
      const mfig = figure(media, { title: 'fit 与 crop' })
      const mRead = mfig.locator('.uf-readout')
      const mBefore = await text(mRead)
      await mfig.locator('button', { hasText: 'Cover' }).click()
      await mfig.locator('button', { hasText: 'crop' }).click()
      const mAfter = await text(mRead)
      log.interactions.mediaFit = { before: mBefore, after: mAfter }
      assert.notEqual(mBefore, mAfter)
      await shot(media, mfig, 'UInkMediaFit')
      await closeAll()
    }

    // 4. 减少动态效果：切换步骤后没有动画与过渡
    {
      const page = await open('/standard/incremental.html', { viewport: { width: 1440, height: 1000 }, colorScheme: 'light', reducedMotion: 'reduce' })
      const pfig = figure(page, { title: '按页追加' })
      await pfig.locator('button', { hasText: '下一步' }).click()
      log.reducedAnimations = await pfig.evaluate(el => el.getAnimations({ subtree: true }).length)
      log.reducedTransition = await pfig.locator('.uf-btn').first().evaluate(el => getComputedStyle(el).transitionDuration)
      assert.equal(log.reducedAnimations, 0)
      assert.equal(log.reducedTransition, '0s')
    }

    log.errors = errors
    fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(log, null, 2))
    console.log(JSON.stringify(log, null, 2))
    assert.deepEqual(errors, [])
    console.log('PASS')
  } finally {
    fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ ...log, errors }, null, 2))
    server.closeAllConnections()
    server.close()
    // headless Edge 的 close 偶尔不返回，最多等 5 秒
    await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 5000))])
  }
}

// Edge 关闭后偶尔残留句柄，结果已写出，显式退出
main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => process.exit())
