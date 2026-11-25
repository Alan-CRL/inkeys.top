<script setup lang="ts">
import { ref } from 'vue'
import { useDarkMode } from 'vuepress-theme-plume/client'
import { useAssetUrl } from '../../../cdn/useAssetUrl'
import { useAppear } from './appear'
import { SCENE_IDS, useCopy } from './copy'

const { copy } = useCopy()
const root = ref<HTMLElement>()
useAppear(root)

/*
 * 场景画面：纯色面板里叠放内容、墨迹和软件界面，每层是一张透明图，依次出场。
 * 位置和宽度是面板宽高的百分比（设计稿 1600×1000），与 media/nh3-scenes/build.py 的预览一致。
 * 墨迹图和内容层同样大小，直接铺满内容层；界面图各自定位。
 * 界面目前只有 en-US 一套，三种语言共用。
 */
interface Stage {
  /** 面板底色与内容层样式的名字，对应 .nh3-stage-<name>。 */
  name: string
  /** 内容层在面板里的位置（左、上、宽、高，百分比）。 */
  content: [number, number, number, number]
  /** 内容层的底图（报告页、幻灯片）；白板没有底图，板面由样式画出。 */
  sheet?: boolean
  /** 铺在内容层上的墨迹图，自下而上。 */
  ink: string[]
  /** 浮在最上面的界面图：文件名、左、上、宽（百分比）。 */
  ui: [string, number, number, number][]
}

// 顺序与 copy.s2.scenes 一致。
const INK = ['ink-highlight', 'ink-main', 'ink-marks']
const STAGES: Stage[] = [
  {
    name: 'screen',
    content: [5.625, 7, 94.375, 93],
    sheet: true,
    ink: INK,
    ui: [['bar', 15.625, 67.8, 56.125]],
  },
  {
    name: 'slides',
    content: [5, 10, 95, 90],
    sheet: true,
    ink: INK,
    ui: [['page', 2.75, 85.8, 20.6875], ['bar', 26.875, 86, 65.875]],
  },
  {
    name: 'board',
    content: [6.25, 8, 93.75, 92],
    ink: INK,
    ui: [['page', 71.875, 71.6, 25.25], ['bar', 13.75, 85, 73.125]],
  },
]

const asset = useAssetUrl()
const isDark = useDarkMode()
const layer = (stage: Stage, file: string) => asset(`/dist-new-index3/s2/${stage.name}-${file}-${isDark.value ? 'dark' : 'light'}.webp`)
const box = ([left, top, width, height]: number[]) => ({ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: height === undefined ? undefined : `${height}%` })
</script>

<template>
  <section ref="root" class="nh3-section nh3-s2" aria-labelledby="nh3-s2-title">
    <div class="nh3-wrap">
      <div class="nh3-s2-head" data-nh3-appear>
        <h2 id="nh3-s2-title" class="nh3-display" data-nh3-item>{{ copy.s2.title }}</h2>
        <p class="nh3-lead" data-nh3-item>{{ copy.s2.lead }}</p>
      </div>
      <div class="nh3-scenes">
        <article v-for="(scene, index) in copy.s2.scenes" :id="SCENE_IDS[index]" :key="SCENE_IDS[index]" class="nh3-scene" data-nh3-appear data-nh3-item>
          <!-- 场景标签和标语顶在上面，说明沉到底部，中间留空。 -->
          <div class="nh3-scene-text">
            <div>
              <p class="nh3-scene-name">{{ scene.name }}</p>
              <h3 class="nh3-title"><span v-for="clause in scene.tagline" :key="clause" class="nh3-clause">{{ clause }}</span></h3>
            </div>
            <div>
              <p class="nh3-body">{{ scene.text }}</p>
              <p v-if="scene.note" class="nh3-caption">{{ scene.note }}</p>
            </div>
          </div>
          <!-- 画面是静态的层叠构图（见上方 STAGES）。 -->
          <div class="nh3-scene-media nh3-stage" :class="`nh3-stage-${STAGES[index].name}`" role="img" :aria-label="scene.media" data-nh3-item>
            <div class="nh3-stage-content" :style="box(STAGES[index].content)" data-nh3-item>
              <img v-if="STAGES[index].sheet" :src="layer(STAGES[index], 'sheet')" alt="" loading="lazy" decoding="async">
              <!-- 墨迹只淡入：位置必须和内容层对齐，不能有位移。 -->
              <img v-for="file in STAGES[index].ink" :key="file" :src="layer(STAGES[index], file)" alt="" loading="lazy" decoding="async" data-nh3-item="fade">
            </div>
            <img v-for="[file, ...rect] in STAGES[index].ui" :key="file" class="nh3-stage-ui" :src="layer(STAGES[index], file)" :style="box(rect)" alt="" loading="lazy" decoding="async" data-nh3-item>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style>
