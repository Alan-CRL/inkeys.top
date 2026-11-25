// 无可见窗口验收语言跳转与语言按钮（任务 11-25-site-i18n 阶段 A）。
// 用法：node verify-i18n.cjs [origin]，origin 默认 http://localhost:8080（开发服务器）；
// 也可以指向 dist 的静态服务器验证生产输出。
const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')

const origin = process.argv[2] || 'http://localhost:8080'
const BOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
const results = []

async function settle(page) {
  // 跳转可能发生在挂载后（开发环境没有 SSR），稍等让 location.replace 生效。
  await page.waitForLoadState('load')
  await page.waitForTimeout(1500)
  await page.waitForLoadState('load')
}

// 共用一个上下文（开发服务器的模块缓存可复用），每个页面用初始化脚本改写浏览器语言、UA 与手动选择。
let shared
async function landing(browser, locale, path, options = {}) {
  shared ??= await browser.newContext()
  const page = await shared.newPage()
  await page.addInitScript(({ languages, stored, userAgent }) => {
    Object.defineProperty(Navigator.prototype, 'languages', { get: () => languages })
    Object.defineProperty(Navigator.prototype, 'language', { get: () => languages[0] })
    if (userAgent) Object.defineProperty(Navigator.prototype, 'userAgent', { get: () => userAgent })
    if (stored) localStorage.setItem('inkeys-locale', stored)
    else localStorage.removeItem('inkeys-locale')
  }, { languages: [locale], stored: options.stored || '', userAgent: options.userAgent || '' })
  await page.goto(origin + path, { waitUntil: 'load', timeout: 120000 })
  await settle(page)
  const url = new URL(page.url())
  await page.close()
  // 开发环境的路由会先把 /download 改写成 /download.html，比较时去掉 .html。
  return decodeURIComponent(url.pathname.replace(/\.html$/, '') + url.search + url.hash)
}

// Windows 上 Edge 的 close() 偶尔不返回，最多等 5 秒。
const closeSoon = target => Promise.race([target.close(), new Promise(resolve => setTimeout(resolve, 5000))])

async function check(name, fn) {
  try {
    await fn()
    results.push(`PASS ${name}`)
    console.log(results.at(-1))
  }
  catch (error) {
    results.push(`FAIL ${name}: ${error.message.replace(/\s+/g, ' ').slice(0, 300)}`)
    console.log(results.at(-1))
  }
}

