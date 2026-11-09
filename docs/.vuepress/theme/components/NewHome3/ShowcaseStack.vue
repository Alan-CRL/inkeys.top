<script setup lang="ts">
import { ref } from 'vue'
import { barIcons } from '../NewHome/icons'
import type { ShowcaseScene } from './showcaseContent'
import { planeTransform, poseTransform } from './stackProjection'
import { useShowcaseStack } from './useShowcaseStack'

const props = defineProps<{ scene: ShowcaseScene }>()
const uid = `nh3-showcase-${props.scene.page}`
const track = ref<HTMLElement>()
const viewport = ref<HTMLElement>()
// 不透明底图：淡化时保留更多轮廓，拆解时加细边。
const BASES = new Set(['desktop', 'slide', 'board', 'background'])
const {
  layers, flat, stage, active, pinned, keyLayers, pose, callout,
  layerFrame, layerState, srcOf, srcsetOf, sizesOf, revealOf, onLayerLoad,
  onPointerMove, onPointerLeave, onPointerDown, focusLayer, togglePin, hoverLegend,
} = useShowcaseStack(props.scene, track, viewport)
</script>

<template>
  <section class="nh3-showcase" :class="[`is-${scene.mode}`, { 'is-flat': flat }]" :aria-labelledby="`${uid}-title`">
    <header class="showcase-intro">
      <!-- 含「 · 」的标题拆开品牌与主题，读屏仍是完整标题。 -->
      <h2 :id="`${uid}-title`" class="showcase-title">
        <template v-if="scene.title.includes(' · ')">
          <span class="title-brand">{{ scene.title.split(' · ')[0] }}</span><span class="title-dot"> · </span><span class="title-rest">{{ scene.title.split(' · ')[1] }}</span>
        </template>
        <template v-else>{{ scene.title }}</template>
      </h2>
      <div class="showcase-text">
        <p v-for="paragraph in scene.paragraphs" :key="paragraph">{{ paragraph }}</p>
        <p v-if="scene.closing" class="showcase-closing">{{ scene.closing }}</p>
      </div>
    </header>

    <div ref="track" class="showcase-track">
      <div class="showcase-sticky">
        <div
          ref="viewport" class="showcase-viewport"
          :style="{ width: `${stage.viewWidth}px`, height: `${stage.viewHeight}px` }"
          @pointermove="onPointerMove" @pointerleave="onPointerLeave" @pointerdown="onPointerDown"
        >
          <div class="showcase-anchor" :style="{ width: `${stage.width}px`, height: `${stage.height}px`, transform: poseTransform(pose) }">
            <div class="showcase-perspective" :style="{ perspective: `${pose.perspective}px` }">
              <div class="showcase-plane" role="img" :aria-label="scene.alt" :style="{ transform: planeTransform(pose) }">
                <div
                  v-for="layer in layers" :key="layer.id" class="showcase-layer"
                  :class="{ 'is-lifted': layerState(layer).lifted, 'is-dimmed': layerState(layer).dimmed, 'is-base': BASES.has(layer.id) }"
                  :style="layerFrame(layer)"
                >
                  <div class="showcase-lift">
                    <img
                      :src="srcOf(layer, 'half')" :srcset="srcsetOf(layer)" :sizes="sizesOf(layer)"
                      :width="layer.box[2]" :height="layer.box[3]" alt="" decoding="async" loading="lazy" draggable="false"
                      :style="{ clipPath: layerState(layer).clip, visibility: layerState(layer).hidden ? 'hidden' : undefined }"
                      @load="onLayerLoad(layer, $event)"
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 批注引线画在视口坐标系里，与 3D 投影共用同一套数学。 -->
          <div class="showcase-overlay" aria-hidden="true">
            <svg v-if="callout && callout.anchor" class="showcase-leader" :viewBox="`${-stage.viewWidth / 2} ${-stage.viewHeight / 2} ${stage.viewWidth} ${stage.viewHeight}`">
              <path :key="callout.id" :d="`M${callout.anchor.x} ${callout.anchor.y} L${callout.edge.x} ${callout.edge.y}`" pathLength="1" />
              <circle :cx="callout.anchor.x" :cy="callout.anchor.y" r="4" />
            </svg>
          </div>
          <Transition name="showcase-card">
            <div
              v-if="callout && !flat" :key="callout.id" class="showcase-card" role="status"
              :style="{ width: `${callout.card}px`, transform: `translate3d(${callout.cardX}px, ${callout.cardY}px, 0)` }"
            >
              <strong>{{ callout.note.title }}</strong>
              <span class="card-body">{{ callout.note.body }}</span>
            </div>
          </Transition>
        </div>

        <!-- 窄屏批注卡改在图片下方出现，不遮挡画面。 -->
        <div v-if="flat && callout" class="showcase-card is-docked" role="status">
          <strong>{{ callout.note.title }}</strong>
          <span class="card-body">{{ callout.note.body }}</span>
        </div>

        <!-- 键盘逐层查看：聚焦时高亮对应图层并弹出同一张批注卡。 -->
        <ul class="showcase-keys" :aria-label="`${scene.title}的图层`">
          <li v-for="layer in keyLayers" :key="layer.id">
            <button type="button" @focus="focusLayer(layer.id)" @blur="focusLayer(null)" @click="togglePin(layer.id)">
              {{ scene.notes[layer.id].title }}
            </button>
          </li>
        </ul>

        <!-- 笔触图标分立舞台两侧：只有原生工具栏图标，悬停或聚焦即抬起对应笔迹。 -->
        <template v-if="scene.legend">
          <div
            v-for="side in (['left', 'right'] as const)" :key="side"
            class="showcase-rail" :class="`is-${side}`" role="group" :aria-label="`${scene.title}的笔触`"
          >
            <button
              v-for="item in scene.legend.filter(entry => entry.side === side)" :key="item.id" type="button" class="rail-item"
              :class="{ 'is-written': revealOf(item.id) >= 1, 'is-active': active === item.id }"
              :aria-label="scene.notes[item.id].title" :aria-pressed="pinned === item.id"
              @mouseenter="hoverLegend(item.id)" @mouseleave="hoverLegend(null)"
              @focus="focusLayer(item.id)" @blur="hoverLegend(null)" @click="togglePin(item.id)"
              v-html="barIcons[item.icon]"
            />
          </div>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped src="./ShowcaseStack.css"></style>
