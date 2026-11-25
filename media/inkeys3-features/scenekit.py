"""Shared high-resolution editorial and teaching-scene primitives."""

from functools import lru_cache
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parent
ARROW_PATH = ROOT / 'editorial/cursor-arrow.json'


def clamp(value):
    return max(0, min(1, value))


def ease(value):
    return 1 - (1 - clamp(value)) ** 3


def progress(time, start, duration):
    if duration <= 0:
        return float(time >= start)
    return clamp((time - start) / duration)


def dashed(points, dash=12, gap=8):
    result = []
    for start, end in zip(points, points[1:]):
        dx, dy = end[0] - start[0], end[1] - start[1]
        length = math.hypot(dx, dy)
        if not length:
            continue
        offset = 0
        while offset < length:
            stop = min(length, offset + dash)
            result.append((
                (start[0] + dx * offset / length, start[1] + dy * offset / length),
                (start[0] + dx * stop / length, start[1] + dy * stop / length),
            ))
            offset += dash + gap
    return result


class Painter:
    def __init__(self, image, scale, font_path):
        self.image = image
        self.scale = scale
        self.draw = ImageDraw.Draw(image)
        self.font_path = str(font_path)
        self.fonts = {}

    def point(self, xy):
        return tuple(round(value * self.scale) for value in xy)

    def points(self, points):
        return [self.point(point) for point in points]

    def rect(self, box):
        x, y, width, height = box
        return (*self.point((x, y)), *self.point((x + width, y + height)))

    def font(self, size):
        size = max(1, round(size * self.scale))
        if size not in self.fonts:
            self.fonts[size] = ImageFont.truetype(self.font_path, size)
        return self.fonts[size]

    def line(self, points, fill, width=1):
        self.draw.line(self.points(points), fill=fill, width=max(1, round(width * self.scale)), joint='curve')

    def dashed(self, points, fill, width=1, dash=12, gap=8):
        for segment in dashed(points, dash, gap):
            self.line(segment, fill, width)

    def rectangle(self, box, fill=None, outline=None, width=1):
        self.draw.rectangle(self.rect(box), fill=fill, outline=outline, width=max(1, round(width * self.scale)))

    def rounded(self, box, radius, fill=None, outline=None, width=1):
        self.draw.rounded_rectangle(self.rect(box), radius=round(radius * self.scale), fill=fill,
                                    outline=outline, width=max(1, round(width * self.scale)))

    def ellipse(self, center, radius_x, radius_y=None, fill=None, outline=None, width=1):
        radius_y = radius_x if radius_y is None else radius_y
        x, y = center
        self.draw.ellipse((*self.point((x - radius_x, y - radius_y)),
                           *self.point((x + radius_x, y + radius_y))), fill=fill, outline=outline,
                          width=max(1, round(width * self.scale)))

    def polygon(self, points, fill=None, outline=None, width=1):
        transformed = self.points(points)
        self.draw.polygon(transformed, fill=fill)
        if outline:
            self.draw.line([*transformed, transformed[0]], fill=outline,
                           width=max(1, round(width * self.scale)), joint='curve')

    def text(self, xy, value, size, fill, anchor='mm'):
        self.draw.text(self.point(xy), value, font=self.font(size), fill=fill, anchor=anchor)


def placement_box(placement, profile):
    return placement[profile]


def native_mapping(placement, profile, source_size=(1440, 720)):
    x, y, width, height = placement_box(placement, profile)
    source_width, source_height = source_size
    fit = placement.get(f'{profile}Fit', placement.get('fit', 'contain'))
    if fit == 'stretch':
        scale_x, scale_y = width / source_width, height / source_height
    else:
        factor = width / source_width, height / source_height
        scale = (max if fit == 'cover' else min)(factor)
        scale_x = scale_y = scale
    return {
        'box': (x, y, width, height),
        'source': (source_width, source_height),
        'sx': scale_x,
        'sy': scale_y,
        'ox': x + (width - source_width * scale_x) / 2,
        'oy': y + (height - source_height * scale_y) / 2,
    }


def map_point(mapping, xy):
    return mapping['ox'] + xy[0] * mapping['sx'], mapping['oy'] + xy[1] * mapping['sy']


