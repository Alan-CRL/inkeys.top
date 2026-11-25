"""Validate real exports, trim a shared toolbar canvas, and publish provenance last."""
from pathlib import Path
from PIL import Image
import argparse
import hashlib
import json
import os
import shutil
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--repository', type=Path, required=True)
parser.add_argument('--sources', type=Path, required=True)
parser.add_argument('--output', type=Path)
args = parser.parse_args()
sources = args.sources.resolve()
here = Path(__file__).resolve().parent
log = (sources / 'export.log').read_text()
if not log.rstrip().endswith('failures=0'):
    raise SystemExit('Exporter did not report a complete successful run.')
revision = subprocess.check_output(['git', '-C', str(args.repository), 'rev-parse', 'HEAD'], text=True).strip()

toolbar_ids = ['toolbar-draw', 'toolbar-pierce', 'toolbar-freeze', 'toolbar-whiteboard']
image_ids = toolbar_ids + ['ppt-page-1', 'ppt-page-2', 'ppt-page-3', 'board-page1', 'board-page2',
                          'board-blank', 'board-dots', 'board-grid', 'ink-circle', 'ink-underline']
sequences = {'toolbar-draw': 'toolbar-press', 'ppt-page-1': 'ppt-page-1-press',
             'ppt-page-2': 'ppt-page-2-press', 'ppt-page-3': 'ppt-page-3-press',
             'board-page1': 'board-page1-press', 'board-page2': 'board-page2-press',
             'ink-circle': 'ink-circle', 'ink-underline': 'ink-underline'}
toolbar_paths = [sources / f'{name}.png' for name in toolbar_ids]
toolbar_paths += [sources / 'toolbar-press' / f'{frame}.png' for frame in range(36)]
bounds = []
sizes = set()
for path in toolbar_paths:
    with Image.open(path) as im:
        im.load()
        sizes.add(im.size)
        bounds.append(im.getchannel('A').getbbox())
if len(sizes) != 1 or None in bounds:
    raise SystemExit('Toolbar states must share one nonempty native backing canvas.')
width, height = sizes.pop()
# 每个状态和每帧共用裁切窗口，禁止逐帧自动裁切导致锚点跳动。
crop = (max(0, min(b[0] for b in bounds) - 18), max(0, min(b[1] for b in bounds) - 18),
        min(width, max(b[2] for b in bounds) + 18), min(height, max(b[3] for b in bounds) + 18))
for path in toolbar_paths:
    with Image.open(path) as im:
        cropped = im.crop(crop)
    cropped.save(path)

assets = []
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

for name in image_ids:
    path = sources / f'{name}.png'
    with Image.open(path) as im:
        im.load()
        if im.mode != 'RGBA' or not im.getchannel('A').getbbox():
            raise SystemExit(f'Invalid RGBA native export: {path}')
        size = im.size
        bounds = im.getchannel('A').getbbox()
    renderer = 'Draw3 InkRenderer' if name.startswith('ink-') else 'WhiteboardVisual::DrawTheme' if name in ('board-blank', 'board-dots', 'board-grid') else 'UI3 BarPageSurface' if name.startswith(('ppt-', 'board-')) else 'UI3 BarRenderLoopCoordinator'
    asset = {'id': name, 'file': f'{name}.png', 'width': size[0], 'height': size[1],
             'kind': 'image', 'state': name, 'theme': 'dark' if renderer.startswith('UI3') else 'scene',
             'scale': 3 if renderer.startswith('UI3') else 1, 'renderer': renderer,
             'contentBounds': list(bounds), 'sha256': digest(path)}
    if name in sequences:
        paths = [sources / sequences[name] / f'{frame}.png' for frame in range(36)]
        frame_hashes = []
        for frame in paths:
            with Image.open(frame) as im:
                im.load()
                if im.size != size:
                    raise SystemExit(f'Sequence dimension mismatch: {frame}')
            frame_hashes.append(digest(frame))
        if len(set(frame_hashes)) < 8:
            raise SystemExit(f'Sequence lacks expected changing native pixels: {name}')
        asset.update({'frames': [p.relative_to(sources).as_posix() for p in paths],
                      'fps': 30, 'frameSha256': frame_hashes})
    assets.append(asset)

manifest = {'schemaVersion': 1, 'provenance': {
    'repository': str(args.repository.resolve()), 'revision': revision,
    'renderer': 'Production UI3 WARP/D2D + Draw3 WARP/HLSL, offscreen with no HWND',
    'command': 'INKEYS_FEATURE_MEDIA_OUTPUT=<output> Inkeys.exe --bar-eraser-offscreen-test',
    'build': 'InkeysRepo.sln Debug|ARM64; native ARM64 MSBuild',
    'adapterSha256': digest(here / 'FeatureMediaExport.inc'),
    'scope': 'Rendered fixture states and prescribed stroke samples; not a live Office/WPS COM end-to-end capture.',
    'animation': 'UI3 animation and edge lighting enabled explicitly; toolbar60Hz stepped/exported30fps; PageControl30Hz stepped; native easing preserved',
    'alpha': 'Premultiplied BGRA readback converted to straight-alpha PNG',
    'toolbarOriginalSize': [width, height], 'toolbarSharedCrop': list(crop),
    'penRgb': [45, 117, 230], 'language': 'zh-CN',
    'nativeExportFailures': 0,
}, 'assets': assets}
(sources / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
if args.output and args.output.resolve() != sources:
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    publish = []
    for asset in assets:
        publish += [asset['file']] + asset.get('frames', [])
    # 完成所有校验后才发布；manifest 最后替换，不让合成器消费未完成的采集。
    for file in publish + ['export.log', 'manifest.json']:
        destination = output / file
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_suffix(destination.suffix + '.tmp')
        shutil.copyfile(sources / file, temporary)
        os.replace(temporary, destination)
print(f'Validated {len(assets)} assets, {sum(len(a.get("frames", [])) for a in assets)} native frames; shared toolbar crop {crop}')
