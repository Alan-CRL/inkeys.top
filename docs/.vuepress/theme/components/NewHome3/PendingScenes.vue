<script setup lang="ts">
import { pendingScenes } from './showcaseContent'
</script>

<template>
  <!-- 三项功能的原生图层素材由作者补充；到位后改用 ShowcaseStack，版式保持一致。 -->
  <section
    v-for="scene in pendingScenes" :id="`nh3-feature-${scene.id}`" :key="scene.id"
    class="nh3-showcase is-pending" :aria-labelledby="`nh3-pending-${scene.id}`"
  >
    <header class="showcase-intro">
      <h2 :id="`nh3-pending-${scene.id}`" class="showcase-title">{{ scene.title }}</h2>
      <div class="showcase-text">
        <p v-for="paragraph in scene.paragraphs" :key="paragraph">{{ paragraph }}</p>
      </div>
    </header>
    <div class="pending-stage" aria-hidden="true" />
  </section>
</template>

<style scoped src="./ShowcaseStack.css"></style>

<style scoped>
.is-pending { padding-bottom: clamp(96px, 16vh, 180px); }

/* 占位舞台与正式图层舞台同宽同比例，便于素材到位后直接替换而不改变节奏。 */
.pending-stage {
  box-sizing: border-box;
  width: calc(100% - 2 * var(--nh3-gutter));
  aspect-ratio: 16 / 9;
  max-height: calc(100svh - 160px);
  margin: 0 auto;
  border-radius: 8px;
  background-image: radial-gradient(color-mix(in srgb, var(--vp-c-text-1) 16%, transparent) 1.2px, transparent 1.4px);
  background-size: 28px 28px;
  /* 点阵向四周淡出，避免出现生硬的占位边框。 */
  -webkit-mask-image: radial-gradient(ellipse at center, #000 35%, transparent 72%);
  mask-image: radial-gradient(ellipse at center, #000 35%, transparent 72%);
}

@media (max-width: 767px) {
  .pending-stage { width: 100%; border-radius: 0; }
}
</style>
