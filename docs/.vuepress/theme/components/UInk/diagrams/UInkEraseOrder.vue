<script setup lang="ts">
import { useId } from 'vue'
import UInkFigure from '../UInkFigure.vue'
import { polylinePath, sweepPath, type InkPoint, type Point } from '../geometry'

// 按正弦采样一条平滑的笔迹中心线
const wave = (x0: number, x1: number, y: number, amp: number, periods: number): Point[] => {
  const pts: Point[] = []
  for (let x = x0; x <= x1; x += 4) pts.push({ x, y: y + amp * Math.sin(((x - x0) / (x1 - x0)) * periods * 2 * Math.PI) })
  return pts
}

// 对象流顺序：A（Pen）→ Erase → B（Pen）。A、B 都穿过橡皮扫过的区域
const A = polylinePath(wave(24, 276, 50, 14, 1.5))
const B = polylinePath(wave(30, 270, 104, 9, 1))

// 矩形橡皮：2:3 笔尖，width = 24 → 16 × 24（与 ink.md 示例一致），矩形笔尖缺省 Butt
const ERASE_PTS: InkPoint[] = [
  { x: 140, y: 18, width: 24 },
  { x: 156, y: 72, width: 24 },
  { x: 142, y: 124, width: 24 },
]
const ERASE = sweepPath(ERASE_PTS, { shape: 1, aspect: 2 / 3, orientation: 0 })

const STREAM = [
  { n: 1, name: '笔迹 A', field: 'inkType 1', ink: 'blue', note: '在 Erase 之前：被擦断' },
  { n: 2, name: 'Erase', field: 'inkType 0', ink: 'eraser', note: '只作用于它之前的内容' },
  { n: 3, name: '笔迹 B', field: 'inkType 1', ink: 'red', note: '在 Erase 之后：不受影响' },
]

const uid = useId()
</script>

<template>
  <UInkFigure
    title="Erase 只擦之前的内容"
    desc="Erase 按对象流顺序，只作用于同一 Canvas 中排在它前面的 Ink 与 Shape；之后写下的笔迹即使经过同一位置也不受影响（INK-11）。"
  >
    <div class="ueo">
      <ol class="ueo-stream" aria-label="对象流中的顺序">
        <li v-for="item in STREAM" :key="item.n" class="ueo-chip" :data-ink="item.ink">
          <span class="ueo-chip__name"><span class="ueo-chip__n">{{ item.n }}</span>{{ item.name }}</span>
          <code class="uf-code">{{ item.field }}</code>
          <span class="ueo-chip__note">{{ item.note }}</span>
        </li>
      </ol>

      <svg
        class="ueo-canvas"
        viewBox="0 0 300 140"
        role="img"
        aria-label="画面：蓝色笔迹 A 在橡皮扫过的地方断开；红色笔迹 B 写在 Erase 之后，穿过同一区域仍然完整。灰色区域是橡皮扫过的地方。"
      >
        <defs>
          <!-- 擦除效果用遮罩表示：橡皮扫过的区域从 A 上挖掉（具体是裁剪还是透明由软件决定） -->
          <mask :id="`${uid}-erase`" maskUnits="userSpaceOnUse" x="0" y="0" width="300" height="140">
            <rect x="0" y="0" width="300" height="140" fill="#fff" />
            <path :d="ERASE" fill="#000" fill-rule="nonzero" />
          </mask>
        </defs>
        <!-- 橡皮扫过的区域用中性灰示意，它本身不会显示在画面上 -->
        <path :d="ERASE" class="uf-fill-eraser" fill-rule="nonzero" />
        <path :d="A" class="ueo-ink uf-stroke-blue" :mask="`url(#${uid}-erase)`" />
        <path :d="B" class="ueo-ink uf-stroke-red" />
      </svg>

      <p class="ueo-legend">
        <span class="ueo-key">灰色区域：Erase 扫过的地方（示意，本身不显示）</span>
      </p>
    </div>
  </UInkFigure>
</template>

<style scoped>
.ueo {
  display: grid;
  gap: 14px;
}

.ueo-stream {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.uink-fig .ueo-chip {
  display: grid;
  gap: 2px;
  justify-items: start;
  min-width: 120px;
  margin: 0;
  padding: 7px 11px 7px 14px;
  border: 1px solid var(--uink-line);
  border-radius: 10px;
  background:
    linear-gradient(var(--ueo-ink, transparent), var(--ueo-ink, transparent)) left / 4px 100% no-repeat,
    var(--uink-paper);
}

.ueo-chip[data-ink='blue'] { --ueo-ink: var(--uink-ink-blue); }
.ueo-chip[data-ink='red'] { --ueo-ink: var(--uink-ink-red); }

/* 橡皮不是墨迹：灰色虚线边框 */
.uink-fig .ueo-chip[data-ink='eraser'] {
  border: 1.5px dashed var(--uink-text3);
  background: var(--uink-surface);
}

.ueo-chip__name {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  color: var(--uink-text);
  font-size: 14px;
  font-weight: 600;
}

.ueo-chip__n {
  display: inline-grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border: 1px solid var(--uink-stroke);
  border-radius: 50%;
  color: var(--uink-text2);
  font-size: 12px;
  font-weight: 400;
}

.ueo-chip__note {
  color: var(--uink-text2);
  font-size: 12px;
}

.ueo-canvas {
  max-width: 560px;
  border: 1px solid var(--uink-line);
  border-radius: 10px;
  background: var(--uink-paper);
}

.ueo-ink {
  fill: none;
  stroke-width: 7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.uink-fig .ueo-legend {
  margin: 0;
  color: var(--uink-text2);
  font-size: 12.5px;
}

.ueo-key {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.ueo-key::before {
  content: '';
  width: 14px;
  height: 10px;
  border-radius: 2px;
  background: var(--uink-text3);
  opacity: 0.35;
}
</style>
