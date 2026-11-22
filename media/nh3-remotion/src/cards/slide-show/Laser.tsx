import { useId } from 'react'
import type { Sample } from '../../ink/path'

// 激光笔的一道笔迹，不留在页面上。材质照软件的四层（调查记录见任务目录 research/codex-laser-survey-result.md）：
// 外层漫反射（向外 5 个逻辑单位、平方衰减）、实体壳（笔色，宽 D）、内散射环（接近白）、白芯（宽 D/3）。
// 软件里是着色器画的，这里用几层描边加模糊近似，漫反射比原生略亮一点，缩到卡片大小才看得出是在发光。
// 寿命由调用方给：抬笔后满亮保持，再整条一起淡出，路径长度和宽度都不变。

type LaserProps = {
  readonly samples: readonly Sample[]
  /** 从落笔算起的时间（秒）。 */
  readonly time: number
  /** 整条笔迹的不透明度，淡出时从 1 到 0。 */
  readonly opacity: number
  readonly color: string
  /** 实体壳的宽度 D（卡片像素）。 */
  readonly width: number
}

export const LaserStroke = ({ samples, time, opacity, color, width }: LaserProps) => {
  const id = useId()
  if (time <= 0 || opacity <= 0) return null
  let d = ''
  let [left, top, right, bottom] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const sample of samples) {
    if (sample.t > time) break
    d += `${d ? 'L' : 'M'}${sample.x.toFixed(2)} ${sample.y.toFixed(2)}`
    left = Math.min(left, sample.x)
    top = Math.min(top, sample.y)
    right = Math.max(right, sample.x)
    bottom = Math.max(bottom, sample.y)
  }
  if (!d) return null
  const line = { d, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const
  // 滤镜范围按已画出的笔迹外扩固定的距离。不能用默认的“包围盒的百分比”：
  // 刚落笔时笔迹接近一条横线，包围盒几乎没有高度，光晕会被齐刷刷地截掉。
  const pad = width * 6
  const region = { filterUnits: 'userSpaceOnUse', x: left - pad, y: top - pad, width: right - left + pad * 2, height: bottom - top + pad * 2 } as const
  return (
    <g opacity={opacity}>
      <defs>
        <filter id={`${id}-far`} {...region}>
          <feGaussianBlur stdDeviation={width * 0.9} />
        </filter>
        <filter id={`${id}-near`} {...region}>
          <feGaussianBlur stdDeviation={width * 0.3} />
        </filter>
      </defs>
      <path {...line} stroke={color} strokeWidth={width * 3} opacity={0.34} filter={`url(#${id}-far)`} />
      <path {...line} stroke={color} strokeWidth={width * 1.9} opacity={0.5} filter={`url(#${id}-near)`} />
      <path {...line} stroke={color} strokeWidth={width} opacity={0.98} />
      <path {...line} stroke="#fff1f0" strokeWidth={(width * 7) / 15} opacity={0.94} />
      <path {...line} stroke="#ffffff" strokeWidth={width / 3} />
      {/* 书写时笔尖处不画光标：软件里绘制激光时不显示光标（用户 2026-11-22 确认）。 */}
    </g>
  )
}
