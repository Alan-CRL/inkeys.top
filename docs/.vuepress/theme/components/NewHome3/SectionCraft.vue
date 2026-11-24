<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAssetUrl } from '../../../cdn/useAssetUrl'
import MediaSlot from './MediaSlot.vue'
import { useAppear } from './appear'
import { useCopy } from './copy'

// S5：A 书写体验（墨迹板面）与 B 界面与设备（背景图）是紧挨着的一组，外形一致。
const { locale, copy } = useCopy()
const root = ref<HTMLElement>()
const card = ref<HTMLElement>()
const settings = ref<HTMLElement>()
const bar = ref<HTMLElement>()
// 背景图不会报加载错误，地址交给 useAssetUrl 跟随当前可用的 CDN 或本地。
const asset = useAssetUrl()
const craftUrl = (name: string) => `url("${asset(`/new-index3/craft/${name}`)}")`
const inkLayers = computed(() => ({ '--ink-forest': craftUrl('performance-forest.webp') }))
// 让 data-theme 同时切换两层原生图与壁纸，浏览器只请求生效的背景。
const nativeLayers = computed(() => ({
  '--settings-light': craftUrl(`settings-${locale.value}-light.png`),
  '--settings-dark': craftUrl(`settings-${locale.value}-dark.png`),
  '--toolbar-light': craftUrl(`toolbar-${locale.value}-light.png`),
  '--toolbar-dark': craftUrl(`toolbar-${locale.value}-dark.png`),
  '--wallpaper-light': craftUrl('wallpaper-light.webp'),
  '--wallpaper-dark': craftUrl('wallpaper-dark.webp'),
  '--wallpaper-blur-light': craftUrl('wallpaper-light-blur.webp'),
  '--wallpaper-blur-dark': craftUrl('wallpaper-dark-blur.webp'),
}))
let resize: ResizeObserver | undefined

// S5-A 书写演示：123 云盘转码后的 HLS，每种语言各有 1080p / 720p / 480p 三条独立播放列表。
// 没有控制栏可切换清晰度，挂载时按视频区域的物理像素宽度选一档（成片宽 2520，三档约 2520 / 1680 / 1120）。
type InkResolution = '1080p' | '720p' | '480p'
const inkResolution = ref<InkResolution>('720p')
const inkVideo = computed(() => `https://1709404.cdn.123clouddisk.com/1709404/transcode/s5a-${locale.value}-1080p30.m3u8?extParams=m3u8&resolutions=${inkResolution.value}&suffix=mp4&from=transcode`)

function pickInkResolution(): InkResolution {
  const media = root.value?.querySelector<HTMLElement>('.nh3-ink-media')
  const width = (media?.clientWidth || window.innerWidth) * (window.devicePixelRatio || 1)
  // 用户开启了省流量时直接用最低档。
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return '480p'
  return width > 1680 ? '1080p' : width > 1120 ? '720p' : '480p'
}

function alignBlurredWallpaper() {
  const panel = card.value
  if (!panel) return
  // 回退图沿用整张卡片的 cover 裁切，再移到窗口与主栏两块底板下的同一坐标。
  // 沿 offsetParent 累加布局位置，不受出场动画的 transform 影响。
  const layers = [settings.value, ...(bar.value?.querySelectorAll<HTMLElement>('.nh3-craft-bar-glass') ?? [])]
  for (const layer of layers) {
    if (!layer || !layer.offsetWidth) continue
    let x = 0
    let y = 0
    for (let node: HTMLElement | null = layer; node && node !== panel; node = node.offsetParent as HTMLElement | null) {
      x += node.offsetLeft
      y += node.offsetTop
    }
    layer.style.setProperty('--card-width', `${panel.clientWidth}px`)
    layer.style.setProperty('--card-height', `${panel.clientHeight}px`)
    layer.style.setProperty('--wallpaper-x', `${-x}px`)
    layer.style.setProperty('--wallpaper-y', `${-y}px`)
  }
}

