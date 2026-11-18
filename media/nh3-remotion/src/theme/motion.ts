import { Easing } from 'remotion'

// 与官网一致的两条缓动。
export const EASE_OUT = Easing.bezier(0.2, 0, 0, 1)
export const EASE = Easing.bezier(0.4, 0, 0.2, 1)

export const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
