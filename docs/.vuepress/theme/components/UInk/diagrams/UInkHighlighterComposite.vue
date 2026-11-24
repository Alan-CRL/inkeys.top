<script setup lang="ts">
import UInkFigure from '../UInkFigure.vue'
import { sweepPath, type InkPoint, type Nib } from '../geometry'

// 荧光笔：1:8 竖直矩形笔尖，width = 24 → 3 × 24（common/nib.md）；opacity 取 ink.md 示例的 0.4
const NIB: Nib = { shape: 1, aspect: 0.125, orientation: 0 }
const OPACITY = 0.4
const W = 24

// 一笔写到右端后折返，再向右写一行：相邻两段的覆盖区域有重叠
const PTS: InkPoint[] = [
  { x: 24, y: 34, width: W },
  { x: 236, y: 34, width: W },
  { x: 44, y: 54, width: W },
  { x: 228, y: 76, width: W },
]

// 正确：整条覆盖区域作为一个 path（非零环绕取并集），只合成一次
const WHOLE = sweepPath(PTS, NIB)
// 错误：每段单独合成一次，重叠处叠了两层
const SEGMENTS = PTS.slice(1).map((p, i) => sweepPath([PTS[i], p], NIB))

// 被荧光笔覆盖的“文字”：灰色线稿，只为显示荧光笔是半透明的
const TEXT_LINES = 'M30 34 H226 M52 54 H210 M36 76 H220'

const PANELS = [
  {
    key: 'whole',
    name: '正确：整条合成一次',
    note: '先求出整条笔迹的覆盖区域，再一次叠到画面上，重叠处颜色不变。',
    label: '整条合成的荧光笔：三段笔迹相互重叠，但颜色深浅一致',
  },
  {
    key: 'segments',
    name: '错误：逐段合成',
    note: '每段各叠一次，折返和拐点处叠了两层，颜色变深。',
    label: '逐段合成的荧光笔：相邻两段重叠的地方颜色更深，虚线圈标出折返处',
  },
]
</script>

<template>
  <UInkFigure
    title="荧光笔整体合成"
    :desc="`荧光笔（opacity ${OPACITY}）必须先算出整条笔迹覆盖的区域，再作为一个整体叠到画面上；逐段叠加会在笔迹折返处叠出深色（INK-10）。`"
  >
    <div class="uhc">
      <figure v-for="p in PANELS" :key="p.key" class="uf-panel">
        <svg viewBox="0 0 260 104" role="img" :aria-label="p.label">
          <path :d="TEXT_LINES" class="uf-art uhc-text" />
          <path
            v-if="p.key === 'whole'"
            :d="WHOLE"
            class="uf-fill-yellow"
            :fill-opacity="OPACITY"
            fill-rule="nonzero"
          />
          <template v-else>
            <path
              v-for="(d, i) in SEGMENTS"
              :key="i"
              :d="d"
              class="uf-fill-yellow"
              :fill-opacity="OPACITY"
              fill-rule="nonzero"
            />
            <!-- 标出第一次折返处的深色重叠 -->
            <circle cx="222" cy="40" r="24" class="uf-art uf-art--thin uf-art--dash" />
          </template>
        </svg>
        <figcaption class="uf-panel__cap">
          <span class="uf-panel__name">{{ p.name }}</span>
          <span>{{ p.note }}</span>
        </figcaption>
      </figure>
    </div>
  </UInkFigure>
</template>

<style scoped>
.uhc {
  display: grid;
  gap: 20px 24px;
}

@container (min-width: 560px) {
  .uhc {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.uhc svg {
  border: 1px solid var(--uink-line);
  border-radius: 10px;
  background: var(--uink-paper);
}

.uhc-text {
  stroke-width: 3;
}

/* 主题会给 figure 内的 figcaption 加居中与字号，这里还原 */
.uink-fig .uf-panel .uf-panel__cap {
  display: grid;
  gap: 3px;
  margin: 0;
  font-size: 13px;
  text-align: left;
}
</style>
