import type React from 'react'
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { CLAMP } from '../theme/motion'
import { highlighterPathAt, type HighlighterOptions } from './highlighter'
import type { Sample } from './path'
import { dotsToPaths, softStrokeAt, type SoftStroke } from './softPen'

type FadeProps = {
  /** 从第几帧（相对所在片段）开始原地淡出。 */
  readonly fadeFrom: number
  readonly fadeFrames?: number
}

const layer: React.CSSProperties = { position: 'absolute', left: 0, top: 0, overflow: 'visible' }

/** 软笔：从片段的第 0 帧开始写，每一帧重新计算整条笔迹。 */
export const SoftPenStroke = ({ stroke, color, fadeFrom, fadeFrames = 12, speed = 1 }: FadeProps & { readonly stroke: SoftStroke; readonly color: string; readonly speed?: number }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { circles, joints } = dotsToPaths(softStrokeAt(stroke, (frame / fps) * speed))
  return (
    <svg width={1} height={1} style={{ ...layer, opacity: interpolate(frame, [fadeFrom, fadeFrom + fadeFrames], [1, 0], CLAMP) }}>
      <path d={joints} fill={color} />
      <path d={circles} fill={color} />
    </svg>
  )
}

/** 荧光笔：一条半透明的带子。 */
export const HighlighterStroke = ({ samples, color, opacity, nib, fadeFrom, fadeFrames = 12 }: FadeProps & { readonly samples: readonly Sample[]; readonly color: string; readonly opacity: number; readonly nib: HighlighterOptions }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return (
    <svg width={1} height={1} style={{ ...layer, opacity: interpolate(frame, [fadeFrom, fadeFrom + fadeFrames], [1, 0], CLAMP) }}>
      <path d={highlighterPathAt(samples, frame / fps, nib)} fill={color} fillOpacity={opacity} />
    </svg>
  )
}
