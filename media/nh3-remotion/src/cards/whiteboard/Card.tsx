import type React from 'react'
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { CopyOverlay, type CopyLanguage } from '../../components/CopyOverlay'
import { ScreenFrame } from '../../components/ScreenFrame'
import { InkStroke } from '../../ink/InkStroke'
import type { TimedStroke } from '../../ink/handwriting'
import { CLAMP, EASE, EASE_OUT } from '../../theme/motion'
import { track } from '../../theme/keys'
import { CARD, FONT, THEMES, type ThemeName } from '../../theme/tokens'
import { aimFor, cameraAt, stageTransform, WIDE, type Shot } from './camera'
import { Chrome } from './Chrome'
import { BOARDS, type Board as BoardLook, EQUATION, MATTE, PAGE_PITCH, PRISM, SCREEN, WAVE } from './layout'
import { Prism } from './Prism'
import { equation, label, SHAPE_WIDTH, wave, WAVE_DURATION } from './strokes'

// S1“自由白板”卡片：约 8.7 秒循环，60 帧每秒。
// 和“屏幕批注”那张不同，这里没有指针去点按钮：主角是白板上的笔迹，用镜头来讲。
//   特写写算式 → 跟着笔尖横移画正弦曲线 → 以收笔处为轴拉远，露出整块屏幕
//   → 翻到新的一页 → 六棱柱分两步“拉”出来 → 再翻页并推回特写，接上开头。
// 白板不能缩放（只能平移），所以推拉的是整块屏幕，属于镜头语言，不代表软件里有缩放功能。
// 软件翻页是立即切换、没有过渡；这里的横移是剪辑上的转场。分页栏上的页码按软件的方式在点击的那一帧直接更新。

export type WhiteboardProps = {
  readonly theme: ThemeName
  /** 预览时叠上网页的标题文字；导出成片时用 'none'。 */
  readonly copy: CopyLanguage
}

const FPS = 60
const frames = (seconds: number) => Math.round(seconds * FPS)

// ── 时间线（帧）。前一段的结束决定后一段的开始，改时长不用重排后面的数字。
const WRITE_AT = 10
const WRITE_END = WRITE_AT + frames(equation.duration)
// 写完算式停一下，让人读完，镜头再落到曲线的起笔处。
const READ = 14
const WAVE_AT = WRITE_END + READ + 32
const WAVE_END = WAVE_AT + frames(WAVE_DURATION)
// 曲线还剩最后一小段时就开始拉远，收笔落在拉远的途中。
const PULL_AT = WAVE_END - 16
const PULL_END = PULL_AT + 54
// 拉远后停住，让人把整页看完，再翻页。
const FLIP = 26
const FLIP_1 = PULL_END + 26
// 新的一页：镜头推近，棱柱先拉出底面，停一下，再拉出高度。
const PUSH_AT = FLIP_1 + 6
const PUSH_END = PUSH_AT + 34
// 镜头快停稳时底面才开始出现，不和推近抢视线。
const BASE_AT = PUSH_END - 4
const BASE_END = BASE_AT + 24
const RISE_AT = BASE_END + 9
const RISE_END = RISE_AT + 36
const LABEL_AT = RISE_END + 16
const LABEL_END = LABEL_AT + frames(label.duration)
// 第二次翻页的同时推回特写；最后留几帧和开头完全相同的画面，循环处没有跳变。
const FLIP_2 = LABEL_END + 30
const HOME_END = FLIP_2 + 36
export const WHITEBOARD_FRAMES = HOME_END + 4
/** 各段的起止帧，给测试和文档用。 */
export const WHITEBOARD_TIMELINE = { WRITE_AT, WRITE_END, WAVE_AT, WAVE_END, PULL_AT, PULL_END, FLIP_1, PUSH_AT, PUSH_END, BASE_AT, BASE_END, RISE_AT, RISE_END, LABEL_AT, LABEL_END, FLIP_2, HOME_END }

// ── 机位。
const waveEnd = { x: WAVE.x1, y: WAVE.y }
const HOME = { zoom: 2.6, x: 80, y: 80 }
const WRITTEN = { zoom: 2, x: EQUATION.x + equation.width / 2, y: 98 }
// 棱柱这一拍要把屏幕底边的主栏完全推出画面，不留半截。
const SOLID = { x: PRISM.center.x + 10, y: PRISM.center.y - PRISM.height / 2 - 4 }
const SHOTS: Shot[] = [
  { at: WRITE_AT, ...HOME },
  // 写字时镜头跟着字慢慢右移并后退，写完时整条算式正好都在画面里。
  { at: WRITE_END, ...WRITTEN, easing: Easing.inOut(Easing.sin) },
  { at: WRITE_END + READ, ...WRITTEN },
  // 镜头还差最后一点没停稳时就落笔，移动和书写连成一个动作。
  { at: WAVE_AT + 6, zoom: 2, x: 102, y: 180 },
  // 跟拍：镜头匀速右移，笔尖在画面里从左走到右。
  { at: PULL_AT, zoom: 2, ...aimFor(waveEnd, 2), easing: Easing.inOut(Easing.sin) },
  { at: PULL_END, ...WIDE, pivot: waveEnd, easing: Easing.bezier(0.3, 0, 0.1, 1) },
  { at: PUSH_AT, ...WIDE },
  { at: PUSH_END, zoom: 1.6, ...SOLID, easing: EASE },
  // 棱柱这一段镜头不停死，极慢地继续推近。
  { at: FLIP_2, zoom: 1.66, ...SOLID, easing: Easing.linear },
  { at: HOME_END, ...HOME, easing: EASE },
]

