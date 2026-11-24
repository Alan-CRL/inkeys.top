// UInk 1.1 公开样例生成脚本
//
// 运行：node scripts/uink-fixtures/build.mjs（或 pnpm fixtures:uink）
// 输入：scripts/uink-fixtures/cases/*.json，每个样例一个文件，按文件名顺序处理。
// 输出：docs/.vuepress/public/standard/uink-v11/ 下的 .uink、.uink.extra、fixtures.json、SHA256SUMS.txt。
//
// 不依赖任何 npm 包。输出不含时间戳，重复运行逐字节一致。
//
// 用例中的值写法：
// - 数字必须显式标注类型：{ "u8": 1 }、{ "u16": 0 }、{ "u32": 5 }、{ "u64": 1700000000 }、
//   { "i8" | "i16" | "i32" | "i64": -1 }、{ "f32": 1.5 }、{ "f64": 2.5 }。未标注类型的数字会让生成失败（TYPE-1）。
// - { "fixint": 0 }：强制写成 MessagePack fixint，用于构造“非规范但无损”的编码（TYPE-5）。
// - 字符串写成普通 JSON 字符串，按最短的 str 编码；{ "str8": "..." } 强制 str8（Header guid 必须如此）。
// - { "raw": "c1ff" }：原样拼入字节；{ "bin": "00ff" }：MessagePack bin。
// - 布尔、null、数组、Map 直接写 JSON；Map 的键顺序即写出顺序。
// - 值宏（只有一个以 $ 开头的键）：
//   { "$f32s": [1, 0, 0, 1, 0, 0] }        → float32 数组
//   { "$pt": [x, y] }                       → { x: float32, y: float32 }
//   { "$points": [[x, y], ...] }            → 点数组
//   { "$inkPoints": [[x, y, w, {附加键}?], ...] } → Ink 轨迹点：输入为绝对坐标，首点绝对、其余写成相对前一点的位移
//   { "$rgb": "1E5AFF" }                    → Color Map { fallback: uint32 }
// - 块宏：objects 中带 "$preset" 的元素展开为一个图形对象的全部 Shape 部件，部件几何由
//   construction 按图形预设注册表（appendix/shape-presets）计算，保证部件与 construction 一致。
// - 块宏：{ "$replaceFirstByte": "c1", "object": {...} } 正常编码 object 后把首字节替换掉，构造文件中间的损坏。
// - 用例的 truncateBytes：从文件末尾截掉若干字节，构造写到一半的尾块。
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const casesDir = resolve(root, 'scripts/uink-fixtures/cases')
const outDir = resolve(root, 'docs/.vuepress/public/standard/uink-v11')
const specDir = resolve(root, 'docs/standard')

const LEVELS = ['core', 'basic', 'standard', 'full', 'inkeys']

class BuildError extends Error {}
const fail = msg => { throw new BuildError(msg) }

// ───────────────────────── MessagePack 编码 ─────────────────────────

const TYPE_TAGS = new Set(['u8', 'u16', 'u32', 'u64', 'i8', 'i16', 'i32', 'i64', 'f32', 'f64', 'fixint', 'str8', 'raw', 'bin'])

const isPlainObject = v => v !== null && typeof v === 'object' && !Array.isArray(v)
const isTyped = v => isPlainObject(v) && Object.keys(v).length === 1 && TYPE_TAGS.has(Object.keys(v)[0])

const INT_RANGE = {
  u8: [0, 0xff], u16: [0, 0xffff], u32: [0, 0xffffffff], u64: [0n, 0xffffffffffffffffn],
  i8: [-0x80, 0x7f], i16: [-0x8000, 0x7fff], i32: [-0x80000000, 0x7fffffff], i64: [-(2n ** 63n), 2n ** 63n - 1n],
  fixint: [-32, 127],
}

function intValue(tag, v, path) {
  const big = tag === 'u64' || tag === 'i64'
  if (big) {
    if (typeof v === 'number' && !Number.isSafeInteger(v)) fail(`${path}: ${tag} 超出安全整数范围，请写成字符串`)
    const b = BigInt(v)
    if (b < INT_RANGE[tag][0] || b > INT_RANGE[tag][1]) fail(`${path}: ${v} 超出 ${tag} 范围`)
    return b
  }
  if (!Number.isInteger(v)) fail(`${path}: ${tag} 需要整数，实际为 ${JSON.stringify(v)}`)
  if (v < INT_RANGE[tag][0] || v > INT_RANGE[tag][1]) fail(`${path}: ${v} 超出 ${tag} 范围`)
  return v
}

function hexBytes(hex, path) {
  if (typeof hex !== 'string' || !/^([0-9a-fA-F]{2})*$/.test(hex)) fail(`${path}: 无效的十六进制串`)
  return Buffer.from(hex, 'hex')
}

function encodeStr(s, forceStr8, path) {
  const data = Buffer.from(s, 'utf8')
  const n = data.length
  if (forceStr8) {
    if (n > 0xff) fail(`${path}: str8 最长 255 字节`)
    return Buffer.concat([Buffer.from([0xd9, n]), data])
  }
  if (n < 32) return Buffer.concat([Buffer.from([0xa0 | n]), data])
  if (n <= 0xff) return Buffer.concat([Buffer.from([0xd9, n]), data])
  if (n <= 0xffff) { const h = Buffer.alloc(3); h[0] = 0xda; h.writeUInt16BE(n, 1); return Buffer.concat([h, data]) }
  const h = Buffer.alloc(5); h[0] = 0xdb; h.writeUInt32BE(n, 1); return Buffer.concat([h, data])
}

function encodeTyped(v, path) {
  const [tag] = Object.keys(v)
  const x = v[tag]
  const b = n => Buffer.alloc(n)
  switch (tag) {
    case 'fixint': { const n = intValue(tag, x, path); return Buffer.from([n & 0xff]) }
    case 'u8': { const o = b(2); o[0] = 0xcc; o.writeUInt8(intValue(tag, x, path), 1); return o }
    case 'u16': { const o = b(3); o[0] = 0xcd; o.writeUInt16BE(intValue(tag, x, path), 1); return o }
    case 'u32': { const o = b(5); o[0] = 0xce; o.writeUInt32BE(intValue(tag, x, path), 1); return o }
    case 'u64': { const o = b(9); o[0] = 0xcf; o.writeBigUInt64BE(intValue(tag, x, path), 1); return o }
    case 'i8': { const o = b(2); o[0] = 0xd0; o.writeInt8(intValue(tag, x, path), 1); return o }
    case 'i16': { const o = b(3); o[0] = 0xd1; o.writeInt16BE(intValue(tag, x, path), 1); return o }
    case 'i32': { const o = b(5); o[0] = 0xd2; o.writeInt32BE(intValue(tag, x, path), 1); return o }
    case 'i64': { const o = b(9); o[0] = 0xd3; o.writeBigInt64BE(intValue(tag, x, path), 1); return o }
    case 'f32': {
      if (typeof x !== 'number') fail(`${path}: f32 需要数字`)
      const o = b(5); o[0] = 0xca; o.writeFloatBE(x, 1); return o
    }
    case 'f64': {
      if (typeof x !== 'number') fail(`${path}: f64 需要数字`)
      const o = b(9); o[0] = 0xcb; o.writeDoubleBE(x, 1); return o
    }
    case 'str8': if (typeof x !== 'string') fail(`${path}: str8 需要字符串`); return encodeStr(x, true, path)
    case 'raw': return hexBytes(x, path)
    case 'bin': {
      const data = hexBytes(x, path)
      if (data.length > 0xffff) fail(`${path}: bin 过长`)
      const h = data.length <= 0xff ? Buffer.from([0xc4, data.length]) : Buffer.from([0xc5, data.length >> 8, data.length & 0xff])
      return Buffer.concat([h, data])
    }
  }
  fail(`${path}: 未知类型标注 ${tag}`)
}

