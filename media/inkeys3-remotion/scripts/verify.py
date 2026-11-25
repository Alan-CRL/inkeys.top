"""Decode the delivered film, package web assets, and optionally promote this scene only."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess

from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'out'
BUILD = ROOT / 'build'
PUBLIC = ROOT.parents[1] / 'docs/.vuepress/public/feature-media'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    # 公开 manifest 继续保持既有编码和换行，不产生整文件格式 diff。
    original = path.read_bytes() if path.exists() else b''
    newline = '\r\n' if b'\r\n' in original else '\n'
    bom = b'\xef\xbb\xbf' if original.startswith(b'\xef\xbb\xbf') else b''
    path.write_bytes(bom + (json.dumps(value, ensure_ascii=False, indent=2) + '\n').replace('\n', newline).encode('utf-8'))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--publish', action='store_true')
    parser.add_argument('--ffmpeg')
    parser.add_argument('--ffprobe')
    args = parser.parse_args()
    compositor = ROOT / 'node_modules/.pnpm/@remotion+compositor-win32-x64-msvc@4.0.534/node_modules/@remotion/compositor-win32-x64-msvc'
    # Remotion 自带 FFmpeg 不包含 select/palettegen，验收复用完整媒体工具链。
    ffmpeg = args.ffmpeg or os.environ.get('FFMPEG_BIN') or shutil.which('ffmpeg')
    if not ffmpeg:
        raise RuntimeError('Set FFMPEG_BIN or --ffmpeg to a full FFmpeg build with select/palettegen filters (see README).')
    ffprobe = args.ffprobe or os.environ.get('FFPROBE_BIN') or str(compositor / 'ffprobe.exe')

    def run(command):
        result = subprocess.run(command, capture_output=True, timeout=300, creationflags=0x08000000 if os.name == 'nt' else 0)
        if result.returncode:
            raise RuntimeError(f'Exit {result.returncode}: {command[0]}\n{result.stderr.decode("utf-8", errors="replace")}')
        return result.stdout

    files = []
    evidence = BUILD / 'decoded'
    evidence.mkdir(parents=True, exist_ok=True)

    for name, width, height in [('screen-freeze', 1440, 640), ('screen-freeze-mobile', 720, 720)]:
        video = OUT / f'{name}.mp4'
        metadata = json.loads(run([ffprobe, '-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', str(video)]))
        streams = metadata['streams']
        assert len(streams) == 1 and streams[0]['codec_type'] == 'video', 'Film must be silent'
        stream = streams[0]
        assert stream['codec_name'] == 'h264' and stream['pix_fmt'] == 'yuv420p'
        assert (stream['width'], stream['height']) == (width, height)
        assert stream['avg_frame_rate'] == '60/1' and int(stream['nb_read_frames']) == 840
        assert abs(float(metadata['format']['duration']) - 14) < 0.02
        run([ffmpeg, '-v', 'error', '-xerror', '-i', str(video), '-c:v', 'rawvideo', '-f', 'null', '-'])
        files.append({'file': video.name, 'bytes': video.stat().st_size, 'sha256': digest(video), 'frames': 840, 'durationMs': 14000, 'fps': 60, 'width': width, 'height': height})

        # 从最终编码文件取样，而不是只检查 Remotion 的源 PNG。
        frames = [0, 72, 113, 114, 125, 126, 150, 173, 198, 210, 234, 246, 258, 270, 288, 312, 336, 360, 384, 408, 432, 498, 526, 554, 582, 624, 650, 700, 839]
        selection = '+'.join(f'eq(n,{frame})' for frame in frames)
        run([ffmpeg, '-y', '-v', 'error', '-i', str(video), '-vf', f'select=\'{selection}\'', '-fps_mode', 'vfr', str(evidence / f'{name}-%03d.png')])
        samples = {frame: Image.open(evidence / f'{name}-{index:03d}.png').convert('RGB') for index, frame in enumerate(frames, 1)}
        stage = (30, 80, 690, 510) if width == 720 else (50, 82, 1390, 510)
        frozen_delta = sum(ImageStat.Stat(ImageChops.difference(samples[126].crop(stage), samples[173].crop(stage))).mean) / 3
        moving_delta = sum(ImageStat.Stat(ImageChops.difference(samples[0].crop(stage), samples[72].crop(stage))).mean) / 3
        assert frozen_delta < 0.8, f'Frozen background changed: {frozen_delta}'
        assert moving_delta > 1, f'Opening motion is not visible: {moving_delta}'
        samples[700].save(OUT / f'{name}.webp', quality=93, method=6)
        poster = OUT / f'{name}.webp'
        files.append({'file': poster.name, 'bytes': poster.stat().st_size, 'sha256': digest(poster), 'width': width, 'height': height})
        samples[0].save(BUILD / f'{name}-first.png')
        samples[839].save(BUILD / f'{name}-last.png')

        # 接触表包括动作边界；单独图仍保留，便于检查原尺寸墨迹和细节。
        thumb_width = 360 if width == 1440 else 240
        thumb_height = round(thumb_width * height / width)
        contact = Image.new('RGB', (thumb_width * 4, (thumb_height + 24) * 8), '#e5ebe9')
        from PIL import ImageDraw
        draw = ImageDraw.Draw(contact)
        for index, frame in enumerate(frames):
            x, y = index % 4 * thumb_width, index // 4 * (thumb_height + 24)
            contact.paste(samples[frame].resize((thumb_width, thumb_height), Image.Resampling.LANCZOS), (x, y))
            draw.text((x + 8, y + thumb_height + 4), f'{frame / 60:.3f}s / frame {frame}', fill='#315148')
        contact.save(BUILD / f'{name}-contact.jpg', quality=93)
        print(f'PASS {name}: 840 decoded frames, 14s, silent H.264; freeze delta={frozen_delta:.4f}, motion delta={moving_delta:.4f}', flush=True)

    (OUT / 'readme').mkdir(exist_ok=True)
    gif = OUT / 'readme/screen-freeze.gif'
    run([ffmpeg, '-y', '-v', 'error', '-i', str(OUT / 'screen-freeze.mp4'), '-filter_complex', 'fps=15,scale=960:426:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3', '-loop', '0', str(gif)])
    with Image.open(gif) as image:
        duration = 0
        for index in range(image.n_frames):
            image.seek(index)
            duration += image.info.get('duration', 0)
        assert abs(duration - 14000) <= 20 and image.size == (960, 426) and image.info.get('loop') == 0
        files.append({'file': 'readme/screen-freeze.gif', 'bytes': gif.stat().st_size, 'sha256': digest(gif), 'frames': image.n_frames, 'durationMs': duration, 'loop': 0, 'width': 960, 'height': 426})

    provenance = json.loads((ROOT / 'public/native/provenance.json').read_text(encoding='utf-8'))
    provenance['film'] = {'scene': 'screen-freeze', 'renderer': 'Remotion 4.0.534 / React', 'fps': 60, 'frames': 840, 'durationMs': 14000, 'supersample': 2, 'encoder': 'libx264 CRF18 yuv420p faststart', 'sourceFiles': {str(p.relative_to(ROOT)).replace('\\', '/'): digest(p) for p in sorted((ROOT / 'src').glob('*'))}, 'editorial': ['Browser shell, pendulum, angle graph and equations are authored teaching/editorial layers.', 'The camera reframes the teaching scene and ink after input; it is not a native zoom feature.', 'Toolbar arrow is an editorial pointer. Shape frames contain no tool cursor; none is invented.', 'Freeze commits at frame126; Shape commits at210 and retains frozen state. Native sequence timing remains 60fps.']}
    write_json(OUT / 'screen-freeze.provenance.json', provenance)
    verification = {'schemaVersion': 1, 'scene': 'screen-freeze', 'files': files, 'totalBytes': sum(item['bytes'] for item in files), 'checks': 'Both MP4s fully decoded; 840 frames / 60fps / 14s / H.264 yuv420p / no audio. Frozen-background and opening-motion pixel comparisons passed. Posters and GIF dimensions, GIF duration, loop and all SHA256 checked.'}
    write_json(OUT / 'screen-freeze.verification.json', verification)

    if args.publish:
        previous = BUILD / 'previous-public'
        previous.mkdir(exist_ok=True)
        names = [item['file'] for item in files] + ['manifest.json', 'provenance.json', 'verification.json']
        for name in names:
            target = previous / name
            target.parent.mkdir(parents=True, exist_ok=True)
            if not target.exists():
                shutil.copy2(PUBLIC / name, target)
        old_verify = json.loads((PUBLIC / 'verification.json').read_text(encoding='utf-8-sig'))
        replacement_names = {item['file'] for item in files}
        for item in old_verify['files']:
            if item['file'] not in replacement_names:
                assert digest(PUBLIC / item['file']) == item['sha256'], f'Unrelated public asset changed: {item["file"]}'
        for name in replacement_names | {'screen-freeze.provenance.json', 'screen-freeze.verification.json'}:
            shutil.copy2(OUT / name, PUBLIC / name)
        manifest = json.loads((PUBLIC / 'manifest.json').read_text(encoding='utf-8-sig'))
        scene = next(scene for scene in manifest['scenes'] if scene['id'] == 'screen-freeze')
        scene['durationMs'] = 14000
        write_json(PUBLIC / 'manifest.json', manifest)
        history = json.loads((PUBLIC / 'provenance.json').read_text(encoding='utf-8-sig'))
        history.setdefault('sceneOverrides', {})['screen-freeze'] = '/feature-media/screen-freeze.provenance.json'
        write_json(PUBLIC / 'provenance.json', history)
        replacement = {item['file']: item for item in files}
        old_verify['files'] = [replacement.get(item['file'], item) for item in old_verify['files']]
        old_verify['totalBytes'] = sum(item['bytes'] for item in old_verify['files'])
        old_verify['checks'] = 'Legacy checks retained for unchanged assets; their current SHA256 rechecked. screen-freeze was replaced and fully reverified by screen-freeze.verification.json.'
        write_json(PUBLIC / 'verification.json', old_verify)
        print('Published screen-freeze only; other 35 media hashes unchanged. Rollback: build/previous-public.', flush=True)


if __name__ == '__main__':
    main()
