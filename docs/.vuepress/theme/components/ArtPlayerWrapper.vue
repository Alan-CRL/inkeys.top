<template>
  <div class="artplayer-wrapper-container" :style="styleObject">
    <div ref="artRef" class="artplayer-target"></div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, computed, nextTick } from 'vue'
import Artplayer from 'artplayer'

const props = defineProps({
  src: { type: String, required: true },
  style: { type: [String, Object], default: '' },
  // 给 poster 设置默认值为空字符串，解决 ArtPlayer 报错问题
  poster: { type: String, default: '' }, 
  type: { type: String, default: '' },
  volume: { type: Number, default: 0.5 },
  setting: { type: Boolean, default: false },
  fullscreen: { type: Boolean, default: false },
  fullscreenWeb: { type: Boolean, default: false },
  pip: { type: Boolean, default: false },
  playbackRate: { type: Boolean, default: false },
  hotkey: { type: Boolean, default: true },
})

const artRef = ref(null)
const instance = ref(null)

const styleObject = computed(() => props.style)

onMounted(async () => {
  // 等待 DOM 完全渲染
  await nextTick()

  // 1. 动态加载流光插件
  let ambilightPlugin = null
  try {
    const { default: ambilight } = await import('artplayer-plugin-ambilight')
    ambilightPlugin = ambilight
  } catch (e) {
    console.warn('ArtPlayer Plugin Load Error:', e)
  }

  // 2. 初始化 Artplayer
  // 使用 || '' 再次确保不会传 undefined 进去
  instance.value = new Artplayer({
    container: artRef.value,
    url: props.src,
    type: props.type || '', 
    poster: props.poster || '', 
    volume: props.volume,
    isLive: false,
    muted: false,
    autoplay: false,
    pip: props.pip,
    autoSize: true,
    autoMini: true,
    screenshot: true,
    setting: props.setting,
    loop: false,
    flip: true,
    playbackRate: props.playbackRate,
    aspectRatio: true,
    fullscreen: props.fullscreen,
    fullscreenWeb: props.fullscreenWeb,
    subtitleOffset: true,
    miniProgressBar: true,
    mutex: true,
    backdrop: true,
    playsInline: true,
    autoPlayback: true,
    airplay: true,
    theme: '#23ade5',
    lang: 'zh-cn',

    // --- 关键设置 ---
    // 解决跨域 Canvas 报错
    crossOrigin: 'anonymous', 

    plugins: [
      ambilightPlugin ? ambilightPlugin({
        blur: '40px',
        opacity: 0.8, // 透明度，太低了看不清流光
        frequency: 10,
      }) : null
    ].filter(Boolean),
  })
})

onBeforeUnmount(() => {
  if (instance.value && instance.value.destroy) {
    instance.value.destroy(false)
  }
})
</script>

<style scoped>
.artplayer-wrapper-container {
  position: relative;
  /* 关键：必须 visible，否则流光被切掉 */
  overflow: visible !important;
  z-index: 1;
  /* 确保有一定的间距让流光显示 */
  margin-bottom: 40px; 
}

.artplayer-target {
  width: 100%;
  height: 100%;
  background-color: transparent; 
}

/* 样式穿透：确保播放器背景透明 */
:deep(.artplayer-app) {
  overflow: visible !important;
  background-color: transparent !important;
}

:deep(video) {
  object-fit: contain;
}

/* 确保流光层在最底部 */
:deep(.artplayer-plugin-ambilight) {
  z-index: -1 !important;
  pointer-events: none; /* 防止流光层挡住点击 */
}
</style>