import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { InkStroke } from '../../ink/InkStroke'
import { writeText } from '../../ink/handwriting'
import { THEMES, type ThemeName } from '../../theme/tokens'

const line = writeText(['y', ' ', '=', ' ', 's', 'in', ' ', 'x'], { origin: [20, 14], height: 34, pen: { base: 3, expectedSpeed: 430 }, pace: 10 })

/** 字形测试：把算式放大 7 倍、半速书写，用来看字形和笔锋。 */
export const GlyphTest = ({ theme }: { readonly theme: ThemeName }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const time = frame / fps / 2
  return (
    <AbsoluteFill style={{ backgroundColor: THEMES[theme].screen }}>
      <svg width={1280} height={720} viewBox="0 0 183 103">
        {line.strokes.map((item, index) => (
          <InkStroke key={index} stroke={item.stroke} time={time - item.at} color="#ff1000" />
        ))}
      </svg>
      <div style={{ position: 'absolute', left: 20, bottom: 16, color: THEMES[theme].text3, fontSize: 22 }}>{line.duration.toFixed(2)} s</div>
    </AbsoluteFill>
  )
}