def map_points(mapping, points):
    return [map_point(mapping, point) for point in points]


def window_content(box, app):
    x, y, width, height = box
    top = 62 if app == 'browser' else 58
    return x + 12, y + top, width - 24, height - top - 12


def window_shell(painter, box, app='browser'):
    x, y, width, height = box
    dark = app == 'wps'
    top = {'browser': '#e8edef', 'powerpoint': '#f1e8e2', 'wps': '#dfe9f4'}[app]
    body = {'browser': '#fafcfb', 'powerpoint': '#fffdfa', 'wps': '#f8fbff'}[app]
    accent = {'browser': '#3f5960', 'powerpoint': '#c45b37', 'wps': '#3478c5'}[app]
    painter.rounded((x + 3, y + 8, width, height), 20, fill='#203b4020')
    painter.rounded(box, 20, fill=body, outline='#71827f70', width=1)
    painter.rounded((x, y, width, 74 if app == 'browser' else 68), 20, fill=top)
    painter.rectangle((x, y + 38, width, 36 if app == 'browser' else 30), fill=top)
    painter.line([(x, y + (62 if app == 'browser' else 58)), (x + width, y + (62 if app == 'browser' else 58))],
                 '#71827f45', 1)
    if app == 'browser':
        painter.line([(x + 31, y + 25), (x + 22, y + 33), (x + 31, y + 41)], '#53686d', 2)
        painter.line([(x + 61, y + 25), (x + 70, y + 33), (x + 61, y + 41)], '#8b9a9d', 2)
        painter.rounded((x + 92, y + 16, width - 200, 34), 17, fill='#f7f9f9', outline='#9caaad60')
        painter.ellipse((x + 112, y + 33), 4, fill='#7c918e')
    else:
        painter.rounded((x + 18, y + 13, 34 if app == 'powerpoint' else 58, 34), 8, fill=accent)
        painter.text((x + 35 if app == 'powerpoint' else x + 47, y + 30),
                     'P' if app == 'powerpoint' else 'WPS', 18 if app == 'powerpoint' else 13, '#ffffff')
        painter.line([(x + 70 if app == 'powerpoint' else x + 92, y + 16),
                      (x + 70 if app == 'powerpoint' else x + 92, y + 44)], '#71827f45', 1)
        for index in range(3):
            painter.rounded((x + 92 + index * 54 if app == 'powerpoint' else x + 114 + index * 54,
                             y + 20, 38, 22), 5, fill='#ffffff50')
    for index in range(3):
        cx = x + width - 75 + index * 22
        if index == 0:
            painter.line([(cx - 4, y + 31), (cx + 4, y + 31)], '#53686d', 1.4)
        elif index == 1:
            painter.rectangle((cx - 4, y + 26, 8, 8), outline='#53686d', width=1)
        else:
            painter.line([(cx - 4, y + 27), (cx + 4, y + 35)], '#53686d', 1.4)
            painter.line([(cx + 4, y + 27), (cx - 4, y + 35)], '#53686d', 1.4)
    return window_content(box, app)


def desktop(painter, width, height):
    painter.rectangle((0, 0, width, height), fill='#dbe5e8')
    painter.polygon([(0, height * 0.72), (width * 0.52, 0), (width * 0.76, 0), (width * 0.18, height)],
                    fill='#cfdde2')
    painter.polygon([(width * 0.64, height), (width, height * 0.24), (width, height)], fill='#e7edef')
    painter.rectangle((0, height - 34, width, 34), fill='#b9c9ce')
    for index in range(4):
        painter.rounded((24 + index * 42, height - 28, 26, 22), 5, fill='#edf3f4')


def pendulum_geometry(config, time, freeze_at=None):
    clock = min(time, freeze_at) if freeze_at is not None else time
    amplitude = math.radians(config['amplitudeDeg'])
    omega = math.tau / config['period']
    phase = math.pi / 2 - omega * config['highestAt']
    angle = amplitude * math.sin(omega * clock + phase)
    pivot = tuple(config['pivot'])
    bob = (pivot[0] + config['length'] * math.sin(angle),
           pivot[1] + config['length'] * math.cos(angle))
    return {'angle': angle, 'pivot': pivot, 'bob': bob, 'amplitude': amplitude}


def draw_pendulum(painter, mapping, config, time, freeze_at=None):
    geometry = pendulum_geometry(config, time, freeze_at)
    pivot, bob = geometry['pivot'], geometry['bob']
    amplitude = geometry['amplitude']
    arc = []
    for index in range(81):
        angle = -amplitude + 2 * amplitude * index / 80
        arc.append(map_point(mapping, (pivot[0] + config['length'] * math.sin(angle),
                                       pivot[1] + config['length'] * math.cos(angle))))
    painter.line(arc, '#a9babd', 2)
    painter.dashed([map_point(mapping, pivot), map_point(mapping, (pivot[0], pivot[1] + config['length'] + 110))],
                   '#c2cdcf', 1.5, 9, 8)
    painter.line([map_point(mapping, pivot), map_point(mapping, bob)], '#627e88', 4)
    painter.ellipse(map_point(mapping, pivot), 7 * mapping['sx'], fill='#435e66')
    painter.ellipse(map_point(mapping, bob), 18 * mapping['sx'], fill='#168573', outline='#f4fffb', width=2)
    painter.ellipse(map_point(mapping, (bob[0] - 5, bob[1] - 6)), 4 * mapping['sx'], fill='#75c8b5')
    return geometry


def force_geometry(config):
    geometry = pendulum_geometry(config, config['highestAt'])
    angle = geometry['angle']
    bob = geometry['bob']
    gravity = config['gravityLength']
    tangent = (-math.cos(angle), math.sin(angle))
    radial = (math.sin(angle), math.cos(angle))
    ft_length = gravity * math.sin(angle)
    radial_length = gravity * math.cos(angle)
    ft = (bob[0] + tangent[0] * ft_length, bob[1] + tangent[1] * ft_length)
    outward = (bob[0] + radial[0] * radial_length, bob[1] + radial[1] * radial_length)
    mg = (bob[0], bob[1] + gravity)
    tension = (bob[0] - math.sin(angle) * config['tensionLength'],
               bob[1] - math.cos(angle) * config['tensionLength'])
    return {'bob': bob, 'mg': mg, 'T': tension, 'Fₜ': ft, 'outward': outward,
            'parallelogram': [bob, ft, mg, outward, bob]}


def draw_force_labels(painter, mapping, geometry, visible):
    offsets = {'mg': (24, 0), 'T': (-20, -12), 'Fₜ': (-24, 12)}
    for symbol in ('mg', 'T', 'Fₜ'):
        if symbol not in visible:
            continue
        point = geometry[symbol]
        dx, dy = offsets[symbol]
        painter.text(map_point(mapping, (point[0] + dx, point[1] + dy)), symbol,
                     28, '#203b40')


def draw_cuboid_base(painter, mapping, config):
    x, y, width, height = config['front']
    dx, dy = config['depth']
    front = [(x, y), (x + width, y), (x + width, y + height), (x, y + height)]
    back = [(px + dx, py + dy) for px, py in front]
    lines = [[*front, front[0]], [front[0], back[0], back[1], back[2]],
             [front[1], back[1]], [front[2], back[2]]]
    for line in lines:
        painter.line(map_points(mapping, line), '#4e5c60', 3)


def draw_cone_base(painter, mapping, config):
    apex, center = config['apex'], config['center']
    rx, ry = config['radiusX'], config['radiusY']
    left, right = (center[0] - rx, center[1]), (center[0] + rx, center[1])
    painter.line(map_points(mapping, [apex, left]), '#4e5c60', 3)
    painter.line(map_points(mapping, [apex, right]), '#4e5c60', 3)
    arc = [(center[0] + rx * math.cos(math.pi * index / 60),
            center[1] + ry * math.sin(math.pi * index / 60)) for index in range(61)]
    painter.line(map_points(mapping, arc), '#4e5c60', 3)


