"""Headless v2 product-film compositor. Real native pixels are mandatory."""

import argparse
from functools import lru_cache
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys

from PIL import Image, ImageDraw, ImageOps

from scenekit import (
    Painter, clamp, clipped, desktop, draw_cuboid_base,
    draw_force_labels, draw_modern_arrow, draw_pendulum, draw_wave, ease,
    force_geometry, glow_strength, map_point, native_mapping, placement_box,
    progress, transition_pair, window_content, window_shell,
)


ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT.parents[1] / 'docs/.vuepress/public/feature-media'
DEFAULT_OUTPUT = ROOT / 'build/redesign-output'
PREVIEW = ROOT / 'build/redesign-compositor'
REQUIRED_SCENES = {
    'screen-dynamic', 'screen-through', 'screen-freeze', 'slides-ink',
    'slides-binding', 'slides-ready', 'board-backgrounds', 'board-pages',
}
KNOWN_NATIVE = {
    'toolbar-draw', 'toolbar-pierce', 'toolbar-freeze', 'toolbar-shape',
    'toolbar-ppt', 'toolbar-ppt-shape', 'toolbar-whiteboard', 'toolbar-whiteboard-laser',
    'ppt-page-1', 'ppt-page-2', 'board-page1', 'board-page2',
    'board-blank', 'board-dots', 'board-grid', 'pen-icon-light', 'pen-icon-dark',
    'pendulum-mark', 'force-solids', 'force-dashed',
    'cuboid-solid', 'cuboid-dashed', 'cone-solid', 'cone-dashed',
    'binding-ink', 'ready-ink', 'laser-wave', 'board-page1-ink', 'board-page2-ink',
}
CANVAS_ASSETS = {
    'pendulum-mark', 'force-solids', 'force-dashed',
    'cuboid-solid', 'cuboid-dashed', 'cone-solid', 'cone-dashed',
    'binding-ink', 'ready-ink', 'laser-wave', 'board-page1-ink', 'board-page2-ink',
}
CONTROL_ASSETS = {key for key in KNOWN_NATIVE if key.startswith(('toolbar-', 'ppt-page-'))} | {'board-page1', 'board-page2'}
BACKGROUND_ASSETS = {'board-blank', 'board-dots', 'board-grid'}


def scene_assets(scene):
    assets = set()
    controls = scene.get('controls', {})
    toolbar = controls.get('toolbar')
    if toolbar:
        assets.add(toolbar['default'])
    pager = controls.get('pager')
    if pager:
        if pager.get('byApp'):
            assets.update(pager['byApp'].values())
        else:
            pages = {1}
            pages.update(result['value'] for action in scene['actions'] for result in action.get('results', [])
                         if result['key'] == 'page' and isinstance(result['value'], int))
            prefix = 'ppt-page-' if pager['kind'] == 'ppt' else 'board-page'
            assets.update(f'{prefix}{page}' for page in pages)
    if scene['mode'] == 'backgrounds':
        assets.update(BACKGROUND_ASSETS)
    elif scene['mode'] == 'pages':
        assets.update(('board-grid', 'board-dots'))
    for action in scene['actions']:
        if action['type'] == 'draw':
            assets.add(action['asset'])
        if action.get('cursor', '').startswith('pen-icon-'):
            assets.add(action['cursor'])
        for result in action.get('results', []):
            if result['key'] == 'toolbar':
                assets.add(result['value'])
    return assets


def load_plan(path=ROOT / 'storyboard.json'):
    plan = json.loads(Path(path).read_text(encoding='utf-8-sig'))
    if plan.get('schemaVersion') != 2 or plan.get('fps') != 60 or plan.get('supersample') != 2:
        raise ValueError('Storyboard must use schemaVersion 2, 60fps and 2x supersampling')
    if {scene['id'] for scene in plan['scenes']} != REQUIRED_SCENES or len(plan['scenes']) != 8:
        raise ValueError('Storyboard scene IDs do not match the eight-scene web contract')
    expected_profiles = {'desktop': (1440, 640, 60), 'mobile': (720, 720, 60), 'readme': (960, 426, 15)}
    for name, expected in expected_profiles.items():
        profile = plan['profiles'][name]
        if (profile['width'], profile['height'], profile['fps']) != expected:
            raise ValueError(f'Invalid {name} profile')
    for scene in plan['scenes']:
        duration = scene['durationMs'] / 1000
        shots = scene['shots']
        if not shots or shots[0]['start'] != 0 or abs(shots[-1]['end'] - duration) > 1e-6:
            raise ValueError(f'Shot range does not cover scene: {scene["id"]}')
        for previous, following in zip(shots, shots[1:]):
            if previous['end'] != following['start'] or previous['start'] >= previous['end']:
                raise ValueError(f'Non-contiguous shots: {scene["id"]}')
        transition = scene['transition']
        if transition['axis'] != 'slash' or not 320 <= transition['durationMs'] <= 440:
            raise ValueError(f'Invalid slash transition: {scene["id"]}')
        camera = scene['camera']
        times = [entry['at'] for entry in camera]
        if times != sorted(set(times)) or times[0] != 0 or abs(times[-1] - duration) > 1e-6:
            raise ValueError(f'Invalid camera timeline: {scene["id"]}')
        if any(frame['target'] not in scene['anchors'] for frame in camera):
            raise ValueError(f'Unknown camera anchor: {scene["id"]}')
        for placement in scene['placements'].values():
            for profile in ('desktop', 'mobile'):
                box = placement_box(placement, profile)
                if len(box) != 4 or box[2] <= 0 or box[3] <= 0:
                    raise ValueError(f'Invalid placement: {scene["id"]}')
        for action in scene['actions']:
            kind = action['type']
            if kind == 'symbol':
                if action['symbol'] not in {'mg', 'T', 'Fₜ'} or not 0 <= action['at'] <= duration:
                    raise ValueError(f'Invalid teaching symbol: {scene["id"]}')
                continue
            if kind == 'state':
                if (not 0 <= action['start'] <= duration or not action.get('results') or
                        any(result.get('at') != 'start' for result in action['results'])):
                    raise ValueError(f'Invalid state action: {scene["id"]}')
                continue
            if not 0 <= action['start'] < action['end'] <= duration:
                raise ValueError(f'Invalid action time: {scene["id"]}/{action["id"]}')
            if kind == 'draw':
                if action['asset'] not in CANVAS_ASSETS or action['placement'] not in scene['placements']:
                    raise ValueError(f'Invalid native draw action: {scene["id"]}/{action["id"]}')
                if action.get('cursor') not in {'native', 'pen-icon-light', 'pen-icon-dark', None}:
                    raise ValueError(f'Invalid native tool cursor: {scene["id"]}/{action["id"]}')
            elif kind in {'pointer', 'click'}:
                if action['from'] not in scene['anchors'] or action['to'] not in scene['anchors']:
                    raise ValueError(f'Unknown pointer anchor: {scene["id"]}/{action["id"]}')
                if action.get('cursor') not in {'arrow', 'pen-icon-light', 'pen-icon-dark'}:
                    raise ValueError(f'Invalid editorial cursor: {scene["id"]}/{action["id"]}')
                if kind == 'click' and not action['start'] <= action['down'] <= action['up'] <= action['end']:
                    raise ValueError(f'Incomplete click causality: {scene["id"]}/{action["id"]}')
            else:
                raise ValueError(f'Unknown action type: {kind}')
            for result in action.get('results', []):
                if result.get('at') not in {'start', 'down', 'up', 'end'}:
                    raise ValueError(f'Invalid commit strategy: {scene["id"]}/{action["id"]}')
        missing = scene_assets(scene) - set(scene['required'])
        if missing or any(key not in KNOWN_NATIVE for key in scene['required']):
            raise ValueError(f'Required native IDs do not cover actions: {scene["id"]}: {sorted(missing)}')
    return plan


