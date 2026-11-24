<script setup lang="ts">
import UInkFigure from '../UInkFigure.vue'

type Kind = 'marker' | 'len' | 'data'

interface Cell {
  hex: string
  kind: Kind
}

interface Field {
  index?: number
  name: string
  enc: string
  value: string
  cells: Cell[]
  // guid 的 36 个 ASCII 字节不逐格画出，用一格文字代替
  text?: string
}

// 本页「示例」中的 Header：[0, 11, "5fe30f46-…", 2, 1, 12, 1700000000]
const GUID = '5fe30f46-be92-49b6-b921-a60706febf10'

// 大端固定宽度（HDR-1：不得改用最小整数编码）。示例的数值都小于 2^53，用除法逐字节取出即可
const be = (value: number, bytes: number): Cell[] => {
  const out: Cell[] = []
  let v = value
  for (let i = 0; i < bytes; i++) {
    out.unshift({ hex: (v % 256).toString(16).padStart(2, '0'), kind: 'data' })
    v = Math.floor(v / 256)
  }
  return out
}

const mk = (hex: string): Cell => ({ hex, kind: 'marker' })

const uint = (index: number, name: string, value: number, bits: 16 | 32 | 64): Field => ({
  index,
  name,
  enc: `uint${bits}`,
  value: String(value),
  cells: [mk({ 16: 'cd', 32: 'ce', 64: 'cf' }[bits]), ...be(value, bits / 8)],
})

const FIELDS: Field[] = [
  { name: '数组头', enc: 'fixarray', value: '7 个元素', cells: [mk('97')] },
  uint(0, 'type', 0, 16),
  uint(1, 'version', 11, 16),
  {
    index: 2,
    name: 'guid',
    enc: 'str8',
    value: '36 个字符',
    cells: [mk('d9'), { hex: '24', kind: 'len' }],
    text: GUID,
  },
  uint(3, 'deviceNum', 2, 32),
  uint(4, 'workspaceNum', 1, 32),
  uint(5, 'pageNum', 12, 32),
  uint(6, 'time', 1700000000, 64),
]

// 每个字段的字节偏移（guid 的文字格算 36 字节）
const sizeOf = (f: Field) => f.cells.length + (f.text ? f.text.length : 0)
const ROWS = FIELDS.reduce<{ field: Field, start: number, size: number }[]>((acc, f) => {
  const prev = acc[acc.length - 1]
  acc.push({ field: f, start: prev ? prev.start + prev.size : 0, size: sizeOf(f) })
  return acc
}, [])
const TOTAL = ROWS[ROWS.length - 1].start + ROWS[ROWS.length - 1].size

const range = (start: number, size: number) => (size === 1 ? `${start}` : `${start}–${start + size - 1}`)

const LABEL = `Header 的 ${TOTAL} 个字节：${ROWS.map(({ field: f, start, size }) =>
  `${f.name}（${f.enc}，偏移 ${range(start, size)}）${f.cells.map(c => c.hex).join(' ')}${f.text ? ` 及 ASCII 文本 ${f.text}` : ''}`,
).join('；')}。`
</script>

<template>
  <UInkFigure
    title="Header 的字节布局"
    :desc="`Header 固定 ${TOTAL} 字节：数组头 0x97 表示 7 个元素，之后每个字段先是一个类型标记字节，数值按固定宽度、高位在前写出。下面是本页示例的实际字节（十六进制）。`"
  >
    <div class="uhb">
      <!-- 字节格对读屏软件没有意义，整体用一段文字替代 -->
      <ol class="uhb-fields" role="img" :aria-label="LABEL">
        <li v-for="{ field: f, start, size } in ROWS" :key="f.name" class="uhb-field">
          <div class="uhb-head">
            <span v-if="f.index !== undefined" class="uhb-index">{{ f.index }}</span>
            <code v-if="f.index !== undefined" class="uhb-name">{{ f.name }}</code>
            <span v-else class="uhb-name uhb-name--plain">{{ f.name }}</span>
            <span class="uhb-value">= {{ f.value }}</span>
          </div>
          <div class="uhb-cells">
            <span v-for="(c, i) in f.cells" :key="i" class="uhb-cell" :data-kind="c.kind">{{ c.hex }}</span>
            <span v-if="f.text" class="uhb-cell uhb-cell--text" data-kind="data">{{ f.text }}</span>
          </div>
          <div class="uhb-meta">
            <span class="uhb-enc">{{ f.enc }}</span>
            <span>{{ size }} 字节 · 偏移 {{ range(start, size) }}</span>
          </div>
        </li>
      </ol>

      <ul class="uhb-legend" aria-label="图例">
        <li><span class="uhb-swatch" data-kind="marker" aria-hidden="true" />类型标记：决定编码与长度（<code class="uf-code">cd</code> uint16、<code class="uf-code">ce</code> uint32、<code class="uf-code">cf</code> uint64、<code class="uf-code">d9</code> str8）</li>
        <li><span class="uhb-swatch" data-kind="len" aria-hidden="true" />str8 的长度字节：<code class="uf-code">0x24</code> = 36</li>
        <li><span class="uhb-swatch" data-kind="data" aria-hidden="true" />数值或文本本身</li>
      </ul>
      <p class="uhb-note">公开样例 <code class="uf-code">core-pages.uink</code> 的前 {{ TOTAL }} 字节结构与此相同，只是取值不同。</p>
    </div>
  </UInkFigure>
