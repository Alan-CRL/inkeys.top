"""S2 场景卡片的素材：内容底图、Inkeys 墨迹与界面，渲染后导出 WebP。

用法（python3）：
  python3 media/nh3-scenes/build.py                    渲染全部，写入 docs/.vuepress/public/dist-new-index3/s2/
  python3 media/nh3-scenes/build.py --preview          另外合成预览图（只用于检查排版，不是成品）
  python3 media/nh3-scenes/build.py --only board --light   只出某一张、只出浅色，调排版时用

墨迹全部由 InkeysRenderer 绘制：文字用 text 元素；线条（图形、虚线、箭头、下划线、圈）在这里生成带时间的
原始采样点，用 stroke 元素回放。线条的笔速模仿真实书写：弯处慢、直线快，起笔从慢到快；收笔时先减速，
再在终点停住一小会儿，让笔锋追上笔尖后抬笔，所以线尾是圆的、不出锋。只有箭头的两撇和圈注保留出锋。
"""
import bisect
import hashlib
import json
import math
import random
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = HERE / 'out'
PUBLIC = ROOT / 'docs' / '.vuepress' / 'public' / 'dist-new-index3' / 's2'
CLI = r'D:\Project\Inkeys\Inkeys Renderer\Repo\InkeysRenderer#1\packages\cli\bin\inkeys-render.js'
FONTS = Path('C:/Windows/Fonts')

# 足够长的时间轴：静态图取最后一刻，必须晚于全部笔画写完的时刻。
DURATION = 900000

INK = {
    'light': {'ink': '#15171A', 'blue': '#1F6FD6', 'red': '#E0393E', 'hl': '#FFD400', 'green': '#1E9E5A'},
    'dark': {'ink': '#F4F4F2', 'blue': '#77B4FF', 'red': '#FF6E6E', 'hl': '#FFE14A', 'green': '#5FD896'},
}


# ---------- 调用渲染器 ----------

def cli(*args):
    result = subprocess.run(['node', CLI, *map(str, args)], capture_output=True, text=True, encoding='utf-8')
    line = result.stdout.strip().splitlines()[-1] if result.stdout.strip() else '{}'
    data = json.loads(line)
    if result.returncode != 0 or not data.get('ok'):
        raise SystemExit(f'inkeys-render {args[0]} failed ({result.returncode}): {json.dumps(data.get("error"), ensure_ascii=False)[:2000]}')
    return data


def find_key(node, key):
    if isinstance(node, dict):
        if key in node:
            return node[key]
        node = list(node.values())
    if isinstance(node, list):
        for value in node:
            found = find_key(value, key)
            if found is not None:
                return found
    return None


def render(name, scene, at=DURATION):
    """validate → plan（确认写完）→ render，返回直通 alpha 的成品帧。"""
    OUT.mkdir(exist_ok=True)
    path = OUT / f'{name}.scene.json'
    text = json.dumps(scene, ensure_ascii=False)
    frame = OUT / name / 'frames' / 'f000000.png'
    # 场景没变时直接用上次的渲染结果，调排版时不用整套重渲。
    if '--reuse' in sys.argv and frame.exists() and path.exists() and path.read_text(encoding='utf-8') == text:
        return Image.open(frame).convert('RGBA')
    path.write_text(text, encoding='utf-8')
    cli('validate', path)
    if any(e['type'] == 'text' for e in scene['elements']):
        total = find_key(cli('plan', path), 'totalMs')
        if total is None or total >= at:
            raise SystemExit(f'{name}: totalMs={total} 不小于取帧时刻 {at}')
    for element in scene['elements']:
        if element['type'] == 'stroke' and element['points'][-1][2] >= at:
            raise SystemExit(f'{name}: 线条 {element["id"]} 在取帧时刻之后才写完')
    target = OUT / name
    cli('render', path, '--at', at, '--out', target, '--force')
    return Image.open(target / 'frames' / 'f000000.png').convert('RGBA')


_ui_cache = {}


def ui(name, surface, theme, canvas, scale, initial=None):
    """界面图。深浅色的阴影范围不同，各自按像素包围盒裁会让两套图大小不一、切换主题时错位，
    所以两套一起渲染，按共同的包围盒裁剪。initial 里随主题变的值写成 {主题: 值}。"""
    if name not in _ui_cache:
        frames = {}
        for t in INK:
            state = {key: (value[t] if isinstance(value, dict) and t in value else value) for key, value in (initial or {}).items()}
            scene = {'version': 'inkeys.scene/1', 'canvas': {'width': canvas[0], 'height': canvas[1], 'dpi': 96}, 'fps': 30,
                     'durationMs': 1000,
                     'elements': [{'type': 'ui', 'id': 'ui', 'startMs': 0, 'surface': surface, 'scale': scale,
                                   'initial': {'theme': t, 'locale': 'en-US', **state}}]}
            frames[t] = render(f'{name}-{t}', scene, at=500)
        boxes = [image.getbbox() for image in frames.values()]
        box = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
        _ui_cache[name] = {t: image.crop(box) for t, image in frames.items()}
    return _ui_cache[name][theme]


# ---------- 线条：几何 → 带时间的采样点 ----------

STEP = 0.5          # 弧长重采样步长（像素）
HZ = 240            # 输入采样率
BEND_RADIUS = 260   # 半径不小于它的弯按直线的速度走
HOLD_MS = 130       # 收笔后在终点停住的时间：等笔锋追上笔尖


