<script setup lang="ts">
import { useId } from 'vue'
import FeaturePager from './FeaturePager.vue'
import ReleaseSection from './ReleaseSection.vue'
import { detailFeatures, extraFeatures, showMoreFeatures } from './featureContent'

const uid = `nh3-feature-${useId()}`
</script>

<template>
  <div class="nh3-features">
    <!-- 五个主功能整页翻页；焕新发布及以下保持普通滚动。 -->
    <FeaturePager class="feature-pager-bleed" />

    <!-- 焕新发布卡片内含「立即下载」；暂停背景笔迹与识别演示，素材制作阶段不挂载其动画。 -->
    <ReleaseSection class="feature-release-bleed" />

    <!-- 焕新发布之后的内容暂时隐藏，由 featureContent 的 showMoreFeatures 控制。 -->
    <div v-if="showMoreFeatures" id="nh3-more-features" class="feature-details">
      <section
        v-for="feature in detailFeatures" :id="`nh3-feature-${feature.id}`" :key="feature.id"
        class="feature-detail"
        :aria-labelledby="`${uid}-${feature.id}`"
      >
        <!-- 纯色舞台居中承载素材，内框不撑满两侧；后续图片或视频直接放入 frame。 -->
        <div class="feature-stage" aria-hidden="true">
          <div class="feature-stage-frame">
            <span>{{ feature.mediaLabel }}</span>
            <span class="placeholder-note">素材占位</span>
          </div>
        </div>
        <div class="feature-copy">
          <span v-if="feature.status" class="feature-status">{{ feature.status }}</span>
          <h2 :id="`${uid}-${feature.id}`">{{ feature.title }}</h2>
          <p v-for="paragraph in feature.paragraphs" :key="paragraph" v-html="paragraph" />
          <p v-if="feature.note" class="feature-note">{{ feature.note }}</p>
        </div>
      </section>
    </div>

    <section v-if="showMoreFeatures" class="feature-extras" :aria-labelledby="`${uid}-extras`">
      <h2 :id="`${uid}-extras`" class="feature-extras-title">更多功能</h2>
      <div class="feature-extra-grid">
        <article
          v-for="feature in extraFeatures" :key="feature.id" class="feature-extra"
          :aria-labelledby="`${uid}-${feature.id}`"
        >
          <div class="feature-copy">
            <span v-if="feature.status" class="feature-status">{{ feature.status }}</span>
            <h3 :id="`${uid}-${feature.id}`">{{ feature.title }}</h3>
            <p v-for="paragraph in feature.paragraphs" :key="paragraph" v-html="paragraph" />
            <p v-if="feature.note" class="feature-note">{{ feature.note }}</p>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.nh3-features {
  --feature-background: #fff;
  --feature-placeholder: rgba(91, 109, 120, 0.035);
  --feature-border: rgba(91, 109, 120, 0.15);
  --feature-accent: #286a71;
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  padding: 48px 24px 72px;
  color: var(--vp-c-text-1);
  /* 仅介绍区域收为纯色，与上方发布板块自然衔接，不改变首屏背景。 */
  background: linear-gradient(to bottom, transparent, var(--feature-background) 160px);
}

