import type React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { CLAMP, EASE, EASE_OUT } from '../theme/motion'

export const SWAP_FRAMES = 18
const FRAMES = SWAP_FRAMES
const SHIFT = 24
const BLUR = 6

/**
 * 屏幕里的一层内容：进入时从右侧移入，离开时向左移出。
 * 位移、模糊、透明度共用同一条进度，看起来是“从虚焦里浮出来”。
 */
export const SwapLayer = ({ enter = false, exitFrom, children }: { readonly enter?: boolean; readonly exitFrom?: number; readonly children: React.ReactNode }) => {
  const frame = useCurrentFrame()
  const entered = enter ? interpolate(frame, [0, FRAMES], [0, 1], { ...CLAMP, easing: EASE_OUT }) : 1
  const exited = exitFrom === undefined ? 0 : interpolate(frame, [exitFrom, exitFrom + FRAMES], [0, 1], { ...CLAMP, easing: EASE })
  return (
    <AbsoluteFill
      style={{
        opacity: entered * (1 - exited),
        translate: `${(1 - entered) * SHIFT - exited * SHIFT}px 0px`,
        filter: `blur(${(1 - entered + exited) * BLUR}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  )
}
