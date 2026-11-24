<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import UInkFigure from '../UInkFigure.vue'
import { FIT_CONTAIN, FIT_COVER, FIT_FILL, FIT_NONE, circlePath, fitRect, num, type Rect } from '../geometry'

// 一张横图（资源坐标，320 × 180 像素）放进一个竖框（Canvas 单位，150 × 240）
const SRC = { width: 320, height: 180 }
const BOX = { width: 150, height: 240 }
const CROP: Rect = { x: 40, y: 20, width: 180, height: 150 }

// 用 SVG 图形画的“图片”：天空、太阳、远山、近处的草地与参考网格（网格让拉伸一眼可见）
const GRID = (() => {
  const parts: string[] = []
  for (let x = 40; x < SRC.width; x += 40) parts.push(`M${x} 0 V${SRC.height}`)
  for (let y = 45; y < SRC.height; y += 45) parts.push(`M0 ${y} H${SRC.width}`)
  return parts.join(' ')
})()
const IMG = [
  { d: `M0 0 H${SRC.width} V${SRC.height} H0 Z`, cls: 'umf-sky' },
  { d: GRID, cls: 'umf-grid' },
  { d: circlePath({ x: 84, y: 56 }, 22), cls: 'umf-sun' },
  { d: 'M0 180 V122 L58 74 L104 112 L168 46 L232 116 L282 84 L320 108 V180 Z', cls: 'umf-hill-far' },
  { d: 'M0 180 V150 Q78 118 158 142 T320 136 V180 Z', cls: 'umf-hill-near' },
  { d: `M0 0 H${SRC.width} V${SRC.height} H0 Z`, cls: 'umf-edge' },
]

const FITS = [
  { value: FIT_FILL, name: 'Fill', effect: '拉伸铺满框，不保持比例' },
  { value: FIT_CONTAIN, name: 'Contain', effect: '保持比例完整放进框内，居中，空白处透明' },
  { value: FIT_COVER, name: 'Cover', effect: '保持比例铺满框，居中，超出部分裁掉' },
  { value: FIT_NONE, name: 'None', effect: '按原始像素大小放在框的左上角，超出部分裁掉' },
]

const uid = useId()
const fit = ref(FIT_FILL)
const cropOn = ref(false)

const result = computed(() => fitRect(SRC, BOX, fit.value, cropOn.value ? CROP : null))
const current = computed(() => FITS.find(x => x.value === fit.value)!)
// 资源坐标 → 框坐标：先平移到 crop 左上角，再缩放，再放到 dest
const matrix = computed(() => {
  const { crop, dest, scaleX, scaleY } = result.value
  return `matrix(${[scaleX, 0, 0, scaleY, dest.x - crop.x * scaleX, dest.y - crop.y * scaleY].map(num).join(' ')})`
})
// 资源图上 crop 之外的部分压暗（偶数填充挖出 crop 区域）
const shade = `M0 0 H${SRC.width} V${SRC.height} H0 Z M${CROP.x} ${CROP.y} v${CROP.height} h${CROP.width} v${-CROP.height} Z`

const f = (v: number) => num(Math.round(v * 10) / 10)
const scaleText = computed(() => {
  const { scaleX, scaleY } = result.value
  return Math.abs(scaleX - scaleY) < 1e-9 ? `缩放 ${f(scaleX * 100)}%` : `横向缩放 ${f(scaleX * 100)}%，纵向 ${f(scaleY * 100)}%`
})
const destText = computed(() => {
  const d = result.value.dest
  return `x: ${f(d.x)}, y: ${f(d.y)}, width: ${f(d.width)}, height: ${f(d.height)}`
})
const cropText = `{ x: ${CROP.x}, y: ${CROP.y}, width: ${CROP.width}, height: ${CROP.height} }`
const label = computed(() => `${SRC.width} × ${SRC.height} 的横图按 fit ${current.value.name}${cropOn.value ? '、先裁剪' : ''} 放进 ${BOX.width} × ${BOX.height} 的竖框：${current.value.effect}。`)
</script>