def result_time(action, result):
    return action[result.get('at', 'up')]


def scene_state(scene, time):
    controls = scene.get('controls', {})
    state = {
        'page': 'pendulum' if scene['mode'] == 'through' else 1,
        'app': 'powerpoint',
        'open': scene['mode'] != 'ready',
        'freeze': False,
        'toolbar': controls.get('toolbar', {}).get('default'),
        'toolbarVariant': controls.get('toolbar', {}).get('variant'),
    }
    for action in scene['actions']:
        for result in action.get('results', []):
            commit = result_time(action, result)
            if time >= commit:
                state[result['key']] = result['value']
                state[f'{result["key"]}At'] = commit
    return state


def transition_info(scene, time, key):
    duration = scene['transition']['durationMs'] / 1000
    candidates = []
    for action in scene['actions']:
        for result in action.get('results', []):
            if result['key'] == key:
                commit = result_time(action, result)
                if commit <= time < commit + duration:
                    candidates.append((commit, result['value']))
    if not candidates:
        return None
    commit, current = max(candidates)
    previous = scene_state(scene, commit - 1e-7)[key]
    return previous, current, progress(time, commit, duration), commit


def camera_at(scene, time, anchors):
    frames = scene['camera']
    current = frames[0]
    for following in frames[1:]:
        if time <= following['at']:
            amount = ease(progress(time, current['at'], following['at'] - current['at']))
            start, end = anchors[current['target']], anchors[following['target']]
            return (
                current['scale'] + (following['scale'] - current['scale']) * amount,
                start[0] + (end[0] - start[0]) * amount,
                start[1] + (end[1] - start[1]) * amount,
                current.get('shift', 0) + (following.get('shift', 0) - current.get('shift', 0)) * amount,
            )
        current = following
    target = anchors[current['target']]
    return current['scale'], target[0], target[1], current.get('shift', 0)


