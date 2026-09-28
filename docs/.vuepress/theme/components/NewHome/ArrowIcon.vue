<script setup lang="ts">
withDefaults(defineProps<{ down?: boolean }>(), { down: false })
</script>

<template>
  <svg class="nh-arrow" :class="{ 'is-down': down }" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
