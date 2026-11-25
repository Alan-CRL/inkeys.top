from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
import argparse
import hashlib
import json
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--sources', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
sources = args.sources.resolve()
output = args.output.resolve()
here = Path(__file__).resolve().parent
if sources != (here / '../sources-redesign').resolve():
    raise SystemExit('Validation expects the published sources-redesign directory.')
if output != (here / '../build/native-redesign').resolve():
    raise SystemExit('Validation previews belong in build/native-redesign.')
output.mkdir(parents=True, exist_ok=True)
manifest = json.loads((sources / 'manifest.json').read_text(encoding='utf-8'))
contract_path = sources / 'asset-contract.json'
if manifest.get('schemaVersion') != 2 or manifest['verification']['failures'] != 0:
    raise SystemExit('Invalid redesign manifest status.')
if len(manifest['assets']) != 29 or manifest['verification']['assetCount'] != 29:
    raise SystemExit('Expected 29 native assets, including the separate Whiteboard Laser toolbar.')
if manifest['verification']['sequenceFrameCount'] != 2100:
    raise SystemExit('Expected exactly 2100 60fps native sequence frames.')
if hashlib.sha256(contract_path.read_bytes()).hexdigest() != manifest['provenance']['contractSha256']:
    raise SystemExit('Asset contract hash differs from provenance.')
provenance = manifest['provenance']
repository = Path(provenance['repository'])


def git_output(*arguments):
    return subprocess.run(
        ['git', '-C', str(repository), *arguments],
        text=True, capture_output=True, check=True,
    ).stdout.strip()


revision = git_output('rev-parse', 'HEAD')
if revision != provenance['revision'] or revision != 'd060e39bca3673a9cb25da44b7e5a4534e32d038':
    raise SystemExit('Native revision does not match the required feature/shape baseline.')
if git_output('name-rev', '--name-only', 'HEAD') != provenance['branch']:
    raise SystemExit('Native branch provenance mismatch.')
if subprocess.run(['git', '-C', str(repository), 'symbolic-ref', '-q', 'HEAD'], capture_output=True).returncode == 0:
    raise SystemExit('Expected a detached native media worktree.')
worktree = git_output('status', '--porcelain=v1')
expected_worktree = '' if provenance['worktreeStatus'] == 'clean' else '\n'.join(provenance['worktreeStatus'])
if worktree != expected_worktree:
    raise SystemExit('Native worktree changed after adapter restoration or was not restored.')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path, expected_size=None):
    with Image.open(path) as image:
        image.load()
        if image.mode != 'RGBA':
            raise SystemExit(f'Not RGBA: {path}')
        if expected_size and image.size != expected_size:
            raise SystemExit(f'Dimension mismatch: {path}: {image.size} != {expected_size}')
        result = image.copy()
    alpha = result.getchannel('A')
    transparent = alpha.point(lambda value: 255 if value == 0 else 0)
    for channel in result.split()[:3]:
        if ImageChops.multiply(channel, transparent).getbbox():
            raise SystemExit(f'Nonzero RGB below fully transparent pixels: {path}')
    return result


def straight_alpha_evidence(image):
    count = 0
    for red, green, blue, alpha in image.getdata():
        if alpha and max(red, green, blue) > alpha:
            count += 1
    return count


inputs = provenance.get('inputs', {})
if inputs.get('file') != 'export-events.jsonl' or not (sources / inputs['file']).is_file():
    raise SystemExit('Published native input event log is missing.')
if inputs.get('sha256') != digest(sources / inputs['file']):
    raise SystemExit('Native input event log hash differs from manifest.')
if inputs.get('inputPolicy') != json.loads(contract_path.read_text(encoding='utf-8'))['inputPolicy']:
    raise SystemExit('Native input policy differs from the authoritative contract.')
published_events = [json.loads(line) for line in (sources / inputs['file']).read_text(encoding='utf-8').splitlines() if line.strip()]
if len(published_events) != 2100 or inputs.get('eventCount') != len(published_events):
    raise SystemExit('Native input event count does not cover all sequence frames.')