onMounted(() => {
  // 视频要等进入视口才开始请求，这里先定好清晰度，不会产生多余的下载。
  inkResolution.value = pickInkResolution()
  if (!card.value || !settings.value || !bar.value || CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)')) return
  alignBlurredWallpaper()
  if ('ResizeObserver' in window) {
    resize = new ResizeObserver(alignBlurredWallpaper)
    resize.observe(card.value)
    resize.observe(settings.value)
    resize.observe(bar.value)
  }
  window.addEventListener('resize', alignBlurredWallpaper)
})
onBeforeUnmount(() => {
  resize?.disconnect()
  window.removeEventListener('resize', alignBlurredWallpaper)
})
useAppear(root)
</script>

<template>
  <section ref="root" class="nh3-section nh3-s5" aria-labelledby="nh3-s5a-title">
    <div class="nh3-panel nh3-ink" :style="inkLayers" data-nh3-appear data-nh3-item="panel">
      <div class="nh3-wrap nh3-ink-inner">
        <h2 id="nh3-s5a-title" class="nh3-display" data-nh3-item>{{ copy.s5a.title }}</h2>
        <p class="nh3-lead" data-nh3-item><span v-for="line in copy.s5a.lead" :key="line">{{ line }}</span></p>
        <MediaSlot class="nh3-ink-media" data-nh3-item :src-light="inkVideo" :toggle-labels="{ play: copy.s5a.play, pause: copy.s5a.pause }" :label="copy.s5a.media" :note="copy.placeholder.ink" />
      </div>
    </div>

    <div ref="card" class="nh3-panel nh3-craft" :style="nativeLayers" aria-labelledby="nh3-s5b-title" data-nh3-appear data-nh3-item>
      <div class="nh3-wrap nh3-craft-inner">
        <div class="nh3-craft-text">
          <h2 id="nh3-s5b-title" class="nh3-display" data-nh3-item><span v-for="clause in copy.s5b.title" :key="clause" class="nh3-clause">{{ clause }}</span></h2>
          <p class="nh3-body" data-nh3-item>{{ copy.s5b.text }}</p>
        </div>
      </div>
      <!-- 设置界面向右伸出板面，被板面的圆角裁掉；主栏压在窗口下沿上方，向左错开。 -->
      <!-- 窗口与主栏的透明度来自原生导出的直通 alpha；网页把两者最底层的底板统一调到 60%，卡片、文字和图标保持原生。 -->
      <!-- 网页只在两者后面模糊壁纸，模拟 DWM 的 BlurBehind；主栏的模糊只放在两块底板下，不进入阴影与光影留边。 -->
      <div class="nh3-craft-ui">
        <div ref="settings" class="nh3-craft-window" data-nh3-item="right" role="img" :aria-label="copy.s5b.window" />
        <div ref="bar" class="nh3-craft-bar" data-nh3-item="right" role="img" :aria-label="copy.s5b.bar">
          <div class="nh3-craft-bar-glass" />
          <div class="nh3-craft-bar-glass" />
        </div>
      </div>
    </div>
  </section>
</template>

<style>
/* 两块板面都比内容栏宽，左右只离屏幕边缘一小段。 */
.nh3-panel {
  position: relative;
  margin: 0 clamp(12px, 2vw, 28px);
  overflow: hidden;
  border-radius: calc(var(--nh3-r-card) + 8px);
}

/* ---------- A：书写体验。两个主题共用同一幅深色森林。 ---------- */
.nh3-ink {
  padding: clamp(56px, 8vw, 112px) 0 clamp(20px, 3vw, 40px);
  background: var(--nh3-ink-bg) var(--ink-forest) center / cover no-repeat;
  color: var(--nh3-ink-fg);
}

/* 深色主题下板面与页面底色接近，加一圈很淡的内描边区分。 */
[data-theme='dark'] .nh3-ink {
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.07);
}

