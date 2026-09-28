<script setup lang="ts">
import type { BarButtonItem } from './newHome.data'
import { barIcons } from './icons'

interface Props {
  item: BarButtonItem
  active?: boolean
  progress?: boolean
  paused?: boolean
  controls?: string
}

withDefaults(defineProps<Props>(), {
  active: false,
  progress: false,
  paused: false,
})

const emit = defineEmits<{
  activate: [id: BarButtonItem['id']]
  complete: []
}>()
</script>

<template>
  <button
    type="button"
    class="nh-bb"
    :class="[`is-${item.size}`, { 'is-selected': item.selected, 'is-active': active }]"
    :aria-label="item.label"
    :aria-pressed="item.selected ? 'true' : undefined"
    :aria-controls="controls"
    @pointerenter="emit('activate', item.id)"
    @focus="emit('activate', item.id)"
    @click="emit('activate', item.id)"
  >
    <span class="nh-bb-icon nh-icon" aria-hidden="true" v-html="barIcons[item.icon]" />
    <span class="nh-bb-label">{{ item.label }}</span>
    <span
      v-if="active && progress"
      class="nh-bb-progress"
      :class="{ 'is-paused': paused }"
      aria-hidden="true"
      @animationend="emit('complete')"
    />
  </button>
</template>

<style scoped>
.nh-bb {
  position: relative;
  flex: none;
  padding: 0;
  border: 0;
  border-radius: 4px;
  color: var(--nh-bar-text);
  background: transparent;
  font: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    transform 0.4s var(--nh-ease-back),
    background-color 0.24s var(--nh-ease-out),
    color 0.24s var(--nh-ease-out);
}

.nh-bb:hover,
.nh-bb.is-active {
  background: var(--nh-bar-hover);
}

.nh-bb:active {
  background: var(--nh-bar-press);
  transform: scale(0.95);
  transition-duration: 0.12s;
  transition-timing-function: var(--nh-ease-out);
}

.nh-bb.is-selected {
  color: var(--nh-accent);
  background: rgba(var(--nh-accent-rgb), 0.16);
}

.nh-bb.is-selected.is-active,
.nh-bb.is-selected:hover {
  background: rgba(var(--nh-accent-rgb), 0.22);
}

.nh-bb.is-twoTwo {
  width: 70px;
  height: 70px;
}

.nh-bb.is-twoOne {
  width: 70px;
  height: 32.5px;
}

.nh-bb-icon {
  position: absolute;
  pointer-events: none;
}

.is-twoTwo .nh-bb-icon {
  top: 11px;
  left: 21px;
  width: 28px;
  height: 28px;
}

.is-twoOne .nh-bb-icon {
  top: 7.25px;
  left: 5px;
  width: 18px;
  height: 18px;
}

.nh-bb-label {
  position: absolute;
  line-height: 25px;
  white-space: nowrap;
  pointer-events: none;
}

.is-twoTwo .nh-bb-label {
  top: 42.5px;
  left: 0;
  width: 70px;
  font-size: 13px;
  text-align: center;
}

.is-twoOne .nh-bb-label {
  top: 3.75px;
  left: 28px;
  width: 37px;
  font-size: 12px;
  text-align: center;
}

.nh-bb-progress {
  position: absolute;
  right: 14px;
  bottom: 4px;
  left: 14px;
  height: 2px;
  border-radius: 2px;
  background: var(--nh-accent);
  box-shadow: 0 0 8px rgba(var(--nh-accent-rgb), 0.7);
  transform: scaleX(0);
  transform-origin: left center;
  animation: nh-bb-progress 5s linear forwards;
  pointer-events: none;
}

.is-twoOne .nh-bb-progress {
  bottom: 2px;
}

.nh-bb-progress.is-paused {
  animation-play-state: paused;
}

@keyframes nh-bb-progress {
  to {
    transform: scaleX(1);
  }
}
</style>