;(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_BIN || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' })
  const expect = (locale, path, want, options) => check(`${locale} ${path} -> ${want}${options?.stored ? ` (stored ${options.stored})` : ''}${options?.userAgent ? ' (bot)' : ''}`, async () => {
    assert.equal(await landing(browser, locale, path, options), want)
  })

  // AC2 / AC3
  await expect('zh-TW', '/download', '/zh-tw/download')
  await expect('zh-HK', '/download', '/zh-tw/download')
  await expect('en-US', '/download', '/en-us/download')
  await expect('ja-JP', '/download', '/en-us/download')
  await expect('zh-CN', '/download', '/download')
  await expect('en-US', '/download?a=1#x', '/en-us/download?a=1#x')
  await expect('en-US', '/', '/en-us/')
  await expect('en-US', '/tutorial/tutorial', '/tutorial/tutorial')
  // 镜像页不是译文：直接访问未翻译页面仍不跳转
  await expect('zh-TW', '/standard/intro', '/standard/intro')
  await expect('en-US', '/zh-tw/download', '/zh-tw/download')
  await expect('zh-CN', '/en-us/', '/en-us/')
  await expect('en-US', '/download', '/download', { userAgent: BOT_UA })
  // AC7：手动选择优先于浏览器语言
  await expect('en-US', '/download', '/download', { stored: 'zh-CN' })
  await expect('zh-CN', '/download', '/zh-tw/download', { stored: 'zh-TW' })
  // AC5 / AC10：快捷入口
  await expect('en-US', '/inkeys3', '/en-us/version/inkeys3')
  await expect('zh-TW', '/inkeys3', '/zh-tw/version/inkeys3')
  await expect('zh-CN', '/inkeys3', '/version/inkeys3')
  await expect('en-US', '/win7', '/en-us/version/introduction/win7')
  await expect('zh-CN', '/win7', '/version/introduction/win7')
  await expect('zh-CN', '/tos/zh-cn#一、服务说明', '/tos#一、服务说明')
  await expect('en-US', '/tos/zh-cn', '/en-us/tos')
  await expect('zh-CN', '/tos/en-us', '/en-us/tos')

  // AC1：<html lang>
  await check('html lang on /zh-tw/ and /en-us/download', async () => {
    const context = await browser.newContext({ locale: 'zh-CN' })
    const page = await context.newPage()
    await page.goto(origin + '/zh-tw/', { waitUntil: 'load', timeout: 120000 })
    await page.waitForFunction(() => document.documentElement.lang === 'zh-TW', null, { timeout: 15000 })
    await page.goto(origin + '/en-us/download', { waitUntil: 'load', timeout: 120000 })
    await page.waitForFunction(() => document.documentElement.lang === 'en-US', null, { timeout: 15000 })
    await closeSoon(context)
  })

  // AC4 / AC6 / AC7：语言按钮与站内跳转
  await check('language button (desktop): switch, remember, no auto-switch in site', async () => {
    const context = await browser.newContext({ locale: 'en-US', viewport: { width: 1400, height: 900 } })
    const page = await context.newPage()
    await page.goto(origin + '/en-us/download', { waitUntil: 'load', timeout: 120000 })
    const button = page.locator('.nh3-nav-lang > button')
    await button.waitFor({ state: 'visible', timeout: 30000 })
    assert.equal(await page.locator('.vp-navbar-translations:visible').count(), 0, 'Plume navbar translations visible')
    await button.click()
    assert.equal(await button.getAttribute('aria-expanded'), 'true')
    assert.equal(await page.locator('#nh3-nav-lang-menu a[aria-current]').innerText(), 'English')
    await page.keyboard.press('Escape')
    assert.equal(await button.getAttribute('aria-expanded'), 'false')
    assert.equal(await page.evaluate(() => document.activeElement?.closest('.nh3-nav-lang') !== null), true, 'focus not returned')
    await button.click()
    await page.locator('#nh3-nav-lang-menu a', { hasText: '繁體中文' }).click()
    await page.waitForURL(url => new URL(url).pathname.startsWith('/zh-tw/download'), { timeout: 30000 })
    assert.equal(await page.evaluate(() => localStorage.getItem('inkeys-locale')), 'zh-TW')
    // 未翻译页面切换语言：进入目标语言的镜像页（简体原文 + 暂未翻译提示）
    await page.goto(origin + '/tutorial/tutorial', { waitUntil: 'load', timeout: 120000 })
    await settle(page)
    assert.equal(new URL(page.url()).pathname.replace(/\.html$/, ''), '/tutorial/tutorial')
    await page.locator('.nh3-nav-lang > button').click()
    await page.locator('#nh3-nav-lang-menu a', { hasText: 'English' }).click()
    await page.waitForURL(url => new URL(url).pathname.startsWith('/en-us/tutorial/tutorial'), { timeout: 30000 })
    await page.getByText('Not translated yet').first().waitFor({ state: 'visible', timeout: 15000 })
    // 从英文首页点顶栏“知识库”“社区”：留在英文镜像页，不回跳
    await page.goto(origin + '/en-us/', { waitUntil: 'load', timeout: 120000 })
    await settle(page)
    await page.locator('.vp-navbar .navbar-menu-link', { hasText: 'Knowledge Base' }).click()
    await page.waitForURL(url => new URL(url).pathname.startsWith('/en-us/tutorial/tutorial'), { timeout: 30000 })
    await page.waitForTimeout(1500)
    assert.ok(new URL(page.url()).pathname.startsWith('/en-us/tutorial/tutorial'), `left English: ${page.url()}`)
    // 镜像页正文里的链接也留在英文下
    await page.locator('.vp-doc a[href*="ppt-com"]').first().click()
    await page.waitForURL(url => new URL(url).pathname.startsWith('/en-us/tutorial/ppt-com'), { timeout: 30000 })
    await page.locator('.vp-navbar .navbar-menu-link', { hasText: 'Community' }).click()
    await page.waitForURL(url => new URL(url).pathname.startsWith('/en-us/community'), { timeout: 30000 })
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'en-US')
    await closeSoon(context)
  })

  await check('language button (narrow): visible, Plume screen translations hidden', async () => {
    const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    await page.goto(origin + '/download', { waitUntil: 'load', timeout: 120000 })
    const button = page.locator('.nh3-nav-lang > button')
    await button.waitFor({ state: 'visible', timeout: 30000 })
    await button.click()
    await page.locator('#nh3-nav-lang-menu a', { hasText: 'English' }).waitFor({ state: 'visible' })
    await page.keyboard.press('Escape')
    await page.locator('.vp-navbar-hamburger, .hamburger').first().click()
    await page.locator('.vp-nav-screen').waitFor({ state: 'visible', timeout: 10000 })
    assert.equal(await page.locator('.vp-nav-screen-translations:visible').count(), 0, 'Plume screen translations visible')
    await closeSoon(context)
  })

  await closeSoon(browser)
  console.log(results.join('\n'))
  // Edge 有时不退出，直接结束进程。
  process.exit(results.some(line => line.startsWith('FAIL')) ? 1 : 0)
})()