def catmull(points, per=24):
    """向心 Catmull-Rom：平滑穿过每个顶点。"""
    pts = [points[0]] + list(points) + [points[-1]]
    out = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        t0 = 0.0
        t1 = t0 + max(math.dist(p0, p1), 1e-3) ** 0.5
        t2 = t1 + max(math.dist(p1, p2), 1e-3) ** 0.5
        t3 = t2 + max(math.dist(p2, p3), 1e-3) ** 0.5
        for k in range(per):
            t = t1 + (t2 - t1) * k / per
            a1 = [(t1 - t) / (t1 - t0) * p0[d] + (t - t0) / (t1 - t0) * p1[d] for d in (0, 1)]
            a2 = [(t2 - t) / (t2 - t1) * p1[d] + (t - t1) / (t2 - t1) * p2[d] for d in (0, 1)]
            a3 = [(t3 - t) / (t3 - t2) * p2[d] + (t - t2) / (t3 - t2) * p3[d] for d in (0, 1)]
            b1 = [(t2 - t) / (t2 - t0) * a1[d] + (t - t0) / (t2 - t0) * a2[d] for d in (0, 1)]
            b2 = [(t3 - t) / (t3 - t1) * a2[d] + (t - t1) / (t3 - t1) * a3[d] for d in (0, 1)]
            out.append(tuple((t2 - t) / (t2 - t1) * b1[d] + (t - t1) / (t2 - t1) * b2[d] for d in (0, 1)))
    out.append(tuple(points[-1]))
    return out


def resample(points, step=STEP):
    lengths = [0.0]
    for a, b in zip(points, points[1:]):
        lengths.append(lengths[-1] + math.dist(a, b))
    total = lengths[-1]
    count = max(2, int(total / step) + 1)
    out = []
    for i in range(count):
        s = total * i / (count - 1)
        j = min(max(bisect.bisect_right(lengths, s) - 1, 0), len(points) - 2)
        span = lengths[j + 1] - lengths[j]
        u = 0 if span == 0 else (s - lengths[j]) / span
        out.append((points[j][0] + (points[j + 1][0] - points[j][0]) * u, points[j][1] + (points[j + 1][1] - points[j][1]) * u))
    return out, total


def smooth01(u):
    v = min(1.0, max(0.0, u))
    return v * v * (3 - 2 * v)


def box(values, half):
    prefix = [0.0]
    for value in values:
        prefix.append(prefix[-1] + value)
    n = len(values)
    out = []
    for i in range(n):
        h = min(half, i, n - 1 - i)
        out.append((prefix[i + h + 1] - prefix[i - h]) / (2 * h + 1))
    return out


def curvature(a, p, b):
    ab, ap, pb = math.dist(a, b), math.dist(a, p), math.dist(p, b)
    den = ab * ap * pb
    if den < 1e-9:
        return 0.0
    return 2 * abs((p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])) / den


def pace(points, speed, end='hold'):
    """几何折线 → [x, y, 毫秒]。end='hold' 停住收笔（不出锋）；end='flick' 带着速度抬笔（出锋）。"""
    line, length = resample(points)
    n = len(line)
    span = 12
    start_speed, end_speed = 0.4, (0.15 if end == 'hold' else 0.85)
    in_ramp, out_ramp = min(36, length / 3), min(44, length / 3)
    step = length / (n - 1)
    target = []
    for i, p in enumerate(line):
        k = curvature(line[max(0, i - span)], p, line[min(n - 1, i + span)])
        bend = (k * BEND_RADIUS) ** (-1 / 3) if k * BEND_RADIUS > 1 else 1.0
        s = i * step
        head = start_speed + (1 - start_speed) * smooth01(s / in_ramp)
        tail = end_speed + (1 - end_speed) * smooth01((length - s) / out_ramp)
        target.append(speed * bend * head * tail)
    accel = 6 * speed

    def limit(v):
        for i in range(1, n):
            v[i] = min(v[i], math.sqrt(v[i - 1] ** 2 + 2 * accel * step))
        for i in range(n - 2, -1, -1):
            v[i] = min(v[i], math.sqrt(v[i + 1] ** 2 + 2 * accel * step))
        return v

    v = limit(box(target, 12))
    v = [max(8.0, x) for x in limit(box(box(v, 20), 20))]
    times = [0.0]
    for i in range(1, n):
        times.append(times[-1] + step / ((v[i - 1] + v[i]) / 2))
    samples, t = [], 0.0
    while t < times[-1]:
        j = min(max(bisect.bisect_right(times, t) - 1, 0), n - 2)
        u = (t - times[j]) / (times[j + 1] - times[j])
        samples.append([round(line[j][0] + (line[j + 1][0] - line[j][0]) * u, 2),
                        round(line[j][1] + (line[j + 1][1] - line[j][1]) * u, 2), round(t * 1000, 2)])
        t += 1 / HZ
    last = [round(line[-1][0], 2), round(line[-1][1], 2)]
    samples.append([*last, round(times[-1] * 1000, 2)])
    if end == 'hold':
        # 终点原地停留：按采样率重复输出终点，和软件里笔停住时收到的输入一样。
        for k in range(1, int(HOLD_MS / 1000 * HZ) + 1):
            samples.append([*last, round(times[-1] * 1000 + k * 1000 / HZ, 2)])
    return samples


