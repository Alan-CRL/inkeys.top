<script setup lang="ts">
import { useId } from 'vue'
import UInkFigure from '../UInkFigure.vue'

const uid = useId()

interface Node {
  x: number
  y: number
  w: number
  h: number
  name: string
  sub?: string
}

// 三栏：左 Workspace 树、中 Canvas、右 Device 树；viewBox 宽 320，接近手机内容宽度
const COL = { w: 2, c: 120, d: 232 }
const BW = 86

const W_PPT: Node = { x: COL.w, y: 32, w: BW, h: 44, name: 'PPT', sub: '演示文稿' }
const W_BOARD: Node = { x: COL.w, y: 112, w: BW, h: 44, name: '演示内白板', sub: '子 Workspace' }
const D_SCREEN: Node = { x: COL.d, y: 32, w: BW, h: 44, name: '显示器', sub: 'Display' }
const D_WINDOW: Node = { x: COL.d, y: 112, w: BW, h: 44, name: '板中板窗口', sub: 'Window' }

const CW = 80
const CANVASES: (Node & { ws: Node, dev: Node, wy: number, dy: number })[] = [
  { x: COL.c, y: 32, w: CW, h: 30, name: 'PPT 第 1 页', ws: W_PPT, dev: D_SCREEN, wy: 46, dy: 46 },
  { x: COL.c, y: 74, w: CW, h: 30, name: 'PPT 第 2 页', ws: W_PPT, dev: D_SCREEN, wy: 64, dy: 64 },
  { x: COL.c, y: 122, w: CW, h: 30, name: '白板第 1 页', ws: W_BOARD, dev: D_WINDOW, wy: 137, dy: 137 },
]

// Canvas 两侧的连线：左边指向 Workspace（workspaceGuid），右边指向 Device（deviceGuid）
const LINKS = CANVASES.flatMap(c => {
  const cy = c.y + c.h / 2
  return [
    `M${c.x} ${cy} L${c.ws.x + c.ws.w + 1} ${c.wy}`,
    `M${c.x + c.w} ${cy} L${c.dev.x - 1} ${c.dy}`,
  ]
})

// 树的边：子项指向父项（parentWorkspaceGuid / parentDeviceGuid）
const EDGES = [W_BOARD, D_WINDOW].map(n => `M${n.x + n.w / 2} ${n.y} L${n.x + n.w / 2} ${n.y - 34}`)

const TREES = [W_PPT, W_BOARD, D_SCREEN, D_WINDOW]
</script>

<template>
  <UInkFigure
    title="两棵注册树"
    desc="Workspace 树记录场景（白板、PPT），Device 树记录显示区域；每个 Canvas 同时指向一个 Workspace 和一个 Device，把两棵树连起来。"
  >
    <div class="urt">
      <svg
        viewBox="0 0 320 162"
        role="img"
        aria-label="左边是 Workspace 树：演示内白板是 PPT 的子 Workspace。右边是 Device 树：板中板窗口是显示器的子 Device。中间三个 Canvas：PPT 第 1 页和第 2 页指向 PPT 与显示器，白板第 1 页指向演示内白板与板中板窗口。"
      >
        <defs>
          <marker :id="`${uid}-arrow`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M1 1 L9 5 L1 9" class="urt-arrowhead" />
          </marker>
        </defs>

        <text :x="COL.w + BW / 2" y="16" class="uf-text urt-head" text-anchor="middle">Workspace 树</text>
        <text :x="COL.c + CW / 2" y="16" class="uf-text urt-head" text-anchor="middle">Canvas</text>
        <text :x="COL.d + BW / 2" y="16" class="uf-text urt-head" text-anchor="middle">Device 树</text>

        <path v-for="(d, i) in EDGES" :key="`e${i}`" :d="d" class="urt-edge" :marker-end="`url(#${uid}-arrow)`" />
        <path v-for="(d, i) in LINKS" :key="`l${i}`" :d="d" class="urt-link" :marker-end="`url(#${uid}-arrow)`" />

        <g v-for="n in TREES" :key="n.name">
          <rect :x="n.x" :y="n.y" :width="n.w" :height="n.h" rx="8" class="urt-node" />
          <text :x="n.x + n.w / 2" :y="n.y + 19" class="uf-text urt-name" text-anchor="middle">{{ n.name }}</text>
          <text :x="n.x + n.w / 2" :y="n.y + 36" class="uf-text urt-sub" text-anchor="middle">{{ n.sub }}</text>
        </g>

        <g v-for="c in CANVASES" :key="c.name">
          <rect :x="c.x" :y="c.y" :width="c.w" :height="c.h" rx="6" class="urt-canvas" />
          <text :x="c.x + c.w / 2" :y="c.y + c.h / 2" class="uf-text urt-name" text-anchor="middle" dominant-baseline="middle">{{ c.name }}</text>
        </g>
      </svg>

      <ul class="urt-legend">
        <li>
          <svg class="urt-key" viewBox="0 0 28 12" aria-hidden="true"><path d="M2 6 H25" class="urt-edge" /></svg>
          <span>子项用 <code class="uf-code">parentWorkspaceGuid</code> / <code class="uf-code">parentDeviceGuid</code> 指向父项，两棵树都可以嵌套。</span>
        </li>
        <li>
          <svg class="urt-key" viewBox="0 0 28 12" aria-hidden="true"><path d="M2 6 H25" class="urt-link" /></svg>
          <span>Canvas 用 <code class="uf-code">workspaceGuid</code> 指向所属场景，用 <code class="uf-code">deviceGuid</code> 指向所在的显示区域。</span>
        </li>
      </ul>
    </div>
  </UInkFigure>
</template>

<style scoped>
.urt {
  display: grid;
  gap: 16px;
}

/* 手机上 viewBox 与内容宽度接近，文字约等于标注字号；桌面上限制宽度 */
.urt > svg {
  max-width: 420px;
  justify-self: center;
}

.urt-node {
  fill: var(--uink-paper);
  stroke: var(--uink-stroke);
  stroke-width: 1.5;
}

.urt-canvas {
  fill: var(--uink-surface);
  stroke: var(--uink-text3);
  stroke-width: 1.5;
}

.urt-head {
  fill: var(--uink-text2);
  font-size: 13px;
}

.urt-name {
  fill: var(--uink-text);
  font-size: 13px;
  font-weight: 600;
}

.urt-sub {
  font-size: 12.5px;
}

.urt-edge {
  fill: none;
  stroke: var(--uink-text3);
  stroke-width: 1.5;
  stroke-linecap: round;
}

.urt-link {
  fill: none;
  stroke: var(--uink-stroke);
  stroke-width: 1.2;
  stroke-dasharray: 3 3;
  stroke-linecap: round;
}

.urt-arrowhead {
  fill: none;
  stroke: var(--uink-text3);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.urt-legend {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  color: var(--uink-text2);
  font-size: 13px;
  line-height: 1.6;
  list-style: none;
}

.uink-fig .urt-legend li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin: 0;
}

/* 线型图例 */
.uink-fig .urt-key {
  flex: none;
  width: 28px;
  height: 12px;
  margin-top: 5px;
}
</style>
