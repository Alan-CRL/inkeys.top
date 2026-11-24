// 无可见窗口验收 CDN 多地址回退：用 Playwright 拦截请求模拟地址故障，检查图片、背景、下载链接实际使用的地址。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const root = path.resolve(__dirname, '../../..')
const dist = path.join(root, 'docs/.vuepress/dist')
const COM = 'https://1709404.cdn.123clouddisk.com/1709404/Inkeys/Website/public'
const CN = 'https://1709404.cdn.123clouddisk.cn/1709404/Inkeys/Website/public'
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' }
const server = http.createServer((req, res) => {
  const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '')
  let file = path.resolve(dist, relative || 'index.html')
  if (!file.startsWith(dist + path.sep)) { res.writeHead(403).end(); return }
  if (!path.extname(file)) file += '.html'
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
})

const hostOf = url => url.startsWith(COM) ? 'com' : url.startsWith(CN) ? 'cn' : url.startsWith('http://127.0.0.1') ? 'local' : 'other'

async function settle(page) {
  // 滚到底再回顶，让 loading="lazy" 的图片都开始加载。
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y)
      await new Promise(resolve => setTimeout(resolve, 60))
    }
    window.scrollTo(0, 0)
  })
  // 首页有持续加载的 HLS 视频，等不到 networkidle；改为等所有图片结束（成功或失败）。
  await page.waitForFunction(() => [...document.images].every(img => img.complete), null, { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(1500)
  await page.waitForFunction(() => [...document.images].every(img => img.complete), null, { timeout: 30000 }).catch(() => {})
}

async function inspect(page) {
  return page.evaluate(() => {
    const images = [...document.querySelectorAll('img')].filter(img => img.getAttribute('src'))
    const pick = selector => {
      const element = document.querySelector(selector)
      return element ? getComputedStyle(element).backgroundImage : null
    }
    return {
      images: images.map(img => ({ src: img.currentSrc || img.src, ok: img.complete && img.naturalWidth > 0 })),
      links: [...document.querySelectorAll('a[href*=".uink"], a[href$=".json"], a[href$=".txt"]')].map(a => a.href),
      ink: pick('.nh3-ink'),
      craft: pick('.nh3-craft'),
      down: sessionStorage.getItem('inkeys-asset-down'),
      scripts: [...document.head.querySelectorAll('script')].filter(script => script.textContent.includes('inkeys-asset-down')).length,
    }
  })
}

async function scenario(browser, name, { block = [], missing = [] }, pages, check) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  const requests = []
  const errors = []
  for (const base of block)
    await context.route(`${base}/**`, route => route.abort('connectionrefused'))
  for (const file of missing) {
    for (const base of [COM, CN])
      await context.route(`${base}${file}`, route => route.fulfill({ status: 403, body: '' }))
  }
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(String(error)))
  page.on('requestfinished', request => requests.push(request.url()))
  // 记录远程地址上每个非 200 响应和失败请求，便于区分模拟故障与真实的偶发错误。
  page.on('response', response => { if (/clouddisk/.test(response.url()) && response.status() !== 200) console.log('  [resp]', response.status(), response.url()) })
  page.on('requestfailed', request => { if (/clouddisk/.test(request.url()) && !block.some(base => request.url().startsWith(base))) console.log('  [fail]', request.failure()?.errorText, request.url()) })
  const results = {}
  const started = Date.now()
  for (const url of pages) {
    if (url.startsWith('click:')) {
      // SPA 切页：通过页内链接跳转，不刷新文档。
      await page.evaluate(target => {
        const link = document.createElement('a')
        link.href = target
        document.querySelector('#app').appendChild(link)
        link.click()
      }, url.slice(6))
      await page.waitForURL(`**${url.slice(6)}`)
    }
    else {
      await page.goto(`http://127.0.0.1:${server.address().port}${url}`, { waitUntil: 'load' })
    }
    console.log(`  ${name} ${url} loaded ${Date.now() - started}ms`)
    await settle(page)
    console.log(`  ${name} ${url} settled ${Date.now() - started}ms`)
    results[url] = await inspect(page)
  }
  const assetRequests = requests.filter(url => /\.(png|gif|webp|svg)(\?|$)/.test(url))
  const count = assetRequests.reduce((acc, url) => ({ ...acc, [hostOf(url)]: (acc[hostOf(url)] || 0) + 1 }), {})
  console.log(`\n== ${name} (${((Date.now() - started) / 1000).toFixed(1)}s)`)
  console.log('asset requests by host:', JSON.stringify(count))
  for (const [url, result] of Object.entries(results)) {
    const broken = result.images.filter(image => !image.ok)
    const hosts = result.images.reduce((acc, image) => ({ ...acc, [hostOf(image.src)]: (acc[hostOf(image.src)] || 0) + 1 }), {})
    console.log(`${url}: images ${JSON.stringify(hosts)} broken ${broken.length} links ${JSON.stringify([...new Set(result.links.map(hostOf))])} ink ${hostOf(result.ink?.match(/url\("([^"]+)/)?.[1] || '')} craft ${hostOf(result.craft?.match(/url\("([^"]+)/)?.[1] || '')} down ${result.down} scripts ${result.scripts}`)
    if (broken.length) console.log('  broken:', broken.map(image => image.src).join(' '))
  }
  if (errors.length) console.log('page errors:', errors)
  check(results, errors)
  // 首页的 HLS 视频与动画会让 headless Edge 关闭上下文时卡住，先离开页面再关，最多等 5 秒。
  await page.goto('about:blank').catch(() => {})
  await Promise.race([context.close(), new Promise(resolve => setTimeout(resolve, 5000))])
}