class Ink:
    """一张墨迹图：按添加顺序自下而上合成。"""

    def __init__(self, size, seed):
        self.width, self.height = size
        self.seed = seed
        self.rng = random.Random(seed)
        self.elements = []

    def text(self, content, x, y, size, color, width=None, jitter=0.4):
        self.elements.append({
            'type': 'text', 'id': f't{len(self.elements)}', 'startMs': 0,
            'pen': {'type': 'softPen', 'color': color, 'opacity': 1, 'width': width or round(size / 12, 1)},
            'content': content, 'x': x, 'y': y, 'size': size,
            # 默认节奏接近真人抄写，静态图不需要那么长的时间轴，写快一些。
            'pace': {'speed': 700, 'gapMs': 30, 'charGapMs': 40, 'wordGapMs': 60, 'lineGapMs': 80},
            'jitter': jitter,
        })

    def _stroke(self, geometry, color, width, speed, end, pen='softPen'):
        self.elements.append({'type': 'stroke', 'id': f's{len(self.elements)}', 'startMs': 0,
                              'pen': {'type': pen, 'color': color, 'opacity': 1, 'width': width},
                              'points': pace(geometry, speed, end)})

    def line(self, p, q, color, width, speed=780, end='hold', wobble=True, pen='softPen'):
        """徒手直线：两端有一点偏差，中间略微鼓起。"""
        r = self.rng
        length = math.dist(p, q)
        if wobble and length > 24:
            p = (p[0] + r.uniform(-1, 1), p[1] + r.uniform(-1, 1))
            q = (q[0] + r.uniform(-1, 1), q[1] + r.uniform(-1, 1))
            bow = length * r.uniform(-0.006, 0.006)
            nx, ny = -(q[1] - p[1]) / length, (q[0] - p[0]) / length
            mid = lambda u: (p[0] + (q[0] - p[0]) * u + nx * bow * math.sin(math.pi * u),
                             p[1] + (q[1] - p[1]) * u + ny * bow * math.sin(math.pi * u))
            geometry = [mid(i / 16) for i in range(17)]
        else:
            geometry = [p, q]
        self._stroke(geometry, color, width, speed, end, pen)

    def poly(self, points, color, width, speed=700, end='hold'):
        """带尖角的一笔（直角符号、折线），拐角处自动减速。"""
        self._stroke([tuple(p) for p in points], color, width, speed, end)

    def curve(self, points, color, width, speed=640, end='hold', pen='softPen'):
        self._stroke(catmull([tuple(p) for p in points]), color, width, speed, end, pen)

    def dashed(self, p, q, color, width, dash=13, gap=9):
        length = math.dist(p, q)
        pos = 0.0
        while pos < length - 4:
            stop = min(pos + dash + self.rng.uniform(-1.5, 1.5), length)
            a, b = pos / length, stop / length
            self.line((p[0] + (q[0] - p[0]) * a, p[1] + (q[1] - p[1]) * a), (p[0] + (q[0] - p[0]) * b, p[1] + (q[1] - p[1]) * b),
                      color, width, speed=520, wobble=False)
            pos = stop + gap

    def arrow(self, points, color, width, head=22):
        """箭身停住收笔，箭头的两撇出锋。"""
        geometry = catmull([tuple(p) for p in points]) if len(points) > 2 else [tuple(p) for p in points]
        self._stroke(geometry, color, width, 640, 'hold')
        tip, back = geometry[-1], geometry[max(0, len(geometry) - 12)]
        angle = math.atan2(tip[1] - back[1], tip[0] - back[0])
        for side in (0.5, -0.5):
            a = angle + math.pi + side
            self.line(tip, (tip[0] + head * math.cos(a), tip[1] + head * math.sin(a)), color, width, speed=620, end='flick', wobble=False)

    def loop(self, cx, cy, rx, ry, color, width, tilt=-0.12):
        """圈注：起点和终点错开一点，尾巴带着速度离开。"""
        r = self.rng
        pts = []
        for i in range(13):
            a = -2.2 + i * (2 * math.pi + 0.5) / 12
            k = 1 + r.uniform(-0.05, 0.05) + 0.04 * i / 12
            x, y = rx * k * math.cos(a), ry * k * math.sin(a)
            pts.append((cx + x * math.cos(tilt) - y * math.sin(tilt), cy + x * math.sin(tilt) + y * math.cos(tilt)))
        self._stroke(catmull(pts), color, width, 620, 'flick')

    def underline(self, x0, x1, y, color, width, double=False):
        self.curve([(x0, y), ((x0 + x1) / 2, y - 2.5), (x1, y + 1)], color, width, speed=700)
        if double:
            self.curve([(x0 + 5, y + 9), ((x0 + x1) / 2, y + 6.5), (x1 - 3, y + 10)], color, width, speed=700)

    def highlight(self, x0, x1, y, color, width=30):
        self.curve([(x0, y), ((x0 + x1) / 2, y - 2), (x1, y)], color, width, speed=520, pen='highlighter')

    def scene(self):
        return {'version': 'inkeys.scene/1', 'canvas': {'width': self.width, 'height': self.height, 'dpi': 96},
                'fps': 30, 'durationMs': DURATION, 'seed': self.seed, 'elements': self.elements}


# ---------- 内容底图（报告页、幻灯片）：按 2 倍画再缩小 ----------

