<template>
  <div ref="artRef" class="artplayer-app" :style="style"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import Artplayer from 'artplayer';
import artplayerPluginAmbilight from 'artplayer-plugin-ambilight';
import Hls from 'hls.js';

// 定义接收的参数，尽量覆盖你之前用到的参数
const props = defineProps({
  src: { type: String, required: true },
  type: { type: String, default: '' },
  poster: { type: String, default: '' },
  volume: { type: Number, default: 0.5 },
  autoplay: { type: Boolean, default: false },
  quality: { type: Array, default: () => [] },
  style: { type: String, default: 'width: 100%; aspect-ratio: 16 / 9;' }
});

const artRef = ref(null);
let artInstance = null;

onMounted(() => {
  nextTick(() => {
    artInstance = new Artplayer({
      container: artRef.value,
      url: props.src,
      type: props.type,
      poster: props.poster,
      volume: props.volume,
      autoplay: props.autoplay,
      autoSize: true, // 配合背光插件通常需要开启
      fullscreen: true,
      fullscreenWeb: true,
      pip: true,
      setting: true,
      playbackRate: true,
      hotkey: true,
      quality: props.quality,
      
      // 核心：处理 m3u8 流
      customType: {
        m3u8: function (video, url) {
          if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
          }
        },
      },

      // 核心：添加背光插件
      plugins: [
        artplayerPluginAmbilight({
          blur: '30px',   // 模糊度
          opacity: 1,     // 透明度
          frequency: 10,  // 频率
          duration: 0.3,  // 渐变时间
        }),
      ],
    });
  });
});

onBeforeUnmount(() => {
  if (artInstance && artInstance.destroy) {
    artInstance.destroy(false);
  }
});
</script>

<style>
/* 修复可能存在的样式冲突 */
.artplayer-app {
  max-width: 100%;
}
</style>