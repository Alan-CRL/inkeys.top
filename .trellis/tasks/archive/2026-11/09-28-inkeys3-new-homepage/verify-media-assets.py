"""Review delivered media against the reusable scene plan and native hashes."""

import hashlib
import json
from pathlib import Path
import subprocess
import sys

from PIL import Image, ImageSequence


root = Path(__file__).resolve().parent
while not (root / 'package.json').is_file():
    root = root.parent
template = root / 'media/inkeys3-features'
public = root / 'docs/.vuepress/public'
output = public / 'feature-media'
plan = json.loads((template / 'storyboard.json').read_text(encoding='utf-8-sig'))
manifest = json.loads((output / 'manifest.json').read_text(encoding='utf-8-sig'))
native = json.loads((template / 'sources/manifest.json').read_text(encoding='utf-8-sig'))
provenance = json.loads((output / 'provenance.json').read_text(encoding='utf-8-sig'))
sys.path.insert(0, str(template))
from render import locate_ffmpeg

ffmpeg = locate_ffmpeg(None)

assert manifest['schemaVersion'] == native['schemaVersion'] == provenance['schemaVersion'] == 1
expected = {scene['id'] for scene in plan['scenes']}
assert len(manifest['scenes']) == len(expected) == 8
assert {scene['id'] for scene in manifest['scenes']} == expected
assert provenance['storyboardSha256'] == hashlib.sha256((template / 'storyboard.json').read_bytes()).hexdigest()
assert provenance['native'] == native['provenance']

def local_media(value):
    assert value.startswith('/feature-media/'), value
    path = (public / value.lstrip('/')).resolve()
    assert path.is_relative_to(output.resolve()) and path.is_file(), value
    assert path.stat().st_size > 0, value
    return path


for scene in manifest['scenes']:
    assert scene['durationMs'] == plan['durationMs']
    for field, profile in (('video', 'desktop'), ('mobileVideo', 'mobile')):
        path = local_media(scene[field])
        assert path.read_bytes()[4:8] == b'ftyp', path
        decoded = subprocess.run([ffmpeg, '-nostdin', '-hide_banner', '-loglevel', 'error',
                                  '-i', str(path), '-map', '0:v:0', '-f', 'framemd5', '-'],
                                 capture_output=True, text=True, check=True, timeout=120)
        frames = [line for line in decoded.stdout.splitlines() if line and not line.startswith('#')]
        assert len(frames) == round(scene['durationMs'] * plan['fps'] / 1000), path
        dimensions = plan['profiles'][profile]
        assert f"{dimensions['width']}x{dimensions['height']}" in decoded.stdout, path
    for field, profile in (('poster', 'desktop'), ('mobilePoster', 'mobile')):
        with Image.open(local_media(scene[field])) as image:
            image.load()
            dimensions = plan['profiles'][profile]
            assert image.size == (dimensions['width'], dimensions['height'])
    with Image.open(local_media(scene['gif'])) as image:
        dimensions = plan['profiles']['readme']
        assert image.size == (dimensions['width'], dimensions['height'])
        duration = sum(frame.info['duration'] for frame in ImageSequence.Iterator(image))
        assert duration == scene['durationMs'], (scene['id'], duration)
        assert image.n_frames > 1
    print(f"Verified delivered files: {scene['id']}", flush=True)

asset_ids = set()
frames = 0
for asset in native['assets']:
    asset_ids.add(asset['id'])
    paths = [asset['file'], *asset.get('frames', [])]
    hashes = [asset['sha256'], *asset.get('frameSha256', [])]
    assert len(paths) == len(hashes)
    for name, digest in zip(paths, hashes):
        path = (template / 'sources' / name).resolve()
        assert path.is_relative_to((template / 'sources').resolve())
        assert hashlib.sha256(path.read_bytes()).hexdigest() == digest, name
        with Image.open(path) as image:
            image.load()
            assert image.mode == 'RGBA'
            assert image.size == (asset['width'], asset['height'])
    frames += len(asset.get('frames', []))

assert set(provenance['sources']).issubset(asset_ids)
assert {key for scene in plan['scenes'] for key in scene['required']}.issubset(asset_ids)
print(f'PASS: 8 scene IDs; 16 MP4 complete decodes; 16 poster dimensions; 8 GIF timelines; native provenance and {len(asset_ids)} assets / {frames} frame hashes')
