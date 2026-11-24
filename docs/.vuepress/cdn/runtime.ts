import { ASSET_BASES, PROBE_PATH } from './bases'

/**
 * 生成插入 <head> 的内联脚本，负责 public 资源在本站与备用地址之间切换（默认顺序：本站 → ASSET_BASES）。
 *
 * - 单个文件加载失败：只让这张 `<img>` 换到尚未试过的下一个通道。
 * - 卡顿看门狗：视口附近的 `<img>` 或组件背景图 6 秒仍未加载完，就并行测一次各通道的响应。
 *   当前通道失败，或默认顺序里有耗时不到它一半的通道时，整站切到其中最靠前的一个；
 *   通道正常却仍卡住时只让这张图单独换通道；都慢则不动。
 * - 整站切换后改写 DOM 中的 public 地址，并用 MutationObserver 改写之后渲染的内容（SPA 切页）；
 *   组件通过 `window.__INKEYS_ASSETS__` 订阅变化（见 useAssetUrl.ts）。
 *
 * 写成纯字符串而不是序列化函数，避免构建工具注入的辅助函数在浏览器里找不到。
 * 脚本文本必须在 HTML 与 JS 中保持一致：VuePress 按文本接管 head 标签，不一致会在切页时再插入一次。
 */
export function createAssetRuntimeScript(siteBase: string, publicFiles: string[]): string {
  return `
;(() => {
  // 页面头部被重新生成时不重复初始化，保住已登记的订阅。
  if (window.__INKEYS_ASSETS__)
    return
  const sitePrefix = ${JSON.stringify(siteBase.replace(/\/$/, ''))}
  const local = location.origin + sitePrefix
  const bases = [local, ...${JSON.stringify(ASSET_BASES)}]
  const files = new Set(${JSON.stringify(publicFiles)})
  const probePath = ${JSON.stringify(PROBE_PATH)}
  const stallMs = 6000
  const raceGapMs = 15000
  const storageKey = 'inkeys-asset-preferred'
  const attributes = ['src', 'href', 'poster', 'srcset', 'style']
  const urlPattern = /(?:https?:\\/\\/[^\\s"'(),]+)?\\/[^\\s"'(),]*/g

  let preferred = local
  try {
    const saved = sessionStorage.getItem(storageKey)
    if (bases.includes(saved))
      preferred = saved
  }
  catch {}
  const listeners = new Set()
  const tried = new WeakMap()
  const pending = new Map()
  const backgroundProbes = new Map()
  const settledHosts = new WeakMap()
  let observer
  let racing = false
  let lastRace = 0

  // 拆成 [通道, public 路径及查询串]；不在 public 清单中的地址（页面链接、外部资源）返回 undefined。
  const split = (url) => {
    let base
    let rest
    if (url.startsWith('/') && !url.startsWith('//')) {
      if (sitePrefix && !url.startsWith(sitePrefix + '/'))
        return
      base = local
      rest = url.slice(sitePrefix.length)
    }
    else {
      base = bases.find(item => url.startsWith(item + '/'))
      if (!base)
        return
      rest = url.slice(base.length)
    }
    return files.has(rest.replace(/[?#].*$/, '')) ? [base, rest] : undefined
  }
  // 写回 DOM 时本站保持相对路径。
  const prefix = base => base === local ? sitePrefix : base
  const rewrite = (value, from, to) => value.replace(urlPattern, (token) => {
    const parts = split(token)
    return parts && parts[0] === from ? prefix(to) + parts[1] : token
  })
  const fixElement = (element, from, to) => {
    for (const name of attributes) {
      const value = element.getAttribute(name)
      if (!value)
        continue
      const fixed = rewrite(value, from, to)
      if (fixed !== value)
        element.setAttribute(name, fixed)
    }
  }
  const fixTree = (root, from, to) => {
    if (root.nodeType !== 1)
      return
    fixElement(root, from, to)
    root.querySelectorAll('[src],[href],[poster],[srcset],[style]').forEach(element => fixElement(element, from, to))
  }
  // 切到备用通道后，新渲染的内容仍带本站路径（Markdown 页面），在这里改写。
  const watch = () => {
    if (observer || preferred === local)
      return
    observer = new MutationObserver((records) => {
      if (preferred === local)
        return
      for (const record of records) {
        if (record.type === 'attributes')
          fixElement(record.target, local, preferred)
        else
          record.addedNodes.forEach(node => fixTree(node, local, preferred))
      }
    })
    observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: attributes })
  }
  const switchTo = (base) => {
    const previous = preferred
    if (base === previous)
      return
    preferred = base
    try {
      sessionStorage.setItem(storageKey, base)
    }
    catch {}
    fixTree(document.documentElement, previous, base)
    if (previous !== local)
      fixTree(document.documentElement, local, base)
    if (base === local) {
      observer?.disconnect()
      observer = undefined
    }
    else {
      watch()
    }
    pending.clear()
    backgroundProbes.clear()
    listeners.forEach(listener => listener())
  }

  // 让一张图换到指定通道，或按 [当前通道, ...默认顺序] 换到尚未试过的下一个。
  const moveImage = (image, rest, target) => {
    const state = tried.get(image)
    const path = rest.replace(/[?#].*$/, '')
    const used = state && state.path === path ? state.used : new Set()
    const current = split(image.currentSrc || image.src)
    if (current)
      used.add(current[0])
    tried.set(image, { path, used })
    const next = target && !used.has(target) ? target : [preferred, ...bases].find(base => !used.has(base))
    if (!next)
      return
    image.removeAttribute('srcset')
    image.src = prefix(next) + rest
  }

  document.addEventListener('error', (event) => {
    const image = event.target
    if (!(image instanceof HTMLImageElement))
      return
    const parts = split(image.currentSrc || image.src)
    if (parts)
      moveImage(image, parts[1])
  }, true)

  // 并行下载各通道的探测文件并计时，失败或超时记为 Infinity。
  const race = () => Promise.all(bases.map((base) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const started = performance.now()
    return fetch(base + probePath + '?t=' + Date.now(), { cache: 'no-store', mode: base === local ? 'same-origin' : 'cors', signal: controller.signal })
      .then(response => response.ok ? response.arrayBuffer().then(() => performance.now() - started) : Infinity)
      .catch(() => Infinity)
      .finally(() => clearTimeout(timer))
  })).then(times => new Map(bases.map((base, index) => [base, times[index]])))

  const onStall = (base, move) => {
    if (racing || Date.now() - lastRace < raceGapMs)
      return
    racing = true
    lastRace = Date.now()
    race().then((times) => {
      racing = false
      const current = times.get(base)
      // 按默认顺序取第一个明显更快的通道（当前通道失败，或候选耗时不到它的一半），不按测速挑最快。
      const target = bases.find(item => item !== base && times.get(item) < Infinity && (current === Infinity || times.get(item) * 2 < current))
      if (target) {
        if (base === preferred)
          switchTo(target)
        else
          move?.(target)
      }
      // 通道响应正常却仍卡住，多半是这个文件本身的问题，只让它单独换通道。
      else if (current < 2000) {
        move?.()
      }
    }, () => {
      racing = false
    })
  }

  // 加载中的图片可能还是 0×0，按是否参与渲染（display: none 没有矩形）和位置判断，不看尺寸。
  const near = (element) => {
    if (!element.getClientRects().length)
      return false
    const rect = element.getBoundingClientRect()
    return rect.bottom > -800 && rect.top < innerHeight + 800
  }
  const track = (url, now, seen, move) => {
    seen.add(url)
    const entry = pending.get(url)
    if (!entry) {
      pending.set(url, { since: now, handled: false })
      return
    }
    if (!entry.handled && now - entry.since > stallMs) {
      entry.handled = true
      onStall(split(url)[0], move)
    }
  }
  const managedStyle = value => (value.match(urlPattern) || []).some(token => split(token))
  const tick = () => {
    if (document.hidden)
      return
    const now = Date.now()
    const seen = new Set()
    for (const image of document.images) {
      if (image.complete || !near(image))
        continue
      const url = image.currentSrc || image.src
      const parts = split(url)
      if (parts)
        track(url, now, seen, target => moveImage(image, parts[1], target))
    }
    // CSS 背景没有加载事件：用同一 URL 的 Image 观察完成状态（浏览器复用同一请求）。
    for (const host of document.querySelectorAll('[style*="url("]')) {
      const style = host.getAttribute('style')
      if (settledHosts.get(host) === style || !managedStyle(style) || !near(host))
        continue
      let waiting = false
      for (const element of [host, ...host.querySelectorAll('*')]) {
        for (const pseudo of [null, '::before', '::after']) {
          const background = getComputedStyle(element, pseudo).backgroundImage
          if (!background || background === 'none')
            continue
          for (const match of background.matchAll(/url\\("?([^")]+)"?\\)/g)) {
            const url = match[1]
            if (!split(url))
              continue
            let probe = backgroundProbes.get(url)
            if (!probe) {
              probe = new Image()
              probe.src = url
              backgroundProbes.set(url, probe)
            }
            if (!probe.complete) {
              waiting = true
              track(url, now, seen)
            }
          }
        }
      }
      if (!waiting)
        settledHosts.set(host, style)
    }
    for (const url of pending.keys()) {
      if (!seen.has(url))
        pending.delete(url)
    }
  }
  setInterval(tick, 1000)

  window.__INKEYS_ASSETS__ = {
    active: () => preferred === local ? '' : preferred,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  watch()
})()
`.trim()
}