class Sheet:
    SCALE = 2

    def __init__(self, size, background):
        self.size = size
        self.image = Image.new('RGBA', (size[0] * self.SCALE, size[1] * self.SCALE), background)
        self.draw = ImageDraw.Draw(self.image)
        self._fonts = {}

    def font(self, size, weight='regular'):
        key = (size, weight)
        if key not in self._fonts:
            name = {'regular': 'segoeui.ttf', 'semibold': 'seguisb.ttf', 'bold': 'segoeuib.ttf'}[weight]
            self._fonts[key] = ImageFont.truetype(str(FONTS / name), size * self.SCALE)
        return self._fonts[key]

    def width(self, text, size, weight='regular'):
        return self.font(size, weight).getlength(text) / self.SCALE

    def text(self, xy, text, size, color, weight='regular', anchor='ls'):
        self.draw.text((xy[0] * self.SCALE, xy[1] * self.SCALE), text, font=self.font(size, weight), fill=color, anchor=anchor)

    def span(self, x, line, part, size, weight='regular'):
        """一行文字里某个片段的左右边界，用来把墨迹对到字上。"""
        start = line.index(part)
        left = x + self.width(line[:start], size, weight)
        return left, left + self.width(part, size, weight)

    def rect(self, box, color, radius=0, outline=None, line=1):
        s = self.SCALE
        self.draw.rounded_rectangle([v * s for v in box], radius * s, fill=color, outline=outline, width=line * s)

    def segment(self, p, q, color, width=1):
        s = self.SCALE
        self.draw.line([p[0] * s, p[1] * s, q[0] * s, q[1] * s], fill=color, width=width * s)

    def dot(self, center, radius, color):
        s = self.SCALE
        self.draw.ellipse([(center[0] - radius) * s, (center[1] - radius) * s, (center[0] + radius) * s, (center[1] + radius) * s], fill=color)

    def result(self):
        return self.image.resize(self.size, Image.LANCZOS)


# ---------- 教室与白板：正四棱锥 P-ABCD，底面边长 6，高 PO = 4 ----------

BOARD = (1500, 920)  # 板面露在面板里的部分，1 px = 面板设计稿 1 px（面板 1600×1000）
A, B, C, D = (90, 480), (380, 480), (495, 385), (205, 385)
O, P, M = (292, 432), (292, 140), (437, 432)
COL_A, COL_B, LINE = 640, 1090, 48


def board_main(c):
    ink = Ink(BOARD, seed=11)
    # 看不见的棱和底面内的辅助线用虚线。
    for p, q in ((A, D), (D, C), (P, D)):
        ink.dashed(p, q, c['ink'], 3.2)
    for p, q in ((A, C), (B, D)):
        ink.dashed(p, q, c['blue'], 2.6, 12, 9)
    for p, q in ((P, O), (O, M)):
        ink.dashed(p, q, c['blue'], 3, 12, 9)
    # 斜高在侧面上，看得见，画实线；直角符号在 O 处。
    ink.line(P, M, c['blue'], 3.2)
    ink.poly([(O[0], O[1] - 16), (O[0] + 16, O[1] - 16), (O[0] + 16, O[1])], c['blue'], 2.4)
    for p, q in ((A, B), (B, C), (P, A), (P, B), (P, C)):
        ink.line(p, q, c['ink'], 3.8)
    for label, x, y in (('P', 278, 124), ('A', 56, 506), ('B', 378, 516), ('C', 506, 392), ('D', 172, 380),
                        ('O', 258, 462), ('M', 446, 460)):
        ink.text(label, x, y, 32, c['ink'], 2.8)
    ink.text('6', 222, 522, 32, c['blue'], 2.8)
    ink.text('4', 262, 300, 32, c['blue'], 2.8)

    # 底面的俯视图：O 是中心，M 是 BC 中点。
    sq = [(110, 715), (260, 715), (260, 565), (110, 565)]  # A B C D
    for i in range(4):
        ink.line(sq[i], sq[(i + 1) % 4], c['ink'], 3.2)
    ink.dashed(sq[0], sq[2], c['blue'], 2.4, 10, 8)
    ink.dashed(sq[1], sq[3], c['blue'], 2.4, 10, 8)
    ink.line((185, 640), (260, 640), c['blue'], 3)
    for label, x, y in (('A', 80, 738), ('B', 266, 740), ('C', 268, 566), ('D', 80, 566), ('O', 158, 634), ('M', 270, 652)):
        ink.text(label, x, y, 28, c['ink'], 2.4)
    ink.text('3', 212, 630, 28, c['blue'], 2.4)
    ink.text('6', 176, 750, 28, c['blue'], 2.4)

    # 题目与三问：小而密的板书。
    ink.text('P-ABCD:   AB = 6,   PO = 4', COL_A, 138, 36, c['ink'])
    ink.text('(1) S = ?    (2) V = ?    (3) PA = ?', COL_A, 192, 36, c['ink'])
    for i, (indent, line) in enumerate(((0, '(1)  OM = AB/2 = 3'), (62, 'PM² = PO² + OM²'), (128, '= 4² + 3² = 25'),
                                        (62, 'PM = 5'), (62, 'S = 4 × 1/2 × AB × PM'), (88, '= 2 × 6 × 5 = 60'))):
        ink.text(line, COL_A + indent, 276 + i * LINE, 34, c['ink'])
    for i, (indent, line) in enumerate(((0, '(2)  V = 1/3 × AB² × PO'), (88, '= 1/3 × 36 × 4'), (88, '= 48'),
                                        (0, '(3)  OA = 3√2'), (62, 'PA² = 4² + 18 = 34'), (62, 'PA = √34'))):
        ink.text(line, COL_B + indent, 276 + i * LINE, 34, c['ink'])

    # 单独画出的直角三角形 POM。
    tp, to, tm = (720, 580), (720, 730), (832, 730)
    for p, q in ((tp, to), (to, tm), (tp, tm)):
        ink.line(p, q, c['ink'], 3.4)
    ink.poly([(to[0], to[1] - 14), (to[0] + 14, to[1] - 14), (to[0] + 14, to[1])], c['ink'], 2.4)
    for label, x, y in (('4', 688, 668), ('3', 766, 764), ('5', 790, 650)):
        ink.text(label, x, y, 30, c['blue'], 2.6)
    for label, x, y in (('P', 706, 572), ('O', 686, 752), ('M', 840, 752)):
        ink.text(label, x, y, 28, c['ink'], 2.4)
    ink.text('3 : 4 : 5', 880, 668, 32, c['ink'], 2.8)
    return ink.scene()


def board_marks(c):
    """红笔强调：圈出图里的直角三角形，箭头指向单独画出的那个，结论下画线。"""
    ink = Ink(BOARD, seed=23)
    ink.loop(402, 348, 84, 118, c['red'], 3.2, tilt=-0.2)
    ink.arrow([(486, 424), (580, 540), (690, 620)], c['red'], 3)
    ink.underline(703, 797, 432, c['red'], 2.8, double=True)
    ink.underline(880, 982, 682, c['red'], 2.8, double=True)
    return ink.scene()


def board_highlight(c):
    ink = Ink(BOARD, seed=5)
    for x0, x1, y in ((908, 964, 503), (1196, 1252, 360), (1218, 1300, 503)):
        ink.highlight(x0, x1, y, c['hl'])
    return ink.scene()


def build_board(theme):
    c = INK[theme]
    return {
        'ink-highlight': render(f'board-ink-highlight-{theme}', board_highlight(c)),
        'ink-main': render(f'board-ink-main-{theme}', board_main(c)),
        'ink-marks': render(f'board-ink-marks-{theme}', board_marks(c)),
        'bar': ui('board-bar', 'mainBar', theme, (1500, 260), 1.5, {'pen': 'softPen', 'color': {t: INK[t]['red'] for t in INK}}),
        'page': ui('board-page', 'whiteboardPageControl', theme, (1500, 400), 1.3, {'page': {'index': 1, 'count': 3}}),
    }


# ---------- 屏幕演示：浏览器里的一页英文报告，全年发电量 482 GWh ----------

SCREEN = (1510, 930)
MONTHS = 'JFMAMJJASOND'
OUTPUT = [22, 25, 31, 38, 46, 55, 61, 58, 52, 41, 30, 23]  # 合计 482，比去年的 349 多 38%，月均 40
BODY = ['Total output reached 482 GWh this year, up 38% from 2025.',
        'The largest gain came from the coastal site, where new',
        'panels were installed in March. Output peaked in July at',
        '61 GWh and stayed above 50 GWh through September.',
        '',
        'Two sites still lag behind plan. The northern site lost',
        'nine days to maintenance, and storage capacity limits',
        'evening supply. Both issues are scheduled for Q1 2027.']
BODY_X, BODY_Y, BODY_SIZE, BODY_LEAD = 70, 252, 22, 38
CHART = (800, 226, 1440, 664)  # 图表卡片
PLOT = (850, 330, 1400, 594)   # 柱子区域；纵轴 0–70

SCREEN_COLORS = {
    'light': {'page': '#FFFFFF', 'chrome': '#EEF0F3', 'tab': '#FFFFFF', 'text': '#1B1D21', 'muted': '#6A717C',
              'line': '#E2E5EA', 'card': '#F6F7F9', 'bar': '#8FB4E8', 'bar_peak': '#3D7BD9', 'accent': '#2F6FD0'},
    'dark': {'page': '#17181B', 'chrome': '#24262B', 'tab': '#17181B', 'text': '#ECEEF1', 'muted': '#9AA1AC',
             'line': '#30333A', 'card': '#1F2126', 'bar': '#3F5F8F', 'bar_peak': '#6FA5F2', 'accent': '#7FB0F5'},
}


def bar_box(index):
    x0, y0, x1, y1 = PLOT
    slot = (x1 - x0) / 12
    top = y1 - (y1 - y0) * OUTPUT[index] / 70
    return x0 + slot * index + 8, top, x0 + slot * (index + 1) - 8, y1


