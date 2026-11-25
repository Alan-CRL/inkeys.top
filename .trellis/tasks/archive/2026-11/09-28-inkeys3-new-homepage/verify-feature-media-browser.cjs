// 无可见窗口的真实媒体验收；使用已有生产输出，不启动开发服务器。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const root = path.resolve(__dirname, '../../..')
const dist = path.join(root, 'docs/.vuepress/dist')
const output = path.join(root, 'media/inkeys3-features/build/browser-check')
fs.mkdirSync(output, { recursive: true })
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp4': 'video/mp4', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' }
const server = http.createServer((req, res) => {
  const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '')
  let file = path.resolve(dist, relative || 'index.html')
  if (!file.startsWith(dist + path.sep)) { res.writeHead(403).end(); return }
  if (!path.extname(file)) file += '.html'
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return }
  const size = fs.statSync(file).size
  const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/)
  const start = range ? Number(range[1]) : 0
  const end = range && range[2] ? Math.min(size - 1, Number(range[2])) : size - 1
  if (start > end || start >= size) { res.writeHead(416).end(); return }
  res.writeHead(range ? 206 : 200, {
    'Content-Type': types[path.extname(file)] || 'application/octet-stream',
    'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes',
    ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}),
  })
  const stream = fs.createReadStream(file, { start, end })
  res.on('close', () => stream.destroy())
  stream.on('error', () => res.destroy())
  stream.pipe(res)
})

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  // 使用项目内独立缓存，避开 Windows TEMP 中 Edge LOCK 文件导致的清理等待。
  const isolated = await chromium.launchPersistentContext(path.join(output, 'browser-profile'), {
    headless: true,
    artifactsDir: path.join(output, 'browser-artifacts'),
    executablePath: process.env.BROWSER_BIN || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  })
  const browser = isolated.browser()
  const errors = []
  const evidence = []
  try {
    for (const width of [1440, 599, 390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' })
      const page = await context.newPage()
      page.on('pageerror', error => errors.push(String(error)))
      await page.goto(`http://127.0.0.1:${server.address().port}/new-index3.html`, { waitUntil: 'load' })
      await page.waitForTimeout(300)
      const cards = page.locator('.nh3-feature')
      assert.equal(await cards.count(), 3)
      for (const index of [0, 1, 2]) {
        const card = cards.nth(index)
        await card.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }))
        await page.waitForFunction(index => {
          const element = document.querySelectorAll('.nh3-feature video')[index]
          return element && !element.paused && element.currentTime > 0.15 && element.readyState >= 2
        }, index, { timeout: 20000 })
        const film = card.locator('video')
        assert.equal(await film.getAttribute('controls'), null)
        const geometry = await film.evaluate(node => ({
          width: node.clientWidth, height: node.clientHeight, nativeWidth: node.videoWidth, nativeHeight: node.videoHeight,
        }))
        assert.ok(Math.abs(geometry.width / geometry.height - geometry.nativeWidth / geometry.nativeHeight) < 0.01, 'stage fits the selected media ratio without letterboxing')
        await film.evaluate(node => { node.currentTime = 2.5 })
        await page.waitForTimeout(150)
        await card.locator('.feature-pause').click()
        const time = await film.evaluate(node => node.currentTime)
        await page.waitForTimeout(250)
        assert.ok(Math.abs(await film.evaluate(node => node.currentTime) - time) < 0.1, 'manual pause freezes real video')
        evidence.push({ width, index, geometry, src: await film.evaluate(node => node.currentSrc), pausedTime: time })
        await card.screenshot({ path: path.join(output, `${width}-card-${index}.png`) })
        // 从暂停恢复，真实 ended 应换到下一场；不以定时器推断播放成功。
        await card.locator('.feature-pause').click()
        await page.evaluate(() => document.activeElement?.blur())
        await page.waitForFunction(index => !document.querySelectorAll('.nh3-feature video')[index].paused, index)
        const previous = await film.evaluate(node => node.currentSrc)
        await film.evaluate(node => { node.currentTime = node.duration - 0.2 })
        await page.waitForFunction(({ index, previous }) => {
          const element = document.querySelectorAll('.nh3-feature video')[index]
          return element && element.currentSrc !== previous && element.readyState >= 2
        }, { index, previous }, { timeout: 20000 })
        if (index === 1) {
          // 绑定与兼容性字幕也在真实卡片尺寸下取样，避免只看大尺寸接触表。
          for (const slide of [1, 2]) {
            await card.locator('.feature-selector').nth(slide).click()
            await page.evaluate(() => document.activeElement?.blur())
            await page.waitForFunction(index => {
              const element = document.querySelectorAll('.nh3-feature video')[index]
              return element && !element.paused && element.readyState >= 2
            }, index)
            const current = card.locator('video')
            await current.evaluate((node, time) => { node.currentTime = time }, slide === 1 ? 2.5 : 4.5)
            await page.waitForTimeout(150)
            await current.evaluate(node => node.pause())
            await card.screenshot({ path: path.join(output, width + '-slides-' + slide + '.png') })
          }
        }
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${width}px has no horizontal overflow`)
      await context.close()
    }
    assert.deepEqual(errors, [])
    fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ passed: true, reducedMotion: 'reduce', evidence }, null, 2))
    console.log('Assertions and screenshots complete; closing isolated browser')
  } finally {
    // 先关闭本地视频连接，再关闭浏览器，避免退出时等待尚未完成的媒体请求。
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections() })
    console.log('Local media server closed; closing browser')
    await browser.close()
  }
  console.log('PASS: headless Edge real MP4 decode/play/pause/ended, reduced-motion enabled, desktop/mobile source selection, 320/390/599/1440px no overflow; screenshots saved')
}
main().catch(error => { console.error(error); server.close(); process.exitCode = 1 })