// 只看 public 资源：站点图标 /Inkeys.svg 按设计留在本地，GitHub 头像等外部图片不参与。
const assets = result => result.images.filter(image => hostOf(image.src) !== 'other' && !image.src.endsWith('/Inkeys.svg'))
const allHost = (result, host) => assets(result).length > 0 && assets(result).every(image => hostOf(image.src) === host && image.ok)
const bg = (value, host) => hostOf(value?.match(/url\("([^"]+)/)?.[1] || '') === host

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_BIN || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' })
  const pages = ['/new-index3.html', '/community.html', '/standard/conformance.html']
  try {
    await scenario(browser, 'normal', {}, pages, (r, errors) => {
      assert.equal(errors.length, 0)
      assert.ok(allHost(r['/community.html'], 'com'))
      assert.ok(allHost(r['/new-index3.html'], 'com'))
      assert.ok(bg(r['/new-index3.html'].ink, 'com') && bg(r['/new-index3.html'].craft, 'com'))
      assert.ok(r['/standard/conformance.html'].links.every(url => hostOf(url) === 'com'))
    })
    await scenario(browser, 'block .com', { block: [COM] }, ['/new-index3.html', '/community.html', 'click:/standard/conformance.html'], (r, errors) => {
      assert.equal(errors.length, 0)
      assert.ok(allHost(r['/community.html'], 'cn'))
      assert.ok(allHost(r['/new-index3.html'], 'cn'))
      assert.ok(bg(r['/new-index3.html'].ink, 'cn') && bg(r['/new-index3.html'].craft, 'cn'))
      assert.ok(r['click:/standard/conformance.html'].links.every(url => hostOf(url) === 'cn'))
      assert.equal(r['click:/standard/conformance.html'].scripts, 1)
    })
    await scenario(browser, 'block .com + .cn', { block: [COM, CN] }, pages, (r, errors) => {
      assert.equal(errors.length, 0)
      assert.ok(allHost(r['/community.html'], 'local'))
      assert.ok(allHost(r['/new-index3.html'], 'local'))
      assert.ok(bg(r['/new-index3.html'].ink, 'local') && bg(r['/new-index3.html'].craft, 'local'))
      assert.ok(r['/standard/conformance.html'].links.every(url => hostOf(url) === 'local'))
    })
    await scenario(browser, 'one file missing on remotes', { missing: ['/SettingSponsor.png'] }, ['/community.html'], (r, errors) => {
      assert.equal(errors.length, 0)
      const images = assets(r['/community.html'])
      assert.ok(images.every(image => image.ok))
      assert.equal(hostOf(images.find(image => image.src.endsWith('/SettingSponsor.png')).src), 'local')
      assert.ok(images.filter(image => !image.src.endsWith('/SettingSponsor.png')).every(image => hostOf(image.src) === 'com'))
      assert.equal(r['/community.html'].down, null)
    })
    console.log('\nALL PASSED')
  }
  catch (error) {
    console.error(error)
    process.exitCode = 1
  }
  finally {
    await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 5000))])
    server.close()
    process.exit(process.exitCode ?? 0)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
  server.close()
})