def screen_sheet(theme):
    k = SCREEN_COLORS[theme]
    s = Sheet(SCREEN, k['page'])
    # 浏览器外壳：标签页和地址栏。
    s.rect((0, 0, SCREEN[0], 96), k['chrome'])
    s.rect((16, 10, 300, 60), k['tab'], 10)
    s.rect((16, 40, 300, 60), k['tab'])
    s.dot((40, 31), 8, k['accent'])
    s.text((58, 38), 'Solar Output Report', 15, k['text'])
    s.rect((0, 50, SCREEN[0], 96), k['tab'])
    s.rect((120, 58, 1180, 88), k['chrome'], 15)
    s.text((142, 79), 'reports.example.org/solar/2026', 15, k['muted'])
    for x in (34, 68):
        s.dot((x, 73), 3, k['muted'])
    s.segment((0, 96), (SCREEN[0], 96), k['line'])
    # 正文。
    s.text((BODY_X, 160), 'Solar Output Report 2026', 38, k['text'], 'bold')
    s.text((BODY_X, 194), 'Monthly generation across four sites  ·  Updated November 2026', 17, k['muted'])
    for i, line in enumerate(BODY):
        s.text((BODY_X, BODY_Y + i * BODY_LEAD), line, BODY_SIZE, k['text'])
    for i, (value, label) in enumerate((('482 GWh', 'Total output'), ('+38%', 'Year over year'), ('61 GWh', 'Peak month'))):
        x = BODY_X + i * 222
        s.rect((x, 562, x + 204, 664), k['card'], 14)
        s.text((x + 20, 612), value, 30, k['text'], 'semibold')
        s.text((x + 20, 642), label, 16, k['muted'])
    # 图表卡片。
    s.rect(CHART, k['card'], 18)
    s.text((CHART[0] + 28, CHART[1] + 46), 'Monthly output', 22, k['text'], 'semibold')
    s.text((CHART[0] + 28, CHART[1] + 74), 'GWh, all sites', 16, k['muted'])
    x0, y0, x1, y1 = PLOT
    for value in (0, 20, 40, 60):
        y = y1 - (y1 - y0) * value / 70
        s.segment((x0, y), (x1, y), k['line'])
        s.text((x0 - 12, y + 5), str(value), 14, k['muted'], anchor='rs')
    for i in range(12):
        bx0, by0, bx1, by1 = bar_box(i)
        s.rect((bx0, by0, bx1, by1), k['bar_peak'] if i == 6 else k['bar'], 5)
        s.rect((bx0, by1 - 6, bx1, by1), k['bar_peak'] if i == 6 else k['bar'])
        s.text(((bx0 + bx1) / 2, y1 + 26), MONTHS[i], 15, k['muted'], anchor='ms')
    return s


def screen_ink(theme, s):
    c = INK[theme]
    hl, main, marks = Ink(SCREEN, 31), Ink(SCREEN, 37), Ink(SCREEN, 41)
    row = lambda i: BODY_Y + i * BODY_LEAD
    span = lambda i, part: s.span(BODY_X, BODY[i], part, BODY_SIZE)

    # 荧光笔：峰值那半句，跨两行。
    a, b = span(2, 'Output peaked in July at')
    hl.highlight(a + 4, b - 2, row(2) - 8, c['hl'], 26)
    a, b = span(3, '61 GWh')
    hl.highlight(a + 2, b, row(3) - 8, c['hl'], 26)

    # 红笔：圈出 38%，箭头引到页边的验算。
    a, b = span(0, 'up 38%')
    marks.loop((a + b) / 2, row(0) - 8, (b - a) / 2 + 12, 22, c['red'], 2.8, tilt=-0.05)
    marks.arrow([(b + 14, row(0) - 22), (b + 90, row(0) - 76), (838, 152)], c['red'], 2.6, head=18)
    main.text('482 - 349 = 133', 860, 150, 30, c['red'], 2.6)
    main.text('133 / 349 = 38%', 860, 192, 30, c['red'], 2.6)
    main.poly([(1126, 172), (1138, 190), (1168, 144)], c['green'], 3, end='flick')

    # 蓝笔：划出“九天检修”，旁边写疑问；第二段左侧画括号。
    a, b = span(6, 'nine days')
    main.underline(a, b, row(6) + 7, c['blue'], 2.6)
    a, b = span(7, 'Q1 2027')
    main.underline(a, b, row(7) + 7, c['blue'], 2.6, double=True)
    main.curve([(58, row(5) - 20), (44, row(5) - 10), (46, row(6) - 8), (38, row(6) - 2), (46, row(6) + 6), (44, row(7)), (58, row(7) + 8)],
               c['blue'], 2.6)
    main.text('?', 14, row(6) + 4, 36, c['blue'], 3)

    # 图表：月均线、峰值、下半年回落。
    x0, y0, x1, y1 = PLOT
    avg_y = y1 - (y1 - y0) * 40 / 70
    main.dashed((x0 - 6, avg_y), (x1 + 8, avg_y), c['blue'], 2.6, 14, 10)
    main.text('avg 40', x0 + 12, avg_y - 14, 28, c['blue'], 2.4)
    bx0, by0, bx1, _ = bar_box(6)
    marks.loop((bx0 + bx1) / 2, by0 + 2, 34, 26, c['red'], 2.8)
    marks.text('61', bx0 - 4, by0 - 44, 34, c['red'], 2.8)
    marks.arrow([(bx1 + 30, by0 - 6), (bar_box(9)[0] + 20, bar_box(9)[1] - 34), (bar_box(11)[0] + 18, bar_box(11)[1] - 22)],
                c['red'], 2.6, head=18)
    marks.text('-38', bar_box(10)[0] - 6, bar_box(9)[1] - 62, 28, c['red'], 2.4)

    # 图表下方的小计：上半年与下半年。
    main.text('H1: 217', CHART[0] + 36, 724, 30, c['ink'], 2.6)
    main.text('H2: 265', CHART[0] + 36, 766, 30, c['ink'], 2.6)
    main.line((CHART[0] + 196, 698), (CHART[0] + 196, 776), c['ink'], 2.4)
    main.text('217 + 265 = 482', CHART[0] + 230, 746, 30, c['ink'], 2.6)
    main.underline(CHART[0] + 388, CHART[0] + 440, 758, c['red'], 2.6, double=True)
    return {'ink-highlight': hl.scene(), 'ink-main': main.scene(), 'ink-marks': marks.scene()}