function encode(v, path) {
  if (v === null) return Buffer.from([0xc0])
  if (v === true) return Buffer.from([0xc3])
  if (v === false) return Buffer.from([0xc2])
  if (typeof v === 'number') fail(`${path}: 数字 ${v} 没有标注类型（TYPE-1），请写成 { "u32": ${v} } 之类`)
  if (typeof v === 'string') return encodeStr(v, false, path)
  if (Array.isArray(v)) {
    const n = v.length
    let head
    if (n < 16) head = Buffer.from([0x90 | n])
    else if (n <= 0xffff) head = Buffer.from([0xdc, n >> 8, n & 0xff])
    else fail(`${path}: 数组过长`)
    return Buffer.concat([head, ...v.map((x, i) => encode(x, `${path}[${i}]`))])
  }
  if (isTyped(v)) return encodeTyped(v, path)
  if (isPlainObject(v)) {
    const keys = Object.keys(v)
    if (keys.some(k => k.startsWith('$'))) fail(`${path}: 未展开的宏 ${keys.join(',')}`)
    const n = keys.length
    let head
    if (n < 16) head = Buffer.from([0x80 | n])
    else if (n <= 0xffff) head = Buffer.from([0xde, n >> 8, n & 0xff])
    else fail(`${path}: Map 过大`)
    return Buffer.concat([head, ...keys.flatMap(k => [encodeStr(k, false, path), encode(v[k], `${path}.${k}`)])])
  }
  fail(`${path}: 无法编码的值 ${JSON.stringify(v)}`)
}

// ───────────────────────── MessagePack 解码（自检用） ─────────────────────────

class Truncated extends Error {}

// 解码结果保留实际编码：{ e: 编码名, v: 值 }；数组 v 为节点数组，Map v 为 [键节点, 值节点] 数组
function decodeAt(buf, start) {
  let pos = start
  const need = n => { if (pos + n > buf.length) throw new Truncated(); const p = pos; pos += n; return p }
  const str = (e, n) => {
    const p = need(n)
    let s
    try { s = new TextDecoder('utf-8', { fatal: true }).decode(buf.subarray(p, p + n)) } catch { throw new Error(`偏移 ${p}: 无效的 UTF-8`) }
    return { e, v: s }
  }
  const arr = (e, n) => { const items = []; for (let i = 0; i < n; i++) items.push(read()); return { e, v: items } }
  const map = (e, n) => { const items = []; for (let i = 0; i < n; i++) { const k = read(); items.push([k, read()]) } return { e, v: items } }
  function read() {
    const b = buf[need(1)]
    if (b <= 0x7f) return { e: 'fixint', v: b }
    if (b >= 0xe0) return { e: 'fixint', v: b - 0x100 }
    if ((b & 0xf0) === 0x80) return map('map', b & 0x0f)
    if ((b & 0xf0) === 0x90) return arr('array', b & 0x0f)
    if ((b & 0xe0) === 0xa0) return str('fixstr', b & 0x1f)
    switch (b) {
      case 0xc0: return { e: 'nil', v: null }
      case 0xc2: return { e: 'bool', v: false }
      case 0xc3: return { e: 'bool', v: true }
      case 0xc4: { const n = buf[need(1)]; const p = need(n); return { e: 'bin8', v: Buffer.from(buf.subarray(p, p + n)) } }
      case 0xc5: { const n = buf.readUInt16BE(need(2)); const p = need(n); return { e: 'bin16', v: Buffer.from(buf.subarray(p, p + n)) } }
      case 0xca: return { e: 'f32', v: buf.readFloatBE(need(4)) }
      case 0xcb: return { e: 'f64', v: buf.readDoubleBE(need(8)) }
      case 0xcc: return { e: 'u8', v: buf.readUInt8(need(1)) }
      case 0xcd: return { e: 'u16', v: buf.readUInt16BE(need(2)) }
      case 0xce: return { e: 'u32', v: buf.readUInt32BE(need(4)) }
      case 0xcf: return { e: 'u64', v: buf.readBigUInt64BE(need(8)) }
      case 0xd0: return { e: 'i8', v: buf.readInt8(need(1)) }
      case 0xd1: return { e: 'i16', v: buf.readInt16BE(need(2)) }
      case 0xd2: return { e: 'i32', v: buf.readInt32BE(need(4)) }
      case 0xd3: return { e: 'i64', v: buf.readBigInt64BE(need(8)) }
      case 0xd9: return str('str8', buf[need(1)])
      case 0xda: return str('str16', buf.readUInt16BE(need(2)))
      case 0xdb: return str('str32', buf.readUInt32BE(need(4)))
      case 0xdc: return arr('array', buf.readUInt16BE(need(2)))
      case 0xdd: return arr('array', buf.readUInt32BE(need(4)))
      case 0xde: return map('map', buf.readUInt16BE(need(2)))
      case 0xdf: return map('map', buf.readUInt32BE(need(4)))
    }
    throw new Error(`偏移 ${pos - 1}: 不支持的 MessagePack 字节 0x${b.toString(16)}`)
  }
  const node = read()
  return { node, end: pos }
}

// 把整个文件解码为对象序列：结尾不完整时只保留完整对象（FILE-16）；
// 中间出现无法解码的字节时保留之前的对象并停止，不向后搜索（FILE-17）
function decodeStream(buf) {
  const objects = []
  let pos = 0
  while (pos < buf.length) {
    try {
      const { node, end } = decodeAt(buf, pos)
      objects.push({ node, start: pos, end })
      pos = end
    } catch (e) {
      if (e instanceof Truncated) return { objects, truncatedAt: pos, corruptAt: null }
      return { objects, truncatedAt: null, corruptAt: pos, corruptReason: e.message }
    }
  }
  return { objects, truncatedAt: null, corruptAt: null }
}

// float32 用能还原同一个 float32 的最短十进制表示，便于阅读
function f32Short(v) {
  if (!Number.isFinite(v)) return v
  for (let p = 1; p <= 9; p++) {
    const s = Number(v.toPrecision(p))
    if (Math.fround(s) === v) return s
  }
  return v
}

function flatten(node) {
  switch (node.e) {
    case 'map': return Object.fromEntries(node.v.map(([k, v]) => [typeof k.v === 'string' ? k.v : String(k.v), flatten(v)]))
    case 'array': return node.v.map(flatten)
    case 'f32': return f32Short(node.v)
    case 'u64': case 'i64': return Number.isSafeInteger(Number(node.v)) ? Number(node.v) : String(node.v)
    case 'bin8': case 'bin16': return node.v.toString('hex')
    default: return node.v
  }
}

// ───────────────────────── 字段表（自检） ─────────────────────────
// 按 docs/standard 的字段表检查编码与位宽、必填字段、已注册的枚举值，以及未注册的键（TYPE-4）与 Type ID。
// 读取器会忽略这些内容（TYPE-8、TYPE-9），但 1.1 写入器不得写出；偏离之处汇总为 deviations，必须与用例声明的完全一致。

const U16 = 'u16', U32 = 'u32', U64 = 'u64', I32 = 'i32', F32 = 'f32', F64 = 'f64', STR = 'str', BOOL = 'bool', ANY = 'any'
const en = (...vals) => ({ kind: 'enum', vals })
const arr = (of, len) => ({ kind: 'array', of, len })
// open：允许不在字段表中的键（construction 的键由预设定义，私有预设可以有自己的键）
const map = (fields, required = [], open = false) => ({ kind: 'map', fields, required, open })

const COLOR = map({ fallback: U32, space: STR, components: arr(F32, 3) }, ['fallback'])
const PT = map({ x: F32, y: F32 }, ['x', 'y'])
const INK_PT = map({ x: F32, y: F32, width: F32, color: COLOR, opacity: F32 }, ['x', 'y', 'width'])
const NIB = map({ shape: en(0, 1), aspect: F32, orientation: en(0, 1) })
const STROKE = map({
  color: COLOR, opacity: F32, width: F32, dashArray: arr(F32), dashOffset: F32,
  lineCap: en(0, 1, 2), lineJoin: en(0, 1, 2), startMarker: en(0, 1), endMarker: en(0, 1),
}, ['color', 'opacity', 'width'])
const FILL = map({ fillType: en(0), color: COLOR, opacity: F32 }, ['fillType', 'color', 'opacity'])
const GEOMETRY = map({
  points: arr(PT), centerX: F32, centerY: F32, width: F32, height: F32, rotation: F32,
  cornerRadiusX: F32, cornerRadiusY: F32, size: F32, radius: F32,
})
const CONSTRUCTION = map({
  start: PT, end: PT, vertices: arr(PT), mode: en(0, 1), constraint: en(0, 1, 2), constraintVertex: U32,
  cornerRadius: F32, sides: U32, sweep: F32, height: F32, baseSize: PT, radius: F32, baseRotation: F32,
  mirrored: BOOL, offset: PT, right: BOOL,
}, [], true)
const STYLE = map({
  stroke: BOOL, fill: BOOL, strokeColor: COLOR, fillColor: COLOR, strokeOpacity: F32, fillOpacity: F32,
  width: F32, linePattern: en(0, 1, 2, 3), dashOffset: F32,
})
const OBJECT = map({
  id: STR, revision: U64, preset: STR, partCount: U32, transform: arr(F32, 6),
  construction: CONSTRUCTION, style: STYLE, aux: U32, ref: STR, partIndex: U32,
})
const HARDWARE = map({ name: STR, id: STR, identifiers: ANY, physicalWidth: U32, physicalHeight: U32, scaleFactor: F32 })
const DEVICE_COMMON = { guid: STR, deviceType: en(0, 1), name: STR, hardware: HARDWARE, extra: ANY }
const DISPLAY = map({ ...DEVICE_COMMON, x: I32, y: I32, width: U32, height: U32 }, ['guid', 'deviceType', 'x', 'y', 'width', 'height'])
const WINDOW = map({ ...DEVICE_COMMON, parentDeviceGuid: STR, x: F32, y: F32, width: F32, height: F32, zIndex: U32 },
  ['guid', 'deviceType', 'parentDeviceGuid', 'x', 'y', 'width', 'height', 'zIndex'])
const DEVICE = { kind: 'select', pick: node => (mapGet(node, 'deviceType')?.v === 1 ? WINDOW : DISPLAY) }
const WORKSPACE = map({
  guid: STR, workspaceType: en(0, 1, 2), name: STR, parentWorkspaceGuid: STR, hostId: STR, currentPageIndex: U32, extra: ANY,
}, ['guid', 'workspaceType'])
const CONTENT = { type: U16, contentId: U32, undoId: U32 }

const BLOCKS = {
  1: ['HeaderExtension', map({ type: U16, name: STR, explanation: STR, devices: arr(DEVICE), workspaces: arr(WORKSPACE), extra: ANY }, ['type'])],
  2: ['Canvas', map({
    type: U16, workspaceGuid: STR, deviceGuid: STR, pageGuid: STR, pageIndex: U32, pageNumber: U32,
    layerIndex: U32, layerNumber: U32, viewport: map({ x: F32, y: F32, scale: F32 }, ['x', 'y', 'scale']),
    background: map({ color: COLOR, pattern: en(0, 1, 2) }, ['color']),
    pageState: en(0, 1), pageKind: en(0, 1), binding: en(0, 1), slideId: I32, extra: ANY,
  }, ['type', 'pageGuid', 'pageIndex', 'pageNumber', 'layerIndex', 'layerNumber'])],
  3: ['Ink', map({
    ...CONTENT, inkType: en(0, 1, 2, 3), color: COLOR, opacity: F32, texture: en(0), points: arr(INK_PT),
    nib: NIB, cap: en(0, 1, 2), renderOnlyWhenLatest: BOOL, extra: ANY,
  }, ['type', 'contentId', 'undoId', 'inkType', 'color', 'opacity', 'texture', 'points'])],
  4: ['Media', map({
    ...CONTENT, path: STR, mimeType: STR, width: F32, height: F32, transform: arr(F32, 6), opacity: F32,
    fit: en(0, 1, 2, 3), crop: map({ x: F32, y: F32, width: F32, height: F32 }, ['x', 'y', 'width', 'height']),
    pageCount: U32, pageIndex: U32, autoplay: BOOL, loop: BOOL, volume: F32, startTime: F64, playbackRate: F32, extra: ANY,
  }, ['type', 'contentId', 'undoId', 'path', 'mimeType'])],
  5: ['Shape', map({
    ...CONTENT, shapeType: en(0, 1, 2, 3, 4, 5, 6), geometry: GEOMETRY, stroke: STROKE, fill: FILL,
    object: OBJECT, renderOnlyWhenLatest: BOOL, extra: ANY,
  }, ['type', 'contentId', 'undoId', 'shapeType', 'geometry'])],
  6: ['Clear', map({ ...CONTENT, extra: ANY }, ['type', 'contentId', 'undoId'])],
}

const STR_ENC = new Set(['fixstr', 'str8', 'str16', 'str32'])

function mapGet(node, key) {
  if (node?.e !== 'map') return undefined
  return node.v.find(([k]) => k.v === key)?.[1]
}

function checkNode(node, spec, path, out) {
  if (spec === ANY) return
  if (typeof spec === 'string') {
    const ok = spec === STR ? STR_ENC.has(node.e) : node.e === spec
    if (!ok) out.push(`${path}: 应为 ${spec}，实际为 ${node.e}`)
    return
  }
  if (spec.kind === 'select') return checkNode(node, spec.pick(node), path, out)
  if (spec.kind === 'enum') {
    if (node.e !== I32) out.push(`${path}: 应为 i32，实际为 ${node.e}`)
    if (typeof node.v === 'number' && !spec.vals.includes(node.v) && node.v < 128) out.push(`${path}: ${node.v} 是未注册的保留值`)
    return
  }
  if (spec.kind === 'array') {
    if (node.e !== 'array') { out.push(`${path}: 应为 Array，实际为 ${node.e}`); return }
    if (spec.len !== undefined && node.v.length !== spec.len) out.push(`${path}: 长度应为 ${spec.len}，实际为 ${node.v.length}`)
    node.v.forEach((x, i) => checkNode(x, spec.of, `${path}[${i}]`, out))
    return
  }
  if (spec.kind === 'map') {
    if (node.e !== 'map') { out.push(`${path}: 应为 Map，实际为 ${node.e}`); return }
    const seen = new Set()
    for (const [k, v] of node.v) {
      if (!STR_ENC.has(k.e)) { out.push(`${path}: 键不是字符串`); continue }
      if (!(k.v in spec.fields)) {
        if (!spec.open) out.push(`${path}.${k.v}: 未注册的键（TYPE-4）`)
        continue
      }
      if (seen.has(k.v)) out.push(`${path}.${k.v}: 重复的已知键（TYPE-7）`)
      seen.add(k.v)
      checkNode(v, spec.fields[k.v], `${path}.${k.v}`, out)
    }
    for (const r of spec.required) if (!seen.has(r)) out.push(`${path}.${r}: 缺少必填字段`)
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// 资源路径规则（EXTRA-3、EXTRA-4）
function badResourcePath(p) {
  if (typeof p !== 'string' || p === '') return '路径为空'
  if (p.normalize('NFC') !== p) return '不是 NFC'
  if (p.startsWith('/') || p.includes('\\') || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(p)) return '不是 ZIP 内的相对路径'
  if (/[\u0000-\u001f\u007f]/.test(p)) return '含控制字符'
  if (p.split('/').some(s => s === '' || s === '.' || s === '..')) return '含空路径段、. 或 ..'
  return null
}

// Header 必须严格符合 HDR-1；这是硬性要求，任何样例都不得违反
function checkHeader(node, file) {
  const enc = ['u16', 'u16', 'str8', 'u32', 'u32', 'u32', 'u64']
  if (node.e !== 'array' || node.v.length !== 7) fail(`${file}: Header 不是 array(7)`)
  node.v.forEach((x, i) => { if (x.e !== enc[i]) fail(`${file}: Header[${i}] 应为 ${enc[i]}，实际为 ${x.e}`) })
  if (node.v[0].v !== 0) fail(`${file}: Header.type 不是 0`)
  if (node.v[1].v < 10 || node.v[1].v > 19) fail(`${file}: Header.version 不在 10–19`)
  if (!UUID_RE.test(node.v[2].v)) fail(`${file}: Header.guid 不是 UUID`)
}

// 字段表检查 + 对象流的语义检查（编号、撤回组、Clear、页面元数据、图形对象层、注册表引用）
function lintStream(objects) {
  const out = []
  const regs = { devices: null, workspaces: null }
  let canvas = null
  let group = null
  const closeGroup = (i, reason) => {
    out.push(`#${i} Shape.object: 对象 ${group.id} 只有 ${group.next}/${group.partCount} 个连续部件（${reason}，SHAPE-11）`)
    group = null
  }
  objects.forEach(({ node }, i) => {
    if (i === 0) {
      if (node.v[1].v !== 11) out.push(`#0 Header.version: 写入 ${node.v[1].v}，1.1 写入器必须写 11（VER-2）`)
      return
    }
    if (node.e !== 'map') { out.push(`#${i}: 顶层对象不是 Map`); return }
    const typeNode = mapGet(node, 'type')
    if (!typeNode) { out.push(`#${i}: 缺少 type`); return }
    if (!(typeNode.v in BLOCKS)) {
      // 7 及以上保留给后续版本，写入器不得写出；读取器跳过（TYPE-9）
      out.push(`#${i}: Type ID ${typeNode.v} 未注册`)
      return
    }
    const [name, spec] = BLOCKS[typeNode.v]
    checkNode(node, spec, `#${i} ${name}`, out)
    const get = k => mapGet(node, k)?.v
    const t = typeNode.v
    if (t === 1) {
      if (i !== 1) out.push(`#${i} HeaderExtension: 必须紧跟 Header（FILE-2）`)
      for (const r of ['devices', 'workspaces']) {
        const list = mapGet(node, r)
        if (list?.e === 'array' && list.v.length) regs[r] = new Set(list.v.map(x => mapGet(x, 'guid')?.v))
      }
      return
    }
    if (t === 2) {
      if (group) closeGroup(i, '遇到新的 Canvas')
      canvas = { expectId: 0, prevUndo: null, prevClear: false }
      for (const [r, key] of [['workspaces', 'workspaceGuid'], ['devices', 'deviceGuid']]) {
        const g = get(key)
        if (regs[r] && !regs[r].has(g)) out.push(`#${i} Canvas.${key}: 在显式注册表中找不到（HEXT-5）`)
        if (!regs[r] && g !== undefined) out.push(`#${i} Canvas.${key}: 隐式单例时不得写 GUID（HEXT-4）`)
      }
      if (get('layerIndex') !== 0) {
        for (const k of ['viewport', 'background', 'pageState', 'pageKind', 'binding']) {
          if (get(k) !== undefined) out.push(`#${i} Canvas.${k}: 只能写在第 0 层（CANVAS-8）`)
        }
      }
      return
    }
    // 内容块
    if (!canvas) { out.push(`#${i} ${name}: 出现在第一个 Canvas 之前（FILE-4）`); return }
    const cid = get('contentId')
    const undo = get('undoId')
    if (cid !== canvas.expectId) out.push(`#${i} ${name}.contentId: 应为 ${canvas.expectId}，实际为 ${cid}（INK-2）`)
    canvas.expectId++
    if (canvas.prevUndo === null && undo !== 0) out.push(`#${i} ${name}.undoId: Canvas 的第一个内容应为 0（INK-3）`)
    if (canvas.prevUndo !== null && undo < canvas.prevUndo) out.push(`#${i} ${name}.undoId: 不得减小（INK-3）`)
    if (canvas.prevUndo !== null && (t === 6 || canvas.prevClear) && undo <= canvas.prevUndo) {
      out.push(`#${i} ${name}.undoId: Clear 必须独占撤回组（CLEAR-4）`)
    }
    canvas.prevUndo = undo
    canvas.prevClear = t === 6
    if (t === 3) {
      const pts = mapGet(node, 'points')
      if (pts?.e === 'array') pts.v.forEach((p, j) => { if (!(mapGet(p, 'width')?.v > 0)) out.push(`#${i} Ink.points[${j}].width: 必须大于 0（INK-5）`) })
    }
    if (t === 4) {
      const why = badResourcePath(get('path'))
      if (why) out.push(`#${i} Media.path: ${why}（EXTRA-4）`)
    }
    // 图形对象层
    const obj = t === 5 ? mapGet(node, 'object') : undefined
    const ref = mapGet(obj, 'ref')?.v
    if (group) {
      if (ref === group.id && mapGet(obj, 'partIndex')?.v === group.next && undo === group.undo) {
        group.next++
        if (group.next === group.partCount) group = null
        return
      }
      closeGroup(i, '被其他内容打断')
    }
    if (obj) {
      const id = mapGet(obj, 'id')?.v
      if (id !== undefined) {
        const partCount = mapGet(obj, 'partCount')?.v
        if (partCount > 1) group = { id, partCount, next: 1, undo }
      } else if (ref !== undefined) {
        out.push(`#${i} Shape.object.ref: 找不到正在进行的对象 ${ref}（SHAPE-14）`)
      }
    }
  })
  if (group) closeGroup(objects.length, '文件结束')
  return out
}

// ───────────────────────── 宏展开 ─────────────────────────

const f32 = v => ({ f32: v })
const u32 = v => ({ u32: v })
const i32 = v => ({ i32: v })
const pt = (x, y) => ({ x: f32(x), y: f32(y) })

const numArg = (v, path) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(`${path}: 宏参数需要有限数字`)
  return v
}

function expandValue(v, path) {
  if (Array.isArray(v)) return v.map((x, i) => expandValue(x, `${path}[${i}]`))
  if (!isPlainObject(v) || isTyped(v)) return v
  const keys = Object.keys(v)
  if (keys.length === 1 && keys[0].startsWith('$')) {
    const arg = v[keys[0]]
    switch (keys[0]) {
      case '$f32s': return arg.map((x, i) => f32(numArg(x, `${path}[${i}]`)))
      case '$pt': return pt(numArg(arg[0], path), numArg(arg[1], path))
      case '$points': return arg.map(([x, y], i) => pt(numArg(x, `${path}[${i}]`), numArg(y, `${path}[${i}]`)))
      case '$rgb': {
        if (!/^[0-9a-fA-F]{6}$/.test(arg)) fail(`${path}: $rgb 需要 6 位十六进制`)
        return { fallback: u32(parseInt(arg, 16)) }
      }
      case '$inkPoints': {
        // 输入为绝对坐标；用 float64 计算位移后写成 float32（坐标取 0.5 的倍数时位移是精确值）
        let px = 0
        let py = 0
        return arg.map((p, i) => {
          const [x, y, w, more] = p
          numArg(x, path); numArg(y, path); numArg(w, path)
          const point = i === 0 ? { x: f32(x), y: f32(y), width: f32(w) } : { x: f32(x - px), y: f32(y - py), width: f32(w) }
          px = x
          py = y
          return more ? { ...point, ...expandValue(more, `${path}[${i}]`) } : point
        })
      }
    }
    fail(`${path}: 未知的值宏 ${keys[0]}`)
  }
  return Object.fromEntries(keys.map(k => [k, expandValue(v[k], `${path}.${k}`)]))
}

// 把带类型的 JSON 还原为普通数值（宏内部计算用）
function plain(v) {
  if (Array.isArray(v)) return v.map(plain)
  if (isTyped(v)) { const x = Object.values(v)[0]; return typeof x === 'string' && /^-?\d+$/.test(x) ? Number(x) : x }
  if (isPlainObject(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]))
  return v
}

// ───────────────────────── 图形预设（appendix/shape-presets） ─────────────────────────

const STYLE_DEFAULTS = {
  stroke: true, fill: false, strokeOpacity: 1, fillOpacity: 1, width: 2, linePattern: 0, dashOffset: 0,
}

// PRESET-7：linePattern → dashArray（w 为部件描边宽度）
function dashFor(pattern, w) {
  switch (pattern) {
    case 1: return [4 * w, 6 * w]
    case 2: return [0, 3 * w]
    case 3: return [4 * w, 5 * w, 0, 5 * w]
  }
  return null
}

const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

// 局部图元：{ kind: 'line' | 'polyline' | 'circle', ... , pattern? 覆盖线型, fillOnly? }
const PRESETS = {
  // PRESET-9：杆 + 三点 Polyline 箭头（箭头始终为实线）
  arrow(c, style) {
    const s = c.start
    const e = c.end
    const len = Math.hypot(e.x - s.x, e.y - s.y)
    if (!(len > 0)) fail('arrow: start 与 end 重合')
    const d = { x: (e.x - s.x) / len, y: (e.y - s.y) / len }
    const L = 3 * style.width
    const half = 1.5 * style.width
    const base = { x: e.x - d.x * L, y: e.y - d.y * L }
    const n = { x: -d.y, y: d.x }
    return [
      { kind: 'line', pts: [s, e] },
      { kind: 'polyline', pts: [{ x: base.x + n.x * half, y: base.y + n.y * half }, e, { x: base.x - n.x * half, y: base.y - n.y * half }], pattern: 0 },
    ]
  },
  // PRESET-10：mode 缺省为 1（Center）
  circle(c, style, aux) {
    const mode = c.mode ?? 1
    let center
    let r
    if (mode === 1) {
      center = c.start
      r = Math.hypot(c.end.x - c.start.x, c.end.y - c.start.y)
    } else {
      const side = Math.max(Math.abs(c.end.x - c.start.x), Math.abs(c.end.y - c.start.y))
      const sx = Math.sign(c.end.x - c.start.x) || 1
      const sy = Math.sign(c.end.y - c.start.y) || 1
      r = side / 2
      center = { x: c.start.x + sx * r, y: c.start.y + sy * r }
    }
    const prims = [{ kind: 'circle', center, r, closed: true }]
    // PRESET-8：aux 位 1 在圆心生成实心点；只有填充、没有描边时不生成
    if (aux & 1 && style.stroke) prims.push({ kind: 'circle', center, r: null, dot: true })
    return prims
  },
  cuboid: solid,
  cube: solid,
}

// PRESET-14 – PRESET-19：长方体 / 正方体的斜二测投影与隐藏边
function solid(c) {
  const k = 1 / (2 * Math.SQRT2)
  const kx = c.mirrored ? -k : k
  const ky = -k
  const th = c.baseRotation ?? 0
  const cs = Math.cos(th)
  const sn = Math.sin(th)
  const off = c.offset ?? { x: 0, y: 0 }
  const h = c.height
  if (!h) fail('cuboid: height 不得为 0')
  const bx = c.baseSize.x
  const by = c.baseSize.y
  const base = [[-bx / 2, -by / 2], [bx / 2, -by / 2], [bx / 2, by / 2], [-bx / 2, by / 2]]
  const n = base.length
  const proj = ([x, y, z]) => {
    const xr = cs * x - sn * y
    const yr = sn * x + cs * y
    return { x: c.start.x + xr + kx * yr, y: c.start.y + ky * yr + z }
  }
  const V = [kx * cs - sn, -kx * sn - cs, ky]
  const I = [off.x / 2, off.y / 2, h / 2]
  // 法线先按“面上一点 − I”定向为朝外，再判断背面（PRESET-17）
  const isBack = (normal, p) => {
    const nn = dot3(normal, sub3(p, I)) < 0 ? normal.map(x => -x) : normal
    return dot3(nn, V) < -1e-6 * Math.hypot(...nn)
  }
  const B = base.map(([x, y]) => [x, y, 0])
  const T = base.map(([x, y]) => [x + off.x, y + off.y, h])
  const up = [off.x, off.y, h]
  const bottomBack = isBack([0, 0, 1], B[0])
  const topBack = isBack([0, 0, 1], T[0])
  const side = B.map((b, i) => isBack(cross3(sub3(B[(i + 1) % n], b), up), b))
  const prims = []
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const prev = (i + n - 1) % n
    prims.push({ kind: 'line', pts: [proj(B[i]), proj(B[j])], hidden: bottomBack && side[i] })
    prims.push({ kind: 'line', pts: [proj(T[i]), proj(T[j])], hidden: topBack && side[i] })
    prims.push({ kind: 'line', pts: [proj(B[i]), proj(T[i])], hidden: side[i] && side[prev] })
  }
  return prims
}

