"""Deterministic v2 timeline tests and explicitly non-deliverable render fixtures."""

import json
import math
from pathlib import Path
import tempfile
import unittest

from PIL import Image

from render import (
    BACKGROUND_ASSETS, CANVAS_ASSETS, DEFAULT_OUTPUT, KNOWN_NATIVE, PREVIEW,
    ROOT, Film, NativeSources, camera_at, ease, load_plan, progress,
    scene_state, scope_name,
)
from scenekit import force_geometry, glow_strength, pendulum_geometry


FONT = Path('C:/Windows/Fonts/segoeui.ttf')


def fixture_sources(root):
    assets = []
    for key in sorted(KNOWN_NATIVE):
        if key in CANVAS_ASSETS:
            size = (1440, 720)
            frame_count = 3 if key == 'laser-wave' else 2
        elif key in BACKGROUND_ASSETS:
            size = (1440, 720)
            frame_count = 0
        elif key.startswith('toolbar-'):
            size = (600, 80)
            frame_count = 0
        elif key.startswith(('ppt-page-', 'board-page')):
            size = (240, 90)
            frame_count = 0
        else:
            size = (40, 60)
            frame_count = 0
        color = '#173f3b' if key == 'board-grid' else '#f6f1e5' if key == 'board-dots' else '#ffffff'
        image = Image.new('RGBA', size, color if key in BACKGROUND_ASSETS else (0, 0, 0, 0))
        if key not in BACKGROUND_ASSETS:
            for x in range(8, min(80, size[0] - 8), 4):
                image.putpixel((x, min(20, size[1] - 1)), (20, 130, 120, 255))
        image.save(root / f'{key}.png')
        frames = []
        for index in range(frame_count):
            name = f'{key}-{index}.png'
            frame = image.copy()
            if index == 0 and key in CANVAS_ASSETS:
                frame = Image.new('RGBA', size)
            frame.save(root / name)
            frames.append(name)
        asset = {'id': key, 'file': f'{key}.png', 'width': size[0], 'height': size[1]}
        if frames:
            asset.update(frames=frames, fps=1 if key == 'laser-wave' else 60)
        if key.startswith('pen-icon-'):
            asset['hotspot'] = [0, 0]
        assets.append(asset)
    manifest = root / 'manifest.json'
    manifest.write_text(json.dumps({'schemaVersion': 2, 'provenance': {'testFixture': True}, 'assets': assets}))
    return NativeSources(manifest)


class FilmContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.plan = load_plan()
        cls.scenes = {scene['id']: scene for scene in cls.plan['scenes']}

    def test_storyboard_matches_v2_media_contract(self):
        durations = {
            'screen-dynamic': 7000, 'screen-through': 7800, 'screen-freeze': 10000,
            'slides-ink': 9000, 'slides-binding': 8500, 'slides-ready': 7000,
            'board-backgrounds': 6800, 'board-pages': 8500,
        }
        self.assertEqual({key: scene['durationMs'] for key, scene in self.scenes.items()}, durations)
        self.assertEqual(self.plan['fps'], 60)
        self.assertEqual(self.plan['supersample'], 2)
        self.assertEqual(self.plan['profiles']['readme']['fps'], 15)
        self.assertTrue(all(scene['shots'] and scene['actions'] and scene['required'] for scene in self.plan['scenes']))
        self.assertTrue(all('title' not in scene for scene in self.plan['scenes']))
        self.assertTrue(PREVIEW.is_relative_to(ROOT / 'build'))
        self.assertTrue(DEFAULT_OUTPUT.is_relative_to(ROOT / 'build'))

    def test_nonlinear_camera_holds_and_no_toolbar_camera(self):
        self.assertEqual(ease(0), 0)
        self.assertEqual(ease(1), 1)
        self.assertGreater(ease(0.5), 0.8)
        scene = self.scenes['screen-dynamic']
        anchors = {'wide': (720, 320), 'low': (720, 410)}
        self.assertEqual(camera_at(scene, 1.2, anchors), camera_at(scene, 3.6, anchors))
        self.assertEqual(camera_at(scene, 4.0, anchors), camera_at(scene, 7.0, anchors))
        self.assertEqual(self.plan['defaults']['controls']['toolbar']['desktop']['center'], [720, 578])
        self.assertEqual(progress(-1, 0, 1), 0)
        self.assertEqual(progress(3, 0, 1), 1)

    def test_click_commit_and_cursor_ownership(self):
        through = self.scenes['screen-through']
        self.assertEqual(scene_state(through, 1.39)['toolbar'], 'toolbar-draw')
        self.assertEqual(scene_state(through, 1.4)['toolbar'], 'toolbar-pierce')
        self.assertEqual(scene_state(through, 2.54)['page'], 'pendulum')
        self.assertEqual(scene_state(through, 2.55)['page'], 'wave')
        self.assertEqual(scene_state(through, 5.15)['page'], 'pendulum')
        slides = self.scenes['slides-ink']
        self.assertEqual(scene_state(slides, 1.4)['toolbar'], 'toolbar-ppt-shape')
        self.assertEqual(scene_state(slides, 4.49)['page'], 1)
        self.assertEqual(scene_state(slides, 4.5)['page'], 2)
        self.assertEqual(scene_state(slides, 4.5)['toolbar'], 'toolbar-ppt-shape')
        self.assertEqual(scene_state(slides, 7.2)['page'], 1)
        self.assertEqual(scene_state(slides, 7.2)['toolbar'], 'toolbar-ppt-shape')
        for scene in self.plan['scenes']:
            for action in scene['actions']:
                if action['type'] == 'click':
                    self.assertLessEqual(action['start'], action['down'])
                    self.assertLessEqual(action['down'], action['up'])
                    self.assertLessEqual(action['up'], action['end'])

    def test_freeze_is_at_right_maximum_and_ft_is_gravity_component(self):
        scene = self.scenes['screen-freeze']
        self.assertEqual(scene_state(scene, 1.99)['freeze'], False)
        self.assertEqual(scene_state(scene, 2.0)['freezeAt'], 2.0)
        config = self.plan['shared']['pendulum']
        pendulum = pendulum_geometry(config, 2.0, 2.0)
        self.assertAlmostEqual(pendulum['angle'], math.radians(config['amplitudeDeg']))
        geometry = force_geometry(config)
        bob = geometry['bob']
        ft = (geometry['Fₜ'][0] - bob[0], geometry['Fₜ'][1] - bob[1])
        radial = (geometry['outward'][0] - bob[0], geometry['outward'][1] - bob[1])
        mg = (geometry['mg'][0] - bob[0], geometry['mg'][1] - bob[1])
        self.assertAlmostEqual(ft[0] + radial[0], mg[0])
        self.assertAlmostEqual(ft[1] + radial[1], mg[1])
        self.assertAlmostEqual(math.hypot(*ft), config['gravityLength'] * math.sin(pendulum['angle']))
        tension = (geometry['T'][0] - bob[0], geometry['T'][1] - bob[1])
        self.assertAlmostEqual(math.hypot(*tension), math.hypot(*radial))
        self.assertLess(geometry['T'][0], bob[0])
        self.assertLess(geometry['T'][1], bob[1])

    def test_single_laser_contact_hold_fade_then_transition(self):
        scene = self.scenes['board-backgrounds']
        lasers = [action for action in scene['actions'] if action.get('asset') == 'laser-wave']
        self.assertEqual(len(lasers), 1)
        stages = lasers[0]['stages']
        self.assertEqual([stage['kind'] for stage in stages], ['contact', 'hold', 'fade', 'inactive'])
        for stage, duration in zip(stages, (1.2, 1.0, 0.8, 0.2)):
            self.assertAlmostEqual(stage['end'] - stage['start'], duration)
        self.assertEqual(lasers[0]['visibleUntil'], 4.2)
        self.assertEqual(stages[-1]['end'], lasers[0]['end'])
        self.assertGreaterEqual(scene['posterTime'], 2.4)
        self.assertLess(scene['posterTime'], 3.4)
        self.assertEqual(scene_state(scene, 4.19)['toolbar'], 'toolbar-whiteboard-laser')
        self.assertEqual(scene_state(scene, 4.2)['toolbar'], 'toolbar-whiteboard')
        self.assertEqual(self.scenes['board-pages']['controls']['toolbar']['default'], 'toolbar-whiteboard')

    def test_authoritative_contract_and_frame_aligned_controls(self):
        path = ROOT / 'sources-redesign/asset-contract.json'
        if not path.is_file():
            self.skipTest('Authoritative native asset contract is not present yet')
        contract = json.loads(path.read_text(encoding='utf-8'))
        assets = {asset['id']: asset for asset in contract['assets']}
        for scene in self.plan['scenes']:
            self.assertTrue(set(scene['required']) <= assets.keys(), scene['id'])
            for action in scene['actions']:
                if action.get('control'):
                    self.assertAlmostEqual(action['up'] - action['down'], 0.2)
                    control = action['control']
                    result = next((result for result in action.get('results', [])
                                   if result['key'] == ('toolbar' if control == 'toolbar' else 'page')), None)
                    commit = action[result['at']] if result else action['up']
                    if control == 'toolbar':
                        key = result['value'] if result else scene_state(scene, commit)['toolbar']
                    else:
                        previous = scene_state(scene, commit - 1e-7)['page']
                        prefix = 'ppt-page-' if scene['controls']['pager']['kind'] == 'ppt' else 'board-page'
                        key = f'{prefix}{previous}'
                    sequence = assets[key]['sequence']
                    self.assertAlmostEqual(action['start'], commit - sequence['commitFrame'] / 60,
                                           msg=f'{scene["id"]}/{action["id"]}')
        laser = next(action for action in self.scenes['board-backgrounds']['actions']
                     if action.get('asset') == 'laser-wave')
        sequence = assets['laser-wave']['sequence']
        self.assertAlmostEqual(laser['end'] - laser['start'], sequence['frames'] / 60)
        self.assertEqual(laser['visibleUntil'], 4.2)

        class Sequences:
            def sequence_info(self, key):
                return assets[key].get('sequence')

            def asset(self, key):
                return {'frames': [None] * assets[key]['sequence']['frames'], 'fps': 60}

        film = Film(self.plan, Sequences(), FONT)
        through = self.scenes['screen-through']
        key, amount = film.control_visual(through, 1.2, 'toolbar', 'toolbar-draw')
        self.assertEqual(key, 'toolbar-pierce')
        self.assertAlmostEqual(amount, 1 / 3)
        slides = self.scenes['slides-ink']
        key, amount = film.control_visual(slides, 4.5, 'pager', 'ppt-page-2', slides['controls']['pager'])
        self.assertEqual(key, 'ppt-page-1')
        self.assertAlmostEqual(amount, 1 / 3)
        pages = self.scenes['board-pages']
        key, amount = film.control_visual(pages, 3.0, 'pager', 'board-page2', pages['controls']['pager'])
        self.assertEqual(key, 'board-page1')
        self.assertAlmostEqual(amount, 0.5)

    def test_modern_cursor_glow_converges_and_down_shrinks(self):
        self.assertEqual(glow_strength(1.0, 1.0), 1)
        self.assertEqual(glow_strength(1.16, 1.0), 0)
        self.assertLess(glow_strength(1.0, 1.0, down=True), glow_strength(1.0, 1.0))

    def test_scoped_contact_names(self):
        self.assertEqual(scope_name(self.plan['scenes']), 'all')
        self.assertEqual(scope_name([self.scenes['screen-freeze']]), 'screen-freeze')
        self.assertIn('screen-freeze', scope_name([self.scenes['screen-freeze'], self.scenes['slides-ink']]))

    def test_binding_keeps_both_titlebars_clickable(self):
        scene = self.scenes['slides-binding']
        film = Film(self.plan, None, FONT)
        for profile in ('desktop', 'mobile'):
            powerpoint = film.app_window_box(scene, profile, 'powerpoint')
            wps = film.app_window_box(scene, profile, 'wps')
            if profile == 'mobile':
                self.assertLessEqual(powerpoint[1] + powerpoint[3], wps[1])
            for anchor, owner, other in (('pptTitle', powerpoint, wps), ('wpsTitle', wps, powerpoint)):
                x, y = film.anchor(scene, anchor, profile)
                self.assertTrue(owner[0] <= x <= owner[0] + owner[2])
                self.assertTrue(owner[1] <= y <= owner[1] + 58)
                self.assertFalse(other[0] <= x <= other[0] + other[2] and other[1] <= y <= other[1] + other[3])

    def test_missing_native_is_an_error_and_paths_are_contained(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            manifest = root / 'manifest.json'
            manifest.write_text(json.dumps({
                'schemaVersion': 2, 'provenance': {'testFixture': True},
                'assets': [{'id': 'toolbar-draw', 'file': '../outside.png'}],
            }))
            sources = NativeSources(manifest)
            with self.assertRaisesRegex(ValueError, 'Invalid or missing native source'):
                sources.require([{'required': ['toolbar-draw'], 'actions': []}])
            with self.assertRaisesRegex(ValueError, 'Missing real native captures'):
                sources.require([{'required': ['laser-wave'], 'actions': []}])

    def test_native_sources_load_authoritative_contract(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in ('toolbar-draw.png', '0.png', '1.png'):
                Image.new('RGBA', (8, 8), (0, 0, 0, 255)).save(root / name)
            (root / 'manifest.json').write_text(json.dumps({
                'schemaVersion': 2,
                'provenance': {'repository': 'test-fixture'},
                'assets': [{'id': 'toolbar-draw', 'file': 'toolbar-draw.png', 'frames': ['0.png', '1.png'], 'fps': 60}],
            }))
            (root / 'asset-contract.json').write_text(json.dumps({
                'schemaVersion': 2,
                'contract': 'inkeys3-feature-media-native-redesign',
                'idsAreAuthoritative': True,
                'pixelContract': {'sequenceFps': 60, 'draw3Canvas': [1440, 720], 'provenanceRequired': ['repository']},
                'assets': [{'id': 'toolbar-draw', 'sequence': {'frames': 2, 'commitFrame': 1}}],
            }))
            sources = NativeSources(root / 'manifest.json')
            sources.require([{'required': ['toolbar-draw'], 'actions': []}])
            self.assertEqual(sources.sequence_info('toolbar-draw')['commitFrame'], 1)

    def test_static_native_cannot_fake_drawing_progress(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            image = Image.new('RGBA', (1440, 720))
            image.save(root / 'force-solids.png')
            manifest = root / 'manifest.json'
            manifest.write_text(json.dumps({
                'schemaVersion': 2, 'provenance': {'testFixture': True},
                'assets': [{'id': 'force-solids', 'file': 'force-solids.png'}],
            }))
            sources = NativeSources(manifest)
            with self.assertRaisesRegex(ValueError, 'sequence required'):
                sources.require([{'required': ['force-solids'], 'actions': []}])

    def test_real_legacy_controls_smoke_only(self):
        manifest = ROOT / 'sources/manifest.json'
        if not manifest.is_file():
            self.skipTest('Legacy real native controls are unavailable')
        sources = NativeSources(manifest)
        required = ['toolbar-draw', 'toolbar-pierce', 'toolbar-freeze', 'toolbar-whiteboard',
                    'ppt-page-1', 'ppt-page-2', 'board-page1', 'board-page2',
                    'board-blank', 'board-dots', 'board-grid']
        sources.require([{'required': required, 'actions': []}])
        self.assertEqual(sources.image('toolbar-draw').size, (2355, 286))
        self.assertEqual(sources.image('board-grid').size, (1440, 720))

    def test_all_scene_render_smoke_with_non_deliverable_fixtures(self):
        if not FONT.is_file():
            self.skipTest('Local Segoe UI font is unavailable')
        with tempfile.TemporaryDirectory() as directory:
            sources = fixture_sources(Path(directory))
            sources.require(self.plan['scenes'])
            film = Film(self.plan, sources, FONT)
            for scene in self.plan['scenes']:
                frame = film.frame(scene, scene['posterTime'], 1440, 640)
                self.assertEqual(frame.size, (1440, 640))
                self.assertEqual(frame.mode, 'RGB')
            for key in ('screen-through', 'slides-binding', 'board-backgrounds'):
                scene = self.scenes[key]
                self.assertEqual(film.frame(scene, scene['posterTime'], 720, 720).size, (720, 720))


if __name__ == '__main__':
    unittest.main()
