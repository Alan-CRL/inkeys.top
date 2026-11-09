"""从冻结合成器导出可独立悬停的网页图层，并验证普通 alpha-over 重建。"""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import sys
from unittest.mock import patch

# 防止只读素材目录生成 __pycache__。
sys.dont_write_bytecode = True
try:
    import numpy as np
    from PIL import Image, features, __version__ as pillow_version
except ImportError as exc:
    raise SystemExit(f'Missing Python package: {exc.name}; install nothing automatically.') from exc

ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / 'media'
PUBLIC = ROOT / 'docs/.vuepress/public/feature-media/new-index3/layers'
TASK = ROOT / '.trellis/tasks/09-28-inkeys3-new-homepage'
PNG = TASK / 'layers-lossless'
MANIFEST = ROOT / 'docs/.vuepress/theme/components/NewHome3/showcaseLayers.json'
THEMES = ('light', 'dark')


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def transparent(size):
    return Image.new('RGBA', size)


def over(base, *layers):
    result = base.copy()
    for layer in layers:
        result.alpha_composite(layer)
    return result


def reconcile(before, target, candidate, notes, label):
    """把分组时的整数舍入收回本层，避免额外的全画面补差层。"""
    b = np.asarray(before.convert('RGB'), dtype=np.int32)
    t = np.asarray(target.convert('RGB'), dtype=np.int32)
    original = np.asarray(candidate.getchannel('A'), dtype=np.int32)
    support = original > 0
    if np.any(np.any(b != t, axis=2) & ~support):
        raise RuntimeError(f'{label}: changed pixels outside source alpha support')
    # 维持原 alpha；只有颜色超出 8 位范围时才提高必要像素的 alpha。
    delta = t - b
    denominator = np.where(delta >= 0, 255 - b, b)
    needed = np.ceil(np.max(np.maximum(np.abs(delta) - 0.499, 0) * 255 /
                           np.maximum(denominator, 1), axis=2)).astype(np.int32)
    alpha = np.maximum(original, needed).clip(0, 255)
    color = np.rint((t * 255 - b * (255 - alpha[..., None])) /
                    np.maximum(alpha[..., None], 1)).clip(0, 255).astype(np.uint8)
    color[~support] = 0
    rgba = np.dstack((color, alpha.astype(np.uint8)))
    result = Image.fromarray(rgba)
    error = np.abs(np.asarray(over(before, result).convert('RGB'), dtype=np.int16) - t)
    if error.max() != 0:
        raise RuntimeError(f'{label}: integer alpha-over reconciliation failed: max={error.max()}')
    notes[label] = {'alpha_adjusted_pixels': int(np.count_nonzero(alpha != original)),
                    'max_alpha_increase': int((alpha - original).max())}
    return result


def overview(promo, theme):
    hero = promo.hero
    scene = json.loads((promo.HERO / 'scene.json').read_text(encoding='utf-8'))
    size = scene['canvas']['width'], scene['canvas']['height']
    sources = promo.BUILD / f'hero-sources-{theme}'
    expected_native = {'board-shapes.png', 'board-ink.png'}
    actual_native = {p.name for p in sources.glob('*.png')
                     if any(p.name == f'{zone}-{kind}.png'
                            for zone in ('ppt', 'desktop', 'board')
                            for kind in ('shapes', 'ink', 'laser'))}
    if actual_native != expected_native:
        raise RuntimeError(f'Unexpected overview native layers: {actual_native}')
    for name in ('board.png', 'toolbar.png', 'ppt-pager.png', 'board-pager.png'):
        if not (sources / name).is_file():
            raise FileNotFoundError(sources / name)
    records, tracked, wash = [], [], {}
    original_alpha = Image.Image.alpha_composite
    original_wash = hero.white_wash

    def capture(target, image, dest=(0, 0), source=(0, 0)):
        caller = sys._getframe(1)
        if caller.f_code is hero.compose.__code__ and not any(target is x for x in tracked):
            tracked.append(target)
        if any(target is x for x in tracked):
            full = transparent(size)
            original_alpha(full, image, dest, source)
            records.append(full)
        return original_alpha(target, image, dest, source)

    def capture_wash(base, *args):
        wash['args'] = args
        result = original_wash(base, *args)
        wash['result'] = result.copy()
        tracked.append(result)
        return result

    # 只调用合成函数；不调用会写入 media 的 main()。
    with patch.object(Image.Image, 'alpha_composite', capture), patch.object(hero, 'white_wash', capture_wash):
        reference = promo.compose_theme(scene, theme)
    if len(records) != 17 or not wash:
        raise RuntimeError(f'Overview paint sequence changed: captured {len(records)} calls')
    background = over(Image.new('RGBA', size, (0, 0, 0, 255)), *records[:3])
    washed_background = original_wash(background, *wash['args'])
    masks = hero.zone_masks(scene, *size, scene['canvas']['supersample'])
    ownership = np.argmax(np.stack([np.asarray(mask) for mask in masks]), axis=0)
    layers, notes = {}, {}
    # 边界抗锯齿已在原合成器中混合；将边界像素分给覆盖率最高的面板。
    for label, index in (('desktop', 1), ('slide', 0), ('board', 2)):
        panel = washed_background.copy()
        panel.putalpha(Image.fromarray(np.uint8(ownership == index) * 255))
        layers[label] = panel
    layers['dividers'] = reconcile(washed_background, wash['result'], records[3], notes, 'dividers')
    current = wash['result']
    cursor = 4
    for label in ('slide-ink', 'board-shapes', 'board-ink', 'wordmark', 'tagline'):
        draws = records[cursor:cursor + 2]
        target = over(current, *draws)
        grouped = over(transparent(size), *draws)
        layers[label] = reconcile(current, target, grouped, notes, label)
        current = target
        cursor += 2
    # 原合成器先主栏，再左分页，最后右分页。
    for label, image in zip(('toolbar', 'ppt-pager', 'board-pager'), records[cursor:]):
        layers[label] = image
    return size, layers, reference, notes


