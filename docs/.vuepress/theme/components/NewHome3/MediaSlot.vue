<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useDarkMode } from 'vuepress-theme-plume/client'

interface Props {
  /** CSS 宽高比，例如 '16 / 10'；不传时铺满父容器。 */
  ratio?: string
  /** 封面图：视频可播放前、以及系统开启“减少动态效果”时显示。 */
  poster?: string
  /** 浅色与深色主题各一份视频；只给一份时两种主题共用。地址含 .m3u8 时按 HLS 播放。 */
  srcLight?: string
  srcDark?: string
  /** 浅色与深色主题各一份动图（GIF）；给了视频时不用。 */
  imgLight?: string
  imgDark?: string
  loop?: boolean
  /** 给读屏用的画面说明。 */
  label: string
  /** 素材制作完成前显示在占位区域里的说明。 */
  note?: string
  /** 给出时在视频右下角显示播放 / 暂停按钮，文字用作按钮的读屏说明与悬停提示。 */
  toggleLabels?: { play: string; pause: string }
}

const props = withDefaults(defineProps<Props>(), { loop: true })
const isDark = useDarkMode()
const video = ref<HTMLVideoElement>()
const src = computed(() => (isDark.value ? props.srcDark ?? props.srcLight : props.srcLight ?? props.srcDark))
const img = computed(() => (isDark.value ? props.imgDark ?? props.imgLight : props.imgLight ?? props.imgDark))
const isHls = computed(() => !!src.value && /\.m3u8(\?|$)/.test(src.value))
const playing = ref(false)
// 第一帧已解码：之前视频透明，露出容器底色；之后渐显，避免画面在滚动中途突然跳出来。
const ready = ref(false)
let observer: IntersectionObserver | undefined
let nearObserver: IntersectionObserver | undefined
let hls: { destroy(): void } | undefined
// 是否希望播放：默认自动播放（开启“减少动态效果”时默认不播）；用户点过按钮后以用户的选择为准，
// 滚动进出视口只做暂停 / 恢复，不会把用户暂停的视频重新播起来。切换语言或主题后沿用这个选择。
let wantsPlay: boolean | undefined
let resume: (() => void) | undefined

function teardown() {
  observer?.disconnect()
  observer = undefined
  nearObserver?.disconnect()
  nearObserver = undefined
  hls?.destroy()
  hls = undefined
  resume = undefined
}

function toggle() {
  const node = video.value
  if (!node) return
  wantsPlay = node.paused
  if (wantsPlay) resume?.()
  else node.pause()
}

// 区块入场动画（appear.ts 的淡入、上移、板面放大）结束前先不播，等画面到位再从第一帧开始。
// appear.ts 在整组出现完成后会去掉 .nh3-appear，以此为准；页内跳转越过的组会立刻去掉，不会白等。
function settled(node: HTMLElement) {
  const hosts: HTMLElement[] = []
  for (let el: HTMLElement | null = node.parentElement; el; el = el.parentElement) {
    if (el.classList.contains('nh3-appear')) hosts.push(el)
  }
  if (!hosts.length) return Promise.resolve()
  return new Promise<void>(resolve => {
    const done = () => {
      watcher.disconnect()
      window.clearTimeout(timer)
      resolve()
    }
    const watcher = new MutationObserver(() => {
      if (!hosts.some(el => el.classList.contains('nh3-appear'))) done()
    })
    for (const el of hosts) watcher.observe(el, { attributes: true, attributeFilter: ['class'] })
    // 兜底：入场异常没有收尾时也不会一直不播。
    const timer = window.setTimeout(done, 3000)
  })
}

// HLS：优先用 hls.js（与首页宣传片的播放器相同），不支持 MSE 时退回浏览器原生 HLS（Safari / iOS）。
// hls.js 按需加载，只有用到 m3u8 的页面才下载。
async function attachHls(node: HTMLVideoElement, url: string, onReady: () => void) {
  const { default: Hls } = await import('hls.js')
  // 等待加载期间视频节点已被替换（例如切换了语言），放弃这次挂载。
  if (video.value !== node) return
  if (Hls.isSupported()) {
    const instance = new Hls()
    instance.loadSource(url)
    instance.attachMedia(node)
    hls = instance
  } else if (node.canPlayType('application/vnd.apple.mpegurl')) {
    node.src = url
  } else return
  onReady()
}

// 每次换成新的视频节点（切换主题或语言时 key 变化）都重新挂观察器。
watch([video, src], ([node, url]) => {
  teardown()
  playing.value = false
  ready.value = false
  if (!node || !url) return
  // 开启“减少动态效果”时不自动播放，停在封面图（或第一帧）上。
  wantsPlay ??= !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let visible = false
  let requested = false
  const sync = () => {
    // 露出一半以上且入场动画结束后播放，离开视口暂停；自动播放被浏览器拒绝时保持当前画面即可。
    if (!visible || !wantsPlay) {
      node.pause()
      return
    }
    void settled(node).then(() => {
      if (visible && wantsPlay && video.value === node) void node.play().catch(() => {})
    })
  }
  // HLS 提前约一屏半开始请求，滚到时第一帧通常已经就绪；也不会在首屏就下载整段视频。
  const load = () => {
    if (requested || !isHls.value) return
    requested = true
    void attachHls(node, url, sync)
  }
  // 点按钮时视频一定在眼前，直接按可见处理。
  resume = () => {
    visible = true
    load()
    sync()
  }
  if (!('IntersectionObserver' in window)) {
    visible = true
    load()
    sync()
    return
  }
  nearObserver = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) load()
  }, { rootMargin: '150% 0px' })
  nearObserver.observe(node)
  observer = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting)
    if (visible) load()
    sync()
  }, { threshold: 0.5 })
  observer.observe(node)
}, { flush: 'post' })

