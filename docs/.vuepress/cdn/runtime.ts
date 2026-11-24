import { ASSET_BASES, PROBE_PATH } from './bases'

/**
 * 生成插入 <head> 的内联脚本：在正文图片开始加载前就位，负责远程地址的探测与切换。
 *
 * - `<img>` 加载失败时换列表中的下一个地址，最后用本地；同时探测失败的地址。
 * - 探测失败或超时的地址在本次会话内判为不可用，DOM 中指向它的链接、海报、内联样式都改写到当前可用地址，
 *   之后用 MutationObserver 继续改写新渲染的内容（SPA 切页）。一切正常时不启用观察。
 * - 组件通过 `window.__INKEYS_ASSETS__` 订阅变化（见 useAssetUrl.ts），用于 CSS 背景这类不会报错的资源。
 *
 * 写成纯字符串而不是序列化函数，避免构建工具注入的辅助函数在浏览器里找不到。
 */
export function createAssetRuntimeScript(siteBase: string): string {
  return `
;(() => {
  // 页面头部被重新生成时不重复初始化，保住已登记的订阅。
  if (window.__INKEYS_ASSETS__)
    return
  const bases = ${JSON.stringify(ASSET_BASES)}
  const local = ${JSON.stringify(siteBase.replace(/\/$/, ''))}
  const probePath = ${JSON.stringify(PROBE_PATH)}
  const downKey = 'inkeys-asset-down'
  const okKey = 'inkeys-asset-ok'
  const attributes = ['src', 'href', 'poster', 'srcset', 'style']
  const read = (key) => {
    try {
      const value = JSON.parse(sessionStorage.getItem(key) || '[]')
      return new Set(Array.isArray(value) ? value.filter(base => bases.includes(base)) : [])
    }
    catch {
      return new Set()
    }
  }
  const write = (key, set) => {
    try {
      sessionStorage.setItem(key, JSON.stringify([...set]))
    }
    catch {}
  }
  const down = read(downKey)
  const ok = read(okKey)
  const probes = new Map()
  const listeners = new Set()
  let observer

  const active = () => bases.find(base => !down.has(base)) ?? local
  const after = base => bases.slice(bases.indexOf(base) + 1).find(item => !down.has(item)) ?? local
  // 拆出远程地址与 public 内的相对路径，不属于列表的地址返回 undefined。
  const split = (url) => {
    for (const base of bases) {
      if (url.startsWith(base + '/'))
        return [base, url.slice(base.length)]
    }
  }

  const fixElement = (element) => {
    for (const name of attributes) {
      const value = element.getAttribute(name)
      if (!value || !value.includes('://'))
        continue
      let fixed = value
      for (const base of down)
        fixed = fixed.split(base + '/').join(active() + '/')
      if (fixed !== value)
        element.setAttribute(name, fixed)
    }
  }
  const fixTree = (root) => {
    if (root.nodeType !== 1)
      return
    fixElement(root)
    root.querySelectorAll('[src],[href],[poster],[srcset],[style]').forEach(fixElement)
  }
  const watch = () => {
    if (observer)
      return
    observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'attributes')
          fixElement(record.target)
        else
          record.addedNodes.forEach(fixTree)
      }
    })
    observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: attributes })
  }

  const markDown = (base) => {
    if (down.has(base))
      return
    down.add(base)
    ok.delete(base)
    write(downKey, down)
    write(okKey, ok)
    fixTree(document.documentElement)
    watch()
    listeners.forEach(listener => listener())
    check()
  }
  // 每个地址每次页面加载最多探测一次；HEAD 无自定义请求头，不触发预检。
  const probe = (base) => {
    if (!probes.has(base)) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 5000)
      probes.set(base, fetch(base + probePath, { method: 'HEAD', mode: 'cors', cache: 'no-store', signal: controller.signal })
        .then(response => response.ok, () => false)
        .then((healthy) => {
          clearTimeout(timer)
          if (healthy) {
            ok.add(base)
            write(okKey, ok)
          }
          else {
            markDown(base)
          }
          return healthy
        }))
    }
    return probes.get(base)
  }
  // 启动时只确认当前首选地址；本会话已确认可用的不再重复探测，出错时仍会重新探测。
  const check = () => {
    const base = active()
    if (base !== local && !ok.has(base))
      probe(base)
  }

  // 单个文件缺失（403）只让这张图退回，地址整体是否可用交给探测判断。
  document.addEventListener('error', (event) => {
    const image = event.target
    if (!(image instanceof HTMLImageElement))
      return
    const parts = split(image.currentSrc || image.src)
    if (!parts)
      return
    const [base, path] = parts
    probe(base)
    image.removeAttribute('srcset')
    image.src = after(base) + path
  }, true)

  window.__INKEYS_ASSETS__ = {
    active,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  if (down.size)
    watch()
  check()
})()
`.trim()
}
