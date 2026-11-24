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

// 传入的若是备用通道的完整地址，先还原成 public 内的相对路径。
function toPublicPath(url: string): string {
  for (const base of ASSET_BASES) {
    if (url.startsWith(`${base}/`))
      return url.slice(base.length)
  }
  return url
}

/**
 * 返回 `asset(path)`，给出 public 资源当前应使用的地址，供 CSS 背景这类加载失败不会报错的资源使用。
 * 默认走本站（服务端渲染与挂载前一致），挂载后跟随运行时脚本切换到的备用通道。
 */
export function useAssetUrl(): (url: string) => string {
  const base = shallowRef('')
  let stop: (() => void) | undefined

  onMounted(() => {
    // 开发模式不注入运行时脚本，始终走本站。
    const runtime = window.__INKEYS_ASSETS__
    if (!runtime)
      return
    // active() 返回空字符串表示本站，交给 withBase 处理。
    const update = () => {
      base.value = runtime.active()
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
