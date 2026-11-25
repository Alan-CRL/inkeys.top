<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useLangs } from 'vuepress-theme-plume/client'
import { resolveRoute, useRouter } from 'vuepress/client'
import type { Locale } from '../../i18n/locales'
import { LOCALE_NAME, LOCALE_PREFIX, LOCALE_STORAGE_KEY, LOCALES } from '../../i18n/locales'
import { useCopy } from './NewHome3/copy'

// 顶栏语言按钮：与“更多链接”同一圆按钮 + 下拉菜单。站内唯一的语言入口（Plume 自带的已在 site.css 隐藏）。
const { locale, copy } = useCopy()
const router = useRouter()
// 链接沿用 Plume 的计算：目标语言有同路径页面就去该页，否则去集合首页或目标语言首页。
const { localeLinks } = useLangs({ removeCurrent: false })
const root = ref<HTMLDivElement>()
const open = ref(false)

const items = computed(() => LOCALES.map((item) => {
  const link = localeLinks.value.find(entry => entry.text === LOCALE_NAME[item])?.link
  // Plume 在版本列表等集合页上会给出目标语言并不存在的集合地址，这里退回目标语言首页。
  const href = link && !resolveRoute(link).notFound ? link : LOCALE_PREFIX[item]
  return { locale: item, name: LOCALE_NAME[item], href }
}))

function choose(event: MouseEvent, item: { locale: Locale, href: string }) {
  // 只有这里会写入手动选择；之后直接访问不带前缀的网址时按此语言匹配。
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, item.locale)
  }
  catch {}
  open.value = false
  // 带修饰键或非左键点击交给浏览器（新标签页等）。
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  if (item.locale !== locale.value) void router.push(item.href)
}

function onPointerDown(event: PointerEvent) {
  if (open.value && !root.value?.contains(event.target as Node)) open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !open.value) return
  open.value = false
  // 用键盘关闭后把焦点还给按钮。
  root.value?.querySelector('button')?.focus()
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="root" class="nh3-nav-lang">
    <button class="nh3-nav-round" type="button" :aria-label="copy.nav.language" :title="copy.nav.language" aria-controls="nh3-nav-lang-menu" :aria-expanded="open" @click="open = !open">
      <!-- “文 / A” 语言图标 -->
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 8 6 6" /><path d="m4 14 6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" /><path d="m22 22-5-10-5 10" /><path d="M14 18h6" /></svg>
    </button>
    <ul id="nh3-nav-lang-menu" class="nh3-nav-menu" :class="{ 'is-open': open }" :inert="!open">
      <li v-for="item in items" :key="item.locale">
        <a :href="item.href" :lang="item.locale" :hreflang="item.locale" :aria-current="item.locale === locale ? 'true' : undefined" @click="choose($event, item)">
          <span>{{ item.name }}</span>
          <svg v-if="item.locale === locale" class="nh3-nav-lang-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
        </a>
      </li>
    </ul>
  </div>
</template>

<style>
.nh3-nav-lang {
  position: relative;
}

.nh3-nav-lang .nh3-nav-menu {
  min-width: 152px;
}

.nh3-nav-lang .nh3-nav-menu a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.nh3-nav-lang .nh3-nav-menu a[aria-current] {
  font-weight: 500;
}

.nh3-nav-lang-check {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
