<script setup lang="ts">
import type { BarButtonId } from './newHome.data'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouteLink } from 'vuepress/client'
import ArrowIcon from './ArrowIcon.vue'
import FeatureStage from './FeatureStage.vue'
import { barIcons } from './icons'
import { barGroups, heroCopy, heroFeatures } from './newHome.data'
import Ui3Bar from './Ui3Bar.vue'

const stageId = 'nh-hero-stage'

const iconById = new Map<BarButtonId, string>([['main', barIcons.logo]])
for (const item of barGroups.flat())
  iconById.set(item.id, barIcons[item.icon])

const activeId = ref<BarButtonId>(heroFeatures[0].id)
const activeIndex = computed(() => Math.max(0, heroFeatures.findIndex(feature => feature.id === activeId.value)))
const activeFeature = computed(() => heroFeatures[activeIndex.value])
const activeIcon = computed(() => iconById.get(activeFeature.value.id) ?? '')

const autoplay = ref(true)
const barInteracting = ref(false)
const screenHovered = ref(false)
const heroVisible = ref(true)
const pageVisible = ref(true)
const paused = computed(() => barInteracting.value || screenHovered.value || !heroVisible.value || !pageVisible.value)

function activate(id: BarButtonId) {
  if (heroFeatures.some(feature => feature.id === id))
    activeId.value = id
}

// 与 Ui3Bar 的 840px 断点一致：窄屏只显示主按钮与 A1，轮播跳过被隐藏的按钮
const compactIds = new Set<BarButtonId>(['main', ...barGroups[0].map(item => item.id)])
const compact = ref(false)

function next() {
  for (let step = 1; step <= heroFeatures.length; step++) {
    const candidate = heroFeatures[(activeIndex.value + step) % heroFeatures.length].id
    if (!compact.value || compactIds.has(candidate)) {
      activeId.value = candidate
      return
    }
  }
}

