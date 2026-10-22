// 无窗口检查生产构建；产物只写入系统临时目录。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const os = require('node:os')
const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))
const root = path.resolve(process.cwd(), 'docs/.vuepress/dist')
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'inkeys-release-card-'))
const smoke = process.argv.includes('--smoke')
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }
const connections = new Set()
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`)
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404).end()
    return
  }
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream')
  let body = fs.readFileSync(file)
  // 无 JS 场景直接提供主题属性，单独验证两种主题的 SSR 布局。
  if (path.extname(file) === '.html' && url.searchParams.has('theme')) {
    body = body.toString().replace('<html ', `<html data-theme="${url.searchParams.get('theme') === 'dark' ? 'dark' : 'light'}" `)
  }
  res.end(body)
})
server.on('connection', socket => {
  connections.add(socket)
  socket.on('close', () => connections.delete(socket))
})

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  const browserServer = await chromium.launchServer({ channel: 'msedge', headless: true, timeout: 30000 })
  const browser = await chromium.connect(browserServer.wsEndpoint())
  const reports = []
  try {
    for (const javaScriptEnabled of (smoke ? [true] : [true, false])) {
      for (const theme of (smoke ? ['light'] : ['light', 'dark'])) {
        for (const width of (smoke ? [320] : javaScriptEnabled ? [320, 390, 768, 900, 960, 1280, 1920] : [320, 390, 768, 900, 920, 921, 960, 1280, 1920])) {
          const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, javaScriptEnabled })
          const page = await context.newPage()
          const errors = []
          page.on('pageerror', error => errors.push(error.message))
          await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort())
          await page.goto(`${origin}/new-index3.html?theme=${theme}`, { waitUntil: 'load' })
          await page.locator('.nh3-release').scrollIntoViewIfNeeded()
          if (javaScriptEnabled) await page.waitForTimeout(1500)
          const result = await page.locator('.nh3-release').evaluate(section => {
            const bounds = selector => {
              const node = section.querySelector(selector)
              if (!node) return null
              const range = document.createRange()
              if (selector === 'h2') range.selectNodeContents(node)
              const box = selector === 'h2' ? range.getBoundingClientRect() : node.getBoundingClientRect()
              return { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom }
            }
            const buttons = [...section.querySelectorAll('button')].map(button => ({ label: button.getAttribute('aria-label'), disabled: button.disabled, inert: !!button.closest('[inert]'), tabIndex: button.tabIndex, visible: button.getClientRects().length > 0 && getComputedStyle(button).visibility === 'visible' }))
            return {
              overflow: document.documentElement.scrollWidth > innerWidth,
              title: section.querySelector('h2')?.textContent.trim(),
              downloadCount: section.querySelectorAll('.nh-release-download').length,
              heroDownload: !!document.querySelector('.nh3-download'),
              titleBox: bounds('h2'),
              plane: bounds('.nh3-release-plane'),
              wallpaper: bounds('.nh3-release-desktop'),
              toolbar: bounds('.nh3-release-toolbar'),
              buttons,
            }
          })
          const name = `${theme}-${width}-${javaScriptEnabled ? 'js' : 'nojs'}`
          assert.equal(result.overflow, false, `${name}: document overflow`)
          assert.equal(result.downloadCount, 0, `${name}: release download removed`)
          assert.match(result.title, /Inkeys3/)
          assert.equal(result.heroDownload, true, `${name}: hero download remains`)
          const activeTools = result.buttons.filter(button => button.visible && !button.inert && !button.disabled)
          assert.equal(activeTools.length, width >= 900 ? 6 : 8, `${name}: cropped tools excluded from focus, mobile restores tools`)
          if (width >= 900) {
            const cropped = result.toolbar.right - result.wallpaper.right
            assert.ok(cropped >= 31 && cropped <= 49, `${name}: crop ${cropped}px`)
            assert.ok(result.titleBox.right < result.toolbar.x, `${name}: heading overlaps toolbar`)
          }
          else {
            assert.ok(result.toolbar.right <= result.plane.right + 1, `${name}: mobile toolbar clipped`)
          }
          assert.equal(errors.length, 0, `${name}: ${errors.join('; ')}`)
          await page.locator('.nh3-release').screenshot({ path: path.join(output, `${name}.png`), animations: 'disabled' })
          reports.push({ name, ...result })
          await context.close()
        }
      }
    }
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(reports, null, 2))
    console.log(JSON.stringify({ output, cases: reports.length, passed: true }))
  }
  catch (error) {
    console.error(error)
    throw error
  }
  finally {
    for (const socket of connections) socket.destroy()
    server.close()
    await browser.close()
    // 持有自己的浏览器进程，避免 Windows 管道关闭确认挂起测试脚本。
    await browserServer.kill()
  }
}

main().then(() => process.exit(0)).catch(error => {
  server.close()
  console.error(error)
  process.exit(1)
})
