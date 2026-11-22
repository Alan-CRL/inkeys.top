"""网页展示用的“更通透”底板：只降低原生最底层底板的 alpha，前景与卡片保持原生像素。

原生画面 = 前景（文字、图标、卡片、叠色）以 source-over 叠在一层纯色底板上。
对底板覆盖的像素，已知底板颜色与 alpha 即可反解出前景的覆盖率，
再把同一前景叠到更透明的同色底板上，相当于原生“背景不透明度”只改底板这一层。
"""
import numpy as np
from scipy import ndimage

# 设置窗口窗底与主栏底板在网页上统一使用的不透明度（原生默认：窗底 0.80，主栏深色 0.80、浅色约 0.92）。
WEB_BACKDROP_OPACITY = 0.6


def thin_backdrop(straight, base_rgb, base_alpha, region, new_opacity=WEB_BACKDROP_OPACITY):
    """straight：直通 alpha 的 RGBA uint8；region：只在此布尔区域内替换底板。"""
    rgba = straight.astype(np.float64)
    a = rgba[..., 3:4] / 255
    premul = rgba[..., :3] * a
    b, nb = base_alpha / 255, new_opacity
    base = np.asarray(base_rgb, dtype=np.float64)
    # 底板之上的像素：反解前景覆盖率 aF，把下面露出的 (1 - aF) 份底板换成新底板。
    cover = np.clip((a - b) / (1 - b), 0, 1)
    rest = 1 - cover
    over_premul = premul - rest * base * (b - nb)
    over_alpha = a - rest * (b - nb)
    # 底板自身的抗锯齿边缘（alpha 低于底板）：按底板覆盖率等比缩放。
    edge = a < b
    scale = nb / b
    new_premul = np.where(edge, premul * scale, over_premul)
    new_alpha = np.where(edge, a * scale, over_alpha)
    keep = ~region[..., None]
    new_premul = np.where(keep, premul, new_premul)
    new_alpha = np.where(keep, a, new_alpha)
    out = np.empty_like(straight)
    out[..., 3] = np.clip(np.rint(new_alpha[..., 0] * 255), 0, 255)
    rgb = new_premul / np.maximum(new_alpha, 1e-6)
    out[..., :3] = np.where(new_alpha > 0, np.clip(np.rint(rgb), 0, 255), 0)
    return out


def solid_regions(alpha, threshold, min_area):
    """把 alpha 不低于 threshold 的大块区域（含内部文字等空洞）填实，滤掉零散字形。"""
    filled = ndimage.binary_fill_holes(alpha >= threshold)
    labels, count = ndimage.label(filled)
    if not count:
        return filled
    sizes = ndimage.sum(filled, labels, range(1, count + 1))
    return np.isin(labels, 1 + np.flatnonzero(sizes >= min_area))