function scrollToHash(href: string) {
  const target = document.getElementById(href.replace(/^#/, ''))
  if (!target)
    return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

const hero = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | undefined
let motionQuery: MediaQueryList | undefined
let frame = 0
let pointer = { x: 0, y: 0 }

function syncMotion() {
  autoplay.value = !motionQuery?.matches
}

function syncPageVisible() {
  pageVisible.value = document.visibilityState === 'visible'
}

function applyPointer() {
  frame = 0
  const el = hero.value
  if (!el)
    return
  const rect = el.getBoundingClientRect()
  el.style.setProperty('--hx', `${pointer.x - rect.left}px`)
  el.style.setProperty('--hy', `${pointer.y - rect.top}px`)
  el.classList.add('is-lit')
}

function onPointerMove(event: PointerEvent) {
  if (event.pointerType !== 'mouse' || !autoplay.value)
    return
  pointer = { x: event.clientX, y: event.clientY }
  if (!frame)
    frame = requestAnimationFrame(applyPointer)
}

onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  syncMotion()
  motionQuery.addEventListener('change', syncMotion)

  syncPageVisible()
  document.addEventListener('visibilitychange', syncPageVisible)

  if (hero.value && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(([entry]) => {
      heroVisible.value = entry.isIntersecting
    }, { threshold: 0.15 })
    observer.observe(hero.value)
  }
})

onBeforeUnmount(() => {
  motionQuery?.removeEventListener('change', syncMotion)
  document.removeEventListener('visibilitychange', syncPageVisible)
  observer?.disconnect()
  if (frame)
    cancelAnimationFrame(frame)
})
</script>

<template>
  <section ref="hero" class="nh-hero" @pointermove="onPointerMove">
    <div class="nh-hero-bg" aria-hidden="true">
      <span class="nh-hero-glow is-a" />
      <span class="nh-hero-glow is-b" />
      <span class="nh-hero-grid" />
      <span class="nh-hero-light" />
    </div>

    <div class="nh-container nh-hero-inner">
      <header class="nh-hero-copy">
        <span class="nh-hero-badge">
          <span class="nh-dot" />
          {{ heroCopy.badge }}
        </span>
        <h1 class="nh-hero-title">
          {{ heroCopy.titleLead }}<span class="nh-hero-accent">{{ heroCopy.titleAccent }}</span>
        </h1>
        <p class="nh-hero-tagline">
          {{ heroCopy.tagline }}
        </p>
        <div class="nh-hero-actions">
          <RouteLink class="nh-btn nh-btn-primary" :to="heroCopy.primaryLink">
            {{ heroCopy.primaryText }}
            <ArrowIcon />
          </RouteLink>
          <a class="nh-btn nh-btn-ghost" href="#nh-ui3" @click.prevent="scrollToHash('#nh-ui3')">
            {{ heroCopy.moreText }}
            <ArrowIcon down />
          </a>
        </div>
      </header>

      <div
        class="nh-hero-screen"
        @pointerenter="screenHovered = true"
        @pointerleave="screenHovered = false"
      >
        <FeatureStage
          :id="stageId"
          :feature="activeFeature"
          :index="activeIndex"
          :total="heroFeatures.length"
          :icon="activeIcon"
          @navigate="scrollToHash"
        />
        <div class="nh-hero-dock">
          <div class="nh-hero-dock-scroll">
            <Ui3Bar
              :groups="barGroups"
              :active-id="activeId"
              :progress="autoplay"
              :paused="paused"
              :controls="stageId"
              @activate="activate"
              @complete="next"
              @interact="barInteracting = $event"
            />
          </div>
        </div>
      </div>

      <p class="nh-hero-hint">
        <span class="nh-dot" />
        {{ heroCopy.hint }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.nh-hero {
  --hx: 50%;
  --hy: 30%;

  position: relative;
  min-height: calc(100svh - var(--vp-nav-height, 64px));
  padding: clamp(40px, 7vh, 88px) 0 40px;
  isolation: isolate;
}

.nh-hero-bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}

.nh-hero-glow {
  position: absolute;
  border-radius: 50%;
}

.nh-hero-glow.is-a {
  top: -24%;
  left: 50%;
  width: min(1100px, 120vw);
  height: 720px;
  background: radial-gradient(closest-side, var(--nh-glow-1), transparent);
  transform: translateX(-62%);
}

.nh-hero-glow.is-b {
  top: -10%;
  right: -10%;
  width: 760px;
  height: 640px;
  background: radial-gradient(closest-side, var(--nh-glow-2), transparent);
}

.nh-hero-grid {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(var(--nh-grid) 1px, transparent 1px) 0 0 / 64px 64px,
    linear-gradient(90deg, var(--nh-grid) 1px, transparent 1px) 0 0 / 64px 64px;
  -webkit-mask-image: radial-gradient(70% 55% at 50% 0%, #000, transparent);
  mask-image: radial-gradient(70% 55% at 50% 0%, #000, transparent);
}

.nh-hero-light {
  position: absolute;
  inset: 0;
  background: radial-gradient(520px circle at var(--hx) var(--hy), rgba(var(--nh-accent-rgb), 0.07), transparent 70%);
  opacity: 0;
  transition: opacity 1.2s var(--nh-ease-out);
}

.nh-hero.is-lit .nh-hero-light {
  opacity: 1;
}

.nh-hero-copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 880px;
  margin: 0 auto;
  text-align: center;
}

.nh-hero-copy > * {
  animation: nh-rise 0.9s var(--nh-ease-out) both;
}

.nh-hero-copy > :nth-child(2) {
  animation-delay: 0.06s;
}

.nh-hero-copy > :nth-child(3) {
  animation-delay: 0.12s;
}

.nh-hero-copy > :nth-child(4) {
  animation-delay: 0.18s;
}

.nh-hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 34px;
  padding: 0 16px 0 14px;
  border: 1px solid var(--nh-border);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--nh-text-2);
  background: var(--nh-surface);
  box-shadow: var(--nh-highlight);
}

.nh-hero-title {
  margin: 26px 0 0;
  padding: 0;
  border: 0;
  font-size: clamp(44px, 7vw, 92px);
  font-weight: 700;
  line-height: 1.04;
  letter-spacing: -0.035em;
  color: var(--nh-text-1);
}

.nh-hero-accent {
  background: linear-gradient(100deg, var(--nh-accent) 10%, var(--nh-accent-2) 90%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.nh-hero-tagline {
  max-width: 620px;
  margin: 22px 0 0;
  font-size: clamp(16px, 1.6vw, 19px);
  line-height: 1.75;
  color: var(--nh-text-2);
}

.nh-hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 32px;
}

.nh-hero-screen {
  position: relative;
  margin-top: clamp(40px, 6vh, 64px);
  animation: nh-rise 1.1s var(--nh-ease-out) 0.24s both;
}

.nh-hero-dock {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: center;
  margin-top: -40px;
}

.nh-hero-dock-scroll {
  max-width: 100%;
  padding: 0 4px 28px;
  margin-bottom: -28px;
  overflow-x: auto;
  scrollbar-width: none;
}

.nh-hero-dock-scroll::-webkit-scrollbar {
  display: none;
}

.nh-hero-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 28px 0 0;
  font-size: 13px;
  color: var(--nh-text-3);
}

@keyframes nh-rise {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
}

@media (max-width: 600px) {
  .nh-hero-dock-scroll :deep(.nh-bar) {
    zoom: 0.72;
  }

  .nh-hero-dock {
    margin-top: -29px;
  }
}

@media (max-width: 440px) {
  .nh-hero-dock-scroll :deep(.nh-bar) {
    zoom: 0.6;
  }

  .nh-hero-dock {
    margin-top: -24px;
  }
}

@media (hover: none) {
  .nh-hero-hint {
    display: none;
  }
}
</style>
