import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import type { Theme } from '../../../theme/tokens'
import { ORBIT, orbitPoint, SCREEN } from '../layout'

const TRAIL_STEPS = 18
const TRAIL_DEGREES = 30

/**
 * 第三拍的示例内容：行星拖着一小段尾迹绕太阳转。
 * 到 freezeAt（相对帧号）时画面连同尾迹一起停住，之后一动不动。
 */
export const VideoScene = ({ theme, freezeAt }: { readonly theme: Theme; readonly freezeAt: number }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  // 距离定格还有多少秒；定格之后恒为 0。
  const remaining = Math.max(0, freezeAt - frame) / fps
  const angle = ORBIT.stopAngle - remaining * ORBIT.degreesPerSecond
  const planet = orbitPoint(angle, ORBIT.rx, ORBIT.ry)
  const inner = orbitPoint(ORBIT.inner.stopAngle - remaining * ORBIT.inner.degreesPerSecond, ORBIT.inner.rx, ORBIT.inner.ry)
  return (
    <AbsoluteFill style={{ backgroundColor: theme.video }}>
      <svg width={SCREEN.width} height={SCREEN.height}>
        <defs>
          <radialGradient id="sa-sun">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.16" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="0.3" stopColor="#ffffff" stopOpacity="0.32" />
            <stop offset="0.6" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sa-planet" cx="0.34" cy="0.3">
            <stop offset="0" stopColor="#e6e6e6" />
            <stop offset="0.6" stopColor="#9c9c9c" />
            <stop offset="1" stopColor="#5a5a5a" />
          </radialGradient>
        </defs>
        <g transform={`rotate(${ORBIT.tilt} ${ORBIT.cx} ${ORBIT.cy})`} fill="none" stroke="#ffffff">
          <ellipse cx={ORBIT.cx} cy={ORBIT.cy} rx={ORBIT.rx} ry={ORBIT.ry} strokeOpacity={0.14} />
          <ellipse cx={ORBIT.cx} cy={ORBIT.cy} rx={ORBIT.inner.rx} ry={ORBIT.inner.ry} strokeOpacity={0.09} />
        </g>
        <circle cx={ORBIT.cx} cy={ORBIT.cy} r={64} fill="url(#sa-sun)" />
        {/* 尾迹：沿轨道往回的一小段，越远越细越淡。 */}
        {Array.from({ length: TRAIL_STEPS }, (_, index) => {
          const from = orbitPoint(angle - (TRAIL_DEGREES * index) / TRAIL_STEPS, ORBIT.rx, ORBIT.ry)
          const to = orbitPoint(angle - (TRAIL_DEGREES * (index + 1)) / TRAIL_STEPS, ORBIT.rx, ORBIT.ry)
          const fade = 1 - index / TRAIL_STEPS
          return <line key={index} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#ffffff" strokeOpacity={0.5 * fade * fade} strokeWidth={1 + 7 * fade} strokeLinecap="butt" />
        })}
        <circle cx={inner.x} cy={inner.y} r={ORBIT.inner.planetRadius} fill="url(#sa-planet)" />
        <circle cx={planet.x} cy={planet.y} r={ORBIT.planetRadius} fill="url(#sa-planet)" />
      </svg>
    </AbsoluteFill>
  )
}