class NativeSources:
    def __init__(self, manifest, canvas_size=(1440, 720)):
        self.path = Path(manifest).resolve()
        if not self.path.is_file():
            raise ValueError(f'Missing real native manifest: {self.path}')
        self.data = json.loads(self.path.read_text(encoding='utf-8-sig'))
        if self.data.get('schemaVersion') not in {1, 2} or not self.data.get('provenance'):
            raise ValueError('Native captures need schemaVersion 1/2 and renderer provenance')
        self.assets = {asset['id']: asset for asset in self.data['assets']}
        self.canvas_size = tuple(canvas_size)
        self.contract_path = self.path.parent / 'asset-contract.json'
        self.contract = None
        self.contract_assets = {}
        if self.contract_path.is_file():
            self.contract = json.loads(self.contract_path.read_text(encoding='utf-8-sig'))
            if (self.contract.get('schemaVersion') != 2 or
                    self.contract.get('contract') != 'inkeys3-feature-media-native-redesign' or
                    not self.contract.get('idsAreAuthoritative')):
                raise ValueError('Unsupported authoritative native asset contract')
            pixels = self.contract['pixelContract']
            if pixels['sequenceFps'] != 60 or tuple(pixels['draw3Canvas']) != self.canvas_size:
                raise ValueError('Native asset contract canvas/fps does not match storyboard')
            self.contract_assets = {asset['id']: asset for asset in self.contract['assets']}
        self.used = set()

    def sequence_info(self, key):
        if self.contract is None:
            return None
        return self.contract_assets.get(key, {}).get('sequence')

    def asset(self, key, variant=None):
        asset = self.assets[key]
        variants = asset.get('variants', {})
        if variant and variants:
            if variant not in variants:
                raise ValueError(f'Missing native variant {key}:{variant}')
            return {**asset, **variants[variant]}
        return asset

    def require(self, scenes):
        required = {key for scene in scenes for key in scene['required']}
        missing = sorted(required - self.assets.keys())
        if missing:
            raise ValueError('Missing real native captures: ' + ', '.join(missing))
        if self.contract is not None:
            undeclared = sorted(required - self.contract_assets.keys())
            if undeclared:
                raise ValueError('Native IDs absent from authoritative contract: ' + ', '.join(undeclared))
            provenance_missing = [key for key in self.contract['pixelContract']['provenanceRequired']
                                  if key not in self.data['provenance']]
            if provenance_missing:
                raise ValueError('Native provenance incomplete: ' + ', '.join(provenance_missing))
        for key in sorted(required):
            asset = self.assets[key]
            sequence = self.sequence_info(key)
            if sequence and len(asset.get('frames', [])) != sequence['frames']:
                raise ValueError(f'Native frame count does not match asset contract: {key}')
            names = [asset['file'], *asset.get('frames', [])]
            for variant in asset.get('variants', {}).values():
                names.extend([variant['file'], *variant.get('frames', [])])
            for name in names:
                path = (self.path.parent / name).resolve()
                if not path.is_relative_to(self.path.parent) or not path.is_file():
                    raise ValueError(f'Invalid or missing native source: {name}')
            self.check_hashes(asset)
            for variant in asset.get('variants', {}).values():
                self.check_hashes(variant)
            if key in CANVAS_ASSETS:
                if not asset.get('frames'):
                    raise ValueError(f'Native preview/commit sequence required: {key}')
                self.check_canvas(asset, key)
        for scene in scenes:
            for action in scene['actions']:
                if action['type'] != 'draw' or not action.get('nativeDuration') or action.get('initial'):
                    continue
                asset = self.assets[action['asset']]
                expected = round((action['end'] - action['start']) * asset.get('fps', 60))
                if abs(len(asset['frames']) - expected) > 1:
                    raise ValueError(f'Native lifecycle does not match shared timeline: {action["asset"]}')

    def check_hashes(self, asset):
        declared = asset.get('sha256')
        if declared and hashlib.sha256((self.path.parent / asset['file']).read_bytes()).hexdigest() != declared:
            raise ValueError(f'Native source hash mismatch: {asset["file"]}')
        frame_hashes = asset.get('frameSha256', [])
        if frame_hashes and len(frame_hashes) != len(asset.get('frames', [])):
            raise ValueError(f'Native frame hash count mismatch: {asset["id"]}')
        for name, expected in zip(asset.get('frames', []), frame_hashes):
            if hashlib.sha256((self.path.parent / name).read_bytes()).hexdigest() != expected:
                raise ValueError(f'Native frame hash mismatch: {name}')

    def check_canvas(self, asset, key):
        expected_ratio = self.canvas_size[0] / self.canvas_size[1]
        sizes = []
        for name in [asset['file'], *asset['frames']]:
            with Image.open(self.path.parent / name) as image:
                if image.mode != 'RGBA':
                    raise ValueError(f'Native canvas must use straight-alpha RGBA: {key}')
                sizes.append(image.size)
        if len(set(sizes)) != 1:
            raise ValueError(f'Native canvas frames lose shared alpha bounds: {key}')
        if abs(sizes[0][0] / sizes[0][1] - expected_ratio) > 0.002:
            raise ValueError(f'Native canvas aspect does not match storyboard: {key}')

    @lru_cache(maxsize=96)
    def original(self, name):
        with Image.open(self.path.parent / name) as image:
            return image.convert('RGBA')

    @lru_cache(maxsize=64)
    def bounds(self, key, variant=None):
        asset = self.asset(key, variant)
        if key in CONTROL_ASSETS or key in BACKGROUND_ASSETS:
            with Image.open(self.path.parent / asset['file']) as image:
                return 0, 0, image.width, image.height
        rectangles = []
        for name in [asset['file'], *asset.get('frames', [])]:
            with Image.open(self.path.parent / name) as image:
                bounds = image.convert('RGBA').getbbox()
                if bounds:
                    rectangles.append(bounds)
        if not rectangles:
            raise ValueError(f'Empty native alpha capture: {key}')
        return (min(rect[0] for rect in rectangles), min(rect[1] for rect in rectangles),
                max(rect[2] for rect in rectangles), max(rect[3] for rect in rectangles))

    def image(self, key, amount=1, variant=None, canvas=False, sequence=False):
        self.used.add(key)
        asset = self.asset(key, variant)
        frames = asset.get('frames', [])
        if frames and (sequence or amount < 1):
            index = min(len(frames) - 1, int(clamp(amount) * len(frames)))
            image = self.original(frames[index])
        else:
            if canvas and amount < 1:
                raise ValueError(f'Native progression cannot be faked from a static image: {key}')
            image = self.original(asset['file'])
        if canvas or key in BACKGROUND_ASSETS:
            return image.copy()
        return image.crop(self.bounds(key, variant))

    def hotspot(self, key, image):
        asset = self.assets[key]
        hotspot = asset.get('hotspot', [0, 0])
        if all(0 <= value <= 1 for value in hotspot):
            return hotspot[0] * image.width, hotspot[1] * image.height
        bounds = self.bounds(key)
        scale_x = image.width / max(1, bounds[2] - bounds[0])
        scale_y = image.height / max(1, bounds[3] - bounds[1])
        return (hotspot[0] - bounds[0]) * scale_x, (hotspot[1] - bounds[1]) * scale_y