</template>

<style scoped>
.uhb {
  display: grid;
  gap: 16px;
}

.uhb-fields,
.uhb-legend {
  margin: 0;
  padding: 0;
  list-style: none;
}

/* 字段从左到右排列，宽度不够时自动换行；手机上每个字段独占一行 */
.uhb-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 10px;
}

.uink-fig .uhb-field {
  display: grid;
  gap: 6px;
  align-content: start;
  min-width: 0;
  max-width: 100%;
  margin: 0;
}

.uhb-head {
  display: flex;
  gap: 6px;
  align-items: baseline;
  min-height: 20px;
}

.uhb-index {
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border: 1px solid var(--uink-stroke);
  border-radius: 50%;
  color: var(--uink-text2);
  font-size: 12px;
  line-height: 1;
  align-self: center;
}

.uhb-name {
  color: var(--uink-text);
  font-family: var(--vp-font-family-mono, ui-monospace, 'Cascadia Code', Consolas, monospace);
  font-size: 13px;
  font-weight: 600;
}

.uhb-name--plain {
  font-family: inherit;
}

.uhb-value {
  color: var(--uink-text3);
  font-size: 12px;
  white-space: nowrap;
}

.uhb-cells {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.uhb-cell {
  display: inline-grid;
  place-items: center;
  min-width: 28px;
  height: 30px;
  padding: 0 3px;
  border: 1px solid var(--uink-line);
  border-radius: 5px;
  background: var(--uink-paper);
  color: var(--uink-text);
  font-family: var(--vp-font-family-mono, ui-monospace, 'Cascadia Code', Consolas, monospace);
  font-size: 13px;
}

.uhb-cell[data-kind='marker'] {
  border: 1.5px solid var(--uink-text3);
  background: var(--uink-surface);
  font-weight: 600;
}

.uhb-cell[data-kind='len'] {
  border: 1.5px dashed var(--uink-stroke);
}

/* guid 的 36 字节写成一格文字，窄栏时允许在任意位置换行 */
.uhb-cell--text {
  height: auto;
  min-height: 30px;
  padding: 4px 8px;
  color: var(--uink-text2);
  font-size: 12.5px;
  overflow-wrap: anywhere;
}

.uhb-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 8px;
  color: var(--uink-text2);
  font-size: 12px;
  line-height: 1.4;
}

.uhb-enc {
  color: var(--uink-text);
  font-family: var(--vp-font-family-mono, ui-monospace, 'Cascadia Code', Consolas, monospace);
}

.uhb-legend {
  display: grid;
  gap: 6px;
  color: var(--uink-text2);
  font-size: 13px;
  line-height: 1.6;
}

.uink-fig .uhb-legend li {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  margin: 0;
}

.uhb-swatch {
  flex: none;
  width: 18px;
  height: 14px;
  margin-right: 4px;
  border: 1px solid var(--uink-line);
  border-radius: 4px;
  background: var(--uink-paper);
}

.uhb-swatch[data-kind='marker'] {
  border: 1.5px solid var(--uink-text3);
  background: var(--uink-surface);
}

.uhb-swatch[data-kind='len'] {
  border: 1.5px dashed var(--uink-stroke);
}

.uhb-note {
  margin: 0;
  color: var(--uink-text2);
  font-size: 13px;
  line-height: 1.6;
}

@container (max-width: 520px) {
  .uink-fig .uhb-field {
    flex: 1 1 100%;
  }
}
</style>
