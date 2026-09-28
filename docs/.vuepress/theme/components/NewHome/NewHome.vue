<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import HeroSection from './HeroSection.vue'

const Ui3Section = defineAsyncComponent(() => import('./Ui3Section.vue'))
const Draw3Section = defineAsyncComponent(() => import('./Draw3Section.vue'))
const MoreFeatures = defineAsyncComponent(() => import('./MoreFeatures.vue'))
const DownloadCta = defineAsyncComponent(() => import('./DownloadCta.vue'))
</script>

<template>
  <div class="nh-root">
    <HeroSection />
    <Ui3Section />
    <Draw3Section />
    <MoreFeatures />
    <DownloadCta />
  </div>
</template>

<style>
.nh-root {
  --nh-bg: var(--vp-c-bg);
  --nh-text-1: #0f1115;
  --nh-text-2: rgba(15, 17, 21, 0.64);
  --nh-text-3: rgba(15, 17, 21, 0.42);
  --nh-accent: #008c69;
  --nh-accent-rgb: 0, 140, 105;
  --nh-accent-2: #2670e6;
  --nh-on-accent: #ffffff;
  --nh-ink: #f0302a;
  --nh-surface: rgba(255, 255, 255, 0.72);
  --nh-surface-2: rgba(246, 247, 249, 0.92);
  --nh-surface-solid: #ffffff;
  --nh-border: rgba(15, 17, 21, 0.08);
  --nh-border-strong: rgba(15, 17, 21, 0.14);
  --nh-highlight: inset 0 1px 0 rgba(255, 255, 255, 0.9);
  --nh-shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 12px 28px -14px rgba(16, 24, 40, 0.14), 0 36px 72px -36px rgba(16, 24, 40, 0.2);
  --nh-shadow-float: 0 2px 8px rgba(16, 24, 40, 0.06), 0 22px 44px -18px rgba(16, 24, 40, 0.28);
  --nh-glow-1: rgba(0, 198, 160, 0.16);
  --nh-glow-2: rgba(38, 112, 230, 0.14);
  --nh-grid: rgba(15, 17, 21, 0.05);
  --nh-stage-top: #fdfdfe;
  --nh-stage-bottom: #eef1f5;
  --nh-bar-surface: rgba(247, 248, 250, 0.8);
  --nh-bar-surface-solid: rgba(247, 248, 250, 0.94);
  --nh-bar-frame: rgba(0, 0, 0, 0.18);
  --nh-bar-text: #1b1b1b;
  --nh-bar-hover: rgba(0, 0, 0, 0.055);
  --nh-bar-press: rgba(0, 0, 0, 0.1);
  --nh-bar-light-rgb: 0, 140, 105;
  --nh-radius-sm: 12px;
  --nh-radius-md: 18px;
  --nh-radius-lg: 24px;
  --nh-radius-xl: 32px;
  --nh-ease-out: cubic-bezier(0.33, 1, 0.68, 1);
  --nh-ease-back: cubic-bezier(0.34, 1.4, 0.64, 1);
  --nh-ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);

  position: relative;
  overflow-x: clip;
  color: var(--nh-text-1);
  background: var(--nh-bg);
  font-family: 'HarmonyOS Sans SC', 'PingFang SC', 'Microsoft YaHei UI', 'Microsoft YaHei', system-ui, -apple-system, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}

[data-theme='dark'] .nh-root {
  --nh-text-1: #f3f5f7;
  --nh-text-2: rgba(235, 238, 242, 0.66);
  --nh-text-3: rgba(235, 238, 242, 0.4);
  --nh-accent: #58ffec;
  --nh-accent-rgb: 88, 255, 236;
  --nh-accent-2: #4c9eff;
  --nh-on-accent: #06201d;
  --nh-surface: rgba(38, 39, 44, 0.56);
  --nh-surface-2: rgba(30, 31, 35, 0.9);
  --nh-surface-solid: #222327;
  --nh-border: rgba(255, 255, 255, 0.08);
  --nh-border-strong: rgba(255, 255, 255, 0.14);
  --nh-highlight: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  --nh-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 24px 48px -28px rgba(0, 0, 0, 0.7);
  --nh-shadow-float: 0 2px 8px rgba(0, 0, 0, 0.4), 0 24px 48px -16px rgba(0, 0, 0, 0.75);
  --nh-glow-1: rgba(88, 255, 236, 0.09);
  --nh-glow-2: rgba(76, 158, 255, 0.14);
  --nh-grid: rgba(255, 255, 255, 0.045);
  --nh-stage-top: #222328;
  --nh-stage-bottom: #16171a;
  --nh-bar-surface: rgba(24, 24, 24, 0.8);
  --nh-bar-surface-solid: rgba(24, 24, 24, 0.94);
  --nh-bar-frame: rgba(255, 255, 255, 0.18);
  --nh-bar-text: #ffffff;
  --nh-bar-hover: rgba(255, 255, 255, 0.08);
  --nh-bar-press: rgba(255, 255, 255, 0.12);
  --nh-bar-light-rgb: 255, 255, 255;
}

