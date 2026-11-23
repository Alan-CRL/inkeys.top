// S5-A 成片的三语文字。简中先做，繁中、英文只换字。
// 中文标签两行（每行两字，字号 200）；英文标签两到三行（字号 96）。

export type Lang = 'zh-CN' | 'zh-TW' | 'en-US'

export type Copy = {
  /** 开幕“C++ · Direct3D · HLSL”下方的一行副标题。 */
  readonly drive: string
  readonly layers: readonly string[]
  readonly redraw: readonly string[]
  readonly latency: readonly string[]
  readonly predict: readonly string[]
  readonly multi: readonly string[]
  readonly erase: readonly string[]
  readonly taper: readonly string[]
  readonly pressure: readonly string[]
  readonly speed: readonly string[]
  readonly jitter: readonly string[]
  /** 侧边标签字号。 */
  readonly labelSize: number
}

export const COPY: Record<Lang, Copy> = {
  'zh-CN': {
    drive: '强劲驱动',
    layers: ['多层', '缓冲'],
    redraw: ['局部', '刷新'],
    latency: ['超低', '延迟'],
    predict: ['墨迹', '预测'],
    multi: ['多指', '书写'],
    erase: ['边擦', '边写'],
    taper: ['实时', '笔锋'],
    pressure: ['模拟', '压感'],
    speed: ['快细', '慢粗'],
    jitter: ['手抖', '修正'],
    labelSize: 200,
  },
  'zh-TW': {
    drive: '強勁驅動',
    layers: ['多層', '緩衝'],
    redraw: ['局部', '重繪'],
    latency: ['超低', '延遲'],
    predict: ['墨跡', '預測'],
    multi: ['多指', '書寫'],
    erase: ['邊擦', '邊寫'],
    taper: ['即時', '筆鋒'],
    pressure: ['模擬', '壓感'],
    speed: ['快細', '慢粗'],
    jitter: ['手抖', '修正'],
    labelSize: 200,
  },
  'en-US': {
    drive: 'Built for speed',
    layers: ['Layered', 'buffers'],
    redraw: ['Partial', 'redraw'],
    latency: ['Ultra-low', 'latency'],
    predict: ['Ink', 'prediction'],
    multi: ['Multi-touch', 'writing'],
    erase: ['Erase as', 'you write'],
    taper: ['Live', 'taper'],
    pressure: ['Simulated', 'pressure'],
    speed: ['Fast thin,', 'slow bold'],
    jitter: ['Jitter', 'smoothing'],
    labelSize: 96, // 英文词长，字号收小；版式在 zh-CN 定稿后再逐镜头核对
  },
}