class Film:
    def __init__(self, plan, sources, font):
        self.plan = plan
        self.sources = sources
        self.font_path = Path(font)
        self.supersample = plan['supersample']
        self.background_cache = {}

    def profile(self, width, height):
        for name in ('desktop', 'mobile'):
            profile = self.plan['profiles'][name]
            if (width, height) == (profile['width'], profile['height']):
                return name
        raise ValueError(f'Unknown film profile: {width}x{height}')

    def image(self, width, height, color=(0, 0, 0, 0)):
        return Image.new('RGBA', (width * self.supersample, height * self.supersample), color)

    def painter(self, image):
        return Painter(image, self.supersample, self.font_path)

    def mapping(self, scene, placement, profile):
        return native_mapping(scene['placements'][placement], profile, self.plan['nativeCanvas'])

    def anchor(self, scene, name, profile):
        anchor = scene['anchors'][name]
        if 'native' in anchor:
            return map_point(self.mapping(scene, anchor['placement'], profile), anchor['native'])
        return tuple(anchor[profile])

    def native_background(self, key, width, height):
        cache_key = (key, width, height)
        if cache_key not in self.background_cache:
            self.background_cache[cache_key] = ImageOps.fit(
                self.sources.image(key), (width * self.supersample, height * self.supersample),
                Image.Resampling.LANCZOS)
        return self.background_cache[cache_key].copy()

    def paste_control(self, canvas, key, placement, profile, amount=1, variant=None, alpha=1):
        if alpha <= 0:
            return
        image = self.sources.image(key, amount, variant=variant)
        settings = self.plan['defaults']['controls'][placement][profile]
        width = round(settings['width'] * self.supersample)
        height = max(1, round(image.height * width / image.width))
        image = image.resize((width, height), Image.Resampling.LANCZOS)
        if alpha < 1:
            image.putalpha(image.getchannel('A').point(lambda value: round(value * alpha)))
        center = settings['center']
        canvas.alpha_composite(image, (round(center[0] * self.supersample - width / 2),
                                      round(center[1] * self.supersample - height / 2)))

    def paste_canvas(self, canvas, scene, action, profile, amount):
        key = action['asset']
        image = self.sources.image(key, amount, canvas=True, sequence=action.get('sequence', False))
        mapping = self.mapping(scene, action['placement'], profile)
        source_width, source_height = mapping['source']
        size = (max(1, round(source_width * mapping['sx'] * self.supersample)),
                max(1, round(source_height * mapping['sy'] * self.supersample)))
        image = image.resize(size, Image.Resampling.LANCZOS)
        layer = Image.new('RGBA', canvas.size)
        layer.alpha_composite(image, (round(mapping['ox'] * self.supersample),
                                      round(mapping['oy'] * self.supersample)))
        box = placement_box(scene['placements'][action['placement']], profile)
        canvas.alpha_composite(clipped(layer, box, self.supersample))

    def paste_draws(self, canvas, scene, time, profile, placement, page=None, app=None):
        for action in scene['actions']:
            if action['type'] != 'draw' or action['placement'] != placement:
                continue
            if page is not None and action.get('page') != page:
                continue
            if app is not None and action.get('app') != app:
                continue
            visible_until = action.get('visibleUntil', action['end'])
            if (time < action['start'] or time >= action.get('until', float('inf')) or
                    (action.get('transient') and time >= visible_until)):
                continue
            if 'amount' in action:
                amount = action['amount']
            else:
                amount = 1 if action.get('initial') else progress(time, action['start'], action['end'] - action['start'])
            self.paste_canvas(canvas, scene, action, profile, amount)

    def pager_key(self, pager, state):
        if pager.get('byApp'):
            return pager['byApp'][state['app']]
        return f'ppt-page-{state["page"]}' if pager['kind'] == 'ppt' else f'board-page{state["page"]}'

    def control_visual(self, scene, time, control, current_key, pager=None):
        for action in reversed(scene['actions']):
            if action.get('control') != control or action['type'] != 'click':
                continue
            result = next((result for result in action.get('results', [])
                           if result['key'] == ('toolbar' if control == 'toolbar' else 'page')), None)
            if control == 'pager' and result is None:
                continue
            commit = result_time(action, result) if result else action['up']
            if control == 'toolbar':
                visual_key = result['value'] if result else current_key
            else:
                visual_key = self.pager_key(pager, scene_state(scene, commit - 1e-7))
            sequence = self.sources.sequence_info(visual_key)
            asset = self.sources.asset(visual_key)
            if sequence and asset.get('frames'):
                fps = asset.get('fps', 60)
                native_start = commit - sequence['commitFrame'] / fps
                duration = len(asset['frames']) / fps
            else:
                native_start = action['down']
                duration = max(0.45, action['end'] - action['down'])
            if native_start <= time < native_start + duration:
                return visual_key, max(0.000001, progress(time, native_start, duration))
        return current_key, 1

    def browser_page(self, scene, time, profile, page, state):
        width, height = self.profile_size(profile)
        layer = self.image(width, height)
        painter = self.painter(layer)
        content = window_content(scene['placements']['window'][profile], 'browser')
        painter.rectangle(content, fill='#fafcfb')
        mapping = self.mapping(scene, 'page', profile)
        if page == 'wave':
            draw_wave(painter, mapping, self.plan['shared']['wave'], time)
        else:
            draw_pendulum(painter, mapping, self.plan['shared']['pendulum'], time,
                          state.get('freezeAt') if state.get('freeze') else None)
        if scene['mode'] == 'through':
            for name, direction in (('back', -1), ('next', 1)):
                center = self.anchor(scene, name, profile)
                painter.ellipse(center, 24, fill='#edf2f2', outline='#a9b8ba', width=1.5)
                x, y = center
                painter.line([(x + direction * 5, y - 9), (x - direction * 4, y),
                              (x + direction * 5, y + 9)], '#48646b', 2.4)
        return layer

    def browser(self, scene, time, profile, state):
        width, height = self.profile_size(profile)
        canvas = self.image(width, height, self.plan['palette']['paper'])
        window_shell(self.painter(canvas), scene['placements']['window'][profile], 'browser')
        page = scene_state(scene, time)['page'] if scene['mode'] == 'through' else 'pendulum'
        transition = transition_info(scene, time, 'page') if scene['mode'] == 'through' else None
        if transition:
            previous, current, amount, _ = transition
            outgoing = self.browser_page(scene, time, profile, previous, state)
            incoming = self.browser_page(scene, time, profile, current, state)
            body = transition_pair(outgoing, incoming, amount, scene['transition']['distance'],
                                   self.supersample, reverse=current == 'pendulum')
        else:
            body = self.browser_page(scene, time, profile, page, state)
        self.paste_draws(body, scene, time, profile, 'page')
        if scene['mode'] == 'freeze':
            visible = {action['symbol'] for action in scene['actions']
                       if action['type'] == 'symbol' and time >= action['at']}
            draw_force_labels(self.painter(body), self.mapping(scene, 'page', profile),
                              force_geometry(self.plan['shared']['pendulum']), visible)
        content = window_content(scene['placements']['window'][profile], 'browser')
        canvas.alpha_composite(clipped(body, content, self.supersample, 10))
        return canvas

    def slide(self, scene, time, profile, page=1, app='powerpoint', placement='slide'):
        width, height = self.profile_size(profile)
        layer = self.image(width, height)
        painter = self.painter(layer)
        mapping = self.mapping(scene, placement, profile)
        if app == 'wps':
            draw_wave(painter, mapping, self.plan['shared']['wave'], time)
        elif scene['mode'] == 'ready':
            draw_cuboid_base(painter, mapping, self.plan['shared']['cuboid'])
        self.paste_draws(layer, scene, time, profile, placement,
                         page=page if scene['mode'] in {'slides', 'pages'} else None,
                         app=app if scene['mode'] == 'binding' else None)
        return layer

    def slide_window(self, scene, time, profile, state):
        width, height = self.profile_size(profile)
        canvas = self.image(width, height, self.plan['palette']['desktop'])
        window_shell(self.painter(canvas), scene['placements']['window'][profile], 'powerpoint')
        page = state['page']
        transition = transition_info(scene, time, 'page')
        if transition:
            previous, current, amount, _ = transition
            outgoing = self.slide(scene, time, profile, previous)
            incoming = self.slide(scene, time, profile, current)
            body = transition_pair(outgoing, incoming, amount, scene['transition']['distance'],
                                   self.supersample, reverse=current < previous)
        else:
            body = self.slide(scene, time, profile, page)
        content = window_content(scene['placements']['window'][profile], 'powerpoint')
        canvas.alpha_composite(clipped(body, content, self.supersample, 8))
        return canvas

    def app_window_box(self, scene, profile, app):
        placement = 'pptSlide' if app == 'powerpoint' else 'wpsSlide'
        x, y, width, height = scene['placements'][placement][profile]
        return x - 50, y - 100, width + 100, height + 150

    def app_window(self, scene, time, profile, app, alpha=1):
        width, height = self.profile_size(profile)
        layer = self.image(width, height)
        window_shell(self.painter(layer), self.app_window_box(scene, profile, app), app)
        placement = 'pptSlide' if app == 'powerpoint' else 'wpsSlide'
        slide = self.slide(scene, time, profile, page=1, app=app, placement=placement)
        content = window_content(self.app_window_box(scene, profile, app), app)
        layer.alpha_composite(clipped(slide, content, self.supersample, 8))
        if alpha < 1:
            layer.putalpha(layer.getchannel('A').point(lambda value: round(value * alpha)))
        return layer

    def binding(self, scene, time, profile, state):
        width, height = self.profile_size(profile)
        canvas = self.image(width, height)
        desktop(self.painter(canvas), width, height)
        transition = transition_info(scene, time, 'app')
        if transition:
            previous, current, amount, _ = transition
            outgoing = self.app_window(scene, time, profile, previous, 0.86)
            incoming = self.app_window(scene, time, profile, current)
            canvas.alpha_composite(transition_pair(outgoing, incoming, amount, scene['transition']['distance'],
                                                   self.supersample, reverse=current == 'powerpoint'))
        else:
            inactive = 'wps' if state['app'] == 'powerpoint' else 'powerpoint'
            canvas.alpha_composite(self.app_window(scene, time, profile, inactive, 0.86))
            canvas.alpha_composite(self.app_window(scene, time, profile, state['app']))
        return canvas

    def no_install_symbols(self, scene, profile, alpha=1):
        if alpha <= 0:
            return None
        width, height = self.profile_size(profile)
        layer = self.image(width, height)
        painter = self.painter(layer)
        centers = [(width * 0.22, height * 0.68), (width * 0.78, height * 0.68)]
        for index, center in enumerate(centers):
            x, y = center
            color = '#78898d'
            if index == 0:
                painter.rounded((x - 30, y - 34, 60, 60), 8, outline=color, width=3)
                painter.line([(x, y - 50), (x, y - 12)], color, 4)
                painter.polygon([(x - 9, y - 20), (x, y - 10), (x + 9, y - 20)], fill=color)
                painter.line([(x - 15, y + 10), (x + 15, y + 10)], color, 3)
            else:
                painter.rounded((x - 31, y - 25, 62, 48), 10, outline=color, width=4)
                painter.ellipse((x - 8, y - 34), 9, fill=self.plan['palette']['desktop'], outline=color, width=3)
                painter.ellipse((x + 23, y - 7), 8, fill=self.plan['palette']['desktop'], outline=color, width=3)
            painter.ellipse(center, 48, outline=color, width=4)
            painter.line([(x - 34, y - 34), (x + 34, y + 34)], color, 5)
        if alpha < 1:
            layer.putalpha(layer.getchannel('A').point(lambda value: round(value * alpha)))
        return layer

    def ready_desktop(self, scene, time, profile):
        width, height = self.profile_size(profile)
        canvas = self.image(width, height)
        painter = self.painter(canvas)
        desktop(painter, width, height)
        file = self.anchor(scene, 'fileIcon', profile)
        inkeys = (file[0] - (240 if profile == 'desktop' else 170), file[1])
        painter.rounded((inkeys[0] - 42, inkeys[1] - 42, 84, 84), 20, fill='#183f46')
        painter.line([(inkeys[0] - 16, inkeys[1] + 19), (inkeys[0] + 16, inkeys[1] - 20)], '#e9fff8', 8)
        painter.polygon([(inkeys[0] - 20, inkeys[1] + 25), (inkeys[0] - 9, inkeys[1] + 22),
                         (inkeys[0] - 18, inkeys[1] + 12)], fill='#58ffec')
        painter.rounded((file[0] - 42, file[1] - 48, 84, 96), 12, fill='#fffaf6', outline='#c45b37', width=2)
        painter.rounded((file[0] - 27, file[1] - 30, 54, 34), 8, fill='#c45b37')
        painter.text((file[0], file[1] - 13), 'P', 22, '#ffffff')
        painter.rectangle((file[0] - 25, file[1] + 16, 50, 4), fill='#dec9bd')
        painter.rectangle((file[0] - 25, file[1] + 28, 36, 4), fill='#dec9bd')
        symbols = self.no_install_symbols(scene, profile)
        canvas.alpha_composite(symbols)
        return canvas

    def chain_symbol(self, scene, time, profile):
        if not 2.0 <= time < 2.8:
            return None
        alpha = ease(progress(time, 2.0, 0.2)) * (1 - ease(progress(time, 2.45, 0.35)))
        if alpha <= 0:
            return None
        width, height = self.profile_size(profile)
        layer = self.image(width, height)
        painter = self.painter(layer)
        center = (width / 2, 150 if profile == 'desktop' else 128)
        x, y = center
        color = '#168573'
        painter.rounded((x - 61, y - 18, 70, 36), 18, outline=color, width=6)
        painter.rounded((x - 9, y - 18, 70, 36), 18, outline=color, width=6)
        painter.line([(x - 20, y + 42), (x - 4, y + 57), (x + 24, y + 28)], color, 6)
        layer.putalpha(layer.getchannel('A').point(lambda value: round(value * alpha)))
        return layer

    def ready(self, scene, time, profile, state):
        transition = transition_info(scene, time, 'open')
        if transition:
            _, _, amount, _ = transition
            outgoing = self.ready_desktop(scene, time, profile)
            incoming = self.slide_window(scene, time, profile, state)
            canvas = transition_pair(outgoing, incoming, amount, scene['transition']['distance'], self.supersample)
        elif state['open']:
            canvas = self.slide_window(scene, time, profile, state)
        else:
            canvas = self.ready_desktop(scene, time, profile)
        if state['open']:
            fade = 1 - ease(progress(time, 2.0, 0.6))
            symbols = self.no_install_symbols(scene, profile, fade)
            if symbols:
                canvas.alpha_composite(symbols)
            chain = self.chain_symbol(scene, time, profile)
            if chain:
                canvas.alpha_composite(chain)
        return canvas

    def triptych(self, scene, time, profile):
        width, height = self.profile_size(profile)
        images = [self.native_background(key, width, height) for key in ('board-blank', 'board-dots', 'board-grid')]
        canvas = images[0].copy()
        slope = 70 if profile == 'desktop' else 50
        for index in (1, 2):
            amount = ease(progress(time, 0.5 + (index - 1) * 0.12, 0.58))
            target = width * index / 3
            edge = width + slope + (target - width - slope) * amount
            mask = Image.new('L', canvas.size)
            draw = ImageDraw.Draw(mask)
            points = [(edge + slope, 0), (width, 0), (width, height), (edge - slope, height)]
            draw.polygon([(round(x * self.supersample), round(y * self.supersample)) for x, y in points], fill=255)
            canvas = Image.composite(images[index], canvas, mask)
        return canvas

    def backgrounds(self, scene, time, profile):
        width, height = self.profile_size(profile)
        laser = next(action for action in scene['actions'] if action['asset'] == 'laser-wave')
        transition_at = laser.get('visibleUntil', laser['end'])
        if transition_at <= time < transition_at + scene['transition']['durationMs'] / 1000:
            outgoing = self.triptych(scene, transition_at, profile)
            incoming = self.native_background('board-grid', width, height)
            canvas = transition_pair(outgoing, incoming,
                                     progress(time, transition_at, scene['transition']['durationMs'] / 1000),
                                     scene['transition']['distance'], self.supersample)
        elif time >= transition_at:
            canvas = self.native_background('board-grid', width, height)
        else:
            canvas = self.triptych(scene, time, profile)
        self.paste_draws(canvas, scene, time, profile, 'board')
        return canvas

    def board_page(self, scene, time, profile, page):
        width, height = self.profile_size(profile)
        canvas = self.native_background('board-grid' if page == 1 else 'board-dots', width, height)
        self.paste_draws(canvas, scene, time, profile, 'board', page=page)
        return canvas

    def pages(self, scene, time, profile, state):
        transition = transition_info(scene, time, 'page')
        if transition:
            previous, current, amount, _ = transition
            return transition_pair(self.board_page(scene, time, profile, previous),
                                   self.board_page(scene, time, profile, current), amount,
                                   scene['transition']['distance'], self.supersample, reverse=current < previous)
        return self.board_page(scene, time, profile, state['page'])

    def profile_size(self, profile):
        settings = self.plan['profiles'][profile]
        return settings['width'], settings['height']

    def draw_controls(self, canvas, scene, time, profile, state):
        controls = scene.get('controls', {})
        toolbar = controls.get('toolbar')
        if toolbar and (not toolbar.get('visibleWhen') or state.get(toolbar['visibleWhen'])):
            key, amount = self.control_visual(scene, time, 'toolbar', state['toolbar'])
            self.paste_control(canvas, key, toolbar['placement'], profile, amount, state.get('toolbarVariant'))
        pager = controls.get('pager')
        if not pager or time < pager['visibleFrom'] or (scene['mode'] == 'ready' and not state['open']):
            return
        key = self.pager_key(pager, state)
        key, amount = self.control_visual(scene, time, 'pager', key, pager)
        alpha = ease(progress(time, pager['visibleFrom'], 0.3)) if pager.get('animateIn') else 1
        self.paste_control(canvas, key, pager['placement'], profile, amount, alpha=alpha)

    def pointer(self, scene, time, profile):
        candidates = []
        for action in scene['actions']:
            if action['type'] == 'draw' and action.get('cursor', 'native').startswith('pen-icon-'):
                if action['start'] <= time <= action['end'] and action.get('paths'):
                    points = [point for path in action['paths'] for point in path]
                    contact_duration = action['end'] - action['start']
                    sequence = self.sources.sequence_info(action['asset'])
                    if sequence and sequence.get('upFrame') is not None:
                        contact_duration *= sequence['upFrame'] / sequence['frames']
                    position = self.path_point(points, progress(time, action['start'], contact_duration))
                    candidates.append((action['start'], action['cursor'],
                                       map_point(self.mapping(scene, action['placement'], profile), position), False, 0))
            elif action['type'] in {'pointer', 'click'} and action['start'] <= time <= action['end']:
                down = action['type'] == 'click' and action['down'] <= time < action['up']
                stop = action.get('down', action['end'])
                travel = min(0.4, max(0.001, (stop - action['start']) * 0.8))
                move_end = action['start'] + travel
                amount = ease(progress(time, action['start'], move_end - action['start']))
                start, end = self.anchor(scene, action['from'], profile), self.anchor(scene, action['to'], profile)
                position = (start[0] + (end[0] - start[0]) * amount,
                            start[1] + (end[1] - start[1]) * amount)
                glow = glow_strength(time, move_end, down) if action['cursor'] == 'arrow' else 0
                candidates.append((action['start'], action['cursor'], position, down, glow))
        if not candidates:
            return None
        _, cursor, position, down, glow = max(candidates, key=lambda item: item[0])
        return cursor, position, down, glow

    def path_point(self, points, amount):
        if len(points) == 1:
            return points[0]
        lengths = [math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(points, points[1:])]
        distance = sum(lengths) * clamp(amount)
        for (a, b), length in zip(zip(points, points[1:]), lengths):
            if distance <= length and length:
                ratio = distance / length
                return a[0] + (b[0] - a[0]) * ratio, a[1] + (b[1] - a[1]) * ratio
            distance -= length
        return points[-1]

    def draw_pointer(self, canvas, pointer):
        if not pointer:
            return
        cursor, position, down, glow = pointer
        if cursor == 'arrow':
            draw_modern_arrow(canvas, self.supersample, position, self.font_path, down, glow)
            return
        image = self.sources.image(cursor)
        width = round(34 * self.supersample)
        height = max(1, round(image.height * width / image.width))
        image = image.resize((width, height), Image.Resampling.LANCZOS)
        hotspot = self.sources.hotspot(cursor, image)
        canvas.alpha_composite(image, (round(position[0] * self.supersample - hotspot[0]),
                                      round(position[1] * self.supersample - hotspot[1])))

    def frame(self, scene, time, width, height):
        profile = self.profile(width, height)
        time = clamp(time / (scene['durationMs'] / 1000)) * (scene['durationMs'] / 1000)
        state = scene_state(scene, time)
        mode = scene['mode']
        if mode in {'dynamic', 'through', 'freeze'}:
            canvas = self.browser(scene, time, profile, state)
        elif mode == 'slides':
            canvas = self.slide_window(scene, time, profile, state)
        elif mode == 'binding':
            canvas = self.binding(scene, time, profile, state)
        elif mode == 'ready':
            canvas = self.ready(scene, time, profile, state)
        elif mode == 'backgrounds':
            canvas = self.backgrounds(scene, time, profile)
        else:
            canvas = self.pages(scene, time, profile, state)
        scale, target_x, target_y, shift = camera_at(scene, time, {
            name: self.anchor(scene, name, profile) for name in scene['anchors']
        })
        if scale != 1 or shift:
            matte = self.plan['palette']['paper']
            canvas = canvas.transform(canvas.size, Image.Transform.AFFINE, (
                1 / scale, 0, target_x * self.supersample - (target_x + shift) * self.supersample / scale,
                0, 1 / scale, target_y * self.supersample - (target_y - shift) * self.supersample / scale,
            ), Image.Resampling.BICUBIC, fillcolor=matte)
        self.draw_controls(canvas, scene, time, profile, state)
        self.draw_pointer(canvas, self.pointer(scene, time, profile))
        return canvas.convert('RGB').resize((width, height), Image.Resampling.LANCZOS)


def locate_ffmpeg(explicit):
    candidates = [explicit, os.environ.get('FFMPEG_BIN'), shutil.which('ffmpeg')]
    local = Path(os.environ.get('LOCALAPPDATA', '.')) / 'JianyingPro/Apps'
    if local.is_dir():
        candidates.extend(str(path) for path in sorted(local.glob('*/ffmpeg.exe'), reverse=True))
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return str(Path(candidate).resolve())
    raise ValueError('Provide --ffmpeg or FFMPEG_BIN; no encoder is downloaded automatically')


def encoder_for(ffmpeg):
    output = subprocess.run([ffmpeg, '-hide_banner', '-encoders'], capture_output=True, text=True, check=True).stdout
    for encoder in ('libx264', 'h264_mf'):
        if encoder in output:
            return encoder
    raise ValueError('FFmpeg requires libx264 or h264_mf for browser-compatible H.264')


def video(film, scene, profile, output, ffmpeg, encoder, resume=False):
    fps = film.plan['fps']
    width, height = profile['width'], profile['height']
    frame_count = round(scene['durationMs'] * fps / 1000)
    if resume and output.is_file():
        probe = subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-i', str(output),
                                '-map', '0:v:0', '-f', 'framemd5', '-'], capture_output=True, text=True)
        if probe.returncode == 0:
            count = len([line for line in probe.stdout.splitlines() if line and not line.startswith('#')])
            if count == frame_count:
                print(f'Reusing {output.name}: {count} decoded frames', flush=True)
                return count
    temporary = output.with_suffix('.rendering.mp4')
    args = [ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pixel_format', 'rgb24',
            '-video_size', f'{width}x{height}', '-framerate', str(fps), '-i', '-', '-an', '-c:v', encoder,
            '-pix_fmt', 'yuv420p', '-g', str(fps), '-movflags', '+faststart']
    if encoder == 'libx264':
        args.extend(['-preset', 'medium', '-crf', '19'])
    else:
        args.extend(['-b:v', '5000k' if width > height else '3500k'])
    args.append(str(temporary))
    log_path = PREVIEW / 'logs' / f'{output.stem}-encode.log'
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open('wb') as log:
        process = subprocess.Popen(args, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=log)
        try:
            for frame in range(frame_count):
                process.stdin.write(film.frame(scene, frame / fps, width, height).tobytes())
            process.stdin.close()
            if process.wait(timeout=180) != 0:
                raise RuntimeError(f'Encoder failed; see {log_path}')
        except BaseException:
            if process.poll() is None:
                process.kill()
            process.wait()
            raise
    probe = subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-i', str(temporary),
                            '-map', '0:v:0', '-f', 'framemd5', '-'], capture_output=True, text=True, check=True)
    count = len([line for line in probe.stdout.splitlines() if line and not line.startswith('#')])
    if count != frame_count:
        raise ValueError(f'Decoded {count} frames from {temporary}; expected {frame_count}')
    temporary.replace(output)
    return count


