from pathlib import Path
from PIL import Image
import argparse
import hashlib
import json
import os
import shutil
import subprocess

REQUIRED_IDS = {
    'toolbar-draw', 'toolbar-pierce', 'toolbar-freeze', 'toolbar-shape',
    'toolbar-ppt', 'toolbar-ppt-shape', 'toolbar-whiteboard',
    'ppt-page-1', 'ppt-page-2', 'board-page1', 'board-page2',
    'board-blank', 'board-dots', 'board-grid', 'pen-icon-light',
    'pen-icon-dark', 'pendulum-mark', 'force-solids', 'force-dashed',
    'cuboid-solid', 'cuboid-dashed', 'cone-solid', 'cone-dashed',
    'binding-ink', 'ready-ink', 'laser-wave', 'board-page1-ink',
    'board-page2-ink',
}

parser = argparse.ArgumentParser()
parser.add_argument('--repository', type=Path, required=True)
parser.add_argument('--sources', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--contract', type=Path, required=True)
args = parser.parse_args()
sources = args.sources.resolve()
output = args.output.resolve()
contract_path = args.contract.resolve()
here = Path(__file__).resolve().parent
if output != (here / '../sources-redesign').resolve():
    raise SystemExit('Redesign exports may only publish to sources-redesign.')
if output == (here / '../sources').resolve():
    raise SystemExit('Refusing to overwrite legacy sources.')
contract = json.loads(contract_path.read_text(encoding='utf-8'))
if (output / 'asset-contract.json').exists():
    if (output / 'asset-contract.json').read_bytes() != contract_path.read_bytes():
        raise SystemExit('Published asset contract differs from the export input.')
if not (sources / 'export.log').read_text(encoding='utf-8').rstrip().endswith('failures=0'):
    raise SystemExit('Exporter did not report failures=0.')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def git(*arguments, check=True):
    return subprocess.run(
        ['git', '-C', str(args.repository), *arguments],
        text=True, capture_output=True, check=check,
    ).stdout.strip()


def load_rgba(path):
    with Image.open(path) as image:
        image.load()
        if image.mode != 'RGBA':
            raise SystemExit(f'Native export is not RGBA: {path}')
        return image.copy()


def alpha_bounds(image):
    return image.getchannel('A').getbbox()


def sequence_paths(asset):
    sequence = asset.get('sequence')
    if not sequence:
        return []
    return [sources / asset['id'] / f'{frame:06d}.png' for frame in range(sequence['frames'])]


def read_events():
    result = {}
    path = sources / 'export-events.jsonl'
    for line_number, line in enumerate(path.read_text(encoding='utf-8').splitlines(), 1):
        if not line.strip():
            continue
        event = json.loads(line)
        key = (event.get('asset'), event.get('frame'))
        if not isinstance(key[0], str) or not isinstance(key[1], int) or key in result:
            raise SystemExit(f'Invalid or duplicate native event at line {line_number}: {key}')
        result[key] = event
    return result


assets = contract['assets']
ids = [asset['id'] for asset in assets]
if len(ids) != len(set(ids)) or not REQUIRED_IDS.issubset(ids):
    raise SystemExit('Asset contract has duplicates or misses a required semantic ID.')
by_id = {asset['id']: asset for asset in assets}
events = read_events()
toolbar = [asset for asset in assets if asset['id'].startswith('toolbar-')]
toolbar_paths = []
for asset in toolbar:
    toolbar_paths.append(sources / f"{asset['id']}.png")
    toolbar_paths.extend(sequence_paths(asset))

sizes = set()
bounds = []
native_sizes = {}
for asset in toolbar:
    native_sizes[asset['id']] = set()
for path in toolbar_paths:
    image = load_rgba(path)
    sizes.add(image.size)
    native_sizes[path.stem if path.parent == sources else path.parent.name].add(image.size)
    box = alpha_bounds(image)
    if box is None:
        raise SystemExit(f'Toolbar backing canvas is empty: {path}')
    bounds.append(box)
previous_provenance = {}
previous_manifest = sources / 'manifest.json'
if previous_manifest.exists():
    previous_provenance = json.loads(previous_manifest.read_text(encoding='utf-8')).get('provenance', {})
recrop = True
if previous_provenance:
    previous_crop = previous_provenance['toolbarSharedCrop']
    previous_final_size = (previous_crop[2] - previous_crop[0], previous_crop[3] - previous_crop[1])
    if all(size == previous_final_size for size in sizes):
        original_width, original_height = previous_provenance['toolbarOriginalSize']
        crop = tuple(previous_crop)
        native_sizes = previous_provenance['toolbarNativeSizes']
        recrop = False
if recrop:
    original_width = max(size[0] for size in sizes)
    original_height = max(size[1] for size in sizes)
    crop = (
        max(0, min(box[0] for box in bounds) - 18),
        max(0, min(box[1] for box in bounds) - 18),
        min(original_width, max(box[2] for box in bounds) + 18),
        min(original_height, max(box[3] for box in bounds) + 18),
    )
    for path in toolbar_paths:
        with Image.open(path) as image:
            if image.size == (original_width, original_height):
                cropped = image.crop(crop)
            else:
                shared = Image.new('RGBA', (original_width, original_height), (0, 0, 0, 0))
                shared.paste(image, (0, 0))
                cropped = shared.crop(crop)
        cropped.save(path)

manifest_assets = []
all_frame_count = 0
for asset in assets:
    name = asset['id']
    static_path = sources / f'{name}.png'
    static = load_rgba(static_path)
    static_box = alpha_bounds(static)
    if static_box is None:
        raise SystemExit(f'Static native asset is transparent: {name}')
    frame_paths = sequence_paths(asset)
    frame_hashes = []
    frame_events = []
    alpha_union = None
    unique_hashes = set()
    transparent_frames = []
    for frame_index, path in enumerate(frame_paths):
        image = load_rgba(path)
        if image.size != static.size:
            raise SystemExit(f'Sequence dimension mismatch: {name} frame {frame_index}')
        box = alpha_bounds(image)
        if box is not None:
            alpha_union = box if alpha_union is None else (
                min(alpha_union[0], box[0]), min(alpha_union[1], box[1]),
                max(alpha_union[2], box[2]), max(alpha_union[3], box[3]),
            )
        else:
            transparent_frames.append(frame_index)
            if name != 'laser-wave' or frame_index < 179:
                raise SystemExit(f'Unexpected transparent native frame: {name} frame {frame_index}')
        frame_hash = digest(path)
        unique_hashes.add(frame_hash)
        frame_hashes.append(frame_hash)
        event = dict(events.get((name, frame_index), {}))
        if not event:
            raise SystemExit(f'Missing native input event: {name} frame {frame_index}')
        event['sha256'] = frame_hash
        frame_events.append(event)
    minimum_variation = 60 if name == 'laser-wave' else 8
    if frame_paths and len(unique_hashes) < minimum_variation:
        raise SystemExit(f'Sequence lacks real pixel variation: {name}')

    sequence = asset.get('sequence')
    if sequence:
        commit = sequence.get('commit')
        commit_frame = sequence.get('commitFrame')
        if commit and commit_frame is not None:
            for event in frame_events:
                frame = event['frame']
                expected = frame >= commit_frame
                if event.get('businessCommitted') is not expected:
                    raise SystemExit(f'Business commit timing mismatch: {name} frame {frame}')
        if name.startswith('ppt-page-'):
            for event in frame_events:
                expected_count = int(event['frame'] >= sequence['commitFrame'])
                if event.get('commandCount') != expected_count:
                    raise SystemExit(f'PPT Down policy or duplicate Up command: {name} frame {event["frame"]}')
        if 'CreationTransaction' in asset['renderer']:
            document_counts = [event.get('documentStrokes') for event in frame_events]
            if any(value is None for value in document_counts):
                raise SystemExit(f'Missing document provenance: {name}')
            if document_counts != sorted(document_counts) or document_counts[-1] < 1:
                raise SystemExit(f'Shape preview/commit document mismatch: {name}')
        if name == 'laser-wave':
            expected_phases = (
                ('Active', 0, 71), ('Hold', 72, 131),
                ('Fade', 132, 179), ('Inactive', 180, 191),
            )
            for phase, first, last in expected_phases:
                for frame in range(first, last + 1):
                    event = frame_events[frame]
                    if event.get('phase') != phase or event.get('contactId') != 1 or event.get('particles') is not False:
                        raise SystemExit(f'Laser lifecycle mismatch at frame {frame}: {event}')
                    opacity = event.get('opacity')
                    if phase in ('Active', 'Hold') and opacity != 1.0:
                        raise SystemExit(f'Laser is not fully bright during {phase}: frame {frame}')
                    if phase == 'Inactive' and opacity != 0.0:
                        raise SystemExit(f'Laser persists after fade: frame {frame}')
            fade = [frame_events[frame]['opacity'] for frame in range(132, 180)]
            if fade[0] != 1.0 or any(not 0.0 < value < 1.0 for value in fade[1:]):
                raise SystemExit('Laser Fade endpoints do not match the real 0.8s lifecycle.')
            if any(a < b for a, b in zip(fade, fade[1:])):
                raise SystemExit('Laser Fade is not a real monotonic 0.8s decay.')

    entry = {
        'id': name,
        'file': static_path.name,
        'kind': 'image',
        'renderer': asset['renderer'],
        'scenes': asset['scenes'],
        'width': static.width,
        'height': static.height,
        'scale': asset.get('scale', 3 if name.startswith('toolbar-') or name in {
            'ppt-page-1', 'ppt-page-2', 'board-page1', 'board-page2',
            'pen-icon-light', 'pen-icon-dark',
        } else 1),
        'contentBounds': list(static_box),
        'alphaBounds': list(alpha_union) if alpha_union else None,
        'sha256': digest(static_path),
    }
    for key in ('pixelScope', 'hotspot', 'visualAdjustment', 'requiredAdditionalId', 'physics'):
        if key in asset:
            entry[key] = asset[key]
    if name.startswith('toolbar-'):
        entry['sharedCrop'] = list(crop)
    if frame_paths:
        entry.update({
            'fps': 60,
            'frames': [path.relative_to(sources).as_posix() for path in frame_paths],
            'frameSha256': frame_hashes,
            'frameEvents': frame_events,
        })
        if name == 'laser-wave':
            entry['quantizedTransparentTailFrames'] = [frame for frame in transparent_frames if frame < 180]
    manifest_assets.append(entry)
    all_frame_count += len(frame_paths)

hash_by_key = {}
for asset in manifest_assets:
    for index, frame_hash in enumerate(asset.get('frameSha256', [])):
        hash_by_key[(asset['id'], index)] = frame_hash
published_events = []
for (name, frame), event in events.items():
    if (name, frame) not in hash_by_key:
        raise SystemExit(f'Native event has no canonical frame hash: {name} frame {frame}')
    enriched = dict(event)
    enriched['sha256'] = hash_by_key[(name, frame)]
    published_events.append(enriched)
if len(published_events) != all_frame_count:
    raise SystemExit('Native input event count differs from sequence frame count.')
events_path = sources / 'export-events.jsonl'
events_path.write_text(
    ''.join(json.dumps(event, ensure_ascii=False, separators=(',', ':')) + '\n' for event in published_events),
    encoding='utf-8',
)
events_log_hash = digest(events_path)
sequence_asset_count = sum(bool(asset.get('frames')) for asset in manifest_assets)
inputs_summary = {
    'file': 'export-events.jsonl',
    'format': 'jsonl',
    'sha256': events_log_hash,
    'eventCount': len(published_events),
    'chronology': 'native export order',
    'inputPolicy': contract['inputPolicy'],
}
frame_numbers_summary = {
    'fps': 60,
    'totalFrames': all_frame_count,
    'perAsset': {asset['id']: len(asset.get('frames', [])) for asset in manifest_assets},
}
frame_sha256_summary = {
    'algorithm': 'SHA-256',
    'coverage': {'sequenceAssets': sequence_asset_count, 'frames': all_frame_count},
    'canonical': 'assets[*].frameSha256',
    'mirrors': ['assets[*].frameEvents[*].sha256', 'export-events.jsonl[*].sha256'],
    'eventLog': {'file': 'export-events.jsonl', 'sha256': events_log_hash},
    'relationship': 'Canonical per-frame hashes live in assets[*].frameSha256; frameEvents and export-events.jsonl mirror exactly those values. This root object is a structured summary, not a second hash list.',
}
revision = git('rev-parse', 'HEAD')
source_branch = git('name-rev', '--name-only', 'HEAD')
worktree_lines = git('status', '--porcelain=v1')
provenance = {
    'repository': str(args.repository.resolve()),
    'revision': revision,
    'branch': source_branch,
    'headMode': 'detached',
    'worktreeStatus': 'clean' if not worktree_lines else worktree_lines.splitlines(),
    'renderer': 'Production UI3 WARP/D2D + Draw3 WARP/HLSL, offscreen with no HWND',
    'command': 'INKEYS_FEATURE_MEDIA_REDESIGN=1 INKEYS_FEATURE_MEDIA_OUTPUT=<output> Inkeys.exe --bar-eraser-offscreen-test',
    'build': 'InkeysRepo.sln Debug|ARM64; native ARM64 MSBuild',
    'adapterSha256': digest(here / 'FeatureMediaExport.inc'),
    'redesignAdapterSha256': digest(here / 'FeatureMediaRedesign.inc'),
    'installAdapterSha256': digest(here / 'install-adapter.py'),
    'contractSha256': digest(contract_path),
    'alpha': 'Premultiplied BGRA readback converted once to straight-alpha RGBA PNG',
    'toolbarOriginalSize': [original_width, original_height],
    'toolbarNativeSizes': {name: sorted(sizes) for name, sizes in native_sizes.items()},
    'toolbarPadding': 'Transparent right/bottom padding at native (0,0) before one shared crop; no per-frame recentering',
    'toolbarSharedCrop': list(crop),
    'language': 'zh-CN',
    'sequenceFps': 60,
    'scope': 'Scripted fixture inputs through production renderers; no live Office/WPS/COM end-to-end claim.',
    'visualAdjustments': [
        'UI3 dark theme, 3x capture, animation and edge lighting are explicit isolated fixture inputs.',
        'pen-icon-light uses a graphite outline and pen-icon-dark uses a contrast outline as harness/editorial treatment; neither is a user configuration.',
        'Three Whiteboard themes are separate native images; diagonal split and transitions belong to the compositor, not native Whiteboard.',
    ],
    'configuration': 'isolated runtime-config below the unique native capture directory; no user configuration read or write',
    'nativeExportFailures': 0,
    'inputs': inputs_summary,
    'frameNumbers': frame_numbers_summary,
    'frameSha256': frame_sha256_summary,
}
manifest = {
    'schemaVersion': 2,
    'contract': contract['contract'],
    'provenance': provenance,
    'verification': {
        'assetCount': len(manifest_assets),
        'sequenceFrameCount': all_frame_count,
        'failures': 0,
    },
    'assets': manifest_assets,
}
manifest_path = sources / 'manifest.json'
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

output.mkdir(parents=True, exist_ok=True)
publish = []
for asset in manifest_assets:
    publish.append(asset['file'])
    publish.extend(asset.get('frames', []))
for relative in publish + ['export.log', 'export-events.jsonl']:
    destination = output / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(destination.suffix + '.tmp')
    shutil.copyfile(sources / relative, temporary)
    os.replace(temporary, destination)
if contract_path != output / 'asset-contract.json':
    shutil.copyfile(contract_path, output / 'asset-contract.json.tmp')
    os.replace(output / 'asset-contract.json.tmp', output / 'asset-contract.json')
shutil.copyfile(manifest_path, output / 'manifest.json.tmp')
os.replace(output / 'manifest.json.tmp', output / 'manifest.json')
print(f'Validated {len(manifest_assets)} redesign assets and {all_frame_count} 60fps frames; failures=0; shared toolbar crop={crop}')