<template>
  <UInkFigure
    title="fit 与 crop"
    desc="同一张横图放进一个竖框。先按 crop 取出图片的一部分，再按 fit 放进框里（MEDIA-1）；淡色部分是超出框、被裁掉的内容。"
  >
    <div class="umf">
      <figure class="uf-panel umf-src">
        <svg :viewBox="`-6 -6 ${SRC.width + 12} ${SRC.height + 12}`" role="img" :aria-label="`资源图片 ${SRC.width} × ${SRC.height} 像素${cropOn ? `，虚线框为 crop ${cropText}` : ''}`">
          <path v-for="(el, i) in IMG" :key="i" :d="el.d" :class="el.cls" />
          <template v-if="cropOn">
            <path :d="shade" class="umf-shade" fill-rule="evenodd" />
            <rect :x="CROP.x" :y="CROP.y" :width="CROP.width" :height="CROP.height" class="umf-crop" />
            <text :x="CROP.x + 8" :y="CROP.y + 22" class="uf-text uf-mono umf-crop-label">crop</text>
          </template>
        </svg>
        <figcaption class="uf-panel__cap">
          <span class="uf-panel__name">资源</span>
          <span>{{ SRC.width }} × {{ SRC.height }} 像素</span>
        </figcaption>
      </figure>

      <figure class="uf-panel umf-box">
        <svg viewBox="-80 -12 310 264" role="img" :aria-label="label">
          <defs>
            <clipPath :id="`${uid}-crop`">
              <rect :x="result.crop.x" :y="result.crop.y" :width="result.crop.width" :height="result.crop.height" />
            </clipPath>
            <clipPath :id="`${uid}-box`">
              <rect :width="BOX.width" :height="BOX.height" />
            </clipPath>
          </defs>
          <!-- 超出框的部分：淡色显示，说明它被裁掉 -->
          <g :transform="matrix" class="umf-ghost">
            <g :clip-path="`url(#${uid}-crop)`">
              <path v-for="(el, i) in IMG" :key="i" :d="el.d" :class="el.cls" />
            </g>
          </g>
          <g :clip-path="`url(#${uid}-box)`">
            <g :transform="matrix">
              <g :clip-path="`url(#${uid}-crop)`">
                <path v-for="(el, i) in IMG" :key="i" :d="el.d" :class="el.cls" />
              </g>
            </g>
          </g>
          <rect :width="BOX.width" :height="BOX.height" class="umf-frame" />
        </svg>
        <figcaption class="uf-panel__cap">
          <span class="uf-panel__name">Media 的框</span>
          <span><code class="uf-code">width: {{ BOX.width }}</code> <code class="uf-code">height: {{ BOX.height }}</code></span>
        </figcaption>
      </figure>
    </div>

    <div class="umf-readout uf-readout" aria-live="polite">
      <div><strong><code class="uf-code">fit: {{ fit }}</code> {{ current.name }}</strong>{{ current.effect }}。</div>
      <div>
        <strong>crop</strong>
        <template v-if="cropOn"><code class="uf-code">{{ cropText }}</code>：只取虚线框内的部分</template>
        <template v-else>未设置，使用整张图片</template>
      </div>
      <div><strong>结果</strong>{{ scaleText }}，画在框内 <code class="uf-code">{{ destText }}</code></div>
    </div>

    <template #controls>
      <div class="umf-fits" role="group" aria-label="选择 fit">
        <button
          v-for="x in FITS"
          :key="x.value"
          type="button"
          class="uf-btn"
          :aria-pressed="fit === x.value"
          @click="fit = x.value"
        >{{ x.value }} {{ x.name }}</button>
      </div>
      <button type="button" class="uf-btn" :aria-pressed="cropOn" @click="cropOn = !cropOn">
        <span class="uf-mono">crop</span>：{{ cropOn ? '开' : '关' }}
      </button>
    </template>
  </UInkFigure>
</template>

<style scoped>
.umf {
  display: grid;
  gap: 18px;
}

@container (min-width: 600px) {
  .umf {
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
    align-items: center;
  }
}

.umf-box svg {
  overflow: hidden;
}

.umf-sky {
  fill: var(--uink-surface);
}

.umf-grid {
  fill: none;
  stroke: var(--uink-line);
  stroke-width: 1;
}

.umf-sun {
  fill: var(--uink-ink-yellow);
}

.umf-hill-far {
  fill: var(--uink-stroke);
  fill-opacity: 0.55;
}

.umf-hill-near {
  fill: var(--uink-ink-green);
  fill-opacity: 0.8;
}

.umf-edge {
  fill: none;
  stroke: var(--uink-stroke);
  stroke-width: 1;
}

.umf-ghost {
  opacity: 0.22;
}

.umf-shade {
  fill: var(--uink-paper);
  fill-opacity: 0.7;
}

.umf-crop {
  fill: none;
  stroke: var(--uink-accent);
  stroke-width: 2;
  stroke-dasharray: 7 5;
}

.umf-crop-label {
  fill: var(--uink-accent);
  font-size: 14px;
}

.umf-frame {
  fill: none;
  stroke: var(--uink-text);
  stroke-width: 1.5;
}

.umf-readout {
  display: grid;
  gap: 4px;
  margin-top: 14px;
}

.umf-readout strong {
  margin-right: 0.5em;
}

.umf-readout .uf-code {
  white-space: normal;
  overflow-wrap: anywhere;
}

.umf-fits {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