event_map = {}
for event in published_events:
    key = (event.get('asset'), event.get('frame'))
    if key in event_map:
        raise SystemExit(f'Duplicate native input event: {key}')
    event_map[key] = event
frame_numbers = provenance.get('frameNumbers', {})
expected_per_asset = {asset['id']: len(asset.get('frames', [])) for asset in manifest['assets']}
if frame_numbers.get('fps') != 60 or frame_numbers.get('totalFrames') != 2100:
    raise SystemExit('Root frameNumbers summary has incorrect fps or total frames.')
if frame_numbers.get('perAsset') != expected_per_asset:
    raise SystemExit('Root frameNumbers summary differs from actual per-asset frame counts.')
frame_sha256 = provenance.get('frameSha256', {})
if frame_sha256.get('algorithm') != 'SHA-256' or frame_sha256.get('canonical') != 'assets[*].frameSha256':
    raise SystemExit('Root frameSha256 summary has incorrect algorithm or canonical source.')
expected_coverage = {'sequenceAssets': sum(bool(asset.get('frames')) for asset in manifest['assets']), 'frames': 2100}
if frame_sha256.get('coverage') != expected_coverage:
    raise SystemExit('Root frameSha256 coverage differs from actual sequences.')
if frame_sha256.get('eventLog') != {'file': inputs['file'], 'sha256': inputs['sha256']}:
    raise SystemExit('frameSha256 event-log summary differs from inputs.')
if set(frame_sha256.get('mirrors', [])) != {'assets[*].frameEvents[*].sha256', 'export-events.jsonl[*].sha256'}:
    raise SystemExit('frameSha256 does not declare both authoritative mirrors.')
if not frame_sha256.get('relationship'):
    raise SystemExit('frameSha256 canonical/mirror relationship is missing.')

checked_frames = 0
for asset in manifest['assets']:
    static_path = sources / asset['file']
    static = load(static_path, (asset['width'], asset['height']))
    if digest(static_path) != asset['sha256']:
        raise SystemExit(f'Static hash mismatch: {asset["id"]}')
    static_bounds = static.getchannel('A').getbbox()
    if not static_bounds:
        raise SystemExit(f'Empty static asset: {asset["id"]}')
    if list(static_bounds) != asset['contentBounds']:
        raise SystemExit(f'Static alpha bounds mismatch: {asset["id"]}')
    if asset['id'].startswith('toolbar-') and asset['sharedCrop'] != provenance['toolbarSharedCrop']:
        raise SystemExit(f'Toolbar shared crop mismatch: {asset["id"]}')
    frames = asset.get('frames', [])
    if frames and asset.get('fps') != 60:
        raise SystemExit(f'Non-60fps native sequence: {asset["id"]}')
    alpha_union = None
    for index, relative in enumerate(frames):
        path = sources / relative
        image = load(path, static.size)
        box = image.getchannel('A').getbbox()
        if box:
            alpha_union = box if alpha_union is None else (
                min(alpha_union[0], box[0]), min(alpha_union[1], box[1]),
                max(alpha_union[2], box[2]), max(alpha_union[3], box[3]),
            )
        if digest(path) != asset['frameSha256'][index]:
            raise SystemExit(f'Frame hash mismatch: {asset["id"]} frame {index}')
        event = asset['frameEvents'][index]
        if event['frame'] != index or event['sha256'] != asset['frameSha256'][index]:
            raise SystemExit(f'Frame provenance mismatch: {asset["id"]} frame {index}')
        log_event = event_map.get((asset['id'], index))
        if log_event != event:
            raise SystemExit(f'Event log/asset provenance mismatch: {asset["id"]} frame {index}')
        checked_frames += 1
    if frames and (list(alpha_union) if alpha_union else None) != asset['alphaBounds']:
        raise SystemExit(f'Shared sequence alpha bounds mismatch: {asset["id"]}')
    if frames and len(set(asset['frameSha256'])) < (60 if asset['id'] == 'laser-wave' else 8):
        raise SystemExit(f'Insufficient real sequence variation: {asset["id"]}')