function expandPreset(m, path) {
  const name = m.$preset
  if (!PRESETS[name]) fail(`${path}: 生成脚本不支持预设 ${name}`)
  const constructionTyped = expandValue(m.construction ?? {}, `${path}.construction`)
  const styleTyped = expandValue(m.style ?? {}, `${path}.style`)
  const transformTyped = m.transform ? expandValue(m.transform, `${path}.transform`) : null
  const c = plain(constructionTyped)
  const style = { ...STYLE_DEFAULTS, ...plain(styleTyped) }
  const T = transformTyped ? plain(transformTyped) : [1, 0, 0, 1, 0, 0]
  const aux = m.aux ? plain(m.aux) : 0
  const write = new Set(m.write ?? ['transform', 'construction', 'style', 'aux'])
  const det = T[0] * T[3] - T[1] * T[2]
  const scale = Math.sqrt(Math.abs(det))
  // 部件描边宽度 = style.width × √|det T|（style 表）
  const w = style.width * scale
  const tp = p => ({ x: T[0] * p.x + T[2] * p.y + T[4], y: T[1] * p.x + T[3] * p.y + T[5] })
  const strokeColor = styleTyped.strokeColor ?? { fallback: u32(0) }
  const fillColor = styleTyped.fillColor ?? { fallback: u32(0) }
  const strokeMap = pattern => {
    const s = { color: strokeColor, opacity: f32(style.strokeOpacity), width: f32(w) }
    const dash = dashFor(pattern, w)
    if (dash) {
      s.dashArray = dash.map(f32)
      if (style.dashOffset) s.dashOffset = f32(style.dashOffset)
    }
    return s
  }
  const prims = PRESETS[name](c, style, aux)
  const firstId = plain(m.contentId)
  return prims.map((p, i) => {
    const shape = { type: { u16: 5 }, contentId: u32(firstId + i), undoId: m.undoId }
    if (p.kind === 'circle') {
      const center = tp(p.center)
      shape.shapeType = i32(5)
      // 辅助圆心点半径 = max(部件描边宽度, 2)，单位已是 Canvas 单位（PRESET-8）
      shape.geometry = { centerX: f32(center.x), centerY: f32(center.y), radius: f32(p.dot ? Math.max(w, 2) : p.r * scale) }
      if (p.dot) {
        shape.fill = { fillType: i32(0), color: strokeColor, opacity: f32(style.strokeOpacity) }
      } else {
        if (style.stroke) shape.stroke = strokeMap(style.linePattern)
        if (style.fill) shape.fill = { fillType: i32(0), color: fillColor, opacity: f32(style.fillOpacity) }
      }
    } else {
      shape.shapeType = i32(p.kind === 'line' ? 0 : 1)
      shape.geometry = { points: p.pts.map(tp).map(q => pt(q.x, q.y)) }
      shape.stroke = strokeMap(p.hidden ? 1 : (p.pattern ?? style.linePattern))
    }
    if (i === 0) {
      const object = { id: m.id, revision: m.revision, preset: name, partCount: u32(prims.length) }
      if (write.has('transform') && transformTyped) object.transform = transformTyped
      if (write.has('construction')) object.construction = constructionTyped
      if (write.has('style') && m.style) object.style = styleTyped
      if (write.has('aux') && m.aux) object.aux = m.aux
      shape.object = object
    } else {
      shape.object = { ref: m.id, partIndex: u32(i) }
    }
    return shape
  })
}

function expandObjects(list, file) {
  return list.flatMap((o, i) => {
    const path = `${file}#objects[${i}]`
    if (isPlainObject(o) && '$preset' in o) return expandPreset(o, path)
    if (isPlainObject(o) && '$replaceFirstByte' in o) return [expandValue(o.object, `${path}.object`)]
    return [expandValue(o, path)]
  })
}

// ───────────────────────── 资源生成（PNG / SVG / PDF / WAV） ─────────────────────────

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// 用 stored 块手写 zlib 流：不依赖 zlib 版本，输出永远一致
function zlibStored(data) {
  if (data.length > 0xffff) fail('zlibStored: 数据超过单个 stored 块')
  let a = 1
  let b = 0
  for (const x of data) { a = (a + x) % 65521; b = (b + a) % 65521 }
  const head = Buffer.from([0x78, 0x01, 0x01, data.length & 0xff, data.length >> 8, ~data.length & 0xff, (~data.length >> 8) & 0xff])
  const adler = Buffer.alloc(4)
  adler.writeUInt32BE(((b << 16) | a) >>> 0)
  return Buffer.concat([head, data, adler])
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

// 32×16 RGB 四色图：左上蓝、右上橙、左下绿、右下洋红，便于核对 fit 与 crop
function pngQuadrants() {
  const W = 32
  const H = 16
  const colors = [[0x1e, 0x5a, 0xff], [0xff, 0x8a, 0x00], [0x22, 0xa0, 0x6b], [0xd6, 0x33, 0x84]]
  const raw = Buffer.alloc(H * (1 + W * 3))
  for (let y = 0; y < H; y++) {
    const row = y * (1 + W * 3)
    raw[row] = 0
    for (let x = 0; x < W; x++) {
      const c = colors[(y < H / 2 ? 0 : 2) + (x < W / 2 ? 0 : 1)]
      raw.set(c, row + 1 + x * 3)
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(W, 0)
  ihdr.writeUInt32BE(H, 4)
  ihdr.set([8, 2, 0, 0, 0], 8)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr), pngChunk('IDAT', zlibStored(raw)), pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// 静态 SVG：没有脚本、事件或外部引用（EXTRA-9）
function svgBadge() {
  return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">'
    + '<rect x="4" y="4" width="88" height="88" rx="16" fill="#1E5AFF"/>'
    + '<circle cx="48" cy="48" r="24" fill="#FFFFFF"/></svg>\n', 'utf8')
}

// 两页的最小 PDF（320×180 pt）：第 1 页蓝色矩形，第 2 页橙色矩形中间一个白色方块
function pdfHandout() {
  const contents = [
    '0.118 0.353 1 rg\n20 20 280 140 re f\n',
    '1 0.541 0 rg\n20 20 280 140 re f\n1 1 1 rg\n120 60 80 60 re f\n',
  ]
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 320 180] /Resources << >> /Contents 4 0 R >>',
    `<< /Length ${contents[0].length} >>\nstream\n${contents[0]}endstream`,
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 320 180] /Resources << >> /Contents 6 0 R >>',
    `<< /Length ${contents[1].length} >>\nstream\n${contents[1]}endstream`,
  ]
  let body = '%PDF-1.4\n'
  const offsets = objs.map((o, i) => {
    const at = body.length
    body += `${i + 1} 0 obj\n${o}\nendobj\n`
    return at
  })
  const xref = body.length
  body += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  body += offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
  body += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(body, 'ascii')
}

