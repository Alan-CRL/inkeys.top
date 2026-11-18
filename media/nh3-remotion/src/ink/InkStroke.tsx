import { useMemo } from 'react'
import { dotsToPaths, softStrokeAt, type SoftStroke } from './softPen'

/**
 * 一道软笔笔迹在 time（秒，从落笔算起）这一刻的样子；放在 <svg> 里用。
 * 书写中每一帧重新计算，笔锋跟在最前端；写完之后的成品只算一次。
 */
export const InkStroke = ({ stroke, time, color }: { readonly stroke: SoftStroke; readonly time: number; readonly color: string }) => {
  const finished = useMemo(() => dotsToPaths(softStrokeAt(stroke, stroke.duration)), [stroke])
  if (time <= 0) return null
  const { circles, joints } = time >= stroke.duration ? finished : dotsToPaths(softStrokeAt(stroke, time))
  return (
    <>
      <path d={joints} fill={color} />
      <path d={circles} fill={color} />
    </>
  )
}