def tools_layers(compose, theme):
    calls = []
    original = Image.alpha_composite

    def capture(base, layer):
        if sys._getframe(1).f_code is compose.base_without_toolbar.__code__:
            calls.append((base.copy() if not calls or len(calls) == 1 else None, layer.copy()))
        return original(base, layer)

    with patch.object(Image, 'alpha_composite', capture):
        base, _ = compose.base_without_toolbar()
    if len(calls) != 5:
        raise RuntimeError(f'Tools paint sequence changed: captured {len(calls)} calls')
    opaque_brush, pattern = calls[0]
    background, high = calls[1]
    textured = calls[2][1]
    geometry, handwriting = calls[3][1], calls[4][1]
    layers = {'background': background, 'highlight': high}
    brush = compose.clip_content(opaque_brush)
    pattern = compose.clip_content(pattern)
    b = np.asarray(textured.getchannel('A'), dtype=np.float64) / 255
    p = np.asarray(pattern.getchannel('A'), dtype=np.float64) / 255
    q = b * p
    # (不透明刷子 over 点阵) 再恢复刷子 alpha，不能简单拆成两次原 alpha 叠加。
    # 上层 alpha=q=b*p，下层 alpha=b*(1-p)/(1-b*p)，总覆盖率仍为 b。
    a = np.divide(b * (1 - p), 1 - q, out=np.zeros_like(b), where=q < 1)
    brush.putalpha(Image.fromarray(np.uint8(np.rint(a * 255))))
    # 极小覆盖率仍保留一个 alpha 量级，供逐像素整数舍入校正。
    pattern.putalpha(Image.fromarray(np.uint8(np.where(q > 0, np.maximum(1, np.rint(q * 255)), 0))))
    current = over(background, high)
    desired = over(current, textured)
    current = over(current, brush)
    notes = {}
    pattern = reconcile(current, desired, pattern, notes, 'pattern')
    layers.update({'brush': brush, 'pattern': pattern, 'geometry': geometry, 'handwriting': handwriting})
    capture_dir = next(compose.BUILD.glob(f'capture-tools-{theme}-*'))
    toolbar_calls = []

    def capture_toolbar(target, layer):
        if sys._getframe(1).f_code is compose.place_toolbar.__code__:
            toolbar_calls.append(layer.copy())
        return original(target, layer)

    with patch.object(Image, 'alpha_composite', capture_toolbar):
        reference, *_ = compose.place_toolbar(base, capture_dir / 'toolbar.png', capture_dir / 'toolbar-body.json')
    if len(toolbar_calls) != 1:
        raise RuntimeError('Tools toolbar paint sequence changed')
    layers['toolbar'] = toolbar_calls[0]
    return compose.SIZE, layers, reference, notes


