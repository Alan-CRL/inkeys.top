<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAssetUrl } from '../../../cdn/useAssetUrl'
import MediaSlot from './MediaSlot.vue'
import { useAppear } from './appear'
import { SCENE_IDS, useCopy } from './copy'

const { copy } = useCopy()
const root = ref<HTMLElement>()
useAppear(root)

// 每张卡片的循环动图，顺序与 copy.s1.cards 一致（屏幕批注、PPT 演示、自由白板）。
const asset = useAssetUrl()
const GIFS = computed(() => ['screen-annotation', 'slide-show', 'whiteboard'].map(name => ({
  light: asset(`/dist-new-index3/s1/${name}-light.gif`),
  dark: asset(`/dist-new-index3/s1/${name}-dark.gif`),
})))
</script>

<template>
  <section ref="root" class="nh3-section nh3-s1" aria-labelledby="nh3-s1-title">
    <div class="nh3-wrap">
      <div class="nh3-s1-head" data-nh3-appear>
        <h2 id="nh3-s1-title" class="nh3-display" data-nh3-item>{{ copy.s1.title }}</h2>
        <p class="nh3-lead" data-nh3-item>{{ copy.s1.lead }}</p>
      </div>
      <!-- 整张卡片是链接，跳到 S2 里对应的场景卡片。 -->
      <ul class="nh3-s1-cards" data-nh3-appear data-nh3-step="70">
        <li v-for="(card, index) in copy.s1.cards" :key="card.name" data-nh3-item>
          <a class="nh3-s1-card" :href="`#${SCENE_IDS[index]}`">
            <div class="nh3-s1-text">
              <h3 class="nh3-heading">{{ card.name }}</h3>
              <p class="nh3-body">{{ card.text }}</p>
            </div>
            <MediaSlot :label="card.media" :img-light="GIFS[index]?.light" :img-dark="GIFS[index]?.dark" :note="copy.placeholder.carousel" />
          </a>
        </li>
      </ul>
    </div>
  </section>
</template>

<style>
.nh3-s1-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: clamp(72px, 10vw, 144px);
  text-align: center;
}

.nh3-s1-head .nh3-lead {
  margin-top: 24px;
}

.nh3-s1-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* 动图按 2:3 制作并铺满整张卡片，顶部留出纯底色给标题；文字绝对定位叠在左上角，由卡片圆角裁切。 */
.nh3-s1-cards li {
  display: flex;
  margin: 0;
}

.nh3-s1-card {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  aspect-ratio: 2 / 3;
  overflow: hidden;
  border-radius: var(--nh3-r-card);
  background: var(--nh3-surface);
  color: inherit;
  text-decoration: none;
  transition: background-color var(--nh3-dur) var(--nh3-ease), transform var(--nh3-dur-press) var(--nh3-ease);
}

/* 悬停：换底色，卡片里的画面在裁切框内略微放大；卡片本身不动。 */
.nh3-s1-card .nh3-media > * {
  transition: transform var(--nh3-dur-slow) var(--nh3-ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .nh3-s1-card:hover {
    background: var(--nh3-surface-hover);
  }

  .nh3-s1-card:hover .nh3-media > * {
    transform: scale(1.02);
  }
}

.nh3-s1-card:active {
  transform: scale(0.99);
}

.nh3-s1-card:focus-visible {
  outline: 2px solid var(--nh3-accent);
  outline-offset: 3px;
}

.nh3-s1-text {
  position: relative;
  z-index: 1;
  padding: clamp(22px, 2.4vw, 32px);
}

/* 画面左右两侧不能裁（屏幕左沿与右侧主栏），只能裁顶部的纯底色，所以按宽度铺满、贴底对齐。 */
.nh3-s1-card .nh3-media {
  position: absolute;
  inset: 0;
}

.nh3-s1-card .nh3-media img {
  object-position: 50% 100%;
}

.nh3-s1-text .nh3-body {
  margin-top: 6px;
}

/* 卡片窄于约 290 时英文会折成三行压到画面上，所以 1000 以下改为单列，并限制到动图的 1 倍宽度。 */
@media (max-width: 999px) {
  .nh3-s1-cards {
    grid-template-columns: minmax(0, 384px);
    justify-content: center;
  }
}
</style>
