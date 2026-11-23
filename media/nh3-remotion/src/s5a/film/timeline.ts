// S5-A 成片的时间表：唯一事实源。
// 分镜见 .trellis/tasks/11-22-new-index3-s5a-writing/storyboard-v6.md，第七版改动见同目录 revision-v7-plan.md。
// 60 FPS，1854 帧（约 30.9 秒，用户同意“接近 30 秒即可”），最后一帧之后接回第 0 帧。

export const FPS = 60
export const DURATION = 1854

/** 每段的起止帧 [from, to)。 */
export const T = {
  // 第一幕 · 暗场
  title1: [0, 180], // C++ · Direct3D · HLSL，下方“强劲驱动”
  open1: [180, 204],
  layers: [204, 372], // 多层缓冲：L2 / L1 / L0 三张
  redraw: [372, 516], // 局部刷新：L1 与 L0 合成一张（高光在这一张上），再与 L2 合成一张
  x1: [516, 546],
  // 第二幕 · 亮场
  title2: [546, 624],
  open2: [624, 648],
  latency: [648, 828],
  predict: [828, 966], // 推近一直延续到这里，侧边字原地换词
  multi: [966, 1296], // 多指书写 → 边擦边写
  x2: [1296, 1326],
  // 第三幕 · 暗场（不放幕标题）
  open3: [1326, 1350],
  taper: [1350, 1506],
  speed: [1506, 1704], // 模拟压感 → 快细慢粗
  jitter: [1704, 1824],
  out3: [1824, 1854], // 卡片沉回画面下方，接回第 0 帧的空暗场
} as const

export type Act = 'act1' | 'act2' | 'act3'

export const ACTS: Record<Act, { from: number; to: number; scene: 'light' | 'dark' }> = {
  act1: { from: 0, to: T.x1[1], scene: 'dark' },
  act2: { from: T.x1[0], to: T.x2[1], scene: 'light' },
  act3: { from: T.x2[0], to: DURATION, scene: 'dark' },
}

/** 明暗切换：新主题色的卡从下方升起、放大铺满（shot-transitions · mask-wipe）。第三幕与第一幕同为暗场，接缝改用卡片退场。 */
export const SWITCHES = [
  { at: T.x1, to: 'light' },
  { at: T.x2, to: 'dark' },
] as const