def build_screen(theme):
    sheet = screen_sheet(theme)
    layers = {'sheet': sheet.result()}
    for key, scene in screen_ink(theme, sheet).items():
        layers[key] = render(f'screen-{key}-{theme}', scene)
    layers['bar'] = ui('screen-bar', 'penAttributes', theme, (1500, 700), 1.15, {'pen': 'softPen', 'color': {t: INK[t]['red'] for t in INK}})
    return layers


# ---------- 会议与演讲：一张季度回顾的英文幻灯片 ----------

SLIDE = (1520, 900)
WEEKS = [6240, 6610, 7050, 7620, 8380, 9310, 10450, 11520, 12480]  # 第 0–8 周的活跃用户，八周翻一倍
BULLETS = ['Onboarding cut from 5 steps to 3', 'Weekly digest email, 41% open rate', 'Referral credit launched in week 4']
KPIS = (('12,480', 'Active users'), ('86%', 'Retention'), ('54', 'NPS'))
S_PLOT = (760, 330, 1420, 660)  # 折线图区域；纵轴 4000–14000

SLIDE_COLORS = {
    'light': {'page': '#FBFAF7', 'text': '#1D1B18', 'muted': '#7B766D', 'line': '#E4E0D8', 'card': '#F1EEE7', 'accent': '#C8552B',
              'fill': '#F3D9CC'},
    'dark': {'page': '#1B1A18', 'text': '#F1EEE8', 'muted': '#A39D92', 'line': '#34312C', 'card': '#262421', 'accent': '#F08A5D',
             'fill': '#4A2E22'},
}


def week_point(index):
    x0, y0, x1, y1 = S_PLOT
    return x0 + (x1 - x0) * index / 8, y1 - (y1 - y0) * (WEEKS[index] - 4000) / 10000


def slide_sheet(theme):
    k = SLIDE_COLORS[theme]
    s = Sheet(SLIDE, k['page'])
    s.rect((80, 84, 128, 90), k['accent'])
    s.text((80, 130), 'Q3 REVIEW', 18, k['accent'], 'semibold')
    s.text((80, 196), 'Customer growth', 58, k['text'], 'bold')
    s.text((80, 254), 'Eight weeks after the new onboarding flow', 22, k['muted'])
    for i, (value, label) in enumerate(KPIS):
        y = 300 + i * 122
        s.rect((80, y, 330, y + 104), k['card'], 16)
        s.text((104, y + 54), value, 40, k['text'], 'semibold')
        s.text((104, y + 84), label, 17, k['muted'])
    s.text((380, 330), 'What worked', 22, k['text'], 'semibold')
    for i, line in enumerate(BULLETS):
        s.dot((388, 374 + i * 46), 4, k['accent'])
        s.text((406, 381 + i * 46), line, 19, k['text'])
    # 折线图。
    x0, y0, x1, y1 = S_PLOT
    s.text((x0, y0 - 86), 'Weekly active users', 22, k['text'], 'semibold')
    for value in (4000, 8000, 12000):
        y = y1 - (y1 - y0) * (value - 4000) / 10000
        s.segment((x0, y), (x1, y), k['line'])
        s.text((x0 - 14, y + 5), f'{value // 1000}k', 15, k['muted'], anchor='rs')
    points = [week_point(i) for i in range(9)]
    scale = Sheet.SCALE
    s.draw.polygon([(x * scale, y * scale) for x, y in [*points, (x1, y1), (x0, y1)]], fill=k['fill'])
    for a, b in zip(points, points[1:]):
        s.segment(a, b, k['accent'], 4)
    for i, p in enumerate(points):
        s.dot(p, 6, k['accent'])
        s.text((p[0], y1 + 30), f'W{i}', 15, k['muted'], anchor='ms')
    s.text((SLIDE[0] - 80, 846), '3', 15, k['muted'], anchor='rs')
    return s