// 0.25 秒、8 kHz、8 位单声道的 500 Hz 方波提示音
function wavChime() {
  const n = 2000
  const data = Buffer.alloc(n)
  for (let i = 0; i < n; i++) data[i] = i % 16 < 8 ? 152 : 104
  const h = Buffer.alloc(44)
  h.write('RIFF', 0, 'ascii')
  h.writeUInt32LE(36 + n, 4)
  h.write('WAVEfmt ', 8, 'ascii')
  h.writeUInt32LE(16, 16)
  h.writeUInt16LE(1, 20)
  h.writeUInt16LE(1, 22)
  h.writeUInt32LE(8000, 24)
  h.writeUInt32LE(8000, 28)
  h.writeUInt16LE(1, 32)
  h.writeUInt16LE(8, 34)
  h.write('data', 36, 'ascii')
  h.writeUInt32LE(n, 40)
  return Buffer.concat([h, data])
}

const SOURCES = { 'png-quadrants': pngQuadrants, 'svg-badge': svgBadge, 'pdf-handout': pdfHandout, 'wav-chime': wavChime }

// 不压缩的 ZIP；固定 DOS 时间 2026-11-24 00:00，保证输出一致
function zipStored(entries) {
  const DOS_TIME = 0
  const DOS_DATE = ((2026 - 1980) << 9) | (11 << 5) | 24
  const locals = []
  const centrals = []
  let offset = 0
  for (const { path, data } of entries) {
    const name = Buffer.from(path, 'utf8')
    const crc = crc32(data)
    const lh = Buffer.alloc(30)
    lh.writeUInt32LE(0x04034b50, 0)
    lh.writeUInt16LE(10, 4)
    lh.writeUInt16LE(0, 6)
    lh.writeUInt16LE(0, 8)
    lh.writeUInt16LE(DOS_TIME, 10)
    lh.writeUInt16LE(DOS_DATE, 12)
    lh.writeUInt32LE(crc, 14)
    lh.writeUInt32LE(data.length, 18)
    lh.writeUInt32LE(data.length, 22)
    lh.writeUInt16LE(name.length, 26)
    lh.writeUInt16LE(0, 28)
    const ch = Buffer.alloc(46)
    ch.writeUInt32LE(0x02014b50, 0)
    ch.writeUInt16LE(20, 4)
    ch.writeUInt16LE(10, 6)
    ch.writeUInt16LE(0, 8)
    ch.writeUInt16LE(0, 10)
    ch.writeUInt16LE(DOS_TIME, 12)
    ch.writeUInt16LE(DOS_DATE, 14)
    ch.writeUInt32LE(crc, 16)
    ch.writeUInt32LE(data.length, 20)
    ch.writeUInt32LE(data.length, 24)
    ch.writeUInt16LE(name.length, 28)
    ch.writeUInt32LE(offset, 42)
    locals.push(lh, name, data)
    centrals.push(ch, name)
    offset += lh.length + name.length + data.length
  }
  const cd = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(cd.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, cd, end])
}

// ───────────────────────── 主流程 ─────────────────────────

const sha256 = buf => createHash('sha256').update(buf).digest('hex')

function definedRuleIds() {
  const ids = new Set()
  const walk = dir => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.name.endsWith('.md')) for (const m of readFileSync(p, 'utf8').matchAll(/\*\*([A-Z]+-\d+)\*\*/g)) ids.add(m[1])
    }
  }
  walk(specDir)
  return ids
}

// .gitattributes 默认 `* text eol=lf`：没有 binary 属性时，提交会把样例中的 0D 0A 改写成 0A（PNG 签名就含有 0D 0A）
function assertBinaryAttributes() {
  const lines = readFileSync(resolve(root, '.gitattributes'), 'utf8').split(/\r?\n/).map(l => l.trim())
  for (const p of ['*.uink binary', '*.uink.extra binary']) {
    if (!lines.includes(p)) fail(`.gitattributes 缺少 “${p}”，二进制样例提交时会被换行规范化破坏`)
  }
}