.nh3-s2-head {
  padding-bottom: clamp(48px, 6vw, 72px);
}

.nh3-s2-head .nh3-lead {
  margin-top: 24px;
}

.nh3-scenes {
  display: grid;
  gap: 32px;
}

/* 文字 5 栏、画面 7 栏；中间那张卡片左右对调。 */
.nh3-scene {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  padding: 12px;
  border-radius: var(--nh3-r-card);
  background: var(--nh3-surface);
  /* 主题的锚点滚动已经让出顶栏的高度，这里只再留一点空隙。 */
  scroll-margin-top: 24px;
}

.nh3-scene-text {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 40px;
  padding: 36px;
}

/* 场景标签：和主按钮一样的黑白反色胶囊，但不可点击。 */
.nh3-scene-name {
  display: inline-flex;
  align-items: center;
  height: 30px;
  margin: 0 0 20px;
  padding: 0 14px;
  border-radius: var(--nh3-r-pill);
  background: var(--nh3-text);
  color: var(--nh3-bg);
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}

.nh3-scene-text .nh3-body {
  max-width: 30em;
}

.nh3-scene-text .nh3-caption {
  margin-top: 12px;
}

.nh3-scene-media {
  align-self: center;
  border-radius: var(--nh3-r-media);
}

/* 层叠画面：面板裁掉伸出去的部分，里面的尺寸都跟着面板宽度走。 */
.nh3-stage {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 10;
  container-type: inline-size;
  background: var(--nh3-stage-bg);
}

.nh3-stage-content,
.nh3-stage-ui {
  position: absolute;
}

.nh3-stage-content img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.nh3-stage-ui {
  height: auto;
}

/* 内容层的右侧和下侧伸出面板，只露出左上的圆角。 */
.nh3-stage-content {
  overflow: hidden;
  border-top-left-radius: 1.5cqw;
  background-color: var(--nh3-stage-sheet);
  box-shadow: 0 0 0 1px var(--nh3-line), 0 1.2cqw 3cqw rgba(0, 0, 0, 0.12);
}

/* 每张卡片的面板底色和内容层底色；底色与底图一致，图片加载前不会闪。 */
.nh3-stage-screen {
  --nh3-stage-bg: #d6d3ea;
  --nh3-stage-sheet: #ffffff;
}

.nh3-stage-slides {
  --nh3-stage-bg: #c9d8e8;
  --nh3-stage-sheet: #fbfaf7;
}

.nh3-stage-board {
  --nh3-stage-bg: #cbddd2;
  --nh3-stage-sheet: #ffffff;
  --nh3-stage-dot: rgba(0, 0, 0, 0.16);
}

[data-theme='dark'] .nh3-stage-screen {
  --nh3-stage-bg: #28263c;
  --nh3-stage-sheet: #17181b;
}

[data-theme='dark'] .nh3-stage-slides {
  --nh3-stage-bg: #1e2c3d;
  --nh3-stage-sheet: #1b1a18;
}

[data-theme='dark'] .nh3-stage-board {
  --nh3-stage-bg: #1d332c;
  --nh3-stage-sheet: #1e1f22;
  --nh3-stage-dot: rgba(255, 255, 255, 0.16);
}

/* 教室与白板：点阵白板。 */
.nh3-stage-board .nh3-stage-content {
  background-image: radial-gradient(circle, var(--nh3-stage-dot) 0.1cqw, transparent 0.12cqw);
  background-size: 1.75cqw 1.75cqw;
}

@media (min-width: 881px) {
  .nh3-scene:nth-child(even) {
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
  }

  .nh3-scene:nth-child(even) .nh3-scene-media {
    order: -1;
  }
}

@media (max-width: 880px) {
  /* 窄屏三张卡片都是画面在上、文字在下。 */
  .nh3-scene {
    grid-template-columns: minmax(0, 1fr);
  }

  .nh3-scene-media {
    order: -1;
  }

  .nh3-scene-text {
    gap: 20px;
    padding: 24px 12px 12px;
  }
}
</style>
