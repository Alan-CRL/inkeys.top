// 无可见窗口验收 public 资源的通道切换（本站 → 123 .cn → .com）：用 Playwright 拦截请求模拟 404、通道变慢与单文件卡住。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const root = path.resolve(__dirname, '../../..')
const dist = path.join(root, 'docs/.vuepress/dist')
const CN = 'https://1709404.cdn.123clouddisk.cn/1709404/Inkeys/Website/public'
const COM = 'https://1709404.cdn.123clouddisk.com/1709404/Inkeys/Website/public'
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
let origin = ''
const hostOf = url => !url ? 'none' : url.startsWith(CN) ? 'cn' : url.startsWith(COM) ? 'com' : url.startsWith(origin) || url.startsWith('/') ? 'local' : 'other'
const bgHost = value => hostOf(value?.match(/url\("([^"]+)/)?.[1])

async function scrollThrough(page) {
  // 滚到底再回顶，让 loading="lazy" 的图片都开始加载。
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y)
      await new Promise(resolve => setTimeout(resolve, 60))
    }
    window.scrollTo(0, 0)
  })
}

async function inspect(page) {
  return page.evaluate(() => {
    const pick = (selector) => {
      const element = document.querySelector(selector)
      return element ? getComputedStyle(element).backgroundImage : null
    }
    return {
      // 只看 public 资源：GitHub 头像等外部图片不参与。
      images: [...document.images].filter(img => img.getAttribute('src') && !/github\.com/.test(img.src))
        .map(img => ({ src: img.currentSrc || img.src, ok: img.complete && img.naturalWidth > 0 })),
      links: [...document.querySelectorAll('a[href*=".uink"], a[href$=".json"], a[href$=".txt"]')].map(a => a.href),
      ink: pick('.nh3-ink'),
      craft: pick('.nh3-craft'),
      preferred: sessionStorage.getItem('inkeys-asset-preferred'),
      scripts: [...document.head.querySelectorAll('script')].filter(script => script.textContent.includes('inkeys-asset-preferred')).length,
    }
  })
}

function report(label, result) {
  const hosts = result.images.reduce((acc, image) => ({ ...acc, [hostOf(image.src)]: (acc[hostOf(image.src)] || 0) + 1 }), {})
  const broken = result.images.filter(image => !image.ok).map(image => image.src)
  console.log(`  ${label}: images ${JSON.stringify(hosts)} broken ${broken.length} links ${JSON.stringify([...new Set(result.links.map(hostOf))])} ink ${bgHost(result.ink)} craft ${bgHost(result.craft)} preferred ${result.preferred} scripts ${result.scripts}`)
  if (broken.length)
    console.log('    broken:', broken.join(' '))
}

async function scenario(browser, name, setup, run) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  const requests = []
  const errors = []
  await setup?.(context)
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(String(error)))
  page.on('request', request => requests.push(request.url()))
  const started = Date.now()
  console.log(`\n== ${name}`)
  try {
    await run(page, requests)
    assert.deepEqual(errors, [])
    console.log(`  passed in ${((Date.now() - started) / 1000).toFixed(1)}s`)
  }
  finally {
    await page.goto('about:blank').catch(() => {})
    await Promise.race([context.close(), new Promise(resolve => setTimeout(resolve, 5000))])
  }
}