.nh3-ink-inner {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.nh3-ink .nh3-display {
  color: var(--nh3-ink-fg);
}

.nh3-ink .nh3-lead {
  margin-top: 24px;
  color: color-mix(in srgb, var(--nh3-ink-fg) 74%, transparent);
}

/* 导语的两句各占一行。 */
.nh3-ink .nh3-lead span {
  display: block;
}

/* 各宽度都保持 21:9：画面右侧是标签文字，裁成别的比例会切掉文字。 */
/* 底色仿成片第一帧（近黑，左上与右下各一团青色光晕），视频加载完渐显时看不出边界。 */
.nh3-ink-media {
  flex: none;
  width: 100%;
  margin-top: clamp(40px, 5vw, 64px);
  aspect-ratio: 21 / 9;
  border-radius: var(--nh3-r-media);
  background:
    radial-gradient(ellipse 50% 75% at 100% 100%, rgb(14 70 64 / 90%), transparent 100%),
    radial-gradient(ellipse 22% 38% at 0 0, rgb(12 38 38 / 80%), transparent 100%),
    #070909;
}

/* 板面上的占位再压暗一层，文字用板面的次要文字色。 */
.nh3-ink .nh3-media-placeholder {
  background: rgba(0, 0, 0, 0.24);
  color: color-mix(in srgb, var(--nh3-ink-fg) 68%, transparent);
}

[data-theme='dark'] .nh3-ink .nh3-media-placeholder {
  background: rgba(0, 0, 0, 0.3);
}

/* ---------- B：界面与设备。两层原生界面共用整块板面的壁纸。 ---------- */
.nh3-craft {
  --settings: var(--settings-light);
  --toolbar: var(--toolbar-light);
  --wallpaper: var(--wallpaper-light);
  --wallpaper-blur: var(--wallpaper-blur-light);
  --wallpaper-position: center;
  display: grid;
  grid-template: 'layer' / minmax(0, 1fr);
  align-items: center;
  min-height: clamp(520px, 52vw, 680px);
  margin-top: 24px;
  padding: clamp(32px, 3vw, 46px) 0;
  box-sizing: border-box;
  background: var(--nh3-surface) var(--wallpaper) var(--wallpaper-position) / cover no-repeat;
}

[data-theme='dark'] .nh3-craft {
  --settings: var(--settings-dark);
  --toolbar: var(--toolbar-dark);
  --wallpaper: var(--wallpaper-dark);
  --wallpaper-blur: var(--wallpaper-blur-dark);
}

.nh3-craft-inner {
  grid-area: layer;
  position: relative;
  z-index: 1;
}

/* 文字占内容栏左侧不到一半；压在图片上，说明用文字色而不是次要文字色。 */
.nh3-craft-text {
  max-width: 48%;
}

/* 标题比其他区块略小一号，让中文的两个分句各占一行、不再折行。 */
.nh3-craft-text .nh3-display {
  font-size: clamp(32px, 3.9vw, 54px);
}

.nh3-craft-text .nh3-body {
  max-width: 30em;
  margin-top: 24px;
  color: var(--nh3-text);
}

.nh3-craft-ui {
  grid-area: layer;
  /* 宽屏上窗口达到尺寸上限后仍露出到卡片外。 */
  margin-left: max(56%, calc(100% - 620px));
  width: clamp(520px, 50%, 720px);
}

.nh3-craft-window {
  position: relative;
  overflow: hidden;
  aspect-ratio: 960 / 700;
  /* 原生窗口取产品默认的 960 × 700 DIP，8 DIP 圆角。 */
  border-radius: 0.83% / 1.14%;
  -webkit-backdrop-filter: blur(18px);
  backdrop-filter: blur(18px);
}

.nh3-craft-window::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--settings) center / contain no-repeat;
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .nh3-craft-window::before {
    content: '';
    position: absolute;
    left: var(--wallpaper-x);
    top: var(--wallpaper-y);
    width: var(--card-width);
    height: var(--card-height);
    background: var(--wallpaper-blur) var(--wallpaper-position) / cover no-repeat;
  }
}