.nh-root *,
.nh-root *::before,
.nh-root *::after {
  box-sizing: border-box;
}

.nh-root :where(a) {
  color: inherit;
  text-decoration: none;
}

.nh-container {
  width: min(1200px, calc(100% - 48px));
  margin-inline: auto;
}

.nh-section {
  position: relative;
  padding-top: clamp(96px, 12vw, 168px);
  scroll-margin-top: calc(var(--vp-nav-height, 64px) + 8px);
}

.nh-section-head {
  max-width: 720px;
  margin-bottom: clamp(36px, 5vw, 56px);
}

.nh-section-head.is-center {
  margin-inline: auto;
  text-align: center;
}

.nh-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--nh-text-2);
}

.nh-dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--nh-accent);
  box-shadow: 0 0 0 4px rgba(var(--nh-accent-rgb), 0.14), 0 0 12px rgba(var(--nh-accent-rgb), 0.6);
}

.nh-h2 {
  margin: 0;
  font-size: clamp(32px, 4.6vw, 56px);
  font-weight: 650;
  line-height: 1.12;
  letter-spacing: -0.025em;
  color: var(--nh-text-1);
}

.nh-h3 {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 620;
  letter-spacing: -0.01em;
  color: var(--nh-text-1);
}

.nh-lead {
  margin: 18px 0 0;
  font-size: clamp(16px, 1.5vw, 18px);
  line-height: 1.75;
  color: var(--nh-text-2);
}

.nh-body {
  margin: 0;
  font-size: 15px;
  line-height: 1.7;
  color: var(--nh-text-2);
}

.nh-card {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--nh-border);
  border-radius: var(--nh-radius-lg);
  background: var(--nh-surface);
  box-shadow: var(--nh-highlight), var(--nh-shadow);
}

.nh-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 46px;
  padding: 0 24px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: transform 0.4s var(--nh-ease-back), box-shadow 0.24s var(--nh-ease-out), background-color 0.24s var(--nh-ease-out);
}

.nh-btn:active {
  transform: scale(0.95);
  transition-duration: 0.12s;
  transition-timing-function: var(--nh-ease-out);
}

.nh-btn-primary {
  color: var(--nh-bg);
  background: var(--nh-text-1);
  box-shadow: 0 10px 24px -12px rgba(15, 17, 21, 0.5);
}

.nh-btn-primary:hover {
  box-shadow: 0 14px 30px -12px rgba(15, 17, 21, 0.6);
}

.nh-btn-ghost {
  color: var(--nh-text-1);
  border-color: var(--nh-border-strong);
  background: var(--nh-surface);
  backdrop-filter: none;
}

.nh-btn-ghost:hover {
  background: var(--nh-surface-solid);
}

.nh-btn:focus-visible,
.nh-root button:focus-visible,
.nh-root a:focus-visible {
  outline: 2px solid var(--nh-accent);
  outline-offset: 3px;
}

.nh-arrow {
  width: 16px;
  height: 16px;
  transition: transform 0.4s var(--nh-ease-back);
}

.nh-btn:hover .nh-arrow,
.nh-link:hover .nh-arrow {
  transform: translateX(3px);
}

.nh-arrow.is-down {
  transform: rotate(90deg);
}

.nh-btn:hover .nh-arrow.is-down {
  transform: rotate(90deg) translateX(3px);
}

.nh-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--nh-accent);
}

.nh-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.nh-icon svg {
  width: 100%;
  height: 100%;
}

.nh-bento {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 20px;
}

.nh-reveal-armed [data-reveal] {
  transition:
    opacity 0.9s var(--nh-ease-out),
    transform 0.9s var(--nh-ease-out);
  transition-delay: calc(var(--nh-delay, 0) * 90ms);
}

.nh-reveal-armed [data-reveal]:not(.is-revealed) {
  opacity: 0;
  transform: translateY(28px);
}

@media (max-width: 960px) {
  .nh-bento {
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 16px;
  }
}

@media (max-width: 640px) {
  .nh-container {
    width: calc(100% - 32px);
  }

  .nh-bento {
    grid-template-columns: minmax(0, 1fr);
  }

  .nh-bento > * {
    grid-column: 1 / -1 !important;
    grid-row: auto !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nh-root *,
  .nh-root *::before,
  .nh-root *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
</style>