def statistics(actual, expected):
    if actual.size != expected.size:
        raise RuntimeError(f'Image size mismatch: {actual.size} != {expected.size}')
    diff = np.abs(np.asarray(actual.convert('RGB'), dtype=np.int16) -
                  np.asarray(expected.convert('RGB'), dtype=np.int16))
    return {'mean_abs_diff': float(diff.mean()),
            'p99_9_abs_diff': float(np.percentile(diff, 99.9)),
            'max_diff': int(diff.max()),
            'per_channel': {channel: {'mean_abs_diff': float(diff[..., index].mean()),
                                      'p99_9_abs_diff': float(np.percentile(diff[..., index], 99.9)),
                                      'max_diff': int(diff[..., index].max())}
                            for index, channel in enumerate(('r', 'g', 'b'))}}


def accepted(metrics):
    return all(c['mean_abs_diff'] < 1 and c['p99_9_abs_diff'] < 24
               for c in metrics['per_channel'].values())


def replay(page, theme, entries, size, png=False):
    canvas = transparent(size)
    folder = PNG / page if png else PUBLIC / page
    for entry in entries:
        token = 'shared' if entry['themes'] == 'shared' else theme
        suffix = '.png' if png else '-full.webp'
        path = folder / f'{entry["id"]}-{token}{suffix}'
        with Image.open(path) as image:
            x, y, w, h = entry['box']
            if image.size != (w, h):
                raise RuntimeError(f'{path}: incorrect cropped dimensions')
            canvas.alpha_composite(image.convert('RGBA'), (x, y))
    if canvas.getchannel('A').getextrema() != (255, 255):
        raise RuntimeError(f'{page}/{theme}: exported stack does not cover the canvas')
    return canvas


def same_pixels(a, b):
    return a.size == b.size and a.tobytes() == b.tobytes()


