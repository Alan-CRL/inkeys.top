<script setup lang="ts">
import UInkFigure from '../UInkFigure.vue'

type Col = 'main' | 'pack' | 'temp'

interface Temp {
  kind: '资源包' | '主文件'
  pack?: string[]
  ver?: '新版'
}

interface Step {
  title: string
  rules: string
  text: string
  main: { ver: '旧版' | '新版', refs: string[] }
  pack: string[]
  removed?: string[]
  temp: Temp[]
  changed: Col[]
}

// 旧主文件引用 A、B，新主文件改为引用 B、C；每一步磁盘上的主文件都能找到自己引用的资源（EXTRA-12–EXTRA-16）
const OLD = { ver: '旧版' as const, refs: ['A', 'B'] }
const NEW = { ver: '新版' as const, refs: ['B', 'C'] }

const STEPS: Step[] = [
  {
    title: '开始保存',
    rules: 'EXTRA-12',
    text: '旧主文件引用 A、B；这次保存后改为引用 B、C。',
    main: OLD,
    pack: ['A', 'B'],
    temp: [],
    changed: [],
  },
  {
    title: '准备临时资源包',
    rules: 'EXTRA-13',
    text: '内容是新旧两版引用的并集 A、B、C，写完后校验。',
    main: OLD,
    pack: ['A', 'B'],
    temp: [{ kind: '资源包', pack: ['A', 'B', 'C'] }],
    changed: ['temp'],
  },
  {
    title: '生成临时主文件',
    rules: 'EXTRA-14',
    text: '生成并校验新主文件，但先不替换。',
    main: OLD,
    pack: ['A', 'B'],
    temp: [{ kind: '资源包', pack: ['A', 'B', 'C'] }, { kind: '主文件', ver: '新版' }],
    changed: ['temp'],
  },
  {
    title: '替换资源包',
    rules: 'EXTRA-15',
    text: '资源包先换成并集；旧主文件需要的 A、B 仍然都在。',
    main: OLD,
    pack: ['A', 'B', 'C'],
    temp: [{ kind: '主文件', ver: '新版' }],
    changed: ['pack', 'temp'],
  },
  {
    title: '原子替换主文件',
    rules: 'EXTRA-15',
    text: '最后一步替换主文件；新主文件需要的 B、C 已经在包里。',
    main: NEW,
    pack: ['A', 'B', 'C'],
    temp: [],
    changed: ['main', 'temp'],
  },
  {
    title: '清理',
    rules: 'EXTRA-16',
    text: '主文件替换成功后，才删除不再被引用的 A；这一步可以以后再做。',
    main: NEW,
    pack: ['B', 'C'],
    removed: ['A'],
    temp: [],
    changed: ['pack'],
  },
]

const COLS: { key: Col, name: string, file?: string }[] = [
  { key: 'main', name: '主文件', file: 'lesson.uink' },
  { key: 'pack', name: '资源包', file: 'lesson.uink.extra' },
  { key: 'temp', name: '临时文件' },
]
</script>

<template>
  <UInkFigure
    title="资源包的提交顺序"
    desc="完整保存时先换资源包、最后换主文件。A、B、C 代表资源包里的图片：无论在哪一步中断，磁盘上的主文件都能找到它引用的资源。"
  >
    <div class="uec">
      <div class="uec-row uec-row--head" aria-hidden="true">
        <span>步骤</span>
        <span class="uec-cols">
          <span v-for="c in COLS" :key="c.key">{{ c.name }}<code v-if="c.file" class="uf-code">{{ c.file }}</code></span>
        </span>
      </div>

      <ol class="uec-list">
        <li v-for="(s, i) in STEPS" :key="i" class="uec-row">
          <div class="uec-step">
            <span class="uec-num" aria-hidden="true">{{ i }}</span>
            <div class="uec-step__body">
              <span class="uec-title">{{ s.title }}</span>
              <span class="uec-rule">{{ s.rules }}</span>
              <span class="uec-text">{{ s.text }}</span>
            </div>
          </div>

          <dl class="uec-cols">
            <div v-for="c in COLS" :key="c.key" class="uec-cell" :class="{ 'is-changed': s.changed.includes(c.key) }">
              <dt>{{ c.name }}</dt>
              <dd v-if="c.key === 'main'">
                <span class="uec-file" :class="{ 'is-new': s.main.ver === '新版' }">{{ s.main.ver }}</span>
                <span class="uec-refs">引用 {{ s.main.refs.join('、') }}</span>
              </dd>
              <dd v-else-if="c.key === 'pack'">
                <del v-for="r in s.removed" :key="`x${r}`" class="uec-res is-removed">{{ r }}</del>
                <span v-for="r in s.pack" :key="r" class="uec-res">{{ r }}</span>
              </dd>
              <dd v-else>
                <span v-if="!s.temp.length" class="uec-none">无</span>
                <span v-for="t in s.temp" :key="t.kind" class="uec-temp">
                  <span class="uec-temp__kind">{{ t.kind }}</span>
                  <template v-if="t.pack">
                    <span v-for="r in t.pack" :key="r" class="uec-res">{{ r }}</span>
                  </template>
                  <span v-else class="uec-file is-new">{{ t.ver }}</span>
                </span>
              </dd>
            </div>
          </dl>
        </li>
      </ol>
    </div>
  </UInkFigure>
