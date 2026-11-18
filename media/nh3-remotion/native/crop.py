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
DESTINATION = HERE.parent / 'public' / 'toolbar'
THEMES = ('light', 'dark')
STATES = ('soft', 'highlight', 'soft-freeze')
BUTTONS = ('Select', 'pen', 'Shapes', 'Erase', 'Undo', 'Clear', 'More', 'Board', 'Freeze')
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
    body = load(directory / 'toolbar-body.json')
    actual = load(directory / 'toolbar-state.json')
    prefix = f'{theme}/{state}'
    require(manifest['theme'] == theme and manifest['state'] == state and manifest['failures'] == 0 and
            manifest['export_exit_code'] == 0,
            f'{prefix}: capture identity or failure count differs')
    for name, digest in (
            ('native-scene.txt', manifest['input_sha256']),
            ('export.log', manifest['export_log_sha256']),
            ('toolbar.png', manifest['layers']['toolbar.png']),
            ('toolbar-body.json', manifest['metadata']['toolbar-body.json']),
            ('toolbar-state.json', manifest['metadata']['toolbar-state.json'])):
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

    highlight = state == 'highlight'
    frozen = state == 'soft-freeze'
    pen = 'highlight' if highlight else 'soft'
    rgb = 'FFC510' if highlight else 'FF1000'
    require(body['locale'] == 'en-US' and body['pen'] == pen and body['pen_rgb'] == rgb and
            body['freeze'] is frozen, f'{prefix}: body metadata does not match fixture')
    require(actual['theme'] == theme and actual['state'] == state and actual['pen_rgb'] == rgb and
            actual['freeze'] is frozen, f'{prefix}: actual native state differs')
    require(type(actual['pen_tool']) is int and actual['pen_tool'] >= 0,
            f'{prefix}: missing actual pen tool')
    dark = theme == 'dark'
    require(actual['theme_mode'] == (1 if dark else 2) and
            actual['requested_dark'] is dark and actual['applied_dark'] is dark,
            f'{prefix}: native theme was not applied')
    require(actual['select_clickthrough_mode'] == 0 and
            actual['undo'] is True and actual['redo'] is False,
            f'{prefix}: merged mode/history availability differs')
    for field, expected in (
            ('requested_background_opacity', 0), ('applied_background_opacity', 0),
            ('requested_content_opacity', 100), ('applied_content_opacity', 100)):
        require(actual[field] == expected, f'{prefix}: {field} differs')

    # 几何来自生产布局快照；文案和选中态来自最终按钮对象，避免仅验证意图声明。
    visible = {}
    for button in actual['buttons']:
        if not button['visible']:
            continue
        key = button['key']
        if key == 'Divider':
            require(button['selected'] is False, f'{prefix}: divider cannot be selected')
            continue
        require(key in BUTTONS and key not in visible, f'{prefix}: unexpected/duplicate visible button {key}')
        visible[key] = button
    require(set(visible) == set(BUTTONS), f'{prefix}: expected exactly nine visible main buttons')
    for key in BUTTONS:
        label = ('Highlight' if highlight else 'Soft Pen') if key == 'pen' else key
        selected = key == 'pen' or (key == 'Freeze' and frozen)
        require(visible[key]['label'] == label and visible[key]['selected'] is selected,
                f'{prefix}: {key} label/selection differs')

    canvas = numbers(body['canvas'], 2, f'{prefix} canvas')
    require(all(type(value) is int and value > 0 for value in canvas), f'{prefix}: invalid canvas dimensions')
    left, top, right, bottom = numbers(body['body_rect'], 4, f'{prefix} body_rect')
    require(0 <= left < right <= canvas[0] and 0 <= top < bottom <= canvas[1],
            f'{prefix}: body lies outside source canvas')
    zoom = body['pixels_per_logical_unit']
    require(type(zoom) in (int, float) and math.isfinite(zoom) and zoom > 0,
            f'{prefix}: invalid pixels_per_logical_unit')
    geometry = body['buttons']
    require(set(geometry) == set(BUTTONS), f'{prefix}: missing/extra button geometry')
    for key in BUTTONS:
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
    with Image.open(directory / 'toolbar.png') as source:
        require(source.format == 'PNG' and source.mode == 'RGBA' and list(source.size) == canvas,
                f'{prefix}: expected full-canvas RGBA PNG')
        image = source.crop(crop)
        image.load()
    layout = {'image_size': image_size, 'body_rect': cropped_body,
              'pixels_per_logical_unit': zoom, 'buttons': geometry}
    evidence = {'source': directory.relative_to(HERE).as_posix(),
                'crop_rect': list(crop), 'capture_manifest_sha256': sha(directory / 'capture-manifest.json'),
                'source_png_sha256': manifest['layers']['toolbar.png'],
                'executable_sha256': manifest['executable_sha256'], 'source_revision': compiled['revision']}
    identity = {'adapters': manifest['adapters'], 'compiled_build': compiled}
    return image, layout, evidence, identity, [right - left, bottom - top]


def main():
    captures = []
    common_layout = common_identity = common_body_size = None
    for theme in THEMES:
        for state in STATES:
            image, layout, evidence, identity, body_size = verify_capture(theme, state)
            if common_layout is None:
                common_layout, common_identity, common_body_size = layout, identity, body_size
            else:
                # 主体宽高、裁切内锚点、缩放或按钮布局有任何差异都拒绝拼成一套。
                require(body_size == common_body_size,
                        f'{theme}/{state}: body dimensions differ from the other captures')
                require(layout == common_layout,
                        f'{theme}/{state}: cropped image/body position/scale/button geometry differs')
                require(identity == common_identity,
                        f'{theme}/{state}: captures were not produced by the same compiled adapter')
            captures.append((theme, state, image, evidence))

    # 六张全部通过校验后才准备输出；中间 PNG 在 native/build 中，不提前更新公开图片。
    (HERE / 'build').mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='crop-', dir=HERE / 'build') as temporary:
        staging = Path(temporary)
        result = {'schema_version': 1, 'padding_pixels': PADDING,
                  'rectangle_formats': {'body_rect': 'pixel LTRB', 'buttons': 'body-relative logical XYWH'},
                  **common_layout, 'captures': {}}
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
    print('cropped 6 toolbar images:', DESTINATION)


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError) as error:
        raise SystemExit(f'Crop failed: {error}') from error
