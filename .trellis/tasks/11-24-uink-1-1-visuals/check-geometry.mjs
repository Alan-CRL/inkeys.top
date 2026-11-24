// UInk 图示几何自检：直接导入 geometry.ts，按规范公式与公开样例的描述核对数值。
// 运行：node .trellis/tasks/11-24-uink-1-1-visuals/check-geometry.mjs
// 需要 Node.js 22.18+（直接导入 .ts 依赖内置的类型擦除）。
import { readFileSync } from 'node:fs'
import {
  absolutePoints,
  directionAt,
  closedDashPhase,
  dashSegments,
  fitRect,
  nibSize,
  planarPreset,
  presetArcStep,
  solidParts,
  sweepPath,
  viewportInverse,
  viewportMap,
} from '../../../docs/.vuepress/theme/components/UInk/geometry.ts'

let failed = 0
const check = (name, ok, detail = '') => {
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
}
const near = (a, b, tol) => Math.abs(a - b) <= tol

// 1. 笔尖尺寸（common/nib.md 笔尖尺寸，D20：矩形 H = w，W = aspect × H；10-inkeys-erase-clear 样例描述：矩形橡皮 26.7 × 40，方形 40 × 40）
{
  const rect = nibSize(40, { shape: 1, aspect: 0.6666667, orientation: 0 })
  check('矩形橡皮 w=40, aspect 2/3 → H = 40', rect.shape === 'rect' && near(rect.height, 40, 1e-12), `H = ${rect.height}`)
  check('矩形橡皮 → W ≈ 26.67', near(rect.width, 26.67, 0.01), `W = ${rect.width.toFixed(4)}`)
  check('与样例描述一致（宽 26.7、高 40）', rect.width.toFixed(1) === '26.7')

  const square = nibSize(40, { shape: 1, aspect: 1, orientation: 0 })
  check('方形橡皮 w=40, aspect 1 → 40 × 40', near(square.width, 40, 1e-12) && near(square.height, 40, 1e-12), `${square.width} × ${square.height}`)

  const hl = nibSize(24, { shape: 1, aspect: 0.125, orientation: 0 })
  check('荧光笔 w=24, aspect 0.125 → 3 × 24', hl.shape === 'rect' && near(hl.width, 3, 1e-6) && near(hl.height, 24, 1e-12), `${hl.width} × ${hl.height}`)

  const mid = nibSize(24, { shape: 1, aspect: 2 / 3 })
  check('2:3 矩形 w=24 → 16 × 24', near(mid.width, 16, 1e-9) && near(mid.height, 24, 1e-12))
  check('没有 nib → 圆形，width 为直径（NIB-1）', nibSize(6).shape === 'circle' && nibSize(6).width === 6)
  check('shape=1 但 aspect 无效 → 圆形（NIB-6）', nibSize(10, { shape: 1, aspect: 0 }).shape === 'circle' && nibSize(10, { shape: 1, aspect: Number.NaN }).shape === 'circle')
  check('未知 shape → 圆形（NIB-7）', nibSize(10, { shape: 7, aspect: 1 }).shape === 'circle')
}

// 2. INK-4 相对坐标（blocks/ink.md 示例：首点 (120, 240)，第二点位移 (4.5, 1)）
{
  const abs = absolutePoints([{ x: 120, y: 240, width: 6 }, { x: 4.5, y: 1, width: 6.2 }, { x: -2, y: 3, width: 6 }])
  check('相对坐标累加', abs[1].x === 124.5 && abs[1].y === 241 && abs[2].x === 122.5 && abs[2].y === 244)
}

// 3. 扫掠轮廓：Fixed 矩形笔尖水平扫过时，包围盒 = 路径长度 + W，高 = H
{
  const d = sweepPath([{ x: 0, y: 0, width: 24 }, { x: 100, y: 0, width: 24 }], { shape: 1, aspect: 0.125, orientation: 0 })
  const nums = d.match(/-?\d+(\.\d+)?/g).map(Number)
  const xs = nums.filter((_, i) => i % 2 === 0)
  const ys = nums.filter((_, i) => i % 2 === 1)
  check('荧光笔水平扫掠包围盒 103 × 24（Butt，两端是笔尖矩形的边）', near(Math.min(...xs), -1.5, 1e-9) && near(Math.max(...xs), 101.5, 1e-9) && near(Math.min(...ys), -12, 1e-9) && near(Math.max(...ys), 12, 1e-9))
}