.feature-details, .feature-extras {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.feature-detail { margin-bottom: clamp(48px, 5vw, 72px); }
/* 翻页区铺满视口宽度，抵消外层的上、左右内边距。 */
/* 首屏下方先留一段由透明渐变到页底色的间距（与外层渐变同为 160px），再进入翻页区。 */
.feature-pager-bleed { margin: 112px -24px clamp(48px, 5vw, 72px); }
.feature-release-bleed { margin: 0 -24px clamp(48px, 5vw, 72px); }
.placeholder-note { font-size: 11px; opacity: 0.7; }
.feature-copy { min-width: 0; max-width: 50rem; }
.feature-copy h2, .feature-copy h3 {
  margin: 0 0 10px;
  padding: 0;
  border: 0;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.5;
  letter-spacing: -0.025em;
  overflow-wrap: anywhere;
}
.feature-copy p { margin: 0; color: var(--vp-c-text-2); font-size: 18px; line-height: 1.8; overflow-wrap: anywhere; }
.feature-copy p + p { margin-top: 14px; }
.feature-copy .feature-note { margin-top: 16px; color: var(--vp-c-text-3); font-size: 14px; line-height: 1.75; }
.feature-status { display: inline-block; margin-bottom: 10px; color: var(--feature-accent); font-size: 13px; font-weight: 600; }
.feature-copy :deep(strong) { color: var(--vp-c-text-1); font-weight: 650; }
.feature-copy :deep(mark) {
  --vp-mark-animation: none;
  --vp-mark-text: currentcolor;
  --vp-mark-linear-color: color-mix(in srgb, var(--vp-c-brand-3) 32%, transparent);
  animation: none !important;
  background-position: 0 var(--vp-mark-bg-shift, 0.55lh) !important;
  font-weight: inherit;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  overflow-wrap: anywhere;
}

.feature-details { scroll-margin-top: 96px; }
.feature-details .feature-detail { margin-bottom: clamp(80px, 9vw, 132px); }
/* 舞台为纯色圆角底板，素材框按比例居中并在四周留白，不撑满两侧。 */
.feature-stage {
  --feature-stage-background: #dfe9e6;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 1100px;
  aspect-ratio: 16 / 9;
  margin: 0 auto;
  padding: clamp(28px, 6%, 72px) clamp(28px, 7%, 80px);
  border-radius: clamp(20px, 3vw, 36px);
  background: var(--feature-stage-background);
  overflow: hidden;
}
.feature-stage-frame {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 100%;
  padding: 24px;
  border: 1px dashed rgba(40, 72, 80, 0.22);
  border-radius: clamp(10px, 1.4vw, 16px);
  background: rgba(255, 255, 255, 0.42);
  box-shadow: 0 18px 48px -24px rgba(23, 52, 60, 0.28);
  color: var(--vp-c-text-3);
  font-size: 13px;
  line-height: 1.6;
  text-align: center;
  overflow-wrap: anywhere;
}
.feature-detail .feature-copy { max-width: 46rem; margin: clamp(40px, 5vw, 64px) auto 0; text-align: center; }
.feature-detail .feature-copy h2 {
  margin-bottom: clamp(16px, 2vw, 24px);
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Source Han Serif CN', 'Songti SC', 'STSong', 'SimSun', serif;
  font-size: clamp(28px, 3.4vw, 42px);
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.01em;
}
.feature-detail .feature-copy p { font-size: clamp(16px, 1.5vw, 19px); line-height: 1.85; }
.feature-detail .feature-copy p + p { margin-top: 12px; }
.feature-detail .feature-copy .feature-note { margin-top: 20px; font-size: 14px; }

.feature-extras-title { margin: 0 0 24px; padding: 0; border: 0; font-size: 22px; font-weight: 700; line-height: 1.5; letter-spacing: -0.025em; }
.feature-extra-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 32px 48px; }
.feature-extra {
  box-sizing: border-box;
  min-width: 0;
  padding-top: 24px;
  border-top: 1px solid var(--feature-border);
}

[data-theme='dark'] .nh3-features {
  --feature-background: #0a0a0a;
  --feature-placeholder: rgba(201, 211, 219, 0.025);
  --feature-border: rgba(201, 211, 219, 0.14);
  --feature-accent: #386e75;
}
[data-theme='dark'] .feature-stage { --feature-stage-background: #1f2c2d; }
[data-theme='dark'] .feature-stage-frame { border-color: rgba(201, 222, 220, 0.18); background: rgba(8, 12, 13, 0.55); box-shadow: 0 18px 48px -24px rgba(0, 0, 0, 0.7); }
[data-theme='dark'] .feature-status { color: #9acbc1; }

@media (max-width: 767px) {
  .nh3-features { padding: 32px 20px 48px; }
  .feature-detail { margin-bottom: 40px; }
  .feature-pager-bleed { margin: 128px -20px 40px; }
  .feature-release-bleed { margin: 0 -20px 40px; }
  .feature-copy h2, .feature-copy h3, .feature-extras-title { font-size: 19px; }
  .feature-copy p { font-size: 16px; }
  .feature-copy .feature-note { font-size: 13px; }
  .feature-details .feature-detail { margin-bottom: 56px; }
  .feature-stage { aspect-ratio: 4 / 3; padding: 20px; }
  .feature-detail .feature-copy { margin-top: 28px; }
  .feature-detail .feature-copy h2 { font-size: 26px; }
  .feature-extra-grid { grid-template-columns: minmax(0, 1fr); gap: 24px; }
}
</style>
