import { onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { withBase } from 'vuepress/client'
import { ASSET_BASES } from './bases'

interface AssetRuntime {
  active: () => string
  subscribe: (listener: () => void) => () => void
}

declare global {
  interface Window {
    __INKEYS_ASSETS__?: AssetRuntime
  }
}

// 构建时会把源码里的 public 路径替换成主地址，这里统一还原成 public 内的相对路径。
function toPublicPath(url: string): string {
  for (const base of ASSET_BASES) {
    if (url.startsWith(`${base}/`))
      return url.slice(base.length)
  }
  return url
}

/**
 * 返回 `asset(path)`，给出 public 资源当前应使用的地址，供 CSS 背景这类加载失败不会报错的资源使用。
 * 挂载前与服务端渲染保持一致（生产用主地址、开发用本地），挂载后跟随运行时脚本判断出的可用地址。
 */
export function useAssetUrl(): (url: string) => string {
  const base = shallowRef(import.meta.env.PROD ? ASSET_BASES[0] : '')
  let stop: (() => void) | undefined

  onMounted(() => {
    const runtime = window.__INKEYS_ASSETS__
    if (!runtime) {
      base.value = ''
      return
    }
    const update = () => {
      const active = runtime.active()
      // 运行时脚本以本地前缀表示退回本地，这里交给 withBase 处理。
      base.value = ASSET_BASES.includes(active) ? active : ''
    }
    update()
    stop = runtime.subscribe(update)
  })
  onBeforeUnmount(() => stop?.())

  return (url: string) => {
    const path = toPublicPath(url)
    return base.value ? `${base.value}${path}` : withBase(path)
  }
}
