import { Easing, interpolate } from 'remotion'
import native from './native-assets.json'

export const timing = {
  freezeHover: 90,
  freezeDown: 114,
  freeze: 126,
  shapeHover: 174,
  shapeDown: 198,
  shape: 210,
  cameraIn: 234,
  cameraOut: 270,
  solids: 288,
  dashed: 498,
  result: 618,
  duration: 840,
} as const

export const ease = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
  easing: Easing.bezier(0.22, 1, 0.36, 1),
} as const

export const progress = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], ease)

export const physics = {
  amplitude: native.geometry.thetaDegrees * Math.PI / 180,
  length: 350,
  ball: native.geometry.ball,
  // 以真实 Draw3 箭头交点反推支点，避免旧合成器球心与墨迹错位。
  pivot: [
    native.geometry.ball[0] - 350 * Math.sin(native.geometry.thetaDegrees * Math.PI / 180),
    native.geometry.ball[1] - 350 * Math.cos(native.geometry.thetaDegrees * Math.PI / 180),
  ],
}

export const angleAt = (frame: number) =>
  physics.amplitude * Math.cos((Math.min(frame, timing.freeze) - timing.freeze) * Math.PI / 144)

export const layoutFor = (mobile: boolean) => mobile ? {
  width: 720, height: 720,
  browser: { x: 18, y: 20, width: 684, height: 584 },
  world: { x: -192, y: 128, scale: 0.88 },
  toolbar: { x: 16, y: 616, width: 795 },
  camera: { scale: 1.3, x: -740, y: -50 },
} : {
  width: 1440, height: 640,
  browser: { x: 40, y: 22, width: 1360, height: 566 },
  world: { x: -123, y: 56, scale: 1.08 },
  toolbar: { x: 284, y: 528, width: 1020 },
  camera: { scale: 1.4, x: -585, y: -90 },
}

export const assetFrame = (id: keyof typeof native.assets, frame: number) => {
  const asset = native.assets[id]
  if (!asset.sequencePath) return asset.file
  const index = Math.max(0, Math.min(asset.frameCount - 1, Math.floor(frame)))
  return `${asset.sequencePath}${String(index).padStart(6, '0')}.png`
}
