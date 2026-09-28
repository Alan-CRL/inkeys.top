<script setup lang="ts">
import { ref } from 'vue'
import { RouteLink } from 'vuepress/client'
import ArrowIcon from './ArrowIcon.vue'
import { ctaCopy } from './newHome.data'
import { useReveal } from './useReveal'

const root = ref<HTMLElement | null>(null)
useReveal(root)
</script>

<template>
  <section ref="root" class="nh-section nh-cta">
    <div class="nh-container">
      <div class="nh-card nh-cta-card" data-reveal>
        <div class="nh-cta-bg" aria-hidden="true" />
        <h2 class="nh-h2">
          {{ ctaCopy.title }}
        </h2>
        <p class="nh-lead">
          {{ ctaCopy.desc }}
        </p>
        <div class="nh-cta-actions">
          <RouteLink class="nh-btn nh-btn-primary" :to="ctaCopy.primaryLink">
            {{ ctaCopy.primaryText }}
            <ArrowIcon />
          </RouteLink>
          <RouteLink class="nh-btn nh-btn-ghost" :to="ctaCopy.secondaryLink">
            {{ ctaCopy.secondaryText }}
          </RouteLink>
          <a class="nh-btn nh-btn-ghost" :href="ctaCopy.githubLink" target="_blank" rel="noopener noreferrer">
            {{ ctaCopy.githubText }}
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.nh-cta {
  padding-bottom: clamp(80px, 10vw, 128px);
}

.nh-cta-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: clamp(56px, 8vw, 96px) 24px;
  border-radius: var(--nh-radius-xl);
  text-align: center;
  isolation: isolate;
}

.nh-cta-bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(50% 80% at 50% 0%, var(--nh-glow-1), transparent 70%),
    radial-gradient(40% 60% at 85% 100%, var(--nh-glow-2), transparent 70%),
    linear-gradient(var(--nh-grid) 1px, transparent 1px) 0 0 / 40px 40px,
    linear-gradient(90deg, var(--nh-grid) 1px, transparent 1px) 0 0 / 40px 40px;
}

.nh-cta-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 36px;
}
</style>
