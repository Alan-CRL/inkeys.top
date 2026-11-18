import { interpolate } from 'remotion'
import { CLAMP, EASE } from './motion'

/** 一个关键帧：到第 frame 帧时取值 value；easing 是“走到这一帧”这一段用的缓动。 */
export type Key = readonly [frame: number, value: number, easing?: (t: number) => number]

/** 按关键帧取值；首帧之前、末帧之后保持两端的值。 */
export function track(frame: number, keys: readonly Key[]): number {
  if (frame <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    const [to, value, easing = EASE] = keys[i]
    if (frame > to) continue
    const [from, previous] = keys[i - 1]
    return interpolate(frame, [from, to], [previous, value], { ...CLAMP, easing })
  }
  return keys[keys.length - 1][1]
}
