"""Decode exported v2 films, verify timing/dimensions, and hash final files."""

import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess

from PIL import Image, ImageSequence

from render import DEFAULT_OUTPUT, PUBLIC, REQUIRED_SCENES, load_plan, locate_ffmpeg


def verify(output, ffmpeg, require_complete=False):
    output = output.resolve()
    plan = load_plan()
    expected_scenes = {scene['id']: scene for scene in plan['scenes']}
    manifest = json.loads((output / 'manifest.json').read_text(encoding='utf-8'))
    if manifest['schemaVersion'] != 1 or not manifest['scenes']:
        raise ValueError('Expected at least one exported scene record')
    identifiers = {scene['id'] for scene in manifest['scenes']}
    if not identifiers <= REQUIRED_SCENES:
        raise ValueError('Scene IDs do not match the web contract')
    require_complete = require_complete or output == PUBLIC.resolve()
    if require_complete and identifiers != REQUIRED_SCENES:
        raise ValueError('Formal output requires all eight finalized scenes')
    records = []
    for scene in manifest['scenes']:
        if scene['durationMs'] != expected_scenes[scene['id']]['durationMs'] or scene.get('fps', 60) != 60:
            raise ValueError(f'Manifest timing mismatch: {scene["id"]}')
        required = ['video', 'mobileVideo', 'poster', 'mobilePoster']
        optional = ['firstFrame', 'lastFrame', 'mobileFirstFrame', 'mobileLastFrame', 'gif']
        fields = required + optional if require_complete else required + [field for field in optional if field in scene]
        for field in fields:
            if field not in scene:
                raise ValueError(f'Missing complete-output field: {scene["id"]}/{field}')
            reference = scene[field]
            if not reference.startswith('/feature-media/'):
                raise ValueError(f'Unexpected media URL: {reference}')
            relative = reference.removeprefix('/feature-media/')
            path = (output / relative).resolve()
            if not path.is_relative_to(output) or not path.is_file():
                raise ValueError(f'Missing or invalid media path: {reference}')
            record = {
                'scene': scene['id'], 'kind': field, 'file': relative, 'bytes': path.stat().st_size,
                'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            }
            mobile = field.startswith('mobile')
            expected_size = (720, 720) if mobile else (960, 426) if field == 'gif' else (1440, 640)
            if field in ('video', 'mobileVideo'):
                result = subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-i', str(path),
                                         '-map', '0:v:0', '-f', 'framemd5', '-'], capture_output=True,
                                        text=True, check=True, timeout=180)
                dimensions = re.search(r'#dimensions\s+0:\s+(\d+)x(\d+)', result.stdout)
                time_base = re.search(r'#tb\s+0:\s+(\d+)/(\d+)', result.stdout)
                frames = [line.split(',') for line in result.stdout.splitlines() if line and not line.startswith('#')]
                if not dimensions or not time_base or not frames:
                    raise ValueError(f'Cannot decode video metadata: {relative}')
                size = tuple(map(int, dimensions.groups()))
                numerator, denominator = map(int, time_base.groups())
                duration = round((int(frames[-1][2]) + int(frames[-1][3])) * numerator / denominator * 1000)
                expected_frames = round(scene['durationMs'] * 60 / 1000)
                if len(frames) != expected_frames or abs(duration - scene['durationMs']) > 1:
                    raise ValueError(f'Video timing mismatch: {relative}, {len(frames)} frames / {duration}ms')
                measured_fps = len(frames) * 1000 / duration
                if abs(measured_fps - 60) > 0.01:
                    raise ValueError(f'Video fps mismatch: {relative}, {measured_fps}')
                record.update(frames=len(frames), durationMs=duration, fps=measured_fps)
            else:
                with Image.open(path) as image:
                    size = image.size
                    if field == 'gif':
                        duration = sum(frame.info.get('duration', 0) for frame in ImageSequence.Iterator(image))
                        expected_frames = round(scene['durationMs'] * 15 / 1000)
                        if duration != scene['durationMs'] or image.info.get('loop') != 0 or image.n_frames != expected_frames:
                            raise ValueError(f'GIF timing/loop mismatch: {relative}, {duration}ms / {image.n_frames} frames')
                        record.update(frames=image.n_frames, durationMs=duration, fps=15, loop=0)
            if size != expected_size:
                raise ValueError(f'Unexpected size: {relative}: {size}')
            record.update(width=size[0], height=size[1])
            records.append(record)
    report = {
        'schemaVersion': 2,
        'complete': identifiers == REQUIRED_SCENES,
        'scenes': [scene['id'] for scene in manifest['scenes']],
        'files': records,
        'totalBytes': sum(item['bytes'] for item in records),
        'checks': 'Every referenced MP4 was fully decoded; 60fps frame counts/durations, poster and boundary-frame sizes, present GIF 15fps timing/loops, and final-file SHA256 were verified.',
    }
    (output / 'verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument('--ffmpeg')
    parser.add_argument('--require-complete', action='store_true')
    args = parser.parse_args()
    report = verify(args.output, locate_ffmpeg(args.ffmpeg), args.require_complete)
    print(f'Verified {len(report["scenes"])} scenes / {len(report["files"])} media files / {report["totalBytes"]:,} bytes; complete={report["complete"]}')


if __name__ == '__main__':
    main()
