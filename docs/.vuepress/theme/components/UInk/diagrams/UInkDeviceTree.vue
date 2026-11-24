<script setup lang="ts">
import UInkFigure from '../UInkFigure.vue'

interface Dev {
  key: string
  name: string
  kind: string
  type: number
  fields: [string, string][]
  note?: string
}

// 与 device.md、file/main.md 的示例一致：主显示器 3840 × 2160，第二台 1920 × 1080 紧挨在右侧，板中板在主显示器上
const DEVICES: Dev[] = [
  {
    key: 'd1',
    name: '显示器 1',
    kind: 'Display',
    type: 0,
    fields: [['x', '0'], ['y', '0'], ['width', '3840'], ['height', '2160']],
  },
  {
    key: 'd2',
    name: '显示器 2',
    kind: 'Display',
    type: 0,
    fields: [['x', '3840'], ['y', '0'], ['width', '1920'], ['height', '1080']],
  },
  {
    key: 'w1',
    name: '板中板',
    kind: 'Window',
    type: 1,
    fields: [['parentDeviceGuid', '→ 显示器 1'], ['x', '120.0'], ['y', '80.0'], ['width', '1280.0'], ['height', '720.0'], ['zIndex', '10']],
    note: 'x / y 相对父 Device（显示器 1）',
  },
]

// 图中按 1 : 20 缩小；OX / OY 是虚拟桌面原点在图中的位置
const S = 1 / 20
const OX = 10
const OY = 30
const box = (x: number, y: number, w: number, h: number) => ({ x: OX + x * S, y: OY + y * S, width: w * S, height: h * S })
const D1 = box(0, 0, 3840, 2160)
const D2 = box(3840, 0, 1920, 1080)
// Window 的坐标相对显示器 1；显示器 1 的原点就是虚拟桌面原点，所以可以直接换算
const W1 = box(120, 80, 1280, 720)
</script>

<template>
  <UInkFigure
    title="Device 的位置与尺寸"
    desc="显示器（Display）的 x / y 是系统虚拟桌面中的像素坐标，第二台紧挨在第一台右侧，原点 x = 3840；窗口（Window）的 x / y 相对它的父 Device。图按比例缩小。"
  >
    <div class="udt">
      <svg
        viewBox="0 0 308 146"
        role="img"
        aria-label="两台显示器并排：显示器 1 原点 (0, 0)，3840 × 2160；显示器 2 原点 (3840, 0)，1920 × 1080。显示器 1 上有一个板中板窗口，相对显示器 1 的原点是 (120, 80)，大小 1280 × 720。"
      >
        <rect v-bind="D1" rx="3" class="udt-display" />
        <rect v-bind="D2" rx="3" class="udt-display" />
        <rect v-bind="W1" rx="2" class="udt-window" />

        <!-- 原点 -->
        <circle :cx="D1.x" :cy="D1.y" r="3" class="udt-origin" />
        <circle :cx="D2.x" :cy="D2.y" r="3" class="udt-origin" />
        <circle :cx="W1.x" :cy="W1.y" r="2.4" class="udt-origin" />
        <text :x="D1.x" y="20" class="uf-text uf-mono udt-coord">(0, 0)</text>
        <text :x="D2.x" y="20" class="uf-text uf-mono udt-coord">(3840, 0)</text>

        <!-- 板中板：名称在框内，原点与尺寸写在右侧 -->
        <text :x="W1.x + W1.width / 2" :y="W1.y + W1.height / 2" class="uf-text udt-name" text-anchor="middle" dominant-baseline="middle">板中板</text>
        <text :x="W1.x + W1.width + 8" :y="W1.y + 14" class="uf-text uf-mono udt-size">(120, 80)</text>
        <text :x="W1.x + W1.width + 8" :y="W1.y + 30" class="uf-text uf-mono udt-size">1280 × 720</text>

        <text :x="D1.x + D1.width / 2" :y="D1.y + 74" class="uf-text udt-name" text-anchor="middle">显示器 1</text>
        <text :x="D1.x + D1.width / 2" :y="D1.y + 92" class="uf-text uf-mono udt-size" text-anchor="middle">3840 × 2160</text>
        <text :x="D2.x + D2.width / 2" :y="D2.y + 22" class="uf-text udt-name" text-anchor="middle">显示器 2</text>
        <text :x="D2.x + D2.width / 2" :y="D2.y + 40" class="uf-text uf-mono udt-size" text-anchor="middle">1920 × 1080</text>
      </svg>

      <ul class="udt-list" aria-label="三个 Device 的字段">
        <li v-for="d in DEVICES" :key="d.key" class="udt-card">
          <div class="udt-card__head">
            <span class="udt-card__name">{{ d.name }}</span>
            <span class="udt-card__kind">{{ d.kind }} · <code class="uf-code">deviceType {{ d.type }}</code></span>
          </div>
          <dl class="udt-fields">
            <template v-for="[k, v] in d.fields" :key="k">
              <dt><code class="uf-code">{{ k }}</code></dt>
              <dd>{{ v }}</dd>
            </template>
          </dl>
          <p v-if="d.note" class="udt-card__note">{{ d.note }}</p>
        </li>
      </ul>
    </div>
  </UInkFigure>
</template>

<style scoped>
.udt {
  display: grid;
  gap: 18px;
  align-items: center;
}

/* viewBox 宽度接近手机内容宽度，手机上文字约等于标注字号；桌面上限制宽度，避免标注过大 */
.udt svg {
  max-width: 380px;
  justify-self: center;
}

@container (min-width: 680px) {
  .udt {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  }
}

.udt-display {
  fill: var(--uink-paper);
  stroke: var(--uink-stroke);
  stroke-width: 1.5;
}

.udt-window {
  fill: var(--uink-surface);
  stroke: var(--uink-text3);
  stroke-width: 1.5;
}

.udt-origin {
  fill: var(--uink-text);
}

.udt-coord {
  fill: var(--uink-text);
  font-size: 13px;
}

.udt-name {
  fill: var(--uink-text);
  font-size: 13px;
  font-weight: 600;
}

.udt-size {
  font-size: 13px;
}

.udt-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.uink-fig .udt-card {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 10px 12px;
  border: 1px solid var(--uink-line);
  border-radius: 10px;
  background: var(--uink-paper);
}

.udt-card__head {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  align-items: baseline;
}

.udt-card__name {
  color: var(--uink-text);
  font-size: 14px;
  font-weight: 600;
}

.udt-card__kind {
  color: var(--uink-text2);
  font-size: 13px;
}

/* 字段名与取值成对排列，宽度不够时自动折行 */
.udt-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 6px;
  align-items: baseline;
  margin: 0;
  color: var(--uink-text);
  font-family: var(--vp-font-family-mono, ui-monospace, 'Cascadia Code', Consolas, monospace);
  font-size: 13px;
}

.udt-fields dt {
  margin: 0;
}

.udt-fields dd {
  margin: 0 8px 0 0;
}

.udt-card__note {
  margin: 0;
  color: var(--uink-text2);
  font-size: 12.5px;
  line-height: 1.5;
}
</style>
