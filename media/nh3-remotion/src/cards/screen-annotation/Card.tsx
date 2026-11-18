import { AbsoluteFill, interpolate, Sequence, Track, useCurrentFrame } from 'remotion'
import { CopyOverlay, type CopyLanguage } from '../../components/CopyOverlay'
import { Pointer, type PointerSegment } from '../../components/Pointer'
import { ScreenFrame } from '../../components/ScreenFrame'
import { SwapLayer } from '../../components/SwapLayer'
import { ToolbarStrip } from '../../components/ToolbarStrip'
import { HighlighterStroke, SoftPenStroke } from '../../ink/Strokes'
import { CLAMP, EASE } from '../../theme/motion'
import { CARD, FONT, INK, THEMES, type ThemeName } from '../../theme/tokens'
import { PdfPage } from './content/PdfPage'
import { VideoScene } from './content/VideoScene'
import { WebPage } from './content/WebPage'
import { SCREEN } from './layout'
import { headlineLoop, HIGHLIGHTER_NIB, phraseSweep, planetLoop } from './strokes'

// S1“屏幕批注”卡片：约 8.0 秒循环，60 帧每秒，共 482 帧（分镜见任务目录的 design.md 第 4 节）。
// 画面规则：屏幕里的内容是灰色调，墨迹是唯一的彩色；墨迹和主栏都越过屏幕的边框。
// 指针串起整个循环：写 → 去主栏点按钮 → 到下一处 → 写。

export type ScreenAnnotationProps = {
  readonly theme: ThemeName
  /** 预览时叠上网页的标题文字；导出成片时用 'none'。 */
  readonly copy: CopyLanguage
}

// 主栏：一个逻辑单位对应的卡片像素。主栏骑在屏幕的底边上，并向左越过屏幕左沿。
const TOOLBAR_UNIT = 0.775
const TOOLBAR_HEIGHT = 80 * TOOLBAR_UNIT
const TOOLBAR_Y = SCREEN.y + SCREEN.height - TOOLBAR_HEIGHT / 2
// 左段：主按钮距卡片左边 16；右段：主栏右端距卡片右边 16，露出 Freeze。
const TOOLBAR_LEFT = 16
const TOOLBAR_RIGHT = CARD.width - 16 - 770 * TOOLBAR_UNIT
const buttonCenter = (toolbarX: number, button: number) => ({ x: toolbarX + (130 + 75 * button) * TOOLBAR_UNIT, y: TOOLBAR_Y + TOOLBAR_HEIGHT / 2 })

// 两次点击发生的帧，以及主栏滑动的起止帧。
// 指针到位后先停约 0.2 秒再按下（按钮从点击前 8 帧开始下沉），点完再停约 0.25 秒才离开。
const CLICK_PEN = 128
// 定格的点击比主栏到位晚约 1.1 秒：主栏停稳后画面里只剩行星在动，先让视线落到行星上再定格。
const CLICK_FREEZE = 326
const SLIDE_OUT = [236, 260] as const
const SLIDE_BACK = [452, 476] as const

const Toolbar = ({ theme }: { readonly theme: ThemeName }) => {
  const frame = useCurrentFrame()
  // 荧光笔状态：点击笔按钮时切入；变回软笔发生在笔按钮滑出卡片之后。
  const highlight = interpolate(frame, [CLICK_PEN - 6, CLICK_PEN + 6, SLIDE_OUT[1] - 6, SLIDE_OUT[1]], [0, 1, 1, 0], CLAMP)
  // 定格状态：按钮松开的那一帧切入；取消定格发生在 Freeze 滑出卡片之后。
  const freeze = frame >= CLICK_FREEZE ? interpolate(frame, [SLIDE_BACK[0] + 12, SLIDE_BACK[0] + 18], [1, 0], CLAMP) : 0
  return (
    <ToolbarStrip
      theme={theme}
      unit={TOOLBAR_UNIT}
      x={interpolate(frame, [...SLIDE_OUT, ...SLIDE_BACK], [TOOLBAR_LEFT, TOOLBAR_RIGHT, TOOLBAR_RIGHT, TOOLBAR_LEFT], { ...CLAMP, easing: EASE })}
      y={TOOLBAR_Y}
      origin={{ x: 0, y: 0, scale: CARD.scale }}
      weights={{ soft: 1 - highlight - freeze, highlight, 'soft-freeze': freeze }}
      presses={[
        { button: 1, at: CLICK_PEN, depth: 0.9, swap: { from: 'soft', to: 'highlight' } },
        { button: 8, at: CLICK_FREEZE, depth: 0.88 },
      ]}
      accent={THEMES[theme].accent}
    />
  )
}