// 4. SHAPE-7 / NIB-5 虚线分段
{
  const dashes = dashSegments(60, [16, 8])
  check('{16, 8} 长 60 → [0,16] [24,40] [48,60]', JSON.stringify(dashes) === JSON.stringify([[0, 16], [24, 40], [48, 60]]), JSON.stringify(dashes))
  const dots = dashSegments(30, [0, 12])
  check('{0, 12} 长 30 → 0、12、24 三个零长度段', JSON.stringify(dots) === JSON.stringify([[0, 0], [12, 12], [24, 24]]), JSON.stringify(dots))
  const off = dashSegments(30, [16, 8], 4)
  check('dashOffset = 4 → 首段 [0,12]', JSON.stringify(off[0]) === JSON.stringify([0, 12]), JSON.stringify(off))
  check('奇数个值无效 → 实线', JSON.stringify(dashSegments(10, [4, 2, 1])) === JSON.stringify([[0, 10]]))
  check('总和为 0 无效 → 实线', JSON.stringify(dashSegments(10, [0, 0])) === JSON.stringify([[0, 10]]))
}

// 5. viewport 正反换算（CANVAS-16–CANVAS-18）：往返误差 < 1e-6
{
  const viewports = [
    { x: 0, y: 0, scale: 1 },
    { x: -320, y: 180, scale: 1.5 },
    { x: 60.25, y: -40.5, scale: 0.37 },
    { x: 1e4, y: -7e3, scale: 3.75 },
    { x: 12.5, y: 33.3, scale: 0.05 },
  ]
  const points = [{ x: 0, y: 0 }, { x: 240, y: 150 }, { x: -1234.567, y: 89.01 }, { x: 1e5, y: -2e5 }]
  let worst = 0
  for (const vp of viewports) {
    for (const p of points) {
      const back = viewportInverse(viewportMap(p, vp), vp)
      worst = Math.max(worst, Math.abs(back.x - p.x), Math.abs(back.y - p.y))
    }
  }
  check('viewport 往返误差 < 1e-6', worst < 1e-6, `max error = ${worst.toExponential(2)}`)
  const ex = viewportMap({ x: -320, y: 180 }, { x: -320, y: 180, scale: 1.5 })
  check('Device 左上角对着 (viewport.x, viewport.y)', ex.x === 0 && ex.y === 0)
  const p = viewportMap({ x: 240, y: 150 }, { x: 60, y: 40, scale: 1.25 })
  check('deviceX = (240 − 60) × 1.25 = 225，deviceY = (150 − 40) × 1.25 = 137.5', p.x === 225 && p.y === 137.5)
  const dflt = viewportMap({ x: 7, y: 9 })
  check('缺省 viewport 为 {0, 0, 1}（CANVAS-16）', dflt.x === 7 && dflt.y === 9)
}

