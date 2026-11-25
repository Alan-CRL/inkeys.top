// 复用现有无窗口 Edge 验收方式，只检查本次替换的 screen-freeze。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const root = path.resolve(__dirname, '..')
const dist = path.resolve(root, '../../docs/.vuepress/dist')
const output = path.join(root, 'build/site-check')
fs.mkdirSync(output, { recursive: true })
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp4': 'video/mp4', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' }
const server = http.createServer((request, response) => {
  let file = path.resolve(dist, `.${decodeURIComponent(new URL(request.url, 'http://localhost').pathname)}`)
  if (!file.startsWith(`${dist}${path.sep}`)) return response.writeHead(403).end()
  if (!path.extname(file)) file += '.html'
  if (!fs.existsSync(file)) return response.writeHead(404).end()
  const size = fs.statSync(file).size
  const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/)
  const start = range ? Number(range[1]) : 0
  const end = range?.[2] ? Math.min(Number(range[2]), size - 1) : size - 1
  if (start > end || start >= size) return response.writeHead(416).end()
  response.writeHead(range ? 206 : 200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes', ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}) })
  const stream = fs.createReadStream(file, { start, end })
  response.on('close', () => stream.destroy())
  stream.on('error', () => response.destroy())
  stream.pipe(response)
})

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const browser = await chromium.launchPersistentContext(path.join(output, 'profile'), { headless: true, artifactsDir: path.join(output, 'artifacts'), executablePath: process.env.BROWSER_BIN || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', reducedMotion: 'reduce' })
  const errors = []
  const results = []
  try {
    for (const width of [1440, 390, 320]) {
      const page = await browser.newPage()
      await page.setViewportSize({ width, height: 1000 })
      page.on('pageerror', error => errors.push(String(error)))
      // 官网外链资源可能长时间未完成；就绪以本地媒体实际可播为准。
      await page.goto(`http://127.0.0.1:${server.address().port}/new-index3.html`, { waitUntil: 'domcontentloaded' })
      const card = page.locator('.nh3-feature').first()
      await card.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }))
      await card.locator('.feature-selector').nth(2).click()
      await page.evaluate(() => document.activeElement?.blur())
      const film = card.locator('video')
      await page.waitForFunction(() => {
        const video = document.querySelector('.nh3-feature video')
        return video?.currentSrc.includes('screen-freeze') && video.readyState >= 2 && !video.paused && video.currentTime > 0.2
      })
      const dimensions = await film.evaluate(video => ({ width: video.videoWidth, height: video.videoHeight, duration: video.duration, src: video.currentSrc, ratio: video.clientWidth / video.clientHeight }))
      assert.equal(dimensions.duration, 14)
      assert.equal(dimensions.width, width >= 600 ? 1440 : 720)
      assert.ok(Math.abs(dimensions.ratio - dimensions.width / dimensions.height) < 0.01)
      await card.locator('.feature-pause').click()
      const pausedTime = await film.evaluate(video => video.currentTime)
      await page.waitForTimeout(200)
      assert.ok(Math.abs(await film.evaluate(video => video.currentTime) - pausedTime) < 0.05)
      await film.evaluate(video => new Promise(resolve => {
        video.addEventListener('seeked', resolve, { once: true })
        video.currentTime = 11.7
      }))
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      await card.screenshot({ path: path.join(output, `${width}-result.png`) })
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))

      if (width === 1440) {
        await film.evaluate(video => {
          video.currentTime = 0
          window.filmEvidence = { frames: 0, first: null, last: null, captures: [], next: 0 }
          const targets = [1.88, 2.12, 3.5, 4.15, 5.2, 6.4, 7.3, 8.8, 9.8, 11.7, 13.9]
          const expected = video.currentSrc
          const tick = (_, metadata) => {
            if (video.currentSrc !== expected) return
            const record = window.filmEvidence
            record.frames++
            record.first ??= metadata.mediaTime
            record.last = metadata.mediaTime
            if (metadata.mediaTime >= targets[record.next]) {
              const canvas = document.createElement('canvas')
              canvas.width = 720
              canvas.height = 320
              canvas.getContext('2d').drawImage(video, 0, 0, 720, 320)
              record.captures.push({ time: metadata.mediaTime, image: canvas.toDataURL('image/png') })
              record.next++
            }
            video.requestVideoFrameCallback(tick)
          }
          video.requestVideoFrameCallback(tick)
        })
      } else {
        await film.evaluate(video => { video.currentTime = video.duration - 0.25 })
      }
      await card.locator('.feature-pause').click()
      await page.evaluate(() => document.activeElement?.blur())
      await page.waitForFunction(() => document.querySelector('.nh3-feature video')?.currentSrc.includes('screen-dynamic'), null, { timeout: 22000 })
      if (width === 1440) {
        const record = await page.evaluate(() => window.filmEvidence)
        assert.ok(record.frames > 100 && record.last > 13.8, 'Continuous browser playback must reach the ending')
        for (const [index, capture] of record.captures.entries()) {
          fs.writeFileSync(path.join(output, `playback-${String(index).padStart(2, '0')}.png`), Buffer.from(capture.image.split(',')[1], 'base64'))
          delete capture.image
        }
        results.push({ width, dimensions, playback: record })
      } else results.push({ width, dimensions })
      await page.close()
    }
    assert.deepEqual(errors, [])
    fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ passed: true, reducedMotion: 'reduce', results }, null, 2))
    console.log('PASS: screen-freeze real playback, pause, 14s ended, responsive source and ratio, 1440/390/320px, reduced-motion; continuous playback captured.')
  } finally {
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections() })
    await browser.close()
  }
}
main().catch(error => { console.error(error); server.closeAllConnections(); server.close(); process.exitCode = 1 })