// 第几页在正中：0 → 1 → 2。
const pageAt = (frame: number) =>
  track(frame, [
    [FLIP_1, 0],
    [FLIP_1 + FLIP, 1],
    [FLIP_2, 1],
    [FLIP_2 + FLIP, 2],
  ])

const Strokes = ({ items, from, color }: { readonly items: readonly TimedStroke[]; readonly from: number; readonly color: string }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return (
    <>
      {items.map((item, index) => (
        <InkStroke key={index} stroke={item.stroke} time={(frame - from) / fps - item.at} color={color} />
      ))}
    </>
  )
}

/** 一页白板：点阵底，上面是这一页的内容。offset 是它相对屏幕的横向位置。 */
const Page = ({ offset, board, children }: { readonly offset: number; readonly board: BoardLook; readonly children?: React.ReactNode }) => (
  <g transform={`translate(${offset.toFixed(3)} 0)`}>
    <rect width={SCREEN.width} height={SCREEN.height} fill={board.color} />
    <rect width={SCREEN.width} height={SCREEN.height} fill="url(#wb-dots)" />
    {children}
  </g>
)

const Board = ({ board }: { readonly board: BoardLook }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const page = pageAt(frame)
  // 翻页时按横移的速度加一点水平方向的动态模糊。
  const speed = Math.abs(pageAt(frame + 0.5) - pageAt(frame - 0.5)) * PAGE_PITCH
  const blur = Math.min(16, speed * 0.3)
  const visible = (index: number) => Math.abs(index - page) < 1
  const radius = interpolate(frame, [BASE_AT, BASE_END], [0, PRISM.radius], { ...CLAMP, easing: EASE_OUT })
  const height = interpolate(frame, [RISE_AT, RISE_END], [0, PRISM.height], { ...CLAMP, easing: Easing.bezier(0.3, 0, 0.1, 1) })
  return (
    <svg width={SCREEN.width} height={SCREEN.height} style={{ position: 'absolute', left: 0, top: 0 }}>
      <defs>
        <pattern id="wb-dots" width={board.dotGap} height={board.dotGap} patternUnits="userSpaceOnUse">
          <circle cx={board.dotGap / 2} cy={board.dotGap / 2} r={board.dotRadius} fill={board.dot} fillOpacity={board.dotOpacity} />
        </pattern>
        <filter id="wb-slide" filterUnits="userSpaceOnUse" x={-PAGE_PITCH} y={0} width={PAGE_PITCH * 3} height={SCREEN.height}>
          <feGaussianBlur stdDeviation={`${blur.toFixed(2)} 0`} />
        </filter>
      </defs>
      <rect width={SCREEN.width} height={SCREEN.height} fill={board.gutter} />
      <g filter={blur > 0.05 ? 'url(#wb-slide)' : undefined}>
        {visible(0) ? (
          <Page board={board} offset={-page * PAGE_PITCH}>
            <Strokes items={equation.strokes} from={WRITE_AT} color={board.ink} />
            <InkStroke stroke={wave} time={(frame - WAVE_AT) / fps} color={board.accent} />
          </Page>
        ) : null}
        {visible(1) ? (
          <Page board={board} offset={(1 - page) * PAGE_PITCH}>
            <Prism center={PRISM.center} radius={radius} height={height} sides={PRISM.sides} width={SHAPE_WIDTH} color={board.ink} />
            <Strokes items={label.strokes} from={LABEL_AT} color={board.accent} />
          </Page>
        ) : null}
        {visible(2) ? <Page board={board} offset={(2 - page) * PAGE_PITCH} /> : null}
      </g>
    </svg>
  )
}

export const WhiteboardCard = ({ theme: themeName, copy }: WhiteboardProps) => {
  const theme = THEMES[themeName]
  const board = BOARDS[themeName]
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ backgroundColor: theme.surface }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: CARD.width, height: CARD.height, scale: String(CARD.scale), transformOrigin: '0 0', fontFamily: FONT.sans }}>
        {/* 文字区以下才是画面：镜头推近时，白板在这条线以下铺满整张卡片。 */}
        <div style={{ position: 'absolute', left: 0, top: MATTE, width: CARD.width, height: CARD.height - MATTE, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: -MATTE, width: CARD.width, height: CARD.height, transformOrigin: '0 0', transform: stageTransform(cameraAt(frame, SHOTS)) }}>
            <ScreenFrame theme={{ ...theme, screen: board.gutter }} rect={SCREEN}>
              <Board board={board} />
            </ScreenFrame>
            {/* 分页栏和主栏在屏幕框之外，骑在屏幕的底边上；翻页时它们不动，页码在点击的那一帧更新。 */}
            <Chrome theme={themeName} addPageAt={FLIP_1} accent={theme.accent} />
          </div>
        </div>
        <CopyOverlay theme={theme} language={copy} card="whiteboard" />
      </div>
    </AbsoluteFill>
  )
}
