import { FONT, type Theme } from '../../theme/tokens'

// 重做后的两页示例幻灯片（屏幕坐标，屏幕 400×316，卡片里只露出左边约 340）。
// 两页的版式故意差得很远：第 1 页是大标题，第 2 页是柱状图，缩到卡片大小也能一眼分清翻没翻页。
// 内容只用灰阶，颜色留给墨迹。

/** 第 1 页的标题；圈按这个位置画。width 是抽帧量出来的字宽。 */
export const TITLE = { x: 30, baseline: 98, width: 198, fontSize: 34 } as const

/** 第 1 页下方的进度线：三个节点的位置和文字。 */
export const STEPS = { x: [52, 157, 262], y: 198, labels: ['Plan', 'Build', 'Ship'] } as const

/** 第 2 页的柱状图：柱子从左到右越来越高，最后一根最深。 */
export const CHART = { x: 44, baseline: 252, barWidth: 34, gap: 18, heights: [50, 72, 96, 128, 168] } as const
export const barX = (index: number) => CHART.x + index * (CHART.barWidth + CHART.gap)

/** 占位块的深浅：文字色叠一层透明度，浅色、深色两版都看得清（深色版的 block 和纸几乎同色）。 */
const GREY = 0.1

const Line = ({ x, y, width, theme }: { readonly x: number; readonly y: number; readonly width: number; readonly theme: Theme }) => (
  <rect x={x} y={y} width={width} height={6} rx={3} fill={theme.text} opacity={GREY} />
)

const TitlePage = ({ theme }: { readonly theme: Theme }) => (
  <g>
    <text x={TITLE.x} y={48} fontSize={9.5} fontFamily={FONT.sans} fontWeight={600} letterSpacing="0.9" fill={theme.text3}>TEAM UPDATE</text>
    <text x={TITLE.x} y={TITLE.baseline} fontSize={TITLE.fontSize} fontFamily={FONT.serif} letterSpacing="-0.8" fill={theme.text}>Spring launch</text>
    <Line x={TITLE.x} y={132} width={214} theme={theme} />
    <Line x={TITLE.x} y={148} width={176} theme={theme} />
    <Line x={TITLE.x} y={164} width={122} theme={theme} />
    {/* 三步的进度线：前两步已完成（实心），最后一步是激光笔要圈的地方。 */}
    <path d={`M${STEPS.x[0]} ${STEPS.y} H${STEPS.x[2]}`} stroke={theme.text} strokeOpacity={0.2} strokeWidth={1.5} />
    {STEPS.labels.map((label, index) => (
      <g key={label}>
        <circle cx={STEPS.x[index]} cy={STEPS.y} r={index === 2 ? 7 : 5} fill={index === 2 ? theme.paper : theme.text3} stroke={theme.text} strokeWidth={index === 2 ? 2 : 0} />
        <text x={STEPS.x[index]} y={STEPS.y + 24} textAnchor="middle" fontSize={11} fontFamily={FONT.sans} fontWeight={index === 2 ? 600 : 400} fill={index === 2 ? theme.text : theme.text2}>{label}</text>
      </g>
    ))}
  </g>
)

const ChartPage = ({ theme }: { readonly theme: Theme }) => (
  <g>
    <text x={TITLE.x} y={48} fontSize={9.5} fontFamily={FONT.sans} fontWeight={600} letterSpacing="0.9" fill={theme.text3}>WEEK BY WEEK</text>
    <text x={TITLE.x} y={74} fontSize={20} fontFamily={FONT.serif} letterSpacing="-0.4" fill={theme.text}>Sign-ups</text>
    <path d={`M${CHART.x - 10} ${CHART.baseline + 0.5} H${barX(4) + CHART.barWidth + 10}`} stroke={theme.text} strokeOpacity={0.22} strokeWidth={1} />
    {CHART.heights.map((height, index) => (
      <g key={index}>
        <rect x={barX(index)} y={CHART.baseline - height} width={CHART.barWidth} height={height} rx={3}
          fill={index === CHART.heights.length - 1 ? theme.text2 : theme.text} opacity={index === CHART.heights.length - 1 ? 1 : GREY} />
        <rect x={barX(index) + 8} y={CHART.baseline + 10} width={CHART.barWidth - 16} height={5} rx={2.5} fill={theme.text} opacity={GREY} />
      </g>
    ))}
  </g>
)

export const SlidePage = ({ page, theme }: { readonly page: 1 | 2; readonly theme: Theme }) =>
  page === 1 ? <TitlePage theme={theme} /> : <ChartPage theme={theme} />
