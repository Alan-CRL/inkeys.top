<script setup lang="ts">
import { ref } from 'vue'
import { moreCopy, moreFeatures } from './newHome.data'
import { useReveal } from './useReveal'

const root = ref<HTMLElement | null>(null)
useReveal(root)
</script>

<template>
  <section id="nh-features" ref="root" class="nh-section nh-more">
    <div class="nh-container">
      <header class="nh-section-head" data-reveal>
        <span class="nh-eyebrow"><span class="nh-dot" />{{ moreCopy.eyebrow }}</span>
        <h2 class="nh-h2">
          {{ moreCopy.title }}
        </h2>
      </header>

      <div class="nh-more-grid">
        <article
          v-for="(feature, index) in moreFeatures"
          :key="feature.title"
          class="nh-card nh-more-card"
          data-reveal
          :style="{ '--nh-delay': index % 4 }"
        >
          <span class="nh-more-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <h3 class="nh-h3">
            {{ feature.title }}
          </h3>
          <p class="nh-body">
            {{ feature.desc }}
          </p>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.nh-more-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.nh-more-card {
  padding: 26px 26px 28px;
  transition: transform 0.4s var(--nh-ease-back), border-color 0.3s var(--nh-ease-out);
}

.nh-more-card:hover {
  border-color: rgba(var(--nh-accent-rgb), 0.35);
  transform: translateY(-4px);
}

.nh-more-index {
  display: block;
  margin-bottom: 28px;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.08em;
  color: var(--nh-accent);
}

.nh-more-card .nh-body {
  font-size: 14px;
}

@media (max-width: 960px) {
  .nh-more-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .nh-more-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
