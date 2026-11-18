// 镜头：整块“屏幕”（连同主栏）在卡片里被放大、平移。
// 特写时屏幕的四条边都在卡片之外，白板铺满文字区以下的整块区域；拉远后屏幕回到和另外两张卡片相同的位置。
import { interpolate } from 'remotion'
import { CLAMP, EASE } from '../../theme/motion'
import { ANCHOR, SCREEN } from './layout'

export type Shot = {
  /** 到这一帧时镜头到位。 */
  readonly at: number
  /** 放大倍率。 */
  readonly zoom: number
  /** 镜头对准的白板坐标；它会出现在卡片的 ANCHOR 处。 */
  readonly x: number
  readonly y: number
  /** 从上一个机位走到这里用的缓动。 */
  readonly easing?: (t: number) => number
  /** 以这个白板坐标为轴缩放：它在画面里的位置保持不动（起止机位要自己保证一致）。 */
  readonly pivot?: { readonly x: number; readonly y: number }
}

/** 拉远后的机位：倍率 1，屏幕在它本来的位置。 */
export const WIDE = { zoom: 1, x: ANCHOR.x - SCREEN.x, y: ANCHOR.y - SCREEN.y }

/** 以 pivot 为轴、放大到 zoom 倍时，镜头应该对准哪里，才能让 pivot 落在它拉远后的位置上。 */
export function aimFor(pivot: { x: number; y: number }, zoom: number) {
  return { x: pivot.x - (pivot.x - WIDE.x) / zoom, y: pivot.y - (pivot.y - WIDE.y) / zoom }
}

export function cameraAt(frame: number, shots: readonly Shot[]): { zoom: number; x: number; y: number } {
  if (frame <= shots[0].at) return shots[0]
  for (let i = 1; i < shots.length; i++) {
    const to = shots[i]
    if (frame > to.at) continue
    const from = shots[i - 1]
    const u = interpolate(frame, [from.at, to.at], [0, 1], { ...CLAMP, easing: to.easing ?? EASE })
    // 倍率按对数插值，放大和缩小的速度看起来才均匀。
    const zoom = Math.exp(Math.log(from.zoom) + (Math.log(to.zoom) - Math.log(from.zoom)) * u)
    if (to.pivot) {
      const sx = (to.pivot.x - from.x) * from.zoom
      const sy = (to.pivot.y - from.y) * from.zoom
      return { zoom, x: to.pivot.x - sx / zoom, y: to.pivot.y - sy / zoom }
    }
    return { zoom, x: from.x + (to.x - from.x) * u, y: from.y + (to.y - from.y) * u }
  }
  return shots[shots.length - 1]
}

/** 把机位变成舞台（卡片坐标系）的 CSS 变换。 */
export function stageTransform({ zoom, x, y }: { zoom: number; x: number; y: number }): string {
  const fx = SCREEN.x + x
  const fy = SCREEN.y + y
  return `translate(${(ANCHOR.x - fx * zoom).toFixed(3)}px, ${(ANCHOR.y - fy * zoom).toFixed(3)}px) scale(${zoom.toFixed(5)})`
}