const visit = async (page, url, waitUntil = 'load') => {
  await page.goto(origin + url, { waitUntil })
  await scrollThrough(page)
  await page.waitForFunction(() => [...document.images].every(img => img.complete), null, { timeout: 30000 }).catch(() => {})
}
const spaClick = async (page, target) => {
  // 通过页内链接跳转，不刷新文档。
  await page.evaluate((href) => {
    const link = document.createElement('a')
    link.href = href
    document.querySelector('#app').appendChild(link)
    link.click()
  }, target)
  await page.waitForURL(`**${target}`)
  await page.waitForTimeout(1000)
}
const publicAsset = /\.(?:png|gif|webp)(?:\?|$)/
const isLocalAsset = url => url.startsWith(origin) && publicAsset.test(url)
const allHost = (result, host) => result.images.length > 0 && result.images.every(image => image.ok && hostOf(image.src) === host)

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${server.address().port}`
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_BIN || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' })
  try {
    await scenario(browser, 'normal: everything from this site', null, async (page, requests) => {
      for (const url of ['/', '/community.html', '/standard/conformance.html']) {
        await visit(page, url)
        const result = await inspect(page)
        report(url, result)
        assert.ok(result.images.every(image => image.ok && hostOf(image.src) === 'local'))
        assert.ok(result.links.every(link => hostOf(link) === 'local'))
        assert.equal(result.preferred, null)
        if (url === '/')
          assert.ok(bgHost(result.ink) === 'local' && bgHost(result.craft) === 'local')
      }
      assert.equal(requests.filter(url => url.startsWith(CN) || url.startsWith(COM)).length, 0)
    })

    await scenario(browser, 'one file 404 on this site', async (context) => {
      await context.route(`${origin}/SettingSponsor.png`, route => route.fulfill({ status: 404, body: '' }))
    }, async (page) => {
      await visit(page, '/community.html')
      const result = await inspect(page)
      report('/community.html', result)
      assert.ok(result.images.every(image => image.ok))
      assert.equal(hostOf(result.images.find(image => image.src.endsWith('/SettingSponsor.png')).src), 'cn')
      assert.ok(result.images.filter(image => !image.src.endsWith('/SettingSponsor.png')).every(image => hostOf(image.src) === 'local'))
      assert.equal(result.preferred, null)
    })

    await scenario(browser, 'this site slow: images hang, probe 4 s', async (context) => {
      // 本站的 public 图片一直不返回，探测文件 4 秒后才返回；页面与脚本正常。
      await context.route(url => isLocalAsset(url.href), () => {})
      await context.route(url => url.href.startsWith(`${origin}/Inkeys.svg?t=`), async (route) => {
        await new Promise(resolve => setTimeout(resolve, 4000))
        await route.continue().catch(() => {})
      })
    }, async (page) => {
      await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => sessionStorage.getItem('inkeys-asset-preferred'), null, { timeout: 30000 })
      await scrollThrough(page)
      await page.waitForFunction(() => [...document.images].every(img => img.complete), null, { timeout: 30000 }).catch(() => {})
      let result = await inspect(page)
      report('/', result)
      assert.ok(result.preferred.startsWith(CN))
      assert.ok(result.images.filter(image => !image.src.endsWith('/Inkeys.svg')).every(image => image.ok && hostOf(image.src) === 'cn'))
      assert.ok(bgHost(result.ink) === 'cn' && bgHost(result.craft) === 'cn')
      // 同一会话的新页面加载与 SPA 切页都直接使用 .cn。
      await page.goto(`${origin}/community.html`, { waitUntil: 'domcontentloaded' })
      await scrollThrough(page)
      await page.waitForFunction(() => [...document.images].every(img => img.complete), null, { timeout: 30000 }).catch(() => {})
      result = await inspect(page)
      report('/community.html (reload)', result)
      assert.equal(hostOf(result.images.find(image => image.src.endsWith('/SettingSponsor.png')).src), 'cn')
      await spaClick(page, '/standard/conformance.html')
      result = await inspect(page)
      report('/standard/conformance.html (SPA)', result)
      assert.ok(result.links.length > 0 && result.links.every(link => hostOf(link) === 'cn'))
      assert.equal(result.scripts, 1)
    })

    await scenario(browser, 'one file hangs, this site otherwise fine', async (context) => {
      await context.route(`${origin}/SettingSponsor.png`, () => {})
    }, async (page) => {
      await page.goto(`${origin}/community.html`, { waitUntil: 'domcontentloaded' })
      // 看门狗只管视口附近的资源，模拟用户停在这张图所在的位置。
      await page.locator('img[src$="/SettingSponsor.png"]').scrollIntoViewIfNeeded()
      await page.waitForFunction(() => [...document.images].every(img => img.complete), null, { timeout: 30000 }).catch(() => {})
      const result = await inspect(page)
      report('/community.html', result)
      assert.ok(result.images.every(image => image.ok))
      assert.equal(hostOf(result.images.find(image => image.src.endsWith('/SettingSponsor.png')).src), 'cn')
      assert.ok(result.images.filter(image => !image.src.endsWith('/SettingSponsor.png')).every(image => hostOf(image.src) === 'local'))
      assert.equal(result.preferred, null)
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

main()
