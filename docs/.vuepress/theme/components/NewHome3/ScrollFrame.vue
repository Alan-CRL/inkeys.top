<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { advanceFrame, frameRanges, frameView, initialFrameState } from './scrollFrame'

const aperture = ref<HTMLDivElement>()
let page: HTMLElement | null = null
let nav: HTMLElement | null = null
let state = initialFrameState(0)
let ranges = frameRanges(1, 0)
let frame = 0
let mounted = false
let observer: MutationObserver | undefined
let resizeObserver: ResizeObserver | undefined
let originalInert = false
let originalAria: string | null = null
const properties = ['--nh3-nav-visible', '--nh3-nav-fill']

function locked() {
  return !!nav && (nav.contains(document.activeElement)
    || !!nav.querySelector('.screen-open, [aria-expanded="true"]'))
}

function publish() {
  if (!page || !nav) return
  const view = frameView(state, ranges, locked())
  // 功能翻页区（含首屏）由 FeaturePager 标记，期间顶栏保持显示，不随滚动方向收起。
  const visible = page.dataset.nh3Pager ? 1 : view.visible
  page.style.setProperty(properties[0], String(visible))
  page.style.setProperty(properties[1], String(view.fill))
  page.dataset.nh3Frame = view.phase
  const hidden = visible <= 0.001
  page.toggleAttribute('data-nh3-nav-hidden', hidden)
  // 收起时直接退出焦点顺序；恢复时先解除 inert，再由 CSS 平滑进入。
  nav.inert = hidden || originalInert
  if (hidden) nav.setAttribute('aria-hidden', 'true')
  else if (originalAria === null) nav.removeAttribute('aria-hidden')
  else nav.setAttribute('aria-hidden', originalAria)
}

function update() {
  frame = 0
  if (!mounted) return
  state = advanceFrame(state, window.scrollY, ranges)
  publish()
}

function schedule() {
  if (!frame && mounted) frame = requestAnimationFrame(update)
}

function measure() {
  ranges = frameRanges(window.innerHeight, document.documentElement.scrollHeight - window.innerHeight)
  schedule()
}

function restore() {
  // 进入和 BFCache 恢复均从首屏开始；路由滚动策略也会忽略此页面的保存位置。
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  state = initialFrameState(0)
  measure()
  publish()
}

onMounted(() => {
  page = aperture.value?.closest<HTMLElement>('.new-home3-page') ?? null
  nav = page?.querySelector<HTMLElement>('.vp-nav') ?? null
  if (!page || !nav) return
  mounted = true
  originalInert = nav.inert
  originalAria = nav.getAttribute('aria-hidden')
  restore()
  page.setAttribute('data-nh3-frame-ready', '')
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', measure, { passive: true })
  window.addEventListener('pageshow', restore)
  document.addEventListener('focusin', schedule)
  document.addEventListener('focusout', schedule)
  // 原生菜单的 class/aria 状态是唯一来源，不维护第二份菜单开关。
  observer = new MutationObserver(schedule)
  observer.observe(nav, { subtree: true, attributes: true, attributeFilter: ['class', 'aria-expanded'] })
  observer.observe(page, { attributes: true, attributeFilter: ['data-nh3-pager'] })
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(page)
  }
})

onBeforeUnmount(() => {
  mounted = false
  if (frame) cancelAnimationFrame(frame)
  observer?.disconnect()
  resizeObserver?.disconnect()
  window.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', measure)
  window.removeEventListener('pageshow', restore)
  document.removeEventListener('focusin', schedule)
  document.removeEventListener('focusout', schedule)
  if (nav) {
    nav.inert = originalInert
    if (originalAria === null) nav.removeAttribute('aria-hidden')
    else nav.setAttribute('aria-hidden', originalAria)
  }
  properties.forEach(property => page?.style.removeProperty(property))
  page?.removeAttribute('data-nh3-frame-ready')
  page?.removeAttribute('data-nh3-frame')
  page?.removeAttribute('data-nh3-nav-hidden')
})
</script>

<template>
  <div ref="aperture" hidden aria-hidden="true" />
</template>

<style>
.new-home3-page {
  --nh3-frame-color: #f6f8fa;
  /* 与功能介绍区底色一致，供翻页时的沉浸顶栏使用。 */
  --nh3-page-color: #fff;
}

[data-theme='dark'] .new-home3-page {
  --nh3-frame-color: #0b111a;
  --nh3-page-color: #0a0a0a;
}
</style>
