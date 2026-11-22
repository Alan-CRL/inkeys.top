"""校验四次原生放映捕获后，按主体矩形统一保留 60 原始像素的光影余量。"""
from pathlib import Path
import hashlib
import json
import math
import os
import tempfile

from PIL import Image

HERE = Path(__file__).resolve().parent
SOURCE = HERE / 'out'
DESTINATION = HERE.parent / 'public' / 'slide-show'
THEMES = ('light', 'dark')
STATES = ('pager-1of2', 'pager-2of2')
PAGER_CELLS = ('Previous', 'Page', 'Next')
PADDING = 60


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path):
    return json.loads(path.read_text(encoding='utf-8'))


def numbers(value, count, description):
    require(isinstance(value, list) and len(value) == count, f'{description}: invalid vector')
    require(all(type(item) in (int, float) and math.isfinite(item) for item in value),
            f'{description}: non-finite or non-numeric coordinate')
    return value


def verify_capture(theme, state):
    directory = SOURCE / theme / state
    manifest = load(directory / 'capture-manifest.json')
    png = 'pager.png'
    body_name, state_name = 'pager-body.json', 'pager-state.json'
    prefix = f'{theme}/{state}'
    require(manifest['theme'] == theme and manifest['state'] == state and manifest['failures'] == 0 and
            manifest['export_exit_code'] == 0,
            f'{prefix}: capture identity or failure count differs')
    for name, digest in (
            ('native-scene.txt', manifest['input_sha256']),
            ('export.log', manifest['export_log_sha256']),
            (png, manifest['layers'][png]),
            (body_name, manifest['metadata'][body_name]),
            (state_name, manifest['metadata'][state_name])):
        require(sha(directory / name) == digest, f'{prefix}: stale or modified {name}')
    require((directory / 'export.log').read_text(encoding='utf-8').rstrip().endswith('failures=0'),
            f'{prefix}: exporter did not finish successfully')
    compiled = manifest['compiled_build']
    require(manifest['adapters'] == compiled['adapters'] and
            manifest['executable_sha256'] == compiled['executable_sha256'],
            f'{prefix}: capture does not match compiled adapter/binary identity')
    require(compiled['build_exit_code'] == 0 and
            manifest['source_revision'] == compiled['revision'] and compiled['revision'] and
            manifest['source_branch'] == compiled['branch'] and
            compiled['build_log_sha256'], f'{prefix}: incomplete or mismatched build evidence')
    require(set(manifest['adapters']) == {'HeroCommon.inc', 'HeroExport.inc', 'HeroScene.inc'},
            f'{prefix}: unexpected adapter file set')
    require(sha(HERE / 'install.py') == compiled['installer_sha256'],
            f'{prefix}: installer changed since compilation')
    # 当前适配发生变化时必须重新构建/捕获，不能静默复用旧图层。
    for name, digest in manifest['adapters'].items():
        require(Path(name).name == name, f'{prefix}: invalid adapter filename')
        require(sha(HERE / name) == digest, f'{prefix}: adapter changed: {name}')

    body = load(directory / body_name)
    actual = load(directory / state_name)
    current = '1' if state == 'pager-1of2' else '2'
    require(actual['theme'] == theme and actual['state'] == state and actual['locale'] == 'en-US' and
            actual['whiteboard'] is False and actual['ppt_active'] is True and actual['compact'] is False and
            actual['surface'] == 0 and actual['opacity'] == 1 and actual['next_is_end_show'] is False and
            actual['loading'] is False and actual['waiting'] is False and
            actual['page_lines'] == [current, '/2'], f'{prefix}: unstable or wrong slide state')
    require(actual['applied_dark'] is (theme == 'dark') and actual['applied_background_opacity'] == 0 and
            actual['applied_content_opacity'] == 100, f'{prefix}: theme or resident opacity differs')
    require(actual['cells'] == [{'key': key, 'label': key, 'enabled': True} for key in PAGER_CELLS],
            f'{prefix}: wrong cell order, labels or enablement')

    canvas = numbers(body['canvas'], 2, f'{prefix} canvas')
    require(all(type(value) is int and value > 0 for value in canvas), f'{prefix}: invalid canvas dimensions')
    left, top, right, bottom = numbers(body['body_rect'], 4, f'{prefix} body_rect')
    require(0 <= left < right <= canvas[0] and 0 <= top < bottom <= canvas[1],
            f'{prefix}: body lies outside source canvas')
    zoom = body['pixels_per_logical_unit']
    require(zoom == 3, f'{prefix}: expected 3 pixels per logical unit')
    require((right - left, bottom - top) == (240 * zoom, 80 * zoom), f'{prefix}: expected a 240 × 80 body')
    geometry = body['buttons']
    require(set(geometry) == set(PAGER_CELLS), f'{prefix}: missing/extra button geometry')
    for key in PAGER_CELLS:
        x, y, width, height = numbers(geometry[key], 4, f'{prefix} {key}')
        require(width > 0 and height > 0 and x >= -0.0001 and y >= -0.0001 and
                x + width <= (right - left) / zoom + 0.0001 and
                y + height <= (bottom - top) / zoom + 0.0001,
                f'{prefix}: {key} rectangle lies outside body')

    # 像素裁切只能使用整数边界；向外取整保留不足一个像素的实体边缘，不重采样。
    crop = (math.floor(left) - PADDING, math.floor(top) - PADDING,
            math.ceil(right) + PADDING, math.ceil(bottom) + PADDING)
    require(crop[0] >= 0 and crop[1] >= 0 and crop[2] <= canvas[0] and crop[3] <= canvas[1],
            f'{prefix}: source canvas lacks the full 60-pixel padding')
    image_size = [crop[2] - crop[0], crop[3] - crop[1]]
    cropped_body = [left - crop[0], top - crop[1], right - crop[0], bottom - crop[1]]
    with Image.open(directory / png) as source:
        require(source.format == 'PNG' and source.mode == 'RGBA' and list(source.size) == canvas,
                f'{prefix}: expected full-canvas RGBA PNG')
        image = source.crop(crop)
        minimum, maximum = image.getchannel('A').getextrema()
        require(minimum == 0 and maximum > 0, f'{prefix}: crop lacks transparent margins or native content')
    layout = {'image_size': image_size, 'body_rect': cropped_body,
              'pixels_per_logical_unit': zoom, 'buttons': geometry}
    evidence = {'source': directory.relative_to(HERE).as_posix(),
                'crop_rect': list(crop), 'capture_manifest_sha256': sha(directory / 'capture-manifest.json'),
                'source_png_sha256': manifest['layers'][png],
                'executable_sha256': manifest['executable_sha256'], 'source_revision': compiled['revision']}
    identity = {'adapters': manifest['adapters'], 'compiled_build': compiled}
    return image, layout, evidence, identity


