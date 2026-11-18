"""校验六次原生捕获后，按主体矩形统一保留 60 原始像素的光影余量。"""
from pathlib import Path
import hashlib
import json
import math
import os
import tempfile

from PIL import Image

HERE = Path(__file__).resolve().parent
SOURCE = HERE / 'out'
DESTINATION = HERE.parent / 'public' / 'whiteboard'
THEMES = ('light', 'dark')
STATES = ('toolbar', 'pager-1of1', 'pager-2of2')
TOOLBAR_BUTTONS = ('Move', 'Soft Pen', 'Shapes', 'Erase', 'Undo', 'Clear', 'More', 'Close')
PAGER_CELLS = ('Previous', 'Page', 'Add page', 'More')
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
    layer = 'toolbar' if state == 'toolbar' else 'pager'
    png = f'{layer}.png'
    body_name, state_name = f'{layer}-body.json', f'{layer}-state.json'
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
    require(actual['theme'] == theme and actual['state'] == state and actual['locale'] == 'en-US' and
            actual['whiteboard'] is True and actual['presentation'] is False and
            actual['select_clickthrough_mode'] == 0, f'{prefix}: whiteboard fixture differs')
    dark = theme == 'dark'
    require(actual['requested_dark'] is dark and actual['applied_dark'] is dark,
            f'{prefix}: native theme was not applied')
    for field, expected in (
            ('requested_background_opacity', 0), ('applied_background_opacity', 0),
            ('requested_content_opacity', 100), ('applied_content_opacity', 100)):
        require(actual[field] == expected, f'{prefix}: {field} differs')

    if state == 'toolbar':
        require(actual['pen'] == 'soft' and actual['pen_rgb'] == 'FFFFFF' and
                actual['undo'] is True and actual['redo'] is False, f'{prefix}: pen/history state differs')
        expected_buttons = [{'label': name, 'selected': name in ('Soft Pen', 'Close')}
                            for name in TOOLBAR_BUTTONS]
        require(actual['buttons'] == expected_buttons, f'{prefix}: button order, labels or selection differs')
        button_keys = ('MainButton', *TOOLBAR_BUTTONS)
    else:
        count = 1 if state == 'pager-1of1' else 2
        require(actual['surface'] == 0 and actual['current_page'] == actual['total_pages'] == count and
                actual['next_is_add'] is True and actual['menu'] == 0 and
                actual['unsaved'] is False and actual['loading'] is False, f'{prefix}: unstable or wrong page state')
        expected_cells = [{'key': name, 'enabled': name != 'Previous' or count > 1}
                          for name in PAGER_CELLS]
        require(actual['cells'] == expected_cells, f'{prefix}: cell order or enablement differs')
        button_keys = PAGER_CELLS

    canvas = numbers(body['canvas'], 2, f'{prefix} canvas')
    require(all(type(value) is int and value > 0 for value in canvas), f'{prefix}: invalid canvas dimensions')
    left, top, right, bottom = numbers(body['body_rect'], 4, f'{prefix} body_rect')
    require(0 <= left < right <= canvas[0] and 0 <= top < bottom <= canvas[1],
            f'{prefix}: body lies outside source canvas')
    zoom = body['pixels_per_logical_unit']
    require(zoom == 3, f'{prefix}: expected 3 pixels per logical unit')
    geometry = body['buttons']
    require(set(geometry) == set(button_keys), f'{prefix}: missing/extra button geometry')
    for key in button_keys:
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
    layouts = {}
    common_identity = None
    for theme in THEMES:
        for state in STATES:
            image, layout, evidence, identity = verify_capture(theme, state)
            if common_identity is None:
                common_identity = identity
            require(identity == common_identity,
                    f'{theme}/{state}: captures were not produced by the same compiled adapter')
            # 同状态跨主题比对几何；两种分页状态还必须共享裁切锚点和格子位置。
            require(layout == layouts.setdefault(state, layout),
                    f'{theme}/{state}: cropped dimensions, body position or button geometry differ by theme')
            captures.append((theme, state, image, evidence))
    require(layouts['pager-1of1'] == layouts['pager-2of2'],
            'Pager states differ in cropped dimensions, body position or cell geometry')

    # 六张全通过才准备公开文件；临时目录与最终输出位于同一工作区卷。
    with tempfile.TemporaryDirectory(prefix='crop-', dir=HERE) as temporary:
        staging = Path(temporary)
        result = {'schema_version': 1, 'padding_pixels': PADDING,
                  'rectangle_formats': {'body_rect': 'pixel LTRB', 'buttons': 'body-relative logical XYWH'},
                  'states': layouts, 'captures': {}}
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
            os.replace(staging / theme / f'{state}.png', destination)
        os.replace(layout_path, DESTINATION / 'layout.json')
    print('cropped 6 whiteboard layers:', DESTINATION)


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError) as error:
        raise SystemExit(f'Crop failed: {error}') from error
