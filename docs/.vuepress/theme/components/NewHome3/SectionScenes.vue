<script setup lang="ts">
import { ref } from 'vue'
import MediaSlot from './MediaSlot.vue'
import { useAppear } from './appear'
import { SCENE_IDS, useCopy } from './copy'

const { copy } = useCopy()
const root = ref<HTMLElement>()
useAppear(root)
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
          <!-- 画面是一段自动轮播的视频，步骤说明做在视频里，网页上不放步骤条。 -->
          <MediaSlot class="nh3-scene-media" data-nh3-item ratio="16 / 10" :label="scene.media" :note="copy.placeholder.scene" />
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
