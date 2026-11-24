<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useDarkMode, VPLink } from 'vuepress-theme-plume/client'
import { useCopy } from './copy'

// new-index3 顶栏右侧：下载按钮、深浅色切换、更多链接。窄屏只留下载按钮，其余在主题的手机菜单里。
const { copy } = useCopy()
const isDark = useDarkMode()
const more = ref<HTMLDivElement>()
const open = ref(false)

// 与站点原有顶栏的社交链接一致。
const links = [
  { key: 'github', href: 'https://github.com/Alan-CRL/Inkeys' },
  { key: 'gitcode', href: 'https://gitcode.com/alan16356/Inkeys' },
  { key: 'forum', href: 'https://forum.smart-teach.cn/t/inkeys' },
  { key: 'bilibili', href: 'https://space.bilibili.com/1330313497/lists/2210199' },
  { key: 'qq', href: 'https://qm.qq.com/q/wZnY4enpmw' },
] as const

// 深浅色切换：整页交叉淡化 200ms。主题的样式表关掉了视图过渡自带的动画，这里和主题一样用脚本驱动。
function toggleTheme() {
  const start = (document as Document & { startViewTransition?: (update: () => Promise<void>) => { ready: Promise<void> } }).startViewTransition
  if (!start || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    isDark.value = !isDark.value
    return
  }
  const transition = start.call(document, async () => {
    isDark.value = !isDark.value
    await nextTick()
  })
  void transition.ready.then(() => {
    // 主题规定切到深色时旧画面在上、切到浅色时新画面在上，淡化的总是上面那一层。
    document.documentElement.animate(
      { opacity: isDark.value ? [1, 0] : [0, 1] },
      { duration: 200, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards', pseudoElement: `::view-transition-${isDark.value ? 'old' : 'new'}(root)` },
    )
  }).catch(() => {})
}

function onPointerDown(event: PointerEvent) {
  if (open.value && !more.value?.contains(event.target as Node)) open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !open.value) return
  open.value = false
  // 用键盘关闭后把焦点还给按钮。
  more.value?.querySelector('button')?.focus()
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
  <div class="nh3-nav-actions">
    <VPLink class="nh3-btn nh3-btn-primary nh3-btn-small" href="/download" no-icon>{{ copy.nav.download }}</VPLink>
    <!-- 两个图标都输出，由 data-theme 决定显示哪个：服务端不知道访客的主题，按状态渲染会造成水合不一致。 -->
    <button class="nh3-nav-round nh3-nav-theme" type="button" :aria-label="copy.nav.theme" :title="copy.nav.theme" @click="toggleTheme">
      <svg class="is-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 14.4A8.5 8.5 0 0 1 9.6 3.6a8.5 8.5 0 1 0 10.8 10.8Z" /></svg>
      <svg class="is-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.5 1.5M17.2 17.2l1.5 1.5M5.3 18.7l1.5-1.5M17.2 6.8l1.5-1.5" /></svg>
    </button>
    <div ref="more" class="nh3-nav-more">
      <button class="nh3-nav-round" type="button" :aria-label="copy.nav.more" :title="copy.nav.more" aria-controls="nh3-nav-more-menu" :aria-expanded="open" @click="open = !open">
        <svg class="is-dots" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18.5" cy="12" r="1.6" /></svg>
      </button>
      <ul id="nh3-nav-more-menu" class="nh3-nav-menu" :class="{ 'is-open': open }" :inert="!open">
        <li v-for="link in links" :key="link.key">
          <a :href="link.href" target="_blank" rel="noopener noreferrer" @click="open = false">{{ copy.nav.links[link.key] }}</a>
        </li>
      </ul>
    </div>
  </div>
</template>

<style>
.nh3-nav-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 16px;
}

/* 与小号按钮等高的圆形按钮。 */
.nh3-nav-round {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--nh3-surface);
  color: var(--nh3-text);
  cursor: pointer;
  transition: background-color var(--nh3-dur) var(--nh3-ease), transform var(--nh3-dur-press) var(--nh3-ease);
}

.nh3-nav-round svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 太阳和月亮叠在同一格里，切换时交叉淡入并转四分之一圈。 */
.nh3-nav-theme svg {
  grid-area: 1 / 1;
  transition: opacity var(--nh3-dur) var(--nh3-ease), transform var(--nh3-dur-slow) var(--nh3-ease-out);
}

.nh3-nav-theme .is-moon,
[data-theme='dark'] .nh3-nav-theme .is-sun {
  opacity: 0;
}

.nh3-nav-theme .is-moon {
  transform: rotate(-90deg);
}

[data-theme='dark'] .nh3-nav-theme .is-sun {
  transform: rotate(90deg);
}

[data-theme='dark'] .nh3-nav-theme .is-moon {
  opacity: 1;
  transform: none;
}

.nh3-nav-round svg.is-dots {
  fill: currentColor;
  stroke: none;
}

@media (hover: hover) and (pointer: fine) {
  .nh3-nav-round:hover {
    background: var(--nh3-surface-hover);
  }
}

.nh3-nav-round:active {
  transform: scale(0.94);
}

.nh3-nav-round:focus-visible {
  outline: 2px solid var(--nh3-accent);
  outline-offset: 3px;
}

.nh3-nav-more {
  position: relative;
}

.nh3-nav-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 168px;
  margin: 0;
  padding: 6px;
  list-style: none;
  border-radius: var(--nh3-r-control);
  background: var(--nh3-surface);
  opacity: 0;
  visibility: hidden;
  /* 从右上角（按钮下方）展开；收起比展开快。 */
  transform: scale(0.96);
  transform-origin: top right;
  transition: opacity var(--nh3-dur-press) var(--nh3-ease), transform var(--nh3-dur-press) var(--nh3-ease), visibility 0s var(--nh3-dur-press);
}

.nh3-nav-menu.is-open {
  opacity: 1;
  visibility: visible;
  transform: none;
  transition: opacity 160ms var(--nh3-ease-out), transform 160ms var(--nh3-ease-out), visibility 0s;
}

.nh3-nav-menu a {
  display: block;
  padding: 8px 12px;
  border-radius: 8px;
  color: var(--nh3-text);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.6;
  text-decoration: none;
  transition: background-color var(--nh3-dur) var(--nh3-ease);
}

.nh3-nav-menu a:hover {
  background: var(--nh3-surface-hover);
  color: var(--nh3-text);
}

.nh3-nav-menu a:focus-visible {
  outline: 2px solid var(--nh3-accent);
  outline-offset: -2px;
}

/* 手机宽度下主题改用汉堡菜单，深浅色和这些链接都在菜单里。 */
@media (max-width: 767px) {
  .nh3-nav-actions {
    margin-left: 4px;
  }

  .nh3-nav-actions > .nh3-nav-round,
  .nh3-nav-more {
    display: none;
  }
}
</style>
