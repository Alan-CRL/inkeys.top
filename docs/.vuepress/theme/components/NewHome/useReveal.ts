import type { Ref } from 'vue'
import { onBeforeUnmount, onMounted } from 'vue'

// 只有在 JS 就绪后才给区块加上隐藏态，SSR 输出和禁用动效时内容始终可见。
export function useReveal(root: Ref<HTMLElement | null>) {
  let observer: IntersectionObserver | undefined

  onMounted(() => {
    const el = root.value
    if (!el || !('IntersectionObserver' in window))
      return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      return

    const targets = Array.from(el.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (!targets.length)
      return

    // 出现动画结束后移除标记，让元素恢复自身的 hover 过渡（不再带错峰延迟）
    const settle = (event: TransitionEvent) => {
      const target = event.currentTarget as HTMLElement
      if (event.target !== target || event.propertyName !== 'opacity')
        return
      target.removeEventListener('transitionend', settle)
      target.removeAttribute('data-reveal')
    }

    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting)
          continue
        const target = entry.target as HTMLElement
        target.addEventListener('transitionend', settle)
        target.classList.add('is-revealed')
        observer?.unobserve(target)
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 })

    el.classList.add('nh-reveal-armed')
    targets.forEach(target => observer?.observe(target))
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
  })
}
