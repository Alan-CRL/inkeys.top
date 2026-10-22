export const FEATURE_ENTRANCE_SECONDS = 1.05

/** 挂载后再洗牌，服务端和首次水合均保持完整静态布局。 */
export function shuffleEntrances(random = Math.random) {
  const presets = [0, 1, 2]
  for (let index = presets.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1))
    const current = presets[index]
    presets[index] = presets[other]
    presets[other] = current
  }
  return presets
}

export function featureEntrance(time: number, preset: number, part = 0) {
  if (time >= FEATURE_ENTRANCE_SECONDS) return { opacity: 1, transform: 'none' }
  const progress = Math.max(0, Math.min(1, (time - part * 0.09) / 0.78))
  // 小幅超调后落定；三种方向保持同一节奏，层间错峰不拉长整张卡片的入场。
  const remainder = 1 - (1 + 2.1 * (progress - 1) ** 3 + 1.1 * (progress - 1) ** 2)
  const offsets = [[-16, 22, -0.45], [16, 18, 0.45], [0, 30, 0]][preset]
  const strength = part === 0 ? 1 : 0.45
  return {
    opacity: Math.min(1, progress * 4),
    transform: `translate3d(${offsets[0] * remainder * strength}px, ${offsets[1] * remainder * strength}px, 0) rotate(${offsets[2] * remainder * strength}deg)`,
  }
}