def draw_wave(painter, mapping, config, time=0, tangent=False):
    ox, oy = config['origin']
    points = []
    for index in range(181):
        ratio = index / 180
        points.append((ox + config['width'] * ratio,
                       oy + math.sin(ratio * math.tau * config['cycles'] - time * 2.4) * config['amplitude']))
    painter.line(map_points(mapping, [(ox - 60, oy), (ox + config['width'] + 60, oy)]), '#d0dcdd', 2)
    painter.line(map_points(mapping, points), '#6387a1', 4)
    if tangent:
        painter.line(map_points(mapping, [(540, 470), (900, 470), (870, 450)]), '#168573', 4)


def transition_pair(outgoing, incoming, amount, distance, scale, reverse=False, matte=(0, 0, 0, 0)):
    amount = ease(amount)
    canvas = Image.new('RGBA', outgoing.size, matte)
    shift = distance * scale
    if reverse:
        out = (shift * amount, shift * amount)
        enter = (-shift * (1 - amount), -shift * (1 - amount))
    else:
        out = (-shift * amount, -shift * amount)
        enter = (shift * (1 - amount), shift * (1 - amount))
    for image, offset in ((outgoing, out), (incoming, enter)):
        layer = Image.new('RGBA', outgoing.size)
        layer.alpha_composite(image, (round(offset[0]), round(offset[1])))
        canvas.alpha_composite(layer)
    return canvas


def clipped(image, box, scale, radius=0):
    mask = Image.new('L', image.size)
    draw = ImageDraw.Draw(mask)
    x, y, width, height = box
    bounds = (round(x * scale), round(y * scale), round((x + width) * scale), round((y + height) * scale))
    if radius:
        draw.rounded_rectangle(bounds, radius=round(radius * scale), fill=255)
    else:
        draw.rectangle(bounds, fill=255)
    result = Image.new('RGBA', image.size)
    result.paste(image, (0, 0), mask)
    return result


def _arrow_points(commands):
    points = []
    current = None
    for command in commands:
        kind, values = command[0], command[1:]
        if kind == 'M':
            current = tuple(values)
            points.append(current)
        elif kind == 'L':
            current = tuple(values)
            points.append(current)
        elif kind == 'Q':
            control, end = tuple(values[:2]), tuple(values[2:])
            start = current
            for index in range(1, 9):
                t = index / 8
                points.append(((1 - t) ** 2 * start[0] + 2 * (1 - t) * t * control[0] + t ** 2 * end[0],
                               (1 - t) ** 2 * start[1] + 2 * (1 - t) * t * control[1] + t ** 2 * end[1]))
            current = end
        elif kind == 'Z':
            break
        else:
            raise ValueError(f'Unsupported editorial arrow command: {kind}')
    return points


@lru_cache(maxsize=1)
def arrow_definition():
    definition = json.loads(ARROW_PATH.read_text(encoding='utf-8'))
    return definition, _arrow_points(definition['commands'])


def draw_modern_arrow(image, scale, xy, font_path, down=False, glow=0):
    definition, arrow_points = arrow_definition()
    tile_size = 104
    origin = (24, 20)
    tile = Image.new('RGBA', (round(tile_size * scale), round(tile_size * scale)))
    if glow > 0:
        halo = Image.new('RGBA', tile.size)
        painter = Painter(halo, scale, font_path)
        radius = (22 if not down else 14) * (0.75 + 0.25 * glow)
        painter.ellipse((origin[0] + 12, origin[1] + 18), radius, fill=(*_rgb(definition['glow']), round(72 * glow)))
        halo = halo.filter(ImageFilter.GaussianBlur(max(1, round(6 * scale))))
        tile.alpha_composite(halo)
    painter = Painter(tile, scale, font_path)
    factor = 34 / definition['viewBox'][0] * (0.94 if down else 1)
    points = [(origin[0] + x * factor, origin[1] + y * factor) for x, y in arrow_points]
    painter.polygon(points, fill=definition['fill'], outline=definition['stroke'], width=definition['strokeWidth'])
    image.alpha_composite(tile, (round((xy[0] - origin[0]) * scale), round((xy[1] - origin[1]) * scale)))


def glow_strength(time, move_end, down=False):
    strength = 1 if time < move_end else clamp(1 - (time - move_end) / 0.15)
    return strength * (0.55 if down else 1)


def _rgb(value):
    value = value.lstrip('#')
    return tuple(int(value[index:index + 2], 16) for index in (0, 2, 4))