def slide_ink(theme, s):
    c = INK[theme]
    hl, main, marks = Ink(SLIDE, 51), Ink(SLIDE, 57), Ink(SLIDE, 61)
    # 荧光笔：第一条要点。
    hl.highlight(404, 406 + s.width(BULLETS[0], 19), 374, c['hl'], 26)
    # 标题下划线，给三条要点编号。
    main.underline(80, 80 + s.width('Customer growth', 58, 'bold'), 216, c['red'], 3.2)
    for i, mark in enumerate('123'):
        main.text(mark, 350, 384 + i * 46, 26, c['blue'], 2.2)
    main.text('5 → 3', 406 + s.width(BULLETS[0], 19) + 16, 350, 26, c['blue'], 2.2)
    # 红笔：圈出留存率，旁边写上一季的数。
    marks.loop(158, 458, 78, 34, c['red'], 3, tilt=-0.04)
    main.text('+9', 262, 474, 32, c['red'], 2.8)
    # 折线图：起点、终点、翻倍、下一步目标。
    p0, p8 = week_point(0), week_point(8)
    marks.loop(p8[0], p8[1], 26, 22, c['red'], 2.8)
    marks.text('12,480', p8[0] - 150, p8[1] - 30, 30, c['red'], 2.6)
    main.text('6,240', p0[0] + 18, p0[1] + 46, 28, c['blue'], 2.4)
    main.arrow([(p0[0] + 60, p0[1] - 36), (week_point(4)[0] - 20, week_point(4)[1] - 70), (p8[0] - 190, p8[1] - 10)], c['blue'], 2.8, head=20)
    main.text('×2', week_point(3)[0] - 34, week_point(4)[1] - 96, 40, c['blue'], 3.4)
    main.text('8 wks', week_point(3)[0] + 34, week_point(4)[1] - 100, 26, c['blue'], 2.2)
    # 目标线：15k，超出图表上沿一点。
    x0, y0, x1, y1 = S_PLOT
    goal_y = y1 - (y1 - y0) * (15000 - 4000) / 10000
    main.dashed((x0 + 300, goal_y), (x1 + 20, goal_y), c['green'], 2.6, 14, 10)
    main.text('Q4: 15k', x0 + 150, goal_y + 10, 28, c['green'], 2.4)
    # 底部的口算：还差多少。
    main.text('15,000 - 12,480 = 2,520', 420, 560, 28, c['ink'], 2.4)
    main.text('2,520 / 8 = 315 / wk', 420, 602, 28, c['ink'], 2.4)
    main.underline(552, 606, 614, c['red'], 2.6, double=True)
    main.text('NPS 54 ?', 370, 690, 28, c['blue'], 2.4)
    main.arrow([(366, 678), (346, 660), (318, 620)], c['blue'], 2.4, head=16)
    return {'ink-highlight': hl.scene(), 'ink-main': main.scene(), 'ink-marks': marks.scene()}


def build_slides(theme):
    sheet = slide_sheet(theme)
    layers = {'sheet': sheet.result()}
    for key, scene in slide_ink(theme, sheet).items():
        layers[key] = render(f'slides-{key}-{theme}', scene)
    layers['bar'] = ui('slides-bar', 'mainBar', theme, (1500, 260), 1.35, {'pen': 'softPen', 'color': {t: INK[t]['blue'] for t in INK}})
    layers['page'] = ui('slides-page', 'pptPageControl', theme, (1500, 400), 1.35, {'page': {'index': 2, 'count': 12}})
    return layers


# ---------- 导出与预览 ----------

# 每张卡片：面板底色（浅、深）、内容层在面板里的左上角、界面层左上角。与 SectionScenes.vue 的 STAGES 保持一致。
CARDS = {
    'screen': {'build': build_screen, 'panel': ('#D6D3EA', '#28263C'), 'origin': (90, 70), 'ui': {'bar': (250, 678)}},
    'slides': {'build': build_slides, 'panel': ('#C9D8E8', '#1E2C3D'), 'origin': (80, 100), 'ui': {'page': (44, 858), 'bar': (430, 860)}},
    'board': {'build': build_board, 'panel': ('#CBDDD2', '#1D332C'), 'origin': (100, 80), 'ui': {'page': (1150, 716), 'bar': (220, 850)},
              'sheet': ('#FFFFFF', '#1E1F22')},
}


def save(image, name, manifest):
    PUBLIC.mkdir(parents=True, exist_ok=True)
    target = PUBLIC / f'{name}.webp'
    image.save(target, 'WEBP', quality=92, method=6, exact=True)
    manifest[target.name] = {'size': list(image.size), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}


def compose_preview(card, theme, layers):
    spec, light = CARDS[card], theme == 'light'
    panel = Image.new('RGBA', (1600, 1000), spec['panel'][0 if light else 1])
    if 'sheet' in layers:
        content = layers['sheet'].copy()
    else:
        content = Image.new('RGBA', layers['ink-main'].size, spec['sheet'][0 if light else 1])
        dots = ImageDraw.Draw(content)
        for y in range(14, content.height, 28):
            for x in range(14, content.width, 28):
                dots.ellipse((x - 1.5, y - 1.5, x + 1.5, y + 1.5), fill=(0, 0, 0, 40) if light else (255, 255, 255, 40))
    for key in ('ink-highlight', 'ink-main', 'ink-marks'):
        content.alpha_composite(layers[key])
    ox, oy = spec['origin']
    panel.alpha_composite(content.crop((0, 0, 1600 - ox, 1000 - oy)), (ox, oy))
    for key, (x, y) in spec['ui'].items():
        image = layers[key]
        panel.alpha_composite(image.crop((0, 0, min(image.width, 1600 - x), min(image.height, 1000 - y))), (x, y))
    panel.convert('RGB').save(OUT / f'preview-{card}-{theme}.png')


def main():
    args = sys.argv[1:]
    cards = [args[args.index('--only') + 1]] if '--only' in args else list(CARDS)
    themes = ['light'] if '--light' in args else list(INK)
    manifest_path = HERE / 'manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}
    for card in cards:
        for theme in themes:
            layers = CARDS[card]['build'](theme)
            for key, image in layers.items():
                save(image, f'{card}-{key}-{theme}', manifest)
            if '--preview' in args:
                compose_preview(card, theme, layers)
            print(card, theme, {key: image.size for key, image in layers.items()})
    manifest_path.write_text(json.dumps(dict(sorted(manifest.items())), indent=1) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
