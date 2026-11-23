// 大字：幕标题与功能标签。
// - 幕标题一（C++ · Direct3D · HLSL）借用 lead-word-zoom-assemble：三个词先在正中依次弹出、互相替换，
//   最后 HLSL 作为首词缩回自己的槽位、整行滑动归位，前两个词从槽位左侧被推进来；
// - 幕标题二、三与功能标签的入场借用 blur-slide：y、blur、opacity 共用同一个进度与缓动；
// - 每幕第一个功能的开场借用 title-demote-to-label：功能名先在正中排成一行，再一次连续补间
//   滑到卡片一侧排成两行，字号保持不变。
// 参数取自 video-shotcraft 对应 demo（30fps），帧数按 60fps 翻倍。

import { continueRender, delayRender } from 'remotion'
import { Fragment, useEffect, useRef, useState } from 'react'
import type React from 'react'
import { bezier, EASE, FONT, mix, ramp, typeFill, W, H, type Scene } from './kit'

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

// lead-word-zoom-assemble 的三条曲线
const PUSH_EASE = bezier(0.25, 1, 0.5, 1)
const ZOOM_EASE = bezier(0.5, 0, 0.05, 1)
const WORD_EASE = bezier(0.22, 0.8, 0.36, 1)

/** 单个大词在正中弹出：弹性放大 + 失焦收敛 + 极短淡入。 */
const popOf = (f: number, at: number) => ({
  scale: mix(0.86, 1, ramp(f, at, 20, EASE.overshoot)),
  blur: 10 * (1 - ramp(f, at, 12, EASE.out)),
  opacity: ramp(f, at, 6, (t) => t),
})

// ======================================================================
// 幕标题一
// ======================================================================

const T1 = {
  size: 170,
  lead: 2.0, // 首词起手倍数（卡片默认 2.3；Direct3D 在 2.3 倍时超出安全区，取 2.0）
  swaps: [0, 16, 32], // C++、Direct3D、HLSL 依次弹出的帧
  hold: 24, // HLSL 独占画面并继续推近 6%
  recede: 24,
  assemble: 48,
  wordDelay: 12,
  wordStagger: 8,
  wordDur: 24,
  wordFade: 4,
  exit: 166, // 收尾推近失焦交棒
  lift: -64, // 整组上移，给下方的副标题留位置
}

// “强劲驱动”副标题：渐变沿书写方向掠过整组字，前沿最亮（白），身后是亮青、暗青，像一道被拉长的光。
const DRIVE = { at: 100, size: 92, gap: 150 }
const DRIVE_FILL = 'linear-gradient(90deg, #0a6f68 0%, #14a497 13%, #58ffec 29%, #ffffff 39%, rgba(255,255,255,0) 41%, rgba(255,255,255,0) 100%)'