onBeforeUnmount(teardown)
</script>

<template>
  <div class="nh3-media" :class="{ 'is-fill': !ratio, 'is-loading': src && !poster && !ready }" :style="ratio ? { aspectRatio: ratio } : undefined">
    <template v-if="src">
      <!-- 视频本身不显示控制栏，不响应鼠标与键盘，不提供画中画与投屏；需要时只在右下角给一个播放 / 暂停按钮。 -->
      <video ref="video" :key="src" :src="isHls ? undefined : src" :poster="poster" :loop="loop" :aria-label="label" muted playsinline preload="metadata" disablepictureinpicture disableremoteplayback @loadeddata="ready = true" @play="playing = true" @pause="playing = false" />
      <button v-if="toggleLabels" class="nh3-media-toggle" :class="{ 'is-playing': playing }" type="button" :aria-label="playing ? toggleLabels.pause : toggleLabels.play" :title="playing ? toggleLabels.pause : toggleLabels.play" @click="toggle">
        <svg class="is-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.9 5.55 18.3 11.3a.8.8 0 0 1 0 1.4L8.9 18.45A.6.6 0 0 1 8 17.9V6.1a.6.6 0 0 1 .9-.55Z" /></svg>
        <svg class="is-pause" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="5" width="3" height="14" rx=".8" /><rect x="14" y="5" width="3" height="14" rx=".8" /></svg>
      </button>
    </template>
    <img v-else-if="img" :key="img" :src="img" :alt="label" loading="lazy">
    <img v-else-if="poster" :src="poster" :alt="label" loading="lazy">
    <div v-else class="nh3-media-placeholder" role="img" :aria-label="label">
      <span v-if="note">{{ note }}</span>
    </div>
  </div>
</template>

<style>
.nh3-media {
  position: relative;
  overflow: hidden;
  min-height: 0;
}

.nh3-media.is-fill {
  flex: 1;
}

.nh3-media video,
.nh3-media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 视频只作展示：点击、右键菜单与拖动都落到外层，不触发浏览器自带的播放交互。 */
.nh3-media video {
  pointer-events: none;
  user-select: none;
  transition: opacity var(--nh3-dur-enter) var(--nh3-ease-out);
}

/* 第一帧到达前视频与按钮透明，露出容器底色（由使用方设成与第一帧接近的颜色），到达后渐显。 */
.nh3-media.is-loading video,
.nh3-media.is-loading .nh3-media-toggle {
  opacity: 0;
}

.nh3-media.is-loading .nh3-media-toggle {
  pointer-events: none;
}

/* 尺寸、图标比例与按下反馈和首屏的播放按钮（.nh3-playback）一致；画面在暗场与白场之间切换，
   所以底色用半透明深色毛玻璃配白色图标，两种画面上都看得清。 */
.nh3-media-toggle {
  position: absolute;
  right: clamp(10px, 1.4vw, 18px);
  bottom: clamp(10px, 1.4vw, 18px);
  z-index: 1;
  display: grid;
  place-items: center;
  width: clamp(32px, 3.4vw, 40px);
  height: clamp(32px, 3.4vw, 40px);
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgb(18 18 18 / 46%);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 14%);
  -webkit-backdrop-filter: blur(12px) saturate(140%);
  backdrop-filter: blur(12px) saturate(140%);
  color: #fff;
  cursor: pointer;
  transition: background-color var(--nh3-dur) var(--nh3-ease), transform var(--nh3-dur-press) var(--nh3-ease), opacity var(--nh3-dur-enter) var(--nh3-ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .nh3-media-toggle:hover {
    background: rgb(18 18 18 / 64%);
  }
}

.nh3-media-toggle:active {
  transform: scale(0.94);
}

.nh3-media-toggle:focus-visible {
  outline: 2px solid var(--nh3-accent);
  outline-offset: 3px;
}

/* 两个图标叠在同一格里，切换时交叉淡入并略微缩放。 */
.nh3-media-toggle svg {
  grid-area: 1 / 1;
  width: 50%;
  height: 50%;
  fill: currentColor;
  transition: opacity var(--nh3-dur) var(--nh3-ease), transform var(--nh3-dur) var(--nh3-ease-out);
}

.nh3-media-toggle .is-pause,
.nh3-media-toggle.is-playing .is-play {
  opacity: 0;
  transform: scale(0.6);
}

.nh3-media-toggle.is-playing .is-pause {
  opacity: 1;
  transform: none;
}

/* 减少动态效果：只保留颜色与透明度变化。 */
@media (prefers-reduced-motion: reduce) {
  .nh3-media-toggle:active,
  .nh3-media-toggle svg {
    transform: none !important;
  }
}

/* 占位只比所在容器的底色深一点，将来换成素材时边界同样不明显。 */
.nh3-media-placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: 16px;
  box-sizing: border-box;
  background: color-mix(in srgb, var(--nh3-text) 5%, transparent);
  color: var(--nh3-text3);
  font-size: 13px;
  line-height: 1.6;
  text-align: center;
}
</style>