</template>

<style scoped>
.uec {
  display: grid;
}

.uec-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

/* 窄栏：每一步是一张卡片，三个文件状态逐行列出 */
.uink-fig .uec-row {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 12px 0;
  border-top: 1px solid var(--uink-line);
}

.uink-fig .uec-list .uec-row:first-child {
  border-top: 0;
}

.uec-row--head {
  display: none;
}

.uec-step {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.uec-num {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 1px solid var(--uink-stroke);
  border-radius: 50%;
  color: var(--uink-text2);
  font-size: 12px;
}

.uec-step__body {
  display: grid;
  gap: 2px;
}

.uec-title {
  color: var(--uink-text);
  font-size: 14px;
  font-weight: 600;
}

.uec-rule {
  color: var(--uink-text3);
  font-size: 12px;
}

.uec-text {
  color: var(--uink-text2);
  font-size: 13px;
  line-height: 1.6;
}

.uec-cols {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 34px;
}

.uec-cell {
  display: grid;
  grid-template-columns: 4.5em minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  min-height: 34px;
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: 8px;
}

/* 这一步发生变化的文件 */
.uec-cell.is-changed {
  border-color: var(--uink-accent);
}

.uec-cell dt {
  color: var(--uink-text2);
  font-size: 13px;
}

.uec-cell dd {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 6px;
  align-items: center;
  margin: 0;
}

.uec-file {
  padding: 2px 10px;
  border: 1.5px solid var(--uink-stroke);
  border-radius: 999px;
  color: var(--uink-text);
  font-size: 13px;
  font-weight: 600;
}

.uec-file.is-new {
  border-color: var(--uink-text3);
  background: var(--uink-surface);
}

.uec-refs {
  color: var(--uink-text2);
  font-size: 12.5px;
}

.uec-res {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 1.5px solid var(--uink-stroke);
  border-radius: 5px;
  background: var(--uink-paper);
  color: var(--uink-text);
  font-family: var(--vp-font-family-mono, ui-monospace, 'Cascadia Code', Consolas, monospace);
  font-size: 13px;
}

.uec-res.is-removed {
  border-style: dashed;
  color: var(--uink-text3);
  text-decoration: line-through;
  opacity: 0.6;
}

.uec-temp {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  margin-right: 6px;
}

.uec-temp__kind {
  color: var(--uink-text2);
  font-size: 12.5px;
}

.uec-none {
  color: var(--uink-text3);
  font-size: 13px;
}

/* 宽栏：表格式时间线，左边是步骤，右边三列是此刻磁盘上的文件 */
@container (min-width: 640px) {
  .uink-fig .uec-row {
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 3fr);
    gap: 14px;
    align-items: center;
  }

  .uec-row--head {
    display: grid;
    padding: 0 0 8px;
    border-top: 0;
    border-bottom: 1px solid var(--uink-line);
    color: var(--uink-text2);
    font-size: 13px;
  }

  .uec-row--head .uec-cols span {
    display: grid;
    gap: 2px;
    justify-items: start;
  }

  .uec-cols {
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1fr) minmax(0, 1.2fr);
    gap: 8px;
    padding-left: 0;
  }

  .uec-cell {
    position: relative;
    display: block;
  }

  /* 宽栏时列名已在表头，dt 只留给读屏软件 */
  .uec-cell dt {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
}
</style>
