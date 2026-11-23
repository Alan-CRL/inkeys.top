"""从 Patrick Hand（轮廓字体，SIL OFL）提取每个字形的中心线，按笔顺排好，输出给 S5-A 的板书使用。

用法（在 media/nh3-remotion 下）：
  uv run --with pillow --with scikit-image --with numpy python scripts/patrick-centerlines.py \
      .cache/fonts/patrickhand/PatrickHand-Regular.ttf src/s5a/film/patrickHand.ts

流程：字形栅格化 → 骨架化 → 剪掉短毛刺 → 骨架拆成“端点/交叉点之间的线段” → 按顺滑程度把线段接成笔画
→ 高斯平滑、抽稀 → 坐标除以字号（单位 em，基线 y=0，向上为负）。
每一笔之后会在片中重新走 Draw3 墨迹模拟，所以这里只要干净的中心线，不保留轮廓宽度。
"""

import json
import math
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage
from skimage.morphology import skeletonize

EM = 512  # 栅格化字号（像素）
PAD = 64
CHARSET = (
    "0123456789"
    "abcdefghijklmnopqrstuvwxyz"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "+-=()[]/.,:;'<>|"
    "²³√×÷±≤≥π·−°"
)
N8 = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def raster(font, ch):
    asc, desc = font.getmetrics()
    w = int(font.getlength(ch)) + 2 * PAD
    h = asc + desc + 2 * PAD
    img = Image.new("L", (w, h), 0)
    ImageDraw.Draw(img).text((PAD, PAD + asc), ch, font=font, fill=255, anchor="ls")
    return np.array(img) > 127, (PAD, PAD + asc)


def neighbors(sk, y, x):
    out = []
    for dy, dx in N8:
        yy, xx = y + dy, x + dx
        if 0 <= yy < sk.shape[0] and 0 <= xx < sk.shape[1] and sk[yy, xx]:
            out.append((yy, xx))
    return out


def degree_map(sk):
    k = np.ones((3, 3), int)
    k[1, 1] = 0
    return ndimage.convolve(sk.astype(int), k, mode="constant") * sk


def prune(sk, length):
    """反复剪掉长度小于 length 的端点毛刺（骨架化在笔画拐角处留下的短枝）。"""
    sk = sk.copy()
    for _ in range(4):
        deg = degree_map(sk)
        ends = list(zip(*np.nonzero((deg == 1) & sk)))
        removed = False
        for y, x in ends:
            path = [(y, x)]
            prev = None
            cur = (y, x)
            while True:
                nb = [p for p in neighbors(sk, *cur) if p != prev and p not in path]
                if len(nb) != 1:
                    break
                prev, cur = cur, nb[0]
                if deg[cur] > 2:
                    break
                path.append(cur)
                if len(path) > length:
                    break
            # 只剪“端点 → 交叉点”的短枝；孤立短线（如 i 的点）保留。
            if len(path) <= length and deg[cur] > 2:
                for p in path:
                    sk[p] = False
                removed = True
        if not removed:
            break
    return skeletonize(sk)


def trace_edges(sk):
    """把骨架拆成线段：交叉点像素聚成一个节点，线段连在节点之间；纯闭环单独返回。"""
    deg = degree_map(sk)
    junction = (deg > 2) & sk
    labels, n = ndimage.label(junction, structure=np.ones((3, 3)))
    node_of = {}
    centers = {}
    for i in range(1, n + 1):
        pts = list(zip(*np.nonzero(labels == i)))
        for p in pts:
            node_of[p] = i
        centers[i] = tuple(np.mean(pts, axis=0))
    ends = list(zip(*np.nonzero((deg == 1) & sk)))
    for k, p in enumerate(ends):
        node_of[p] = n + 1 + k
        centers[n + 1 + k] = p
    visited = set()
    edges = []
    # 从每个节点像素出发，沿非节点像素走到下一个节点。
    for p, nid in list(node_of.items()):
        for q in neighbors(sk, *p):
            if q in node_of or (p, q) in visited:
                continue
            path = [centers[nid], q]
            prev, cur = p, q
            visited.add((p, q))
            end = None
            while True:
                nb = [r for r in neighbors(sk, *cur) if r != prev and (r in node_of or r not in path[1:])]
                nxt = None
                for r in nb:
                    if r in node_of and node_of[r] != node_of.get(prev):
                        nxt = r
                        break
                if nxt is not None:
                    end = node_of[nxt]
                    visited.add((nxt, cur))
                    path.append(centers[end])
                    break
                nb = [r for r in nb if r not in node_of and r not in path]
                if not nb:
                    break
                prev, cur = cur, nb[0]
                path.append(cur)
            if end is None:
                continue
            key = (min(nid, end), max(nid, end), round(path[len(path) // 2][0]), round(path[len(path) // 2][1]))
            if any(e["key"] == key for e in edges):
                continue
            edges.append({"a": nid, "b": end, "pts": path, "key": key})
    # 端点直接相连的孤立线段（两端都是端点）
    covered = set()
    for e in edges:
        for p in e["pts"]:
            covered.add((round(p[0]), round(p[1])))
    loops = []
    rest = sk.copy()
    for y, x in covered:
        if 0 <= y < rest.shape[0] and 0 <= x < rest.shape[1]:
            rest[y, x] = False
    for p in node_of:
        rest[p] = False
    labels, n = ndimage.label(rest, structure=np.ones((3, 3)))
    for i in range(1, n + 1):
        pts = list(zip(*np.nonzero(labels == i)))
        if len(pts) < 12:
            # 很小的孤立块是 i、j 的点或标点：记成一笔极短的点，墨迹模拟会把它画成圆点。
            cy, cx = np.mean(pts, axis=0)
            loops.append([(cy - 1.5, cx - 1.0), (cy + 1.5, cx + 1.0)])
            continue
        loops.append(order_loop(set(pts)))
    return edges, loops, centers


def order_loop(pts):
    """闭环（如 o、0）按书写习惯从右上方起笔、逆时针绕一圈。"""
    start = min(pts, key=lambda p: p[0] - 0.6 * p[1])
    path = [start]
    cur = start
    left = set(pts) - {start}
    while left:
        nb = [p for p in left if abs(p[0] - cur[0]) <= 1 and abs(p[1] - cur[1]) <= 1]
        if not nb:
            break
        # 第一步朝左（逆时针），之后沿骨架走
        cur = min(nb, key=lambda p: p[1]) if len(path) == 1 else nb[0]
        path.append(cur)
        left.discard(cur)
    path.append(start)
    return path


def angle_of(a, b):
    return math.atan2(b[0] - a[0], b[1] - a[1])


def direction_at(pts, from_start, span=10):
    if from_start:
        return angle_of(pts[0], pts[min(span, len(pts) - 1)])
    return angle_of(pts[max(0, len(pts) - 1 - span)], pts[-1])


def assemble(edges, centers):
    """按“最顺”的方向把线段接成笔画：到交叉点时，接上转角最小且小于 65° 的下一段。"""
    unused = list(range(len(edges)))
    strokes = []
    deg = {}
    for e in edges:
        deg[e["a"]] = deg.get(e["a"], 0) + 1
        deg[e["b"]] = deg.get(e["b"], 0) + 1
    while unused:
        # 起笔：剩余线段里，度为 1 的端点优先；其中取最靠上、靠左的。
        cands = []
        for i in unused:
            e = edges[i]
            for node, pts in ((e["a"], e["pts"]), (e["b"], e["pts"][::-1])):
                score = pts[0][0] + 0.7 * pts[0][1] - (400 if deg.get(node, 0) == 1 else 0)
                cands.append((score, i, node, pts))
        _, i, node, pts = min(cands, key=lambda c: c[0])
        unused.remove(i)
        stroke = list(pts)
        cur = edges[i]["b"] if node == edges[i]["a"] else edges[i]["a"]
        while True:
            inc = direction_at(stroke, False)
            best = None
            for j in unused:
                e = edges[j]
                if cur not in (e["a"], e["b"]):
                    continue
                p = e["pts"] if e["a"] == cur else e["pts"][::-1]
                d = direction_at(p, True)
                turn = abs((d - inc + math.pi) % (2 * math.pi) - math.pi)
                if best is None or turn < best[0]:
                    best = (turn, j, p)
            if best is None or best[0] > math.radians(65):
                break
            _, j, p = best
            unused.remove(j)
            stroke.extend(p[1:])
            cur = edges[j]["b"] if edges[j]["a"] == cur else edges[j]["a"]
        strokes.append(stroke)
    return strokes


def resample(pts, step=2.0):
    pts = np.array(pts, float)
    seg = np.hypot(*np.diff(pts, axis=0).T)
    s = np.concatenate([[0], np.cumsum(seg)])
    if s[-1] < 1e-6:
        return pts[:1]
    t = np.arange(0, s[-1], step)
    t = np.append(t, s[-1])
    return np.stack([np.interp(t, s, pts[:, 0]), np.interp(t, s, pts[:, 1])], 1)


def smooth(pts, sigma=3.5, closed=False):
    if len(pts) < 5:
        return pts
    mode = "wrap" if closed else "nearest"
    out = np.stack([ndimage.gaussian_filter1d(pts[:, k], sigma, mode=mode) for k in range(2)], 1)
    if not closed:
        out[0], out[-1] = pts[0], pts[-1]
    return out


def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    ab = b - a
    n = np.hypot(*ab)
    if n < 1e-9:
        d = np.hypot(*(pts - a).T)
    else:
        d = np.abs(ab[0] * (pts[:, 1] - a[1]) - ab[1] * (pts[:, 0] - a[0])) / n
    k = int(np.argmax(d))
    if d[k] > eps:
        return np.concatenate([rdp(pts[: k + 1], eps)[:-1], rdp(pts[k:], eps)])
    return np.stack([a, b])


def main(font_path, out_path):
    font = ImageFont.truetype(font_path, EM)
    glyphs = {}
    widths = []
    for ch in CHARSET:
        img, (ox, oy) = raster(font, ch)
        if not img.any():
            continue
        dist = ndimage.distance_transform_edt(img)
        sk = skeletonize(img)
        sk = prune(sk, 18)
        widths.extend((2 * dist[sk]).tolist())
        # 先把很小的骨架块（i、j 的点和标点）单独拿出来，记成极短的一笔，墨迹模拟会画成圆点。
        lab, nlab = ndimage.label(sk, structure=np.ones((3, 3)))
        dots = []
        for i in range(1, nlab + 1):
            pts = np.argwhere(lab == i)
            if len(pts) < 12:
                cy, cx = pts.mean(axis=0)
                dots.append([(cy - 1.5, cx - 1.0), (cy + 1.5, cx + 1.0)])
                sk[lab == i] = False
        edges, loops, centers = trace_edges(sk)
        strokes = assemble(edges, centers) + loops + dots
        out = []
        for s in strokes:
            closed = len(s) > 3 and math.dist(s[0], s[-1]) < 2.5
            p = resample(s)
            if len(p) < 2:
                continue
            p = smooth(p, closed=closed)
            p = rdp(p, 0.5)
            # 书写习惯：从上往下起笔；横向的笔画从左往右。闭环保持原方向。
            if not closed:
                dy = p[0][0] - p[-1][0]
                dx = p[0][1] - p[-1][1]
                if dy > 0.12 * EM or (abs(dy) < 0.05 * EM and dx > 0.15 * EM):
                    p = p[::-1]
            # (y, x) 像素 → (x, y) em，基线为 0
            out.append([[round((x - ox) / EM, 4), round((y - oy) / EM, 4)] for y, x in p])
        # 笔顺：先左后右；同列先上后下。i、j 的点放在最后写（标点本身只有点，不受影响）。
        is_dot = lambda s: len(s) == 2 and math.dist(s[0], s[1]) < 0.02
        has_body = any(not is_dot(s) for s in out)
        out.sort(key=lambda s: (has_body and is_dot(s), min(q[0] for q in s) + 0.4 * min(q[1] for q in s)))
        glyphs[ch] = {"adv": round(font.getlength(ch) / EM, 4), "strokes": out}
    data = {
        "source": "Patrick Hand Regular 1.003, (c) 2010-2012 Patrick Wagesreiter, SIL Open Font License 1.1",
        "units": "em; baseline y=0, y grows downward",
        "strokeWidth": round(float(np.median(widths)) / EM, 4),
        "glyphs": glyphs,
    }
    body = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    with open(out_path, "w", encoding="utf-8", newline="\n") as fh:
        if out_path.endswith(".ts"):
            # 输出成 TS 模块，工程不必打开 resolveJsonModule。
            fh.write("// 由 scripts/patrick-centerlines.py 生成，不要手改。\n")
            fh.write("export const PATRICK_HAND = " + body + "\n")
        else:
            fh.write(body)
    print(len(glyphs), "glyphs, stroke width", data["strokeWidth"], "em")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