def export_page(page, build, report):
    report.update({'status': 'running', 'themes': {theme: {'source_replay': None,
                   'lossless_png': None, 'full_webp': None} for theme in THEMES}})
    results = {theme: build(theme) for theme in THEMES}
    size = results['light'][0]
    labels = list(results['light'][1])
    if results['dark'][0] != size or list(results['dark'][1]) != labels:
        raise RuntimeError(f'{page}: theme layouts differ')
    folder = PUBLIC / page
    png_folder = PNG / page
    folder.mkdir(parents=True, exist_ok=True)
    png_folder.mkdir(parents=True, exist_ok=True)
    entries, assets = [], []
    report.update({'size': list(size), 'derivation': {theme: results[theme][3] for theme in THEMES}})
    for label in labels:
        pair = [results[theme][1][label] for theme in THEMES]
        bounds = [image.getchannel('A').getbbox() for image in pair]
        if any(box is None for box in bounds):
            raise RuntimeError(f'{page}/{label}: empty source layer')
        box = (min(b[0] for b in bounds), min(b[1] for b in bounds),
               max(b[2] for b in bounds), max(b[3] for b in bounds))
        shared = same_pixels(*pair)
        entries.append({'id': label, 'box': [box[0], box[1], box[2] - box[0], box[3] - box[1]],
                        'clip': None, 'themes': 'shared' if shared else 'split', 'half': True})
        for theme, image in zip(THEMES, pair):
            if shared and theme == 'dark':
                continue
            token = 'shared' if shared else theme
            stem = f'{label}-{token}'
            cropped = image.crop(box)
            png_path = png_folder / f'{stem}.png'
            cropped.save(png_path, optimize=True)
            # 不透明图层直接用 RGB；透明层保留无损 alpha。
            if cropped.getchannel('A').getextrema() == (255, 255):
                cropped = cropped.convert('RGB')
            half = cropped.resize((max(1, (cropped.width + 1) // 2),
                                   max(1, (cropped.height + 1) // 2)), Image.Resampling.LANCZOS)
            half_path = folder / f'{stem}-half.webp'
            half.save(half_path, format='WEBP', quality=85, method=6, exact=True)
            assets.append((stem, cropped))
    finals = {}
    for theme in THEMES:
        with Image.open(MEDIA / f'inkeys3-showcase-assets/{page}/final/{page}-{theme}.png') as image:
            finals[theme] = image.convert('RGB')
        native = statistics(results[theme][2], finals[theme])
        png_metrics = statistics(replay(page, theme, entries, size, png=True), finals[theme])
        report['themes'][theme].update({'source_replay': native, 'lossless_png': png_metrics})
        if native['max_diff'] != 0 or png_metrics['max_diff'] != 0:
            raise RuntimeError(f'{page}/{theme}: lossless replay differs from frozen final: {report["themes"][theme]}')
    # 先用约定质量；需要时升级全尺寸文件，最终保底为无损 WebP。
    for quality in (85, 95, 100, None):
        for stem, image in assets:
            kwargs = {'lossless': True, 'quality': 100} if quality is None else {'quality': quality}
            image.save(folder / f'{stem}-full.webp', format='WEBP', method=6, exact=True, **kwargs)
        for theme in THEMES:
            report['themes'][theme]['full_webp'] = statistics(replay(page, theme, entries, size), finals[theme])
        if all(accepted(report['themes'][theme]['full_webp']) for theme in THEMES):
            report['full_encoding'] = {'quality': quality, 'lossless': quality is None, 'method': 6}
            break
    else:
        raise RuntimeError(f'{page}: WebP reconstruction failed acceptance even losslessly')
    expected_paths = {folder / f'{stem}-{scale}.webp' for stem, _ in assets for scale in ('full', 'half')}
    stale = set(folder.glob('*.webp')) - expected_paths
    if stale:
        raise RuntimeError(f'{page}: unexpected old WebP files; inspect manually: {sorted(str(p) for p in stale)}')
    report['files'] = {p.relative_to(ROOT).as_posix(): p.stat().st_size for p in sorted(expected_paths)}
    report['full_bytes'] = sum(p.stat().st_size for p in expected_paths if p.name.endswith('-full.webp'))
    report['half_bytes'] = sum(p.stat().st_size for p in expected_paths if p.name.endswith('-half.webp'))
    report['half_target_bytes'] = 2_500_000
    report['half_target_met'] = report['half_bytes'] < report['half_target_bytes']
    report['lossless_png_bytes'] = sum((png_folder / f'{stem}.png').stat().st_size for stem, _ in assets)
    report['layers'] = entries
    print(f'{page}: full={report["full_bytes"]:,} bytes; half={report["half_bytes"]:,} bytes; '
          f'half target {"PASS" if report["half_target_met"] else "EXCEEDED"}', flush=True)
    for theme in THEMES:
        print(f'{page}/{theme}: {json.dumps(report["themes"][theme])}', flush=True)
    report['status'] = 'passed'
    return {'width': size[0], 'height': size[1], 'layers': entries}


def main():
    manifest, report = {}, {
        'status': 'running', 'pages': {},
        'environment': {'python': sys.version, 'pillow': pillow_version, 'numpy': np.__version__},
        'derivation_notes': [
            'Original compose functions are instrumented; no layout coordinates are duplicated.',
            'Overview background panels own the highest-coverage zone-mask pixels; original antialiased seam blends and white wash are baked into those pixels.',
            'Dividers are reconstructed from original washed before/after canvases using straight-alpha RGB inversion.',
            'Ink, wordmark and tagline shadows stay with their semantic layers; integer grouping is reconciled only within original alpha support.',
            'Tools brush/pattern alpha is redistributed to preserve original coverage under ordinary alpha-over; pattern is a composed texture prototype.',
            'Paint order is retained: overview dividers precede ink; toolbar precedes pagers; tools geometry precedes handwriting.',
        ],
        'half_encoding': {'quality': 85, 'method': 6, 'lossless': False},
    }
    TASK.mkdir(parents=True, exist_ok=True)
    report_path = TASK / 'layers-verify.json'
    try:
        if not features.check('webp'):
            raise RuntimeError('Installed Pillow has no WebP support; install nothing automatically.')
        promo = load_module('showcase_promo', MEDIA / 'inkeys3-theme-promo/compose_hero.py')
        compose_tools = load_module('showcase_tools', MEDIA / 'inkeys3-theme-promo/compose_tools.py')
        for page, build in (('overview', lambda theme: overview(promo, theme)),
                            ('tools', lambda theme: tools_layers(compose_tools, theme))):
            report['pages'][page] = {}
            manifest[page] = export_page(page, build, report['pages'][page])
        MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8', newline='\n')
        report['total_webp_bytes'] = sum(p['full_bytes'] + p['half_bytes'] for p in report['pages'].values())
        report['total_lossless_png_bytes'] = sum(p['lossless_png_bytes'] for p in report['pages'].values())
        report['total_bytes_excluding_script_and_report'] = (report['total_webp_bytes'] +
            report['total_lossless_png_bytes'] + MANIFEST.stat().st_size)
        report['status'] = 'passed'
    except Exception as exc:
        report['status'] = 'failed'
        report['error'] = f'{type(exc).__name__}: {exc}'
        for page_report in report['pages'].values():
            if page_report.get('status') == 'running':
                page_report['status'] = 'failed'
        raise
    finally:
        report_path.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(f'Total WebP: {report["total_webp_bytes"]:,} bytes; report: {report_path}', flush=True)


if __name__ == '__main__':
    main()