def gif(film, scene, output):
    profile = film.plan['profiles']['readme']
    width, height, fps = profile['width'], profile['height'], profile['fps']
    source = film.plan['profiles'][profile['sourceProfile']]
    frames = [film.frame(scene, index / fps, source['width'], source['height']).resize((width, height), Image.Resampling.LANCZOS)
              for index in range(round(scene['durationMs'] * fps / 1000))]
    samples = Image.new('RGB', (width * 4, height))
    for column, ratio in enumerate((0.1, 0.35, 0.65, 0.9)):
        samples.paste(frames[min(len(frames) - 1, round(ratio * (len(frames) - 1)))], (column * width, 0))
    palette = samples.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
    frames = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in frames]
    durations = [round((index + 1) * 100 / fps) * 10 - round(index * 100 / fps) * 10 for index in range(len(frames))]
    frames[0].save(output, save_all=True, append_images=frames[1:], duration=durations, loop=0, optimize=True)


def contact_sheet(film, scenes, output, mobile=False):
    profile = 'mobile' if mobile else 'desktop'
    source = film.plan['profiles'][profile]
    width, height = (360, 360) if mobile else (480, 214)
    columns = max(len(scene['contactTimes']) for scene in scenes)
    canvas = Image.new('RGB', (width * columns, (height + 40) * len(scenes)), '#e7ebe8')
    draw = ImageDraw.Draw(canvas)
    painter = Painter(canvas, 1, film.font_path)
    for row, scene in enumerate(scenes):
        for column, time in enumerate(scene['contactTimes']):
            frame = film.frame(scene, time, source['width'], source['height']).resize((width, height), Image.Resampling.LANCZOS)
            canvas.paste(frame, (column * width, row * (height + 40)))
            painter.text((column * width + 12, row * (height + 40) + height + 20),
                         f'{scene["id"]} · {time:.2f}s', 16, '#203b40', 'lm')
    canvas.save(output, quality=92)


