import type { ComputedRef } from 'vue'
import { computed } from 'vue'
import { useRouteLocale } from 'vuepress/client'
import type { Locale } from './locales'
import { localeFromPrefix } from './locales'

/** 当前页面的语言：由路由所在的 locale 推出，服务端渲染与客户端结果一致。 */
export function useLocale(): ComputedRef<Locale> {
  const routeLocale = useRouteLocale()
  return computed(() => localeFromPrefix(routeLocale.value))
}