// 6. 立体预设（PRESET-14–PRESET-19）：长方体部件与公开样例 full-shape-preset 逐点一致（容差 0.01）
{
  const fixtures = JSON.parse(readFileSync(new URL('../../../docs/.vuepress/public/standard/uink-v11/fixtures.json', import.meta.url), 'utf8'))
  const sample = fixtures.fixtures.find(f => f.file === 'full-shape-preset.uink')
  const first = sample.objects.findIndex(o => o.object?.preset === 'cuboid')
  const object = sample.objects[first].object
  const fileParts = sample.objects.slice(first, first + object.partCount)
  const parts = solidParts('cuboid', object.construction, object.transform)
  check('长方体部件数 = partCount = 12', parts.length === 12 && fileParts.length === 12, `${parts.length}`)
  let worst = 0
  let sameHidden = true
  parts.forEach((p, i) => {
    const q = fileParts[i].geometry.points
    p.points.forEach((pt, j) => { worst = Math.max(worst, Math.abs(pt.x - q[j].x), Math.abs(pt.y - q[j].y)) })
    if (p.hidden !== Array.isArray(fileParts[i].stroke.dashArray)) sameHidden = false
  })
  check('长方体 12 个部件逐点一致（容差 0.01）', worst <= 0.01, `max error = ${worst.toExponential(2)}`)
  check('隐藏边（虚线）与样例一致：partIndex 3、6、8', sameHidden && parts.map((p, i) => (p.hidden ? i : -1)).filter(i => i >= 0).join() === '3,6,8')

  const prism = solidParts('prism', { start: { x: 0, y: 0 }, height: -120, radius: 70, sides: 5 })
  const pyramid = solidParts('pyramid', { start: { x: 0, y: 0 }, height: -120, radius: 70, sides: 4 })
  check('棱柱 Line ×3n、棱锥 Line ×2n', prism.length === 15 && pyramid.length === 8, `${prism.length}、${pyramid.length}`)
  const cube = solidParts('cube', { start: { x: 0, y: 0 }, height: -100, baseRotation: 0 })
  check('正方体正视：3 条隐藏边', cube.length === 12 && cube.filter(p => p.hidden).length === 3)
  const mirrored = solidParts('cuboid', { ...object.construction, mirrored: true }, object.transform)
  check('mirrored 改变斜轴方向（kx 取负）', mirrored.some((p, i) => Math.abs(p.points[1].x - parts[i].points[1].x) > 1))

  // 圆柱：两条轮廓母线；底面圆周分成可见与隐藏两段，顶面整圈可见
  const cyl = solidParts('cylinder', { start: { x: 0, y: 0 }, height: -150, radius: 80, baseRotation: 0.3 })
  const bottom = cyl.filter(p => p.role === 'bottom')
  const top = cyl.filter(p => p.role === 'top')
  check('圆柱：2 条母线、底面 2 段（1 隐藏）、顶面 1 段可见', cyl.filter(p => p.role === 'side').length === 2 && bottom.length === 2 && bottom.filter(p => p.hidden).length === 1 && top.length === 1 && !top[0].hidden)
  // 正视时轮廓母线在投影椭圆的左右端点（x = ±radius）
  const sides = cyl.filter(p => p.role === 'side').map(p => p.points[0].x).sort((a, b) => a - b)
  check('圆柱母线落在底面椭圆左右极值 x = ±80', near(sides[0], -80, 1e-9) && near(sides[1], 80, 1e-9), sides.join(', '))
  // PRESET-16：R = 80 时 step ≈ 0.158，2π / step ≈ 39.7 → 40 段；没有 offset 时母线切点正好是轴端点（采样点），不重复插入
  const ringPts = bottom.reduce((n, p) => n + p.points.length, 0) - bottom.length
  check('圆柱底面 40 个采样点，母线切点与轴端点重合', ringPts === 40, `${ringPts}`)
  // 有 offset 时母线切点不在采样点上，另外插入 2 个
  const slanted = solidParts('cylinder', { start: { x: 0, y: 0 }, height: -150, radius: 80, baseRotation: 0.3, offset: { x: 30, y: 10 } }).filter(p => p.role === 'bottom')
  const slantedPts = slanted.reduce((n, p) => n + p.points.length, 0) - slanted.length
  check('斜圆柱：40 个采样点 + 2 个母线切点', slantedPts === 42, `${slantedPts}`)
  const cone = solidParts('cone', { start: { x: 0, y: 0 }, height: -150, radius: 80 })
  check('圆锥：2 条母线汇于锥顶 (0, −150)', cone.filter(p => p.role === 'side').every(p => near(p.points[1].x, 0, 1e-9) && near(p.points[1].y, -150, 1e-9)))
  check('height = 0 → 无效，返回空', solidParts('cuboid', { start: { x: 0, y: 0 }, height: 0, baseSize: { x: 1, y: 1 } }).length === 0)
}

// 7. 平面预设（PRESET-9–PRESET-12）
{
  const para = planarPreset('parallelogram', { start: { x: 0, y: 0 }, end: { x: 100, y: 60 } })
  check('平行四边形：k = 25 → (75, 0)、(25, 60)', JSON.stringify(para.parts[0].geometry.points) === JSON.stringify([{ x: 0, y: 0 }, { x: 75, y: 0 }, { x: 100, y: 60 }, { x: 25, y: 60 }]))
  const arrow = planarPreset('arrow', { start: { x: 0, y: 0 }, end: { x: 100, y: 0 } }, 2)
  check('箭头：长 3w、半宽 1.5w', JSON.stringify(arrow.parts[1].geometry.points) === JSON.stringify([{ x: 94, y: 3 }, { x: 100, y: 0 }, { x: 94, y: -3 }]))
  const square4 = planarPreset('regular-polygon', { start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, sides: 4 })
  const v1 = square4.parts[0].geometry.points[1]
  check('正多边形顺时针：第二个顶点在 (0, 10)', near(v1.x, 0, 1e-9) && near(v1.y, 10, 1e-9))
  const sector = planarPreset('sector', { start: { x: 0, y: 0 }, end: { x: 40, y: 0 }, sweep: Math.PI / 2 })
  const sp = sector.parts[0].geometry.points
  check('扇形：末点为圆心闭合', sp[sp.length - 1].x === 0 && sp[sp.length - 1].y === 0)
  const full = planarPreset('sector', { start: { x: 0, y: 0 }, end: { x: 40, y: 0 }, sweep: 2 * Math.PI })
  const fp = full.parts[0].geometry.points
  check('整圆扇形：不加圆心、去掉重合末点', !fp.some(p => p.x === 0 && p.y === 0) && !(near(fp[fp.length - 1].x, 40, 1e-9) && near(fp[fp.length - 1].y, 0, 1e-9)))
  const step = presetArcStep(40)
  check('PRESET-6：圆弧弦高误差 = 0.25', near(40 * (1 - Math.cos(step / 2)), 0.25, 1e-9))
}

