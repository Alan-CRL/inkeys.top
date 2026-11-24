<script setup lang="ts">
import UInkFigure from '../UInkFigure.vue'
import { polylinePath, sweepPath, type InkPoint } from '../geometry'

// 笔迹 A：圆形笔尖、width = 8 的一条波浪线
const WIDTH = 8
const R = WIDTH / 2
const A: InkPoint[] = []
for (let x = 20; x <= 220; x += 4) A.push({ x, y: 60 + 18 * Math.sin(((x - 20) / 200) * 2 * Math.PI), width: WIDTH })

// 方形橡皮：1:1 笔尖，width = 24 → 24 × 24，竖直擦过，扫过 x ∈ [108, 132]
const ERASE_X = 120
const ERASE_W = 24
const ERASE = sweepPath(
  [{ x: ERASE_X, y: 16, width: ERASE_W }, { x: ERASE_X, y: 104, width: ERASE_W }],
  { shape: 1, aspect: 1, orientation: 0 },
)

// 按 x 截取中心线（线性插值求交点）
const clipX = (pts: InkPoint[], keep: (x: number) => boolean, edge: number): InkPoint[] => {
  const out: InkPoint[] = []
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const q = pts[i - 1]
    if (q && keep(p.x) !== keep(q.x)) {
      const t = (edge - q.x) / (p.x - q.x)
      out.push({ x: edge, y: q.y + (p.y - q.y) * t, width: WIDTH })
    }
    if (keep(p.x)) out.push(p)
  }
  return out
}

// 烘焙：剩余片段的圆头正好止于橡皮区域的边缘，所以中心线再向外让出半个笔宽
const LEFT_EDGE = ERASE_X - ERASE_W / 2 - R
const RIGHT_EDGE = ERASE_X + ERASE_W / 2 + R
const A1 = clipX(A, x => x <= LEFT_EDGE, LEFT_EDGE)
const A2 = clipX(A, x => x >= RIGHT_EDGE, RIGHT_EDGE)

// 宽度一致的圆形笔尖扫过的区域，就是同宽、圆头圆角的描边，直接用描边绘制
const WHOLE = polylinePath(A)
const PIECES = [polylinePath(A1), polylinePath(A2)]

const BEFORE = [
  { name: '笔迹 A', field: 'inkType 1', ink: 'blue', undo: 'undoId 0' },
  { name: 'Erase', field: 'inkType 0', ink: 'eraser', undo: 'undoId 1' },
]
const AFTER = [
  { name: '片段 A₁', field: 'inkType 1', ink: 'blue', undo: 'undoId 0' },
  { name: '片段 A₂', field: 'inkType 1', ink: 'blue', undo: 'undoId 0' },
]
</script>

<template>
  <UInkFigure
    title="导出时烘焙橡皮"
    desc="导出给不支持 Erase 的软件时，把擦除结果写进笔迹本身：被擦断的笔迹拆成两段完整的 Ink，再删除 Erase Ink。"
  >
    <div class="ueb">
      <div class="uf-panel">
        <svg viewBox="0 0 240 120" role="img" aria-label="烘焙前：文件中是一条完整的蓝色笔迹 A，加上一条竖直擦过它的 Erase Ink（灰色区域）">
          <path :d="WHOLE" class="ueb-ink uf-stroke-blue" :stroke-width="WIDTH" />
          <path :d="ERASE" class="uf-fill-eraser" fill-rule="nonzero" />
        </svg>
        <p class="uf-panel__cap">
          <span class="uf-panel__name">烘焙前</span>
          <span>一条完整笔迹，加一条 Erase Ink</span>
        </p>
        <ol class="ueb-stream" aria-label="烘焙前的对象流">
          <li v-for="c in BEFORE" :key="c.name" class="ueb-chip" :data-ink="c.ink">
            <span class="ueb-chip__name">{{ c.name }}</span>
            <code class="uf-code">{{ c.field }}</code>
            <code class="uf-code">{{ c.undo }}</code>
          </li>
        </ol>
      </div>

      <div class="ueb-arrow" aria-hidden="true">
        <span class="ueb-arrow__sign">→</span>
        <span>烘焙</span>
      </div>

      <div class="uf-panel">
        <svg viewBox="0 0 240 120" role="img" aria-label="烘焙后：蓝色笔迹在原来被擦的地方断开，成为两段独立的笔迹 A₁、A₂，Erase Ink 已删除">
          <path v-for="(d, i) in PIECES" :key="i" :d="d" class="ueb-ink uf-stroke-blue" :stroke-width="WIDTH" />
          <!-- 原来橡皮的位置，只作对照 -->
          <rect :x="ERASE_X - ERASE_W / 2" y="4" :width="ERASE_W" height="112" class="uf-art uf-art--thin uf-art--dash" />
        </svg>
        <p class="uf-panel__cap">
          <span class="uf-panel__name">烘焙后</span>
          <span>两段完整笔迹，共享原来的 <code class="uf-code">undoId</code></span>
        </p>
        <ol class="ueb-stream" aria-label="烘焙后的对象流">
          <li v-for="c in AFTER" :key="c.name" class="ueb-chip" :data-ink="c.ink">
            <span class="ueb-chip__name">{{ c.name }}</span>
            <code class="uf-code">{{ c.field }}</code>
            <code class="uf-code">{{ c.undo }}</code>
          </li>
        </ol>
      </div>
    </div>
  </UInkFigure>
</template>

<style scoped>
.ueb {
  display: grid;
  gap: 16px;
}

@container (min-width: 600px) {
  .ueb {
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: start;
  }

  .ueb-arrow {
    flex-direction: column;
    padding-top: 44px;
  }
}

.ueb svg {
  border: 1px solid var(--uink-line);
  border-radius: 10px;
  background: var(--uink-paper);
}

.ueb-ink {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.ueb-arrow {
  display: flex;
  gap: 4px 8px;
  align-items: center;
  justify-content: center;
  color: var(--uink-text2);
  font-size: 13px;
}

.ueb-arrow__sign {
  color: var(--uink-text3);
  font-size: 20px;
  line-height: 1;
}

/* 窄屏上下排列时箭头朝下 */
@container (max-width: 599px) {
  .ueb-arrow__sign {
    transform: rotate(90deg);
  }
}

/* 还原主题给段落加的外边距 */
.uink-fig .uf-panel .uf-panel__cap {
  display: grid;
  gap: 3px;
  margin: 0;
  font-size: 13px;
  text-align: left;
}

.ueb-stream {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.uink-fig .ueb-chip {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  align-items: center;
  margin: 0;
  padding: 6px 10px 6px 13px;
  border: 1px solid var(--uink-line);
  border-radius: 10px;
  background:
    linear-gradient(var(--ueb-ink, transparent), var(--ueb-ink, transparent)) left / 4px 100% no-repeat,
    var(--uink-paper);
}

.ueb-chip[data-ink='blue'] { --ueb-ink: var(--uink-ink-blue); }

/* 橡皮不是墨迹：灰色虚线边框 */
.uink-fig .ueb-chip[data-ink='eraser'] {
  border: 1.5px dashed var(--uink-text3);
  background: var(--uink-surface);
}

.ueb-chip__name {
  min-width: 4.5em;
  color: var(--uink-text);
  font-size: 14px;
  font-weight: 600;
}
</style>
