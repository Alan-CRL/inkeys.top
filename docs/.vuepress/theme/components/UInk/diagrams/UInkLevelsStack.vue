<script setup lang="ts">
import UInkFigure from '../UInkFigure.vue'

interface Level {
  key: string
  name: string
  en: string
  text: string
  keys: string
}

// 从外到内：完整级包含标准级，标准级包含基础级，基础级包含核心级（levels.md 分级矩阵）
const LEVELS: Level[] = [
  { key: 'full', name: '完整级', en: 'Full', text: '全部能力', keys: 'PDF 与音视频、多图层、多 Device、HDR 颜色、图形预设' },
  { key: 'standard', name: '标准级', en: 'Standard', text: '课堂批注软件的日常场景', keys: '图片、viewport、PPT 绑定、图形对象层、分组撤回' },
  { key: 'basic', name: '基础级', en: 'Basic', text: '笔迹和图形的外观正确', keys: '透明度、荧光笔、笔尖与端帽、虚线与箭头、页面背景' },
  { key: 'core', name: '核心级', en: 'Core', text: '多页的笔迹和基础图形都画在原处', keys: '多页、Pen 笔迹、七种基础图形、fallback 颜色' },
]
</script>

<template>
  <UInkFigure
    title="五个等级"
    desc="四个主等级逐级包含：高等级满足低等级的全部要求。Inkeys 附加级是一块插件，可以叠加在任一主等级上。"
  >
    <div class="uls">
      <!-- 嵌套结构本身就是“包含”关系；用递归模板会更绕，这里直接按层级写四层 -->
      <div class="uls-stack">
        <div class="uls-level" :data-level="LEVELS[0].key">
          <div class="uls-head">
            <span class="uls-name">{{ LEVELS[0].name }}<span class="uls-en">{{ LEVELS[0].en }}</span></span>
            <span class="uls-socket" aria-hidden="true">+ Inkeys</span>
          </div>
          <div class="uls-text">{{ LEVELS[0].text }}：{{ LEVELS[0].keys }}</div>
          <div class="uls-level" :data-level="LEVELS[1].key">
            <div class="uls-head">
              <span class="uls-name">{{ LEVELS[1].name }}<span class="uls-en">{{ LEVELS[1].en }}</span></span>
              <span class="uls-socket" aria-hidden="true">+ Inkeys</span>
            </div>
            <div class="uls-text">{{ LEVELS[1].text }}：{{ LEVELS[1].keys }}</div>
            <div class="uls-level" :data-level="LEVELS[2].key">
              <div class="uls-head">
                <span class="uls-name">{{ LEVELS[2].name }}<span class="uls-en">{{ LEVELS[2].en }}</span></span>
                <span class="uls-socket" aria-hidden="true">+ Inkeys</span>
              </div>
              <div class="uls-text">{{ LEVELS[2].text }}：{{ LEVELS[2].keys }}</div>
              <div class="uls-level" :data-level="LEVELS[3].key">
                <div class="uls-head">
                  <span class="uls-name">{{ LEVELS[3].name }}<span class="uls-en">{{ LEVELS[3].en }}</span></span>
                  <span class="uls-socket" aria-hidden="true">+ Inkeys</span>
                </div>
                <div class="uls-text">{{ LEVELS[3].text }}：{{ LEVELS[3].keys }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="uls-join" aria-hidden="true">+</div>

      <div class="uls-plug">
        <div class="uls-name">Inkeys 附加级</div>
        <div class="uls-text">Inkeys 特有的橡皮与 Clear：Erase Ink 与橡皮笔尖、Clear 与跨 Clear 撤回</div>
        <div class="uls-example">可以叠加在任一主等级上，例如“标准级 + Inkeys 附加级”。</div>
      </div>
    </div>
  </UInkFigure>
</template>

<style scoped>
.uls {
  display: grid;
  gap: 12px;
  align-items: center;
}

@container (min-width: 640px) {
  .uls {
    grid-template-columns: minmax(0, 1fr) auto 190px;
    gap: 14px;
  }
}

.uls-level {
  display: grid;
  gap: 4px;
  padding: 12px 14px 14px;
  border: 1.5px solid var(--uink-stroke);
  border-radius: 14px;
  background: var(--uink-paper);
}

/* 越往内背景越深一档，层级更清楚 */
.uls-level .uls-level {
  margin-top: 8px;
  padding: 10px 12px 12px;
  border-radius: 12px;
  background: var(--uink-surface);
}

.uls-level .uls-level .uls-level {
  background: var(--uink-paper);
}

.uls-level .uls-level .uls-level .uls-level {
  border-color: var(--uink-text3);
  background: var(--uink-surface);
}

@container (max-width: 520px) {
  .uls-level .uls-level {
    padding: 9px 8px 10px;
  }
}

.uls-head {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.uls-name {
  color: var(--uink-text);
  font-size: 15px;
  font-weight: 600;
}

.uls-en {
  margin-left: 6px;
  color: var(--uink-text3);
  font-size: 12.5px;
  font-weight: 400;
}

.uls-text {
  color: var(--uink-text2);
  font-size: 13px;
  line-height: 1.6;
}

/* 每一级旁边都有一个可以插入 Inkeys 附加级的位置 */
.uls-socket {
  flex: none;
  padding: 1px 8px;
  border: 1px dashed var(--uink-accent);
  border-radius: 999px;
  color: var(--uink-accent);
  font-size: 12px;
  opacity: 0.75;
}

.uls-join {
  justify-self: center;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1.5px solid var(--uink-accent);
  border-radius: 50%;
  color: var(--uink-accent);
  font-size: 18px;
  line-height: 1;
}

.uls-plug {
  display: grid;
  gap: 6px;
  padding: 14px;
  border: 1.5px dashed var(--uink-accent);
  border-radius: 14px;
  background: var(--uink-paper);
}

.uls-example {
  color: var(--uink-text);
  font-size: 13px;
  line-height: 1.6;
}
</style>