// 8. Media fit / crop（MEDIA-1、MEDIA-3）：320 × 180 的横图放进 150 × 240 的竖框
{
  const src = { width: 320, height: 180 }
  const box = { width: 150, height: 240 }
  const eq = (r, x, y, w, h) => near(r.x, x, 1e-9) && near(r.y, y, 1e-9) && near(r.width, w, 1e-9) && near(r.height, h, 1e-9)
  check('Fill：铺满框', eq(fitRect(src, box, 0).dest, 0, 0, 150, 240))
  check('Contain：150 × 84.375，上下居中', eq(fitRect(src, box, 1).dest, 0, 77.8125, 150, 84.375))
  const cover = fitRect(src, box, 2).dest
  check('Cover：高铺满 240，左右居中超出', near(cover.height, 240, 1e-9) && near(cover.width, 1280 / 3, 1e-9) && near(cover.x, (150 - 1280 / 3) / 2, 1e-9))
  check('None：原始大小贴左上角', eq(fitRect(src, box, 3).dest, 0, 0, 320, 180))
  check('不认识的 fit 按 Fill', fitRect(src, box, 7).fit === 0)
  check('crop 超出资源 → 取交集', eq(fitRect(src, box, 0, { x: 200, y: -20, width: 200, height: 100 }).crop, 200, 0, 120, 80))
  check('crop 交集为空或无效 → 忽略', eq(fitRect(src, box, 0, { x: 400, y: 0, width: 10, height: 10 }).crop, 0, 0, 320, 180) && eq(fitRect(src, box, 0, { x: 0, y: 0, width: 0, height: 10 }).crop, 0, 0, 320, 180))
}

// 9. 闭合虚线相位（PRESET-21）：锚点处为实线中点，两侧对称
{
  const P = 400
  const w = 2
  check('锚点 d = 0、P/4 → 相位 2w', closedDashPhase(P, 0, w) === 4 && closedDashPhase(P, 100, w) === 4)
  check('锚点两侧对称', closedDashPhase(P, 49, w) === closedDashPhase(P, 51, w) && closedDashPhase(P, 99, w) === closedDashPhase(P, 101, w))
  check('点线锚点相位为 0', closedDashPhase(P, 200, w, true) === 0)
}

// 10. NIB-8 书写方向：首末点取所在段，中间点取平分方向，折返取离开方向，零长度段跳过
{
  const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: -10 }, { x: 10, y: -10 }, { x: 20, y: -10 }, { x: 10, y: -10 }]
  const d0 = directionAt(pts, 0)
  const d1 = directionAt(pts, 1)
  const d2 = directionAt(pts, 2)
  const d4 = directionAt(pts, 4)
  const d5 = directionAt(pts, 5)
  check('首点取第一段方向', near(d0.x, 1, 1e-9) && near(d0.y, 0, 1e-9))
  check('拐点取平分方向 (1, −1)', near(d1.x, -d1.y, 1e-9) && d1.x > 0)
  check('重复点跳过零长度段，仍取平分方向', near(d2.x, -d2.y, 1e-9) && d2.x > 0, JSON.stringify(d2))
  check('完全折返时取离开方向', near(d4.x, -1, 1e-9) && near(d4.y, 0, 1e-9), JSON.stringify(d4))
  check('末点取最后一段方向', near(d5.x, -1, 1e-9))
}

console.log(failed ? `\nFAIL: ${failed} 项未通过` : '\nPASS: 全部通过')
process.exitCode = failed ? 1 : 0