def scope_name(scenes):
    if len(scenes) == len(REQUIRED_SCENES):
        return 'all'
    identifiers = [scene['id'] for scene in scenes]
    if len(identifiers) <= 3:
        return '-'.join(identifiers)
    digest = hashlib.sha256(','.join(identifiers).encode()).hexdigest()[:8]
    return f'range-{identifiers[0]}-to-{identifiers[-1]}-{digest}'


def export_representatives(film, scenes, mobile=False):
    profile = 'mobile' if mobile else 'desktop'
    source = film.plan['profiles'][profile]
    directory = PREVIEW / 'frames'
    directory.mkdir(parents=True, exist_ok=True)
    for scene in scenes:
        duration = scene['durationMs'] / 1000
        times = {'first': 0, 'poster': scene['posterTime'], 'last': duration - 1 / film.plan['fps']}
        for kind, time in times.items():
            film.frame(scene, time, source['width'], source['height']).save(
                directory / f'{scene["id"]}-{profile}-{kind}.png')


def export_manifest(args, plan, scenes, sources, entries, encoder):
    manifest = args.output / 'manifest.json'
    prior = json.loads(manifest.read_text(encoding='utf-8')) if manifest.is_file() else {'schemaVersion': 1, 'scenes': []}
    updated = {entry['id']: entry for entry in prior.get('scenes', [])}
    updated.update({entry['id']: entry for entry in entries})
    manifest.write_text(json.dumps({'schemaVersion': 1, 'scenes': [updated[scene['id']] for scene in plan['scenes'] if scene['id'] in updated]},
                                   ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    provenance = {
        'schemaVersion': 2,
        'native': sources.data['provenance'],
        'renderer': 'Pillow 2x editorial compositor + FFmpeg H.264',
        'encoder': encoder,
        'storyboardSha256': hashlib.sha256((ROOT / 'storyboard.json').read_bytes()).hexdigest(),
        'rendererSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'scenekitSha256': hashlib.sha256((ROOT / 'scenekit.py').read_bytes()).hexdigest(),
        'editorialArrowSha256': hashlib.sha256((ROOT / 'editorial/cursor-arrow.json').read_bytes()).hexdigest(),
        'sourceManifestSha256': hashlib.sha256(sources.path.read_bytes()).hexdigest(),
        'fps': plan['fps'],
        'supersample': plan['supersample'],
        'profiles': plan['profiles'],
        'boundary': 'Native UI/Draw3 pixels and scripted state; teaching windows, math labels, editorial cursor and slash transitions are separate. PowerPoint/WPS windows are stylized teaching environments, not Office/COM end-to-end acceptance.',
        'sources': sorted({key for scene in plan['scenes'] if scene['id'] in updated for key in scene['required']}),
    }
    (args.output / 'provenance.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sources', type=Path, default=ROOT / 'sources-redesign/manifest.json')
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument('--scene', action='append', choices=sorted(REQUIRED_SCENES))
    parser.add_argument('--ffmpeg')
    parser.add_argument('--font', type=Path, default=Path('C:/Windows/Fonts/segoeui.ttf'))
    parser.add_argument('--check', action='store_true', help='Validate v2 timeline and mandatory native inputs without rendering')
    parser.add_argument('--contacts-only', action='store_true')
    parser.add_argument('--skip-gif', action='store_true')
    parser.add_argument('--resume', action='store_true', help='Reuse only videos whose actual decoded frame count is complete')
    args = parser.parse_args()
    plan = load_plan()
    scenes = [scene for scene in plan['scenes'] if not args.scene or scene['id'] in args.scene]
    sources = NativeSources(args.sources, plan['nativeCanvas'])
    sources.require(scenes)
    if args.check:
        print(f'Validated {len(scenes)} v2 scenes against real native sources: {args.sources}')
        return
    if not args.font.is_file():
        raise ValueError('Provide --font with a locally licensed TrueType/OpenType font')
    film = Film(plan, sources, args.font)
    scope = scope_name(scenes)
    PREVIEW.mkdir(parents=True, exist_ok=True)
    contact_sheet(film, scenes, PREVIEW / f'contact-sheet-{scope}-desktop.jpg')
    contact_sheet(film, scenes, PREVIEW / f'contact-sheet-{scope}-mobile.jpg', mobile=True)
    export_representatives(film, scenes)
    export_representatives(film, scenes, mobile=True)
    if args.contacts_only:
        print(f'Rendered {len(scenes)} contact-sheet rows and representative frames for {scope}')
        return
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / 'readme').mkdir(exist_ok=True)
    ffmpeg = locate_ffmpeg(args.ffmpeg)
    encoder = encoder_for(ffmpeg)
    entries = []
    for scene in scenes:
        key = scene['id']
        print(f'Rendering {key}: {encoder}', flush=True)
        for profile_name in ('desktop', 'mobile'):
            suffix = '' if profile_name == 'desktop' else '-mobile'
            destination = args.output / f'{key}{suffix}.mp4'
            video(film, scene, plan['profiles'][profile_name], destination, ffmpeg, encoder, resume=args.resume)
            dimensions = plan['profiles'][profile_name]
            duration = scene['durationMs'] / 1000
            for kind, time in (('poster', scene['posterTime']), ('first', 0), ('last', duration - 1 / plan['fps'])):
                filename = f'{key}{suffix}.webp' if kind == 'poster' else f'{key}{suffix}-{kind}.webp'
                film.frame(scene, time, dimensions['width'], dimensions['height']).save(
                    args.output / filename, quality=95, method=6)
        if not args.skip_gif:
            gif(film, scene, args.output / f'readme/{key}.gif')
        entry = {
            'id': key,
            'video': f'/feature-media/{key}.mp4',
            'poster': f'/feature-media/{key}.webp',
            'firstFrame': f'/feature-media/{key}-first.webp',
            'lastFrame': f'/feature-media/{key}-last.webp',
            'durationMs': scene['durationMs'],
            'fps': plan['fps'],
            'mobileVideo': f'/feature-media/{key}-mobile.mp4',
            'mobilePoster': f'/feature-media/{key}-mobile.webp',
            'mobileFirstFrame': f'/feature-media/{key}-mobile-first.webp',
            'mobileLastFrame': f'/feature-media/{key}-mobile-last.webp',
        }
        if not args.skip_gif:
            entry['gif'] = f'/feature-media/readme/{key}.gif'
        entries.append(entry)
    export_manifest(args, plan, scenes, sources, entries, encoder)
    print(f'Exported {len(entries)} scenes to {args.output}', flush=True)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, RuntimeError, subprocess.SubprocessError) as error:
        print(f'Render failed: {error}', file=sys.stderr)
        sys.exit(1)