function buildCase(file, ruleIds) {
  const src = JSON.parse(readFileSync(join(casesDir, file), 'utf8'))
  for (const k of ['file', 'title', 'primaryLevel', 'rules', 'description', 'objects', 'expected', 'expectedObjects']) {
    if (src[k] === undefined) fail(`${file}: 缺少 ${k}`)
  }
  if (!LEVELS.includes(src.primaryLevel)) fail(`${file}: primaryLevel 无效`)
  for (const l of LEVELS) if (typeof src.expected[l] !== 'string' || !src.expected[l]) fail(`${file}: expected.${l} 缺失`)
  for (const r of src.rules) if (!ruleIds.has(r)) fail(`${file}: 规则编号 ${r} 在 docs/standard 中不存在`)

  const objects = expandObjects(src.objects, file)
  const encoded = objects.map((o, i) => encode(o, `${src.file}#${i}`))
  // 损坏的对象：先按正常对象编码，再替换首字节，模拟文件中间被破坏（FILE-17）
  const intactEncoded = encoded.map(b => b)
  const corruptIndex = src.objects.findIndex(o => isPlainObject(o) && '$replaceFirstByte' in o)
  if (corruptIndex >= 0) {
    if (src.objects.filter(o => isPlainObject(o) && '$replaceFirstByte' in o).length > 1) fail(`${src.file}: 只支持一个损坏对象`)
    if (src.objects.slice(0, corruptIndex).some(o => isPlainObject(o) && '$preset' in o)) fail(`${src.file}: 损坏对象之前不支持 $preset`)
    const first = hexBytes(src.objects[corruptIndex].$replaceFirstByte, `${src.file}#${corruptIndex}`)
    if (first.length !== 1) fail(`${src.file}: $replaceFirstByte 必须是一个字节`)
    const bad = Buffer.from(encoded[corruptIndex])
    bad[0] = first[0]
    encoded[corruptIndex] = bad
  }
  let bytes = Buffer.concat(encoded)
  const lastStart = bytes.length - encoded.at(-1).length
  if (src.truncateBytes) {
    // 截断必须落在最后一个对象内部，模拟写入过程中崩溃
    if (!(src.truncateBytes > 0 && src.truncateBytes < encoded.at(-1).length)) fail(`${src.file}: truncateBytes 必须小于最后一个对象的长度`)
    bytes = bytes.subarray(0, bytes.length - src.truncateBytes)
  }

  // 自检：逐个对象重新解码
  const { objects: decoded, truncatedAt, corruptAt } = decodeStream(bytes)
  checkHeader(decoded[0]?.node, src.file)
  if (decoded.length !== src.expectedObjects) fail(`${src.file}: 解码出 ${decoded.length} 个完整对象，expectedObjects 为 ${src.expectedObjects}`)
  if (Boolean(src.truncateBytes) !== (truncatedAt !== null)) fail(`${src.file}: 截断状态与 truncateBytes 不符`)
  if (truncatedAt !== null && truncatedAt !== lastStart) fail(`${src.file}: 不完整对象的起点 ${truncatedAt} 不是最后一个对象的起点 ${lastStart}`)
  if ((corruptIndex >= 0) !== (corruptAt !== null)) fail(`${src.file}: 解码在 ${corruptAt} 处失败，与 $replaceFirstByte 声明不符`)
  if (corruptIndex >= 0) {
    const expectAt = encoded.slice(0, corruptIndex).reduce((n, b) => n + b.length, 0)
    if (corruptAt !== expectAt) fail(`${src.file}: 解码停在 ${corruptAt}，应停在损坏对象起点 ${expectAt}`)
    if (corruptIndex === encoded.length - 1) fail(`${src.file}: 损坏对象之后必须还有对象，才是“中间损坏”`)
  }
  // 语义检查使用未损坏的完整对象流，保证损坏位置之后的对象本身也是有效的
  const lintTarget = corruptIndex >= 0 ? decodeStream(Buffer.concat(intactEncoded)) : { objects: decoded }
  if (corruptIndex >= 0 && (lintTarget.truncatedAt !== null || lintTarget.corruptAt !== null)) fail(`${src.file}: 未损坏版本无法完整解码`)
  const deviations = lintStream(lintTarget.objects)
  const declared = src.deviations ?? []
  const missing = deviations.filter(d => !declared.includes(d))
  const extra = declared.filter(d => !deviations.includes(d))
  if (missing.length || extra.length) {
    fail(`${src.file}: 自检结果与声明的 deviations 不一致\n  未声明：\n    ${missing.join('\n    ') || '（无）'}\n  声明但未出现：\n    ${extra.join('\n    ') || '（无）'}`)
  }

  const entry = {
    file: src.file,
    title: src.title,
    primaryLevel: src.primaryLevel,
    rules: src.rules,
    description: src.description,
    expected: Object.fromEntries(LEVELS.map(l => [l, src.expected[l]])),
    expectedObjects: src.expectedObjects,
  }
  if (truncatedAt !== null) entry.validPrefixBytes = truncatedAt
  if (corruptAt !== null) {
    entry.validPrefixBytes = corruptAt
    entry.bytesAfterCorruption = bytes.length - corruptAt
  }
  if (declared.length) entry.deviations = declared
  Object.assign(entry, {
    size: bytes.length,
    sha256: sha256(bytes),
    objects: decoded.map(d => flatten(d.node)),
    hex: bytes.toString('hex'),
  })
  const outputs = [{ name: src.file, data: bytes }]
  const entries = [entry]

  if (src.extra) {
    const files = src.extra.entries.map(e => {
      const why = badResourcePath(e.path)
      if (why) fail(`${src.extra.file}: 条目 ${e.path} ${why}`)
      if (!SOURCES[e.source]) fail(`${src.extra.file}: 未知资源 ${e.source}`)
      return { ...e, data: SOURCES[e.source]() }
    }).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    if (new Set(files.map(f => f.path)).size !== files.length) fail(`${src.extra.file}: 条目路径重复（EXTRA-5）`)
    const zip = zipStored(files)
    outputs.push({ name: src.extra.file, data: zip })
    entries.push({
      file: src.extra.file,
      title: src.extra.title,
      description: src.extra.description,
      entries: files.map(f => ({ path: f.path, mimeType: f.mimeType, size: f.data.length, sha256: sha256(f.data) })),
      size: zip.length,
      sha256: sha256(zip),
      hex: zip.toString('hex'),
    })
  }
  return { outputs, entries }
}

function main() {
  assertBinaryAttributes()
  const ruleIds = definedRuleIds()
  const caseFiles = readdirSync(casesDir).filter(f => f.endsWith('.json')).sort()
  const outputs = []
  const fixtures = []
  for (const f of caseFiles) {
    const r = buildCase(f, ruleIds)
    outputs.push(...r.outputs)
    fixtures.push(...r.entries)
  }
  const names = outputs.map(o => o.name)
  if (new Set(names).size !== names.length) fail('输出文件名重复')

  const manifest = {
    format: 'UInk 1.1 Beta conformance fixtures',
    version: 11,
    generator: 'scripts/uink-fixtures/build.mjs（pnpm fixtures:uink），输入为 scripts/uink-fixtures/cases/*.json；重复运行输出逐字节一致',
    levels: { core: '核心级', basic: '基础级', standard: '标准级', full: '完整级', inkeys: '完整级 + Inkeys 附加级' },
    notes: [
      'expected 按等级描述读取器应有的显示结果。core、basic、standard、full 是未实现 Inkeys 附加级的读取器；inkeys 是完整级 + Inkeys 附加级的读取器。',
      'objects 是逐个对象解码后的可读内容：Ink 轨迹点保持文件中的写法（首点绝对坐标，其余为位移）；float32 写成能还原同一数值的最短十进制。',
      'deviations 列出样例故意偏离写入规则的地方（非规范但无损的数值编码、保留的枚举值、不完整的图形对象层），用来验证读取器的容错与回退；写入器不得模仿。',
      'validPrefixBytes 是截断或损坏样例中可读部分的结束偏移（不完整或无法解码的对象的起点），也就是 SAVE-22 的安全追加位置；bytesAfterCorruption 是损坏位置之后被放弃的字节数。',
    ],
    fixtures,
  }
  outputs.push({ name: 'fixtures.json', data: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8') })
  // 写 LF：GNU sha256sum -c 不接受 CRLF 行（.gitattributes 为样例目录的 SHA256SUMS.txt 单独设了 eol=lf）
  const sums = outputs.filter(o => o.name !== 'fixtures.json').map(o => `${sha256(o.data)}  ${o.name}`).sort((a, b) => (a.slice(66) < b.slice(66) ? -1 : 1))
  outputs.push({ name: 'SHA256SUMS.txt', data: Buffer.from(sums.map(l => `${l}\n`).join(''), 'ascii') })

  mkdirSync(outDir, { recursive: true })
  // 清理以前生成、现在已不存在的样例
  const keep = new Set(outputs.map(o => o.name))
  for (const f of readdirSync(outDir)) {
    if ((f.endsWith('.uink') || f.endsWith('.uink.extra')) && !keep.has(f)) unlinkSync(join(outDir, f))
  }
  for (const o of outputs) writeFileSync(join(outDir, o.name), o.data)
  console.log(`已生成 ${outputs.length} 个文件到 ${outDir}`)
  for (const e of fixtures) console.log(`  ${e.file.padEnd(32)} ${String(e.size).padStart(6)} B${e.expectedObjects !== undefined ? `  ${e.expectedObjects} 个对象` : ''}`)
}

try {
  main()
} catch (e) {
  if (e instanceof BuildError) {
    console.error(`生成失败：${e.message}`)
    process.exit(1)
  }
  throw e
}