// 指针的路线。每道笔迹的起点、终点直接取自笔迹数据，按钮的位置取自主栏的布局。
const first = (samples: readonly { x: number; y: number }[]) => samples[0]
const last = (samples: readonly { x: number; y: number }[]) => samples[samples.length - 1]
const PEN_BUTTON = buttonCenter(TOOLBAR_LEFT, 1)
const FREEZE_BUTTON = buttonCenter(TOOLBAR_RIGHT, 8)
const POINTER: PointerSegment[] = [
  { kind: 'hold', from: 0, to: 14, at: first(headlineLoop.samples) },
  { kind: 'write', from: 14, to: 62, samples: headlineLoop.samples },
  { kind: 'hold', from: 62, to: 84, at: last(headlineLoop.samples) },
  { kind: 'travel', from: 84, to: 108, a: last(headlineLoop.samples), b: PEN_BUTTON, bend: 0.14 },
  { kind: 'hold', from: 108, to: 142, at: PEN_BUTTON },
  { kind: 'travel', from: 142, to: 166, a: PEN_BUTTON, b: first(phraseSweep), bend: 0.18 },
  { kind: 'hold', from: 166, to: 176, at: first(phraseSweep) },
  { kind: 'write', from: 176, to: 206, samples: phraseSweep },
  { kind: 'hold', from: 206, to: 236, at: last(phraseSweep) },
  { kind: 'travel', from: 236, to: 262, a: last(phraseSweep), b: FREEZE_BUTTON, bend: -0.16 },
  { kind: 'hold', from: 262, to: 340, at: FREEZE_BUTTON },
  { kind: 'travel', from: 340, to: 364, a: FREEZE_BUTTON, b: first(planetLoop.samples), bend: 0.12 },
  { kind: 'hold', from: 364, to: 374, at: first(planetLoop.samples) },
  { kind: 'write', from: 374, to: 410, samples: planetLoop.samples },
  { kind: 'hold', from: 410, to: 452, at: last(planetLoop.samples) },
  { kind: 'travel', from: 452, to: 478, a: last(planetLoop.samples), b: first(headlineLoop.samples), bend: 0.2 },
  { kind: 'hold', from: 478, to: 482, at: first(headlineLoop.samples) },
]

export const ScreenAnnotationCard = ({ theme: themeName, copy }: ScreenAnnotationProps) => {
  const theme = THEMES[themeName]
  return (
    <AbsoluteFill style={{ backgroundColor: theme.surface }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: CARD.width, height: CARD.height, scale: String(CARD.scale), transformOrigin: '0 0', fontFamily: FONT.sans }}>
        <ScreenFrame theme={theme} rect={SCREEN}>
          <Sequence name="网页" durationInFrames={148}>
            <SwapLayer exitFrom={130}>
              <WebPage theme={theme} dark={themeName === 'dark'} />
            </SwapLayer>
          </Sequence>
          <Sequence name="PDF" from={130} durationInFrames={126}>
            <SwapLayer enter exitFrom={108}>
              <PdfPage theme={theme} />
            </SwapLayer>
          </Sequence>
          <Sequence name="视频（第 88 帧定格）" from={238} durationInFrames={244}>
            <SwapLayer enter exitFrom={214}>
              <VideoScene theme={theme} freezeAt={CLICK_FREEZE - 238} />
            </SwapLayer>
          </Sequence>
          <Sequence name="网页（接回开头）" from={452} durationInFrames={30}>
            <SwapLayer enter>
              <WebPage theme={theme} dark={themeName === 'dark'} />
            </SwapLayer>
          </Sequence>
        </ScreenFrame>

        {/* 主栏在屏幕框之外：骑在屏幕的底边上，向左越过屏幕左沿，右端伸出卡片。 */}
        <Toolbar theme={themeName} />

        {/* 墨迹在屏幕框之外的独立一层：不被边框裁切，换内容时原地淡出。 */}
        <Track name="墨迹">
          <Sequence name="软笔：圈出标题" from={14} durationInFrames={126} layout="none">
            <SoftPenStroke stroke={headlineLoop} color={INK.softPen} fadeFrom={114} />
          </Sequence>
          <Sequence name="荧光笔：盖住一句话" from={176} durationInFrames={66} layout="none">
            <HighlighterStroke samples={phraseSweep} color={INK.highlighter} opacity={INK.highlighterOpacity} nib={HIGHLIGHTER_NIB} fadeFrom={54} />
          </Sequence>
          <Sequence name="软笔：圈出行星" from={374} durationInFrames={88} layout="none">
            <SoftPenStroke stroke={planetLoop} color={INK.softPen} fadeFrom={76} />
          </Sequence>
        </Track>

        <Pointer
          segments={POINTER}
          toolbarTop={TOOLBAR_Y}
          nib={{ from: CLICK_PEN, to: SLIDE_OUT[1], height: HIGHLIGHTER_NIB.height, width: HIGHLIGHTER_NIB.width, color: INK.highlighter }}
          penColor={INK.softPen}
          clicks={[CLICK_PEN, CLICK_FREEZE]}
        />

        <CopyOverlay theme={theme} language={copy} />
      </div>
    </AbsoluteFill>
  )
}
