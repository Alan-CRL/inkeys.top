<script setup lang="ts">
import type { MediaSource } from './newHome.data'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

interface Props {
  media?: MediaSource
  eager?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  eager: false,
})

const video = ref<HTMLVideoElement | null>(null)
let observer: IntersectionObserver | undefined

function observeVideo() {
  observer?.disconnect()
  const el = video.value
  if (!el || !('IntersectionObserver' in window))
    return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    return

  observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting)
      el.play().catch(() => {})
    else
      el.pause()
  }, { threshold: 0.25 })
  observer.observe(el)
}

onMounted(observeVideo)
watch(() => props.media?.src, () => requestAnimationFrame(observeVideo))

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<template>
  <div class="nh-media">
    <img
      v-if="media?.type === 'image'"
      class="nh-media-el"
      :src="media.src"
      :alt="media.alt ?? ''"
      :loading="eager ? 'eager' : 'lazy'"
      decoding="async"
    >
    <video
      v-else-if="media?.type === 'video'"
      ref="video"
      class="nh-media-el"
      :src="media.src"
      :poster="media.poster"
      :aria-label="media.alt"
      muted
      loop
      playsinline
      preload="none"
    />
    <slot v-else />
  </div>
</template>

<style scoped>
.nh-media {
  position: absolute;
  inset: 0;
}

.nh-media-el {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
