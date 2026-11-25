"""下载页插图卡片里的墨迹：由 InkeysRenderer 绘制，导出透明 WebP。

用法（python3）：
  python3 media/dl-tiles/tiles.py                 渲染全部，写入 docs/.vuepress/public/download/ink/
  python3 media/dl-tiles/tiles.py --only board    只出某一张
  python3 media/dl-tiles/tiles.py --reuse         场景没变的直接用上次的渲染结果

卡片线稿是 DownloadCard.vue 里的 SVG（viewBox 160×120），墨迹图按 4 倍画（640×480），
用 <image> 叠在线稿上。下面的坐标都写 viewBox 单位，由 P() / K 换算成画布像素。
线条的采样（弯处慢、直线快、停住收笔不出锋）复用 media/nh3-scenes/build.py。
"""
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE.parent / 'nh3-scenes'))
import build as nh3  # noqa: E402

nh3.OUT = HERE / 'out'
PUBLIC = ROOT / 'docs' / '.vuepress' / 'public' / 'download' / 'ink'

K = 4
SIZE = (160 * K, 120 * K)

# 与页面原先的墨迹配色一致；深色模式用提亮的一套。
COLORS = {
    'light': {'blue': '#2563EB', 'red': '#E5484D', 'green': '#2F9E44'},
    'dark': {'blue': '#5B8CFF', 'red': '#FF6B70', 'green': '#4CC265'},
}


def P(x, y):
    return (x * K, y * K)


class Tile(nh3.Ink):
    """坐标与字号、笔宽都按 viewBox 单位给。"""

    def __init__(self, seed):
        super().__init__(SIZE, seed)

    def write(self, content, x, y, size, color):
        self.text(content, x * K, y * K, size * K, color, round(size * K / 12, 1))

    def seg(self, p, q, color, width=1.25, **kw):
        self.line(P(*p), P(*q), color, width * K, **kw)

    def bend(self, points, color, width=1.25, **kw):
        self.curve([P(*p) for p in points], color, width * K, **kw)

    def corner(self, points, color, width=1.25, **kw):
        self.poly([P(*p) for p in points], color, width * K, **kw)

    def under(self, x0, x1, y, color, width=1.2, double=False):
        self.underline(x0 * K, x1 * K, y * K, color, width * K, double)

    def point_to(self, points, color, width=1.3, head=6):
        self.arrow([P(*p) for p in points], color, width * K, head * K)

    def ring(self, cx, cy, rx, ry, color, width=1.2, tilt=-0.06):
        self.loop(cx * K, cy * K, rx * K, ry * K, color, width * K, tilt)

    def raw(self, points, color, width=1.3, speed=620, end='hold'):
        """已经足够密的折线，直接按笔速采样。"""
        self._stroke([P(*p) for p in points], color, width * K, speed, end)


# ---------- 谁可以使用 ----------

def person(c):
    """个人：纸上的一条笔记。"""
    t = Tile(101)
    t.write('Idea!', 90, 46, 17, c['blue'])
    t.under(90, 132, 54, c['red'])
    return t


def school(c):
    """教育：黑板上的板书。"""
    t = Tile(102)
    t.write('y = 2x + 1', 30, 50, 18, c['blue'])
    t.under(32, 122, 60, c['red'], double=True)
    return t


def business(c):
    """企业与商业：在图表上画出增长趋势。"""
    t = Tile(103)
    t.point_to([(78, 70), (100, 54), (130, 28)], c['red'], head=7)
    return t


def live(c):
    """创作与直播：画面上的手写。"""
    t = Tile(104)
    t.write('Hi!', 38, 62, 30, c['blue'])
    t.under(38, 82, 71, c['red'])
    return t


# ---------- 在什么设备上使用 ----------

def computer(c):
    """电脑：显示器和笔记本屏幕上各写一处。"""
    t = Tile(201)
    t.write('Inkeys', 22, 30, 17, c['blue'])
    t.under(22, 68, 38, c['red'])
    t.write('abc', 90, 78, 22, c['green'])
    return t


def panel(c):
    """大屏一体机：勾股定理和一个直角三角形。"""
    t = Tile(202)
    t.write('a² + b² = c²', 24, 38, 17, c['blue'])
    a, b, d = (96, 70), (134, 70), (134, 46)
    t.seg(a, b, c['green'])
    t.seg(b, d, c['green'])
    t.seg(d, a, c['green'])
    t.corner([(128, 70), (128, 64), (134, 64)], c['green'], 1)
    return t


def projector(c):
    """投影仪：在投影的幻灯片上圈重点、打勾。"""
    t = Tile(203)
    t.ring(66, 52, 33, 7.5, c['red'])
    t.corner([(100, 25), (105, 31), (116, 17)], c['blue'], end='flick')
    return t


def detachable(c):
    """二合一平板：用笔写字，下划线收在笔尖。"""
    t = Tile(204)
    t.write('Notes', 46, 40, 20, c['blue'])
    t.bend([(46, 50), (72, 48.5), (100, 50)], c['red'], 1.2)
    return t


# ---------- 用什么书写 ----------

def mouse(c):
    """鼠标：一串连笔圈，收在指针尖。"""
    t = Tile(301)
    # 长幅摆线：前进量小于半径时形成连续的圈。
    x0, y0, a, r = 16, 88, 2.75, 8
    pts = []
    steps = 180
    for i in range(steps + 1):
        u = 6 * math.pi * i / steps
        pts.append((x0 + a * u - r * math.sin(u) * 0.8, y0 - r * (1 - math.cos(u))))
    end = pts[-1]
    pts += [(end[0] + 4, end[1] - 1.5), (78, 84)]
    t.raw(pts, c['blue'], speed=560)
    return t


def touch(c):
    """触摸：手指划出的一笔，收在指尖。"""
    t = Tile(302)
    t.bend([(18, 84), (30, 56), (46, 50), (58, 74), (72, 76), (84, 54), (96, 45)], c['green'], 1.4, speed=600)
    return t


def tablet(c):
    """数位板：笔在板上写，字出现在显示器里。"""
    t = Tile(303)
    t.write('123', 30, 42, 24, c['red'])
    return t


def pen(c):
    """屏幕笔：直接写在屏幕上，下划线收在笔尖。"""
    t = Tile(304)
    t.write('Hello', 28, 56, 26, c['blue'])
    t.bend([(28, 68), (60, 66), (96, 68)], c['green'], 1.2)
    return t


TILES = {
    'person': person, 'school': school, 'business': business, 'live': live,
    'computer': computer, 'panel': panel, 'projector': projector, 'detachable': detachable,
    'mouse': mouse, 'touch': touch, 'tablet': tablet, 'pen': pen,
}


def main():
    args = sys.argv[1:]
    names = [args[args.index('--only') + 1]] if '--only' in args else list(TILES)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    for name in names:
        for theme, colors in COLORS.items():
            image = nh3.render(f'{name}-{theme}', TILES[name](colors).scene())
            box = image.getbbox()
            image.save(PUBLIC / f'{name}-{theme}.webp', 'WEBP', quality=90, method=6, exact=True)
            # 墨迹的包围盒（viewBox 单位），对线稿位置时用。
            print(name, theme, [round(v / K, 1) for v in box] if box else None)


if __name__ == '__main__':
    main()