export const ActTitle1 = ({ f, drive }: { readonly f: number; readonly drive: string }) => {
  const words = ['C++', 'Direct3D', 'HLSL']
  const rowRef = useRef<HTMLSpanElement>(null)
  const leadRef = useRef<HTMLSpanElement>(null)
  const baseRef = useRef<HTMLSpanElement>(null)
  const [handle] = useState(() => delayRender('S5A 幕标题一：测量整行'))
  const [m, setM] = useState<{ width: number; lead: number; base: number } | null>(null)
  useEffect(() => {
    const row = rowRef.current
    const lead = leadRef.current
    if (!row || !lead) return continueRender(handle)
    setM({ width: row.offsetWidth, lead: (lead.offsetLeft + lead.offsetWidth / 2) / row.offsetWidth, base: baseRef.current?.offsetTop ?? T1.size * 0.88 })
  }, [handle])
  useEffect(() => {
    if (m) continueRender(handle)
  }, [m, handle])

  const style: React.CSSProperties = { fontFamily: FONT, fontWeight: 700, fontSize: T1.size, letterSpacing: '-0.01em', lineHeight: 1.1, whiteSpace: 'nowrap' }
  // 暗场竖向渐变每个词各自一份即可（不需要按整行对齐）。
  const fill = { ...typeFill('dark'), paddingBottom: 8 }
  const leadAt = T1.swaps[2]
  const zoomAt = leadAt + T1.hold
  // 前两个词：单独在正中弹出，下一个词出现时硬切。
  // 整行在这期间也保持挂载（不可见），挂载时就能量到支点；否则从前几帧开始渲染时永远量不到。
  const swapIndex = f < T1.swaps[1] ? 0 : 1
  const swap = popOf(f, T1.swaps[swapIndex])
  const swapping = f < leadAt
  const width = m?.width ?? 1500
  const leadRatio = m?.lead ?? 0.85
  const base = m?.base ?? T1.size * 0.88
  const scaleAt = (x: number) =>
    mix(T1.lead, T1.lead * 1.06, PUSH_EASE(clamp01((x - leadAt) / T1.hold))) + mix(0, 1 - T1.lead * 1.06, ZOOM_EASE(clamp01((x - zoomAt) / T1.recede)))
  const scale = scaleAt(f) * mix(0.93, 1, ramp(f, leadAt, 20, EASE.overshoot))
  const v = Math.abs(scaleAt(f + 0.5) - scaleAt(f - 0.5))
  const intro = (10 / T1.lead) * (1 - ramp(f, leadAt, 12, EASE.out))
  // 交棒：整行推近 + 失焦 + 淡出。
  const ex = ramp(f, T1.exit, 12, bezier(0.55, 0.085, 0.68, 0.53))
  const blur = Math.min(3.5, v * 20) + intro + 9 * ex
  const slide = width * (0.5 - leadRatio)
  const tx = mix(slide, 0, ZOOM_EASE(clamp01((f - zoomAt) / T1.assemble)))
  return (
    <>
    {swapping ? (
      // 替换阶段的词与整行用同一套行盒和字号，绕基线放大：两者基线一致，HLSL 接棒时不会跳高。
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', translate: `0 ${T1.lift}px` }}>
        <span style={{ ...style, position: 'relative', display: 'inline-block', transformOrigin: `50% ${base}px`, scale: `${T1.lead * swap.scale}`, opacity: m ? swap.opacity : 0, filter: swap.blur > 0.05 ? `blur(${(swap.blur / T1.lead).toFixed(2)}px)` : undefined }}>
          <span style={{ ...fill, display: 'inline-block' }}>{words[swapIndex]}</span>
          <span style={{ display: 'inline-block', width: 0, height: 0 }} />
        </span>
      </div>
    ) : null}
    {(() => {
      // 副标题：随渐变前沿从左到右显现，同时轻微右移、去模糊。
      const p = ramp(f, DRIVE.at, 40, EASE.swift)
      const enter = ramp(f, DRIVE.at, 34, EASE.out)
      const blurD = 8 * (1 - enter) + 9 * ex
      return f >= DRIVE.at ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', translate: `0 ${T1.lift + DRIVE.gap}px`, scale: `${1 + 0.12 * ex}`, opacity: 1 - ex }}>
          <span
            style={{
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: DRIVE.size,
              lineHeight: 1.2,
              letterSpacing: /[㐀-鿿]/.test(drive) ? '0.16em' : '0.02em',
              whiteSpace: 'nowrap',
              backgroundImage: DRIVE_FILL,
              backgroundSize: '250% 100%',
              backgroundPosition: `${(1 - p) * 100}% 0`,
              backgroundRepeat: 'no-repeat',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              paddingBottom: 6,
              translate: `${-0.35 * DRIVE.size * (1 - enter)}px 0`,
              filter: blurD > 0.05 ? `blur(${blurD.toFixed(2)}px)` : undefined,
            }}
          >
            {drive}
          </span>
        </div>
      ) : null
    })()}
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', translate: `0 ${T1.lift}px`, scale: `${1 + 0.12 * ex}`, opacity: swapping ? 0 : 1 - ex }}>
      <span
        ref={rowRef}
        style={{
          ...style,
          position: 'relative',
          display: 'inline-block',
          transformOrigin: `${leadRatio * 100}% ${base}px`,
          scale: `${scale}`,
          translate: `${tx}px`,
          filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
          opacity: m ? 1 : 0, // 量到支点之前不显示，避免脏帧
        }}
      >
        {words.map((word, i) => {
          const isLead = i === 2
          // 前面的词从槽位左侧推进来：离首词近的先进。
          const order = 1 - i
          const at = zoomAt + T1.wordDelay + order * T1.wordStagger
          return (
            <Fragment key={word}>
              <span
                ref={isLead ? leadRef : undefined}
                style={{
                  ...fill,
                  display: 'inline-block',
                  opacity: isLead ? ramp(f, leadAt, 6, (t) => t) : ramp(f, at, T1.wordFade, (t) => t),
                  translate: isLead ? undefined : `${mix(-0.5 * T1.size, 0, WORD_EASE(clamp01((f - at) / T1.wordDur)))}px`,
                }}
              >
                {word}
              </span>
              {/* 词间空格放在 inline-block 之外，否则会被行盒裁掉 */}
              {i < words.length - 1 ? ' ' : null}
            </Fragment>
          )
        })}
        <span ref={baseRef} style={{ display: 'inline-block', width: 0, height: 0 }} />
      </span>
    </div>
    </>
  )
}

// ======================================================================
// blur-slide：逐词（中文逐字）入场；出场是同一通道反向
// ======================================================================

type Unit = { readonly text: string; readonly at: number }

/**
 * 一行词：三通道（y、blur、opacity）共用同一个 p。
 * 注意：带 transform / filter 的子元素不能借父元素的 background-clip: text（会整块消失），
 * 所以渐变填充写在每个词自己身上，fill(i) 负责让渐变按整行对齐、不在每个字上重来一遍。
 */
const units = (list: readonly Unit[], f: number, size: number, dur: number, out: number | undefined, fill: (i: number) => React.CSSProperties) =>
  list.map((u, i) => {
    const p = ramp(f, u.at, dur, EASE.out)
    const q = out === undefined ? 0 : ramp(f, out + i * 2, 12, EASE.exit)
    const blur = 18 * (1 - p) + 14 * q
    return (
      <span key={i} style={{ display: 'inline-block', opacity: p * (1 - q), transform: `translateY(${((1 - p) * 0.38 - 0.3 * q) * size}px)`, filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined, paddingBottom: size * 0.06, ...fill(i) }}>
        {u.text}
      </span>
    )
  })

