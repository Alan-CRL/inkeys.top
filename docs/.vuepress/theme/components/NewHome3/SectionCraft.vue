<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vuepress/client'
import MediaSlot from './MediaSlot.vue'
import { useAppear } from './appear'
import { useCopy } from './copy'

// S5：A 书写体验（墨迹板面）与 B 界面与设备（背景图）是紧挨着的一组，外形一致。
const { locale, copy } = useCopy()
const root = ref<HTMLElement>()
const card = ref<HTMLElement>()
const settings = ref<HTMLElement>()
const assets = withBase('/new-index3/craft/')
// 让 data-theme 同时切换两层原生图与壁纸，浏览器只请求生效的背景。
const nativeLayers = computed(() => ({
  '--settings-light': `url("${assets}settings-${locale.value}-light.png")`,
  '--settings-dark': `url("${assets}settings-${locale.value}-dark.png")`,
  '--toolbar-light': `url("${assets}toolbar-${locale.value}-light.png")`,
  '--toolbar-dark': `url("${assets}toolbar-${locale.value}-dark.png")`,
}))
let resize: ResizeObserver | undefined

function alignBlurredWallpaper() {
  const panel = card.value
  const frame = settings.value
  if (!panel || !frame || !frame.offsetWidth) return
  // 回退图沿用整张卡片的 cover 裁切，再移到窗口下的同一坐标。
  frame.style.setProperty('--card-width', `${panel.clientWidth}px`)
  frame.style.setProperty('--card-height', `${panel.clientHeight}px`)
  frame.style.setProperty('--wallpaper-x', `${-frame.offsetLeft}px`)
  frame.style.setProperty('--wallpaper-y', `${-frame.offsetTop}px`)
}

onMounted(() => {
  if (!card.value || !settings.value || CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)')) return
  alignBlurredWallpaper()
  if ('ResizeObserver' in window) {
    resize = new ResizeObserver(alignBlurredWallpaper)
    resize.observe(card.value)
    resize.observe(settings.value)
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
    <div class="nh3-panel nh3-ink" data-nh3-appear data-nh3-item="panel">
      <div class="nh3-wrap nh3-ink-inner">
        <h2 id="nh3-s5a-title" class="nh3-display" data-nh3-item>{{ copy.s5a.title }}</h2>
        <p class="nh3-lead" data-nh3-item><span v-for="line in copy.s5a.lead" :key="line">{{ line }}</span></p>
        <MediaSlot class="nh3-ink-media" data-nh3-item :label="copy.s5a.media" :note="copy.placeholder.ink" />
      </div>
    </div>

    <div ref="card" class="nh3-panel nh3-craft" :style="nativeLayers" aria-labelledby="nh3-s5b-title" data-nh3-appear data-nh3-item>
      <div class="nh3-wrap nh3-craft-inner">
        <div class="nh3-craft-text">
          <h2 id="nh3-s5b-title" class="nh3-display" data-nh3-item><span v-for="clause in copy.s5b.title" :key="clause" class="nh3-clause">{{ clause }}</span></h2>
          <p class="nh3-body" data-nh3-item>{{ copy.s5b.text }}</p>
        </div>
      </div>
      <!-- 设置界面向右伸出板面，被板面的圆角裁掉；主栏在它下方，左边缘对齐。 -->
      <div class="nh3-craft-ui">
        <div ref="settings" class="nh3-craft-window" data-nh3-item="right" role="img" :aria-label="copy.s5b.window" />
        <div class="nh3-craft-bar" data-nh3-item="right" role="img" :aria-label="copy.s5b.bar" />
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
  background: var(--nh3-ink-bg) url('/new-index3/craft/performance-forest.webp') center / cover no-repeat;
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

.nh3-ink-media {
  flex: none;
  width: 100%;
  margin-top: clamp(40px, 5vw, 64px);
  aspect-ratio: 21 / 9;
  border-radius: var(--nh3-r-media);
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
  --wallpaper: url('/new-index3/craft/wallpaper-light.webp');
  --wallpaper-blur: url('/new-index3/craft/wallpaper-light-blur.webp');
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
  --wallpaper: url('/new-index3/craft/wallpaper-dark.webp');
  --wallpaper-blur: url('/new-index3/craft/wallpaper-dark-blur.webp');
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
  margin-left: max(57%, calc(100% - 640px));
  width: clamp(520px, 52%, 760px);
}

.nh3-craft-window {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 10;
  /* 原生窗口是 1040 × 650 DIP、8 DIP 圆角。 */
  border-radius: 0.77% / 1.23%;
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
  --bar-width: min(82%, 39vw);
  /* 2431px 宽的导出图四边留出 60.5px 给原生光影，间距对齐实体边沿。 */
  --bar-inset: calc(var(--bar-width) * 60.5 / 2431);
  width: var(--bar-width);
  margin-top: calc(24px - var(--bar-inset));
  margin-left: calc(0px - var(--bar-inset));
  aspect-ratio: 2431 / 361;
  background: var(--toolbar) center / contain no-repeat;
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

  .nh3-ink-media {
    aspect-ratio: 16 / 10;
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
