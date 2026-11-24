import { onBeforeUnmount, onMounted } from 'vue'
import type { Ref } from 'vue'

/**
 * 区块进入视口时出现一次：淡入加一小段位移，之后不再重播，也不跟随滚动进度。
 *
 * 标记方式：
 * - `data-nh3-appear`：一组，整组进入视口时一起触发；`data-nh3-step` 可改组内间隔（毫秒）。
 * - `data-nh3-item`：组内依次出现的元素（组本身也可以是其中一个）；没有标记时整组作为一个元素。
 *   取值 `right` 从右侧移入，`panel` 由 97% 放大，其余为上移。
 *
 * 隐藏用的类名在挂载后才加上：没有脚本、不支持 IntersectionObserver
 * 或系统开启“减少动态效果”时，内容始终可见。
 */

// 所有区块共用：还没出现过的组。页内跳转越过的组不补播动画，直接显示。
const waiting = new Map<Element, HTMLElement[]>()

function show(group: Element, animate: boolean) {
  const items = waiting.get(group)
  if (!items) return
  waiting.delete(group)
  for (const item of items) {
    if (!animate) item.classList.remove('nh3-appear')
    item.classList.remove('nh3-appear-pending')
  }
  if (!animate) return
  // 出现完成后去掉过渡类，不影响元素自己的悬停过渡。
  const last = Number.parseFloat(items[items.length - 1].style.getPropertyValue('--nh3-appear-delay')) || 0
  window.setTimeout(() => {
    for (const item of items) {
      item.classList.remove('nh3-appear')
      item.style.removeProperty('--nh3-appear-delay')
    }
  }, last + 900)
}

export function useAppear(root: Ref<HTMLElement | undefined>) {
  let observer: IntersectionObserver | undefined
  const groups: Element[] = []

  onMounted(() => {
    const node = root.value
    if (!node || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    observer = new IntersectionObserver(entries => {
      let entered = false
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entered = true
        show(entry.target, true)
        observer?.unobserve(entry.target)
      }
      if (!entered) return
      // 有内容进入视口时，把已经被越过（整组在视口上方）的组直接显示出来。
      for (const group of [...waiting.keys()]) {
        if (group.getBoundingClientRect().bottom < 0) show(group, false)
      }
    }, { threshold: 0.15 })

    for (const group of node.querySelectorAll<HTMLElement>('[data-nh3-appear]')) {
      const items = [...group.querySelectorAll<HTMLElement>('[data-nh3-item]')]
      if (group.matches('[data-nh3-item]') || !items.length) items.unshift(group)
      const step = Number(group.dataset.nh3Step) || 80
      items.forEach((item, index) => {
        item.style.setProperty('--nh3-appear-delay', `${index * step}ms`)
        item.classList.add('nh3-appear', 'nh3-appear-pending')
      })
      waiting.set(group, items)
      groups.push(group)
      observer.observe(group)
    }
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    for (const group of groups) waiting.delete(group)
  })
}
