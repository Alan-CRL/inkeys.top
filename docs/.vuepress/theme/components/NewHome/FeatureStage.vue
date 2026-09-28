<script setup lang="ts">
import type { HeroFeature } from './newHome.data'
import { computed } from 'vue'
import ArrowIcon from './ArrowIcon.vue'
import MediaSlot from './MediaSlot.vue'

interface Props {
  feature: HeroFeature
  index: number
  total: number
  icon: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  navigate: [href: string]
}>()

const inkPaths = [
  'M40 300C170 110 300 350 470 210S760 70 960 170',
  'M60 110C240 60 300 330 520 260S820 130 950 300',
  'M30 220C160 330 320 90 500 150S780 330 970 120',
]

const inkPath = computed(() => inkPaths[props.index % inkPaths.length])
const counter = computed(() => `${String(props.index + 1).padStart(2, '0')} / ${String(props.total).padStart(2, '0')}`)
</script>

<template>
  <div class="nh-stage" aria-live="polite">
    <div class="nh-stage-bg" aria-hidden="true" />

    <Transition name="nh-stage-media">
      <MediaSlot :key="feature.id" class="nh-stage-media" :media="feature.media" eager>
        <div class="nh-stage-placeholder" aria-hidden="true">
          <svg class="nh-stage-ink" viewBox="0 0 1000 400" preserveAspectRatio="none">
            <defs>
              <linearGradient :id="`nh-ink-${feature.id}`" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stop-color="var(--nh-accent)" stop-opacity="0" />
                <stop offset="0.35" stop-color="var(--nh-accent)" stop-opacity="0.55" />
                <stop offset="1" stop-color="var(--nh-accent-2)" stop-opacity="0.5" />
              </linearGradient>
            </defs>
            <path :d="inkPath" pathLength="1" :stroke="`url(#nh-ink-${feature.id})`" />
          </svg>
          <div class="nh-stage-tile">
            <span class="nh-stage-tile-icon nh-icon" v-html="icon" />
          </div>
          <span class="nh-stage-note">素材待补充</span>
        </div>
      </MediaSlot>
    </Transition>

    <Transition name="nh-stage-copy" mode="out-in">
      <div :key="feature.id" class="nh-stage-copy">
        <div class="nh-stage-meta">
          <span class="nh-dot" />
          <span>{{ feature.eyebrow }}</span>
          <span class="nh-stage-count">{{ counter }}</span>
        </div>
        <h2 class="nh-stage-title">
          {{ feature.title }}
        </h2>
        <p class="nh-stage-desc">
          {{ feature.desc }}
        </p>
        <a class="nh-link" :href="feature.href" @click.prevent="emit('navigate', feature.href)">
          {{ feature.hrefText }}
          <ArrowIcon />
        </a>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.nh-stage {
  position: relative;
  height: clamp(360px, 46vh, 520px);
  overflow: hidden;
  border: 1px solid var(--nh-border);
  border-radius: var(--nh-radius-xl);
  background: linear-gradient(180deg, var(--nh-stage-top), var(--nh-stage-bottom));
  box-shadow: var(--nh-highlight), var(--nh-shadow);
  isolation: isolate;
}

.nh-stage-bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(60% 80% at 78% 40%, var(--nh-glow-1), transparent 70%),
    radial-gradient(50% 70% at 20% 110%, var(--nh-glow-2), transparent 70%),
    linear-gradient(var(--nh-grid) 1px, transparent 1px) 0 0 / 40px 40px,
    linear-gradient(90deg, var(--nh-grid) 1px, transparent 1px) 0 0 / 40px 40px;
  -webkit-mask-image: radial-gradient(120% 100% at 60% 30%, #000 40%, transparent 100%);
  mask-image: radial-gradient(120% 100% at 60% 30%, #000 40%, transparent 100%);
}

.nh-stage-placeholder {
  position: absolute;
  inset: 0;
}

.nh-stage-ink {
  position: absolute;
  inset: 8% 0 18%;
  width: 100%;
  height: 74%;
}

.nh-stage-ink path {
  fill: none;
  stroke-width: 9;
  stroke-linecap: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: nh-stage-ink 1.6s var(--nh-ease-out) 0.1s forwards;
}

@keyframes nh-stage-ink {
  to {
    stroke-dashoffset: 0;
  }
}

.nh-stage-tile {
  position: absolute;
  top: 44%;
  left: 72%;
  display: grid;
  place-items: center;
  width: 136px;
  height: 136px;
  border: 1px solid var(--nh-border-strong);
  border-radius: 38px;
  color: var(--nh-accent);
  background: var(--nh-surface);
  box-shadow: var(--nh-highlight), var(--nh-shadow-float), 0 0 80px rgba(var(--nh-accent-rgb), 0.18);
  transform: translate(-50%, -50%);
  animation: nh-stage-float 6s var(--nh-ease-in-out) infinite alternate;
}

.nh-stage-tile-icon {
  width: 56px;
  height: 56px;
}

@keyframes nh-stage-float {
  to {
    transform: translate(-50%, calc(-50% - 10px));
  }
}

.nh-stage-note {
  position: absolute;
  right: 24px;
  top: 20px;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--nh-text-3);
}

.nh-stage-copy {
  position: absolute;
  top: clamp(24px, 4vw, 44px);
  left: clamp(24px, 4vw, 44px);
  width: min(400px, calc(100% - 48px));
  padding: 24px 26px;
  border: 1px solid var(--nh-border);
  border-radius: var(--nh-radius-lg);
  background: var(--nh-surface);
  box-shadow: var(--nh-highlight), var(--nh-shadow-float);
  backdrop-filter: blur(20px) saturate(1.3);
  -webkit-backdrop-filter: blur(20px) saturate(1.3);
}

.nh-stage-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--nh-text-2);
}

.nh-stage-count {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  color: var(--nh-text-3);
}

.nh-stage-title {
  margin: 14px 0 10px;
  font-size: clamp(22px, 2.2vw, 28px);
  font-weight: 650;
  line-height: 1.25;
  letter-spacing: -0.015em;
  color: var(--nh-text-1);
  border: 0;
  padding: 0;
}

.nh-stage-desc {
  margin: 0 0 18px;
  font-size: 15px;
  line-height: 1.7;
  color: var(--nh-text-2);
}

.nh-stage-copy-enter-active {
  transition: opacity 0.5s var(--nh-ease-out), transform 0.5s var(--nh-ease-out);
}

.nh-stage-copy-leave-active {
  transition: opacity 0.18s ease-in, transform 0.18s ease-in;
}

.nh-stage-copy-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.nh-stage-copy-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.nh-stage-media-enter-active,
.nh-stage-media-leave-active {
  transition: opacity 0.6s var(--nh-ease-out);
}

.nh-stage-media-enter-from,
.nh-stage-media-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .nh-stage {
    height: 460px;
  }

  .nh-stage-copy {
    top: 16px;
    left: 16px;
    width: calc(100% - 32px);
    padding: 20px;
  }

  .nh-stage-tile {
    top: auto;
    bottom: 64px;
    left: 50%;
    width: 104px;
    height: 104px;
    border-radius: 30px;
    transform: translate(-50%, 0);
    animation: none;
  }

  .nh-stage-tile-icon {
    width: 44px;
    height: 44px;
  }

  .nh-stage-note {
    display: none;
  }
}
</style>