def main():
    captures = []
    common_layout = None
    common_identity = None
    for theme in THEMES:
        for state in STATES:
            image, layout, evidence, identity = verify_capture(theme, state)
            if common_identity is None:
                common_identity = identity
            require(identity == common_identity,
                    f'{theme}/{state}: captures were not produced by the same compiled adapter')
            if common_layout is None:
                common_layout = layout
            require(layout == common_layout,
                    f'{theme}/{state}: cropped dimensions, body position or cell geometry differ')
            captures.append((theme, state, image, evidence))
    for theme, state, _, _ in captures:
        destination = DESTINATION / theme / f'{state}.png'
        require(not destination.exists(), f'Published pager already exists: {destination}')

    # 四张全通过才准备公开文件；临时目录与最终输出位于同一工作区卷。
    with tempfile.TemporaryDirectory(prefix='crop-', dir=HERE) as temporary:
        staging = Path(temporary)
        result = {'schema_version': 1, 'padding_pixels': PADDING,
                  'rectangle_formats': {'body_rect': 'pixel LTRB', 'buttons': 'body-relative logical XYWH'},
                  'states': dict.fromkeys(STATES, common_layout), 'captures': {}}
        for theme, state, image, evidence in captures:
            path = staging / theme / f'{state}.png'
            path.parent.mkdir(parents=True, exist_ok=True)
            image.save(path, format='PNG')
            evidence['output'] = f'{theme}/{state}.png'
            evidence['output_sha256'] = sha(path)
            result['captures'][f'{theme}/{state}'] = evidence
        layout_path = staging / 'layout.json'
        layout_path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n',
                               encoding='utf-8', newline='\n')
        for theme, state, _, _ in captures:
            destination = DESTINATION / theme / f'{state}.png'
            destination.parent.mkdir(parents=True, exist_ok=True)
            # 独占发布，保护预检后出现的同名文件，也保留根目录下的旧分页图。
            os.link(staging / theme / f'{state}.png', destination)
        os.replace(layout_path, DESTINATION / 'layout.json')
    print('cropped 4 slideshow layers:', DESTINATION)


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError) as error:
        raise SystemExit(f'Crop failed: {error}') from error