.nh3-craft-bar {
  --bar-width: min(84%, 40vw);
  /* 2431px 宽的导出图四边留出 60.5px 给原生光影，实体高 240px；位置都按实体边沿计算。 */
  --bar-inset: calc(var(--bar-width) * 60.5 / 2431);
  --bar-solid: calc(var(--bar-width) * 240 / 2431);
  /* 主栏压在窗口下沿之上、向左错出一段：压住四成实体高，正好盖住最后一行小字，版权与许可行仍完整。 */
  --bar-overlap: calc(var(--bar-solid) * 0.4);
  --bar-shift: 10%;
  position: relative;
  z-index: 1;
  width: var(--bar-width);
  margin-top: calc(0px - var(--bar-overlap) - var(--bar-inset));
  margin-left: calc(0px - var(--bar-shift) - var(--bar-inset));
  aspect-ratio: 2431 / 361;
}

/* 原生主栏图画在模糊层之上。 */
.nh3-craft-bar::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--toolbar) center / contain no-repeat;
}

.nh3-craft-bar-glass {
  /* 主按钮与主栏两块底板在 2431 × 361 导出图里的实体位置；Chromium 的背景模糊不受 mask 裁切，用圆角盒近似原生超椭圆。 */
  position: absolute;
  left: calc(61% * 100 / 2431);
  top: calc(61% * 100 / 361);
  width: calc(239% * 100 / 2431);
  height: calc(239% * 100 / 361);
  overflow: hidden;
  border-radius: 12.5%;
  -webkit-backdrop-filter: blur(18px);
  backdrop-filter: blur(18px);
}

.nh3-craft-bar-glass + .nh3-craft-bar-glass {
  left: calc(331% * 100 / 2431);
  width: calc(2039% * 100 / 2431);
  border-radius: 0.9% / 7.6%;
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .nh3-craft-bar-glass::before {
    content: '';
    position: absolute;
    left: var(--wallpaper-x);
    top: var(--wallpaper-y);
    width: var(--card-width);
    height: var(--card-height);
    background: var(--wallpaper-blur) var(--wallpaper-position) / cover no-repeat;
  }
}

@media (max-width: 880px) {
  /* 竖向取景保留右侧连续的弯道。 */
  .nh3-ink {
    background-position: 70% center;
  }

  .nh3-ink .nh3-lead {
    position: relative;
    isolation: isolate;
    color: color-mix(in srgb, var(--nh3-ink-fg) 96%, transparent);
  }

  /* 湿路高光可能穿过窄屏导语，遮光随实际行高展开，上下渐隐。 */
  .nh3-ink .nh3-lead::before {
    content: '';
    position: absolute;
    z-index: -1;
    inset: -40px -100vw;
    background: linear-gradient(to bottom, transparent, rgb(5 19 14 / 64%) 40px, rgb(5 19 14 / 64%) calc(100% - 40px), transparent);
  }

  .nh3-ink-media .nh3-media-placeholder span {
    padding: 3px 9px;
    border-radius: 4px;
    background: rgb(5 19 14 / 70%);
    color: var(--nh3-ink-fg);
  }

  /* 文字在上，界面在下；设置界面仍从右侧伸出，主栏居中。 */
  .nh3-craft {
    --wallpaper-position: 16% center;
    display: block;
    min-height: 0;
    padding: clamp(48px, 6vw, 88px) 0 56px;
  }

  .nh3-craft-text {
    max-width: none;
  }

  .nh3-craft-ui {
    width: auto;
    margin: 40px var(--nh3-gutter) 0;
  }

  .nh3-craft-window {
    width: 112%;
  }

  .nh3-craft-bar {
    --bar-width: min(100%, 560px);
    margin-inline: auto;
  }
}

@media (max-width: 560px) {
  .nh3-craft {
    --wallpaper-position: left center;
  }

  .nh3-craft-text .nh3-body {
    max-width: 25em;
  }

  /* 最窄的屏幕只留主栏。 */
  .nh3-craft-window {
    display: none;
  }

  .nh3-craft-bar {
    --bar-width: 100%;
    margin-top: 0;
  }
}
</style>
