import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.resolve(root, '../inkeys3-features/sources-redesign')
const checkOnly = process.argv.includes('--check')
if (process.argv.slice(2).some((arg) => arg !== '--check')) throw new Error('Usage: node scripts/prepare-assets.mjs [--check]')

const sha256 = (data) => createHash('sha256').update(data).digest('hex')
const manifestBytes = await readFile(path.join(source, 'manifest.json'))
const contractBytes = await readFile(path.join(source, 'asset-contract.json'))
const manifest = JSON.parse(manifestBytes)
const contract = JSON.parse(contractBytes)
if (manifest.contract !== 'inkeys3-feature-media-native-redesign' || manifest.schemaVersion !== 2) {
  throw new Error('Unexpected native manifest contract')
}
if (sha256(contractBytes) !== manifest.provenance.contractSha256 || manifest.provenance.nativeExportFailures !== 0) {
  throw new Error('Native contract hash or export status is invalid')
}
// 以下输入几何和按钮热点已按这版 fixture 核查；更新 exporter 后必须重新核对，不能静默套用旧坐标。
if (manifest.provenance.redesignAdapterSha256 !== 'db6f15b143155814001327475f4c5c6b12f3759a7de0813a9d0500264f0cce42') {
  throw new Error('Native fixture changed: review force geometry and toolbar hotspots before preparing assets')
}
const inputBytes = await readFile(path.join(source, 'export-events.jsonl'))
if (manifest.provenance.inputs.file !== 'export-events.jsonl' || sha256(inputBytes) !== manifest.provenance.inputs.sha256) {
  throw new Error('Native input-event hash mismatch')
}
const inputs = inputBytes.toString('utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line))
if (inputs.length !== manifest.provenance.inputs.eventCount) throw new Error('Native input-event count mismatch')
const inputEvents = new Map(inputs.map((event) => [`${event.asset}/${event.frame}`, event]))

// 只准备当前定格短片；软笔主栏只取静态帧，避免复制不使用的交互和其他七幕素材。
const selected = ['toolbar-draw', 'toolbar-freeze', 'toolbar-shape', 'force-solids', 'force-dashed']
const files = []
const assets = {}
let toolbarCanvas

async function verifyPng(file, expectedHash, width, height) {
  if (path.isAbsolute(file) || file.split(/[\\/]/).some((part) => part === '..')) throw new Error(`Unsafe native path: ${file}`)
  const data = await readFile(path.join(source, file))
  if (!/^[a-f0-9]{64}$/.test(expectedHash) || sha256(data) !== expectedHash) throw new Error(`Native SHA256 mismatch: ${file}`)
  // IHDR 验证与哈希联合保证使用原始 RGBA 画布，不在准备阶段裁切、重采样或重新编码。
  if (!data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      data.toString('ascii', 12, 16) !== 'IHDR' || data.readUInt32BE(16) !== width ||
      data.readUInt32BE(20) !== height || data[24] !== 8 || data[25] !== 6) {
    throw new Error(`Unexpected PNG dimensions/format: ${file}`)
  }
  files.push({ file, data, sha256: expectedHash })
}

function compactEvents(events) {
  const runs = []
  for (const event of events) {
    const { asset, frame, sha256: ignoredHash, ...state } = event
    const previous = runs.at(-1)
    if (previous && JSON.stringify(previous.state) === JSON.stringify(state)) previous.to = frame
    else runs.push({ from: frame, to: frame, state })
  }
  return runs
}

for (const id of selected) {
  const entry = manifest.assets.find((asset) => asset.id === id)
  const rule = contract.assets.find((asset) => asset.id === id)
  if (!entry || !rule || !entry.scenes.includes('screen-freeze')) throw new Error(`Missing native asset: ${id}`)
  if (entry.fps !== 60) throw new Error(`Expected 60fps native input: ${id}`)
  if (id.startsWith('toolbar-')) {
    const signature = JSON.stringify([entry.width, entry.height, entry.sharedCrop])
    toolbarCanvas ??= signature
    if (signature !== toolbarCanvas) throw new Error(`Toolbar canvas anchor changed: ${id}`)
    if (signature !== '[2738,286,[2952,1279,5690,1565]]') throw new Error(`Toolbar hotspot reference changed: ${id}`)
  } else if (entry.width !== 1440 || entry.height !== 720) throw new Error(`Drawing canvas changed: ${id}`)
  await verifyPng(entry.file, entry.sha256, entry.width, entry.height)
  const animated = id !== 'toolbar-draw'
  if (animated) {
    if (entry.frames.length !== rule.sequence.frames || entry.frameSha256.length !== entry.frames.length ||
        entry.frameEvents.length !== entry.frames.length) throw new Error(`Native frame count mismatch: ${id}`)
    for (let index = 0; index < entry.frames.length; index++) {
      const expectedPath = `${id}/${String(index).padStart(6, '0')}.png`
      const event = entry.frameEvents[index]
      if (entry.frames[index] !== expectedPath || event.frame !== index || event.asset !== id ||
          event.sha256 !== entry.frameSha256[index]) throw new Error(`Native event/frame mismatch: ${id}/${index}`)
      const sourceEvent = inputEvents.get(`${id}/${index}`)
      if (!sourceEvent || Object.entries(sourceEvent).some(([key, value]) => event[key] !== value)) {
        throw new Error(`Native event log disagrees with manifest: ${id}/${index}`)
      }
      await verifyPng(expectedPath, entry.frameSha256[index], entry.width, entry.height)
    }
    const commit = entry.frameEvents[rule.sequence.commitFrame]
    if (!commit.businessCommitted) throw new Error(`Native commit missing: ${id}`)
  }
  assets[id] = {
    file: `native/${entry.file}`,
    width: entry.width,
    height: entry.height,
    fps: entry.fps,
    frameCount: animated ? entry.frames.length : 0,
    sequencePath: animated ? `native/${id}/` : null,
    frameDigits: 6,
    contentBounds: entry.contentBounds,
    alphaBounds: entry.alphaBounds,
    ...(entry.sharedCrop ? { sharedCrop: entry.sharedCrop } : {}),
    ...(animated ? { events: compactEvents(entry.frameEvents) } : {}),
    cursorBakedIn: false,
  }
}

const metadata = {
  schemaVersion: 1,
  scene: 'screen-freeze',
  fps: 60,
  nativeCanvas: [1440, 720],
  assets,
  // 热点位于真实原生按压像素区域中央，坐标相对于保留透明边距的 2738×286 主栏画布。
  toolbar: {
    freezeHotspot: [2210, 196],
    shapeHotspot: [860, 140],
    hoverFrame: 0,
    downFrame: 24,
    commitFrame: 36,
    hoverEndFrame: 54,
    shapeKeepsFrozen: true,
  },
  geometry: {
    ball: [900, 260],
    mgEnd: [900, 420],
    tensionEnd: [824.82459, 207.361611],
    tangentEnd: [824.82459, 367.361611],
    radialEnd: [975.17541, 312.638389],
    thetaDegrees: 55,
    gravityLength: 160,
    tensionLength: 91.77222981616738,
    lineWidth: 4,
    colors: { mg: '#2D75E6', tension: '#20AFCF', tangent: '#E9A23B', dashed: '#E9A23B' },
    solidGestures: [
      { id: 'mg', start: 0, commit: 48 },
      { id: 'tension', start: 48, commit: 96 },
      { id: 'tangent', start: 96, commit: 144 },
    ],
    dashedGesture: { start: 0, commit: 84, path: ['ball', 'radialEnd', 'mgEnd', 'tangentEnd'], closesOnCommit: true },
  },
}
const provenance = {
  schemaVersion: 1,
  scene: 'screen-freeze',
  sourceManifest: 'media/inkeys3-features/sources-redesign/manifest.json',
  sourceManifestSha256: sha256(manifestBytes),
  sourceContractSha256: sha256(contractBytes),
  preparationSha256: sha256(await readFile(fileURLToPath(import.meta.url))),
  native: manifest.provenance,
  consumedAssets: selected,
  copiedFiles: files.map(({ file, sha256: hash, data }) => ({ file: `native/${file}`, sha256: hash, bytes: data.length })),
  boundaries: [
    'Production UI3/Draw3 pixels from deterministic offscreen fixtures; not a live end-to-end recording.',
    'Whole PNG files copied byte-for-byte; common toolbar crop and drawing canvas retained without per-frame trimming.',
    'Browser, pendulum, mathematical labels, editorial pointer, camera and timing belong to the Remotion compositor.',
    'Force PNG sequences contain production Shape preview/commit pixels but no baked Shape cursor. PenIcon is not used as a substitute.',
    'Toolbar shape selection was captured with Freeze already active; Freeze remains active after selecting Geometry.',
    'Ft is a tangential component of mg, not a third independent force. Dashed polygon closes when committed.',
  ],
}

if (!checkOnly) {
  // 所有来源先校验成功再写输出，缺失或损坏时不会混入未经验证的新帧。
  for (const { file, data } of files) {
    const output = path.join(root, 'public/native', file)
    await mkdir(path.dirname(output), { recursive: true })
    await writeFile(output, data)
  }
  await mkdir(path.join(root, 'src'), { recursive: true })
  await writeFile(path.join(root, 'src/native-assets.json'), `${JSON.stringify(metadata, null, 2)}\n`)
  await writeFile(path.join(root, 'public/native/provenance.json'), `${JSON.stringify(provenance, null, 2)}\n`)
}
const bytes = files.reduce((sum, file) => sum + file.data.length, 0)
console.log(`${checkOnly ? 'Verified' : 'Prepared'} ${selected.length} assets, ${files.length} RGBA PNG files, ${bytes} bytes; hashes, dimensions, event frames and shared anchors match.`)