/** 横向渐变按整行铺开：第 i 段从行内 offsets[i] 处取色。 */
const lineFill = (scene: Scene, width: number, offsets: readonly number[]) => (i: number): React.CSSProperties => ({
  ...typeFill(scene),
  backgroundSize: scene === 'light' ? `${width}px 100%` : undefined,
  backgroundPosition: scene === 'light' ? `${-offsets[i]}px 0` : undefined,
  // 行宽是估算值，可能比实际字形窄：超出部分不平铺（否则会从渐变起点重来，FPS 的 S 右下角曾因此发暗），改用渐变末端色补齐。
  backgroundRepeat: scene === 'light' ? 'no-repeat' : undefined,
  backgroundColor: scene === 'light' ? '#4cc6d6' : undefined,
})

/** 幕标题二、三：居中的一行大字。sheen 给“软笔”落定后一道只在字内的亮光。 */
export const ActTitle = ({ f, scene, words, at, size, out, sheenAt }: { readonly f: number; readonly scene: Scene; readonly words: readonly string[]; readonly at: number; readonly size: number; readonly out: number; readonly sheenAt?: number }) => {
  const list = words.map((text, i) => ({ text, at: at + i * 8 }))
  const sheen = sheenAt === undefined ? -1 : ramp(f, sheenAt, 40, EASE.smooth)
  const gap = 0.32 * size
  const widths = words.map((w) => lineWidth(w, size))
  const offsets = widths.map((_, i) => widths.slice(0, i).reduce((a, b) => a + b + gap, 0))
  const total = widths.reduce((a, b) => a + b, 0) + gap * (words.length - 1)
  const fill =
    sheen > 0 && sheen < 1
      ? (i: number): React.CSSProperties => ({
          // 字面上掠过的亮光：底色收一点灰，亮带是纯白，被字形裁剪，不向外发光。
          backgroundImage: `linear-gradient(105deg, #d9e2e0 0%, #d9e2e0 ${sheen * 140 - 30}%, #ffffff ${sheen * 140 - 12}%, #d9e2e0 ${sheen * 140 + 6}%, #d9e2e0 100%)`,
          backgroundSize: `${total}px 100%`,
          backgroundPosition: `${-offsets[i]}px 0`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        })
      : lineFill(scene, total, offsets)
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap, fontFamily: FONT, fontWeight: 700, fontSize: size, lineHeight: 1.1, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
        {units(list, f, size, 44, out, fill)}
      </div>
    </div>
  )
}

// ======================================================================
// 功能标签：两行大字
// ======================================================================

export type Anchor = { readonly x: number; readonly y: number }
export const RIGHT: Anchor = { x: 1700, y: 0 }
export const LEFT: Anchor = { x: 430, y: 0 }

const isCJK = (s: string) => /[㐀-鿿]/.test(s)
/** 一行字的宽度估计：中文按全角，西文按 0.56em。 */
const lineWidth = (s: string, size: number) => (isCJK(s) ? s.length * size * 1.02 : s.length * size * 0.56)

/**
 * 两行标签。
 * - at：逐字入场的起点；out：出场起点（可省）。
 * - single：1 = 在正中排成一行（开场），0 = 在 anchor 处排成两行；中间值为补间（第二行晚 4 帧起步）。
 * - anchor：两行块的左上角 x；y 自动垂直居中。
 */
export const Label = ({ f, scene, lines, size, at, out, anchor, single = () => 0 }: { readonly f: number; readonly scene: Scene; readonly lines: readonly string[]; readonly size: number; readonly at: number; readonly out?: number; readonly anchor: (f: number) => Anchor; readonly single?: (f: number) => number }) => {
  const lead = 1.08 * size
  const blockTop = H / 2 - (lines.length * lead) / 2
  const total = lines.reduce((sum, l) => sum + lineWidth(l, size), 0) + (lines.length - 1) * (isCJK(lines[0]) ? 0 : 0.3 * size)
  let offset = 0
  let charIndex = 0
  return (
    <>
      {lines.map((line, i) => {
        const sOne = single(f - i * 4)
        const a = anchor(f - i * 4)
        const oneX = W / 2 - total / 2 + offset
        const oneY = H / 2 - lead / 2
        offset += lineWidth(line, size) + (isCJK(line) ? 0 : 0.3 * size)
        const x = mix(a.x, oneX, sOne)
        const y = mix(blockTop + i * lead, oneY, sOne)
        const pieces = isCJK(line) ? [...line] : [line]
        const list = pieces.map((text) => ({ text, at: at + (charIndex++) * 3 }))
        const w = lineWidth(line, size)
        const offsets = pieces.map((_, k) => k * size * 1.02)
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y, fontFamily: FONT, fontWeight: 700, fontSize: size, lineHeight: 1.08, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
            {units(list, f, size, 36, out, lineFill(scene, w, offsets))}
          </div>
        )
      })}
    </>
  )
}