for name in ('pen-icon-light', 'pen-icon-dark', 'force-dashed', 'cone-dashed', 'laser-wave'):
    asset = next(item for item in manifest['assets'] if item['id'] == name)
    evidence = straight_alpha_evidence(load(sources / asset['file']))
    if evidence <= 0:
        raise SystemExit(f'No straight-alpha edge evidence in representative native asset: {name}')

for name in ('force-solids', 'force-dashed'):
    physics = next(item for item in manifest['assets'] if item['id'] == name)['physics']
    if physics['mg'] != 160 or physics['thetaDegrees'] != 55 or physics['tensionLength'] != 91.77222981616738:
        raise SystemExit(f'Force geometry provenance mismatch: {name}')

laser = next(item for item in manifest['assets'] if item['id'] == 'laser-wave')
if laser['frameSha256'][72] != laser['frameSha256'][131]:
    raise SystemExit('Laser Hold is not a stable full-brightness interval.')
for first, last in ((0, 71), (72, 131), (132, 179), (180, 191)):
    for frame in range(first, last + 1):
        image = load(sources / laser['frames'][frame], (laser['width'], laser['height']))
        visible = bool(image.getchannel('A').getbbox())
        if frame < 179 and not visible:
            raise SystemExit(f'Laser alpha disappeared too early at frame {frame}')
        if frame >= 180 and visible:
            raise SystemExit(f'Laser alpha persists after Fade at frame {frame}')
for frame in range(180, 192):
    if load(sources / laser['frames'][frame]).getchannel('A').getbbox():
        raise SystemExit('Laser did not disappear before the editorial transition.')

representatives = [
    ('toolbar-ppt', None), ('toolbar-freeze', None), ('toolbar-ppt-shape', None),
    ('toolbar-whiteboard-laser', None), ('pen-icon-light', None), ('pen-icon-dark', None),
    ('force-dashed', 42), ('force-dashed', None), ('cuboid-dashed', 42), ('cuboid-dashed', None),
    ('cone-dashed', 42), ('cone-dashed', None),
    ('laser-wave', 71), ('laser-wave', 131), ('laser-wave', 155), ('laser-wave', 180),
]
by_id = {asset['id']: asset for asset in manifest['assets']}
tile_width, tile_height = 480, 270
sheet = Image.new('RGB', (tile_width * 4, tile_height * 4), '#E8E8E8')
draw = ImageDraw.Draw(sheet)
for index, (name, frame) in enumerate(representatives):
    asset = by_id[name]
    path = sources / (asset['file'] if frame is None else asset['frames'][frame])
    image = load(path, (asset['width'], asset['height']))
    x = (index % 4) * tile_width
    y = (index // 4) * tile_height
    background = '#202624' if name == 'pen-icon-dark' else '#F7F7F5'
    tile = Image.new('RGBA', (tile_width, tile_height), background)
    image.thumbnail((tile_width - 20, tile_height - 38), Image.Resampling.LANCZOS)
    tile.alpha_composite(image, ((tile_width - image.width) // 2, 24 + (tile_height - 30 - image.height) // 2))
    sheet.paste(tile.convert('RGB'), (x, y))
    label = name if frame is None else f'{name} #{frame}'
    draw.text((x + 8, y + 6), label, fill='#111111')
sheet.save(output / 'representative-contact-sheet.png')
summary = {
    'schemaVersion': 1,
    'failures': 0,
    'assets': len(manifest['assets']),
    'sequenceFrames': checked_frames,
    'revision': manifest['provenance']['revision'],
    'branch': manifest['provenance']['branch'],
    'straightAlphaRepresentatives': ['pen-icon-light', 'pen-icon-dark', 'force-dashed', 'cone-dashed', 'laser-wave'],
    'laser': {'holdFrames': 60, 'fadeFrames': 48, 'inactiveFrames': 12, 'particles': False,
              'quantizedTransparentTailFrames': laser.get('quantizedTransparentTailFrames', [])},
    'contactSheet': 'representative-contact-sheet.png',
}
(output / 'validation.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Native redesign validation passed: assets={len(manifest["assets"])}, frames={checked_frames}, failures=0')
