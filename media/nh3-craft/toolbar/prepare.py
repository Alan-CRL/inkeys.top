"""校验同状态的原生离屏采集，按主栏实体边界保留三倍采样和完整光影。"""
import hashlib
import json
import math
from pathlib import Path
from tempfile import TemporaryDirectory

from PIL import Image


HERE = Path(__file__).resolve().parent
SITE = HERE.parents[2]
PROMO = SITE / 'media/inkeys3-theme-promo'
BUILD = PROMO / 'build'
DESTINATION = SITE / 'docs/.vuepress/public/new-index3/craft'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path):
    return json.loads(path.read_bytes())


def require(condition, description):
    if not condition:
        raise ValueError(description)


def prepare(staging, compiled, locale, theme):
    matches = sorted(BUILD.glob(f'capture-readme-{locale}-{theme}-*'))
    require(len(matches) == 1, f'Expected one native capture for {locale}/{theme}, found {matches}')
    source = matches[0]
    manifest = load(source / 'capture-manifest.json')
    require(manifest['kind'] == f'readme-{locale}' and manifest['theme'] == theme
            and manifest['compiled_build'] == compiled and manifest['adapters'] == compiled['adapters']
            and manifest['executable_sha256'] == compiled['executable_sha256']
            and manifest['source_revision'] == compiled['revision'], f'Wrong capture identity: {source}')
    hashes = {
        **manifest['metadata'], **manifest['layers'],
        'native-scene.txt': manifest['input_sha256'], 'export.log': manifest['export_log_sha256'],
    }
    for name in ('toolbar-body.json', 'toolbar-state.json', 'toolbar.png', 'native-scene.txt', 'export.log'):
        require(sha(source / name) == hashes[name], f'Stale native input or output: {source / name}')
    log = (source / 'export.log').read_text(encoding='utf-8').splitlines()
    require(manifest['failures'] == 0 and log[-1] == 'failures=0', f'Capture failed: {source}')
    scene = (source / 'native-scene.txt').read_text(encoding='utf-8').splitlines()
    require(scene == [f'locale {locale}', 'canvas 2560 1280', 'toolbar FF1000']
            and set(manifest['layers']) == {'toolbar.png'}, f'Unexpected scene or pagination: {source}')
    body = load(source / 'toolbar-body.json')
    state = load(source / 'toolbar-state.json')
    require(body['locale'] == locale and body['pen'] == 'soft' and body['pen_rgb'] == 'FF1000'
            and body['mode'] == 'drawing' and state['select_clickthrough_mode'] == 0
            and state['theme'] == theme and state['applied_dark'] == (theme == 'dark')
            and state['applied_background_opacity'] == 0 and state['applied_content_opacity'] == 100,
            f'Unexpected native toolbar state: {source}')

    left, top, right, bottom = body['body_rect']
    # 以生产几何为基准统一留出 20 个逻辑单位，阴影深浅不会改变对齐位置。
    crop = (math.floor(left) - 60, math.floor(top) - 60, math.ceil(right) + 60, math.ceil(bottom) + 60)
    target = staging / f'toolbar-{locale}-{theme}.png'
    with Image.open(source / 'toolbar.png') as full:
        require(full.mode == 'RGBA' and list(full.size) == body['canvas'], f'Invalid RGBA layer: {source}')
        bounds = full.getchannel('A').getbbox()
        require(bounds and crop[0] < bounds[0] and crop[1] < bounds[1]
                and crop[2] > bounds[2] and crop[3] > bounds[3], f'Clipped glow: {source}')
        image = full.crop(crop)
        require(image.size == (2431, 361), f'Unexpected 3x crop: {source}')
        # 取主栏上沿软笔附近的半透明像素，确认实际红色光影随笔色绘制。
        r, g, b, a = full.getpixel((round(left + (right - left) * .3), math.floor(top) - 1))
        require(r > max(g, b) + 50 and a > 30, f'Missing red edge light: {source}')
        image.save(target, optimize=True)
    return {
        'capture': source.name,
        'capture_manifest_sha256': sha(source / 'capture-manifest.json'),
        'inputs_and_layers_sha256': hashes,
        'crop_rect': crop, 'edge_sample_rgba': [r, g, b, a], 'png_sha256': sha(target),
    }


def main():
    compiled = load(BUILD / 'native-ui-bin/compiled-adapter.json')
    require(sha(BUILD / 'native-build.log') == compiled['build_log_sha256'], 'Build log mismatch')
    for name, digest in compiled['adapters'].items():
        require(sha(PROMO / 'native' / name) == digest, f'Native adapter changed: {name}')
    restored = load(BUILD / 'source-restoration.json')
    require(restored['unchanged'] and restored['before'] == restored['after'], 'Incomplete native restoration')
    with TemporaryDirectory(dir=HERE) as temporary:
        staging = Path(temporary)
        captures = {}
        for locale in ('zh-CN', 'zh-TW', 'en-US'):
            for theme in ('light', 'dark'):
                captures[f'{locale}/{theme}'] = prepare(staging, compiled, locale, theme)
        require(len({entry['png_sha256'] for entry in captures.values()}) == 6, 'Duplicate localized image')
        report = {'native_build': compiled, 'sampling': 3, 'size': [2431, 361],
                  'source_build': BUILD.relative_to(SITE).as_posix(), 'captures': captures}
        (staging / 'captures.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8', newline='\n')
        DESTINATION.mkdir(parents=True, exist_ok=True)
        for image in staging.glob('*.png'):
            image.replace(DESTINATION / image.name)
        (staging / 'captures.json').replace(HERE / 'captures.json')
    print('Verified and published six localized native toolbar captures.')


if __name__ == '__main__':
    main()
