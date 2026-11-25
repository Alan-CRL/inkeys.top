import { CanvasImage, staticFile } from 'remotion'
import native from './native-assets.json'
import { angleAt, assetFrame, physics, progress, timing } from './timeline'

type Props = { frame: number; mobile: boolean }

const curvePath = (frame: number, width: number, height: number) => {
  const end = Math.min(frame, timing.freeze)
  return Array.from({ length: 121 }, (_, i) => {
    const x = i * width / 120
    const sample = end - 288 + i * 288 / 120
    const y = height / 2 - Math.cos((sample - timing.freeze) * Math.PI / 144) * height * 0.37
    return `${i ? 'L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)}`
  }).join(' ')
}

// 教学网页里的角度曲线随单摆一起定格，不添加暗示网页自行暂停的状态。
export const AngleGraph = ({ frame, mobile }: Props) => {
  const w = mobile ? 230 : 260
  const h = mobile ? 52 : 126
  return (
    <svg width={w + 36} height={h + 58} viewBox={`0 0 ${w + 36} ${h + 58}`} style={{ overflow: 'visible' }}>
      <text x="0" y="0" fill="#58716c" fontSize={mobile ? 16 : 22} fontFamily="Georgia, serif" fontStyle="italic">θ(t)</text>
      <g transform="translate(0 24)">
        <path d={`M0 ${h / 2} H${w} M0 0 V${h}`} fill="none" stroke="#c6d5cf" strokeWidth="1.2" />
        {[0, 0.25, 0.5, 0.75, 1].map(x => <path key={x} d={`M${w * x} 0 V${h}`} stroke="#dce5df" strokeDasharray="2 7" />)}
        <path d={curvePath(frame, w, h)} stroke="#4e8b7c" strokeWidth="2.6" fill="none" />
        <circle cx={w} cy={h / 2 - Math.cos((Math.min(frame, timing.freeze) - timing.freeze) * Math.PI / 144) * h * 0.37} r="4.5" fill="#307e6b" stroke="#f9fcf8" strokeWidth="2" />
        <text x={w + 12} y={h / 2 + 5} fill="#71847b" fontSize="16" fontFamily="Georgia, serif" fontStyle="italic">t</text>
      </g>
    </svg>
  )
}

export const TeachingScene = ({ frame }: { frame: number }) => {
  const angle = angleAt(frame)
  const [px, py] = physics.pivot
  const bx = px + physics.length * Math.sin(angle)
  const by = py + physics.length * Math.cos(angle)
  const arc = Array.from({ length: 81 }, (_, i) => {
    const a = -physics.amplitude + i / 80 * physics.amplitude * 2
    return `${i ? 'L' : 'M'} ${px + Math.sin(a) * physics.length} ${py + Math.cos(a) * physics.length}`
  }).join(' ')
  const angleArc = Array.from({ length: 24 }, (_, i) => {
    const a = i / 23 * angle
    return `${i ? 'L' : 'M'} ${px + Math.sin(a) * 70} ${py + Math.cos(a) * 70}`
  }).join(' ')
  return (
    <>
      <svg width="1440" height="720" viewBox="0 0 1440 720" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id="bob-metal" cx="31%" cy="24%" r="80%">
            <stop offset="0" stopColor="#83bbaa" />
            <stop offset="0.42" stopColor="#3f8e77" />
            <stop offset="1" stopColor="#185440" />
          </radialGradient>
        </defs>
        <path d={arc} fill="none" stroke="#c4d3ca" strokeWidth="2" />
        <path d={`M${px} ${py + 16} V${py + physics.length + 38}`} stroke="#c6d2cc" strokeWidth="1.5" strokeDasharray="5 8" />
        <path d={angleArc} fill="none" stroke="#729a89" strokeWidth="1.8" />
        <text x={px + Math.sin(angle / 2) * 94 - 7} y={py + Math.cos(angle / 2) * 94 + 7} fontFamily="Georgia, serif" fontSize="24" fill="#5d8071" fontStyle="italic">θ</text>
        <path d={`M${px - 32} ${py - 15} H${px + 32}`} stroke="#becac2" strokeWidth="6" strokeLinecap="round" />
        <path d={`M${px} ${py} L${bx} ${by}`} stroke="#536b63" strokeWidth="3.1" strokeLinecap="round" />
        <circle cx={px} cy={py} r="7" fill="#566e62" stroke="#f8faf6" strokeWidth="2.5" />
        <circle cx={bx} cy={by} r="20" fill="url(#bob-metal)" stroke="#f6fcf7" strokeWidth="2.4" />
        <circle cx={bx - 6} cy={by - 7} r="4" fill="#e6f6ea" opacity="0.5" />
      </svg>
      {/* 真实序列包含预览与 Up 提交，保持完整画布，不用遮罩伪造写入。 */}
      {frame >= timing.solids && <CanvasImage src={staticFile(assetFrame('force-solids', frame - timing.solids))} style={{ position: 'absolute', inset: 0, width: 1440, height: 720 }} />}
      {frame >= timing.dashed && <CanvasImage src={staticFile(assetFrame('force-dashed', frame - timing.dashed))} style={{ position: 'absolute', inset: 0, width: 1440, height: 720 }} />}
      <svg width="1440" height="720" viewBox="0 0 1440 720" style={{ position: 'absolute', inset: 0, fontFamily: 'Georgia, Times New Roman, serif', fontStyle: 'italic', fontSize: 28 }}>
        <text x="921" y="430" fill={native.geometry.colors.mg} opacity={progress(frame, timing.solids + 48, timing.solids + 63)}>mg</text>
        <text x="800" y="194" fill="#16798f" opacity={progress(frame, timing.solids + 96, timing.solids + 111)}>T</text>
        <text x="778" y="387" fill="#b37a20" opacity={progress(frame, timing.solids + 144, timing.solids + 159)}>F<tspan fontSize="17" baselineShift="sub">t</tspan></text>
      </svg>
    </>
  )
}
