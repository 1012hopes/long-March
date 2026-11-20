# -*- coding: utf-8 -*-
"""把图生图产出的「360 等距圆柱全景」整理成场景层能用的底图。

和 prep-pano.py 的差别：
  · 这张是**一整圈**，左右两端会在圆筒上接起来，所以多一步「接缝处理」；
  · 不裁顶部 —— 等距圆柱的顶就是天顶，裁掉一寸，抬头就少一寸；
  · 只裁底部水印，然后放大 2 倍、锐化、提亮。

用法：
  python scripts/prep-pano360.py <源图> <输出名> [--seam 0.026] [--lift 1.06]
输出：
  real/img/wide/<输出名>.jpg       给场景层用
  .tmp-pano/<输出名>-seam.png      接缝一条（最后 260px + 最前 260px 并排），用来看接得对不对
"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

ROOT = r"E:/数媒/长征一条路的来处/app/public/experience/real/img/wide"
TMP = r"E:/数媒/长征一条路的来处/.tmp-pano"
CROP_BOTTOM = 46
# 2:1 的等距圆柱，输出固定成 POT（2 的幂）—— 见下面 resize 处的说明。
# 4096×2048 是移动端 GL 纹理上限的安全值；桌面上还能更大，但没必要。
POT_W, POT_H = 4096, 2048


def seam_fix(a, band):
    """接缝：把「最右一小段」叠进「最左一小段」，然后把最右那段切掉。

    图生图给的 360 图几乎不可能真的左右严丝合缝。放着不管，转到那儿就是
    一道竖着的硬切。这里做的是标准的 wrap 重叠：
        新图宽 = 原宽 - b
        前 b 列 = (1-t)·原图(w-b+x) 与 t·原图(x) 的渐变（t 从 0 到 1）
    于是新图的第 0 列紧接新图的最后一列 —— 它们本来就是原图里挨着的两列，
    接缝在数学上消失了。代价是丢掉 b 列（2.6% 的一小条）。
    """
    h, w = a.shape[:2]
    b = max(4, int(round(w * band)))
    if b >= w // 4:
        return a
    out = a[:, :w - b].copy()
    left = a[:, :b].astype(np.float32)          # 原图开头
    tail = a[:, w - b:w].astype(np.float32)     # 原图结尾（要接到开头前面去）
    t = np.linspace(0.0, 1.0, b, dtype=np.float32)[None, :, None]
    out[:, :b] = np.clip(tail * (1 - t) + left * t, 0, 255).astype(np.uint8)
    return out


def corner(a, width, dark):
    """把接缝那条竖带压暗，做成一个屋角。

    360 图几乎不可能左右严丝合缝，硬切就落在「竹竿被一刀切断」这种地方，
    眼睛立刻看出是两张图拼的。压暗不是遮盖，是给这个「面」找一个物理身份：
    两面墙相交的地方本来就是暗的，草屋的转角更是黑的。
    于是观众读到的不是一个错误，是一处墙角。

    width  暗带半宽占图宽的比例
    dark   中心处剩多少亮度（0.22 很黑，0.45 只是阴影）
    """
    h, w = a.shape[:2]
    x = np.arange(w, dtype=np.float32)
    # 到接缝（x=0 / x=w 同一点）的环向距离
    d = np.minimum(x, w - x) / w
    s = np.clip(d / max(1e-6, width), 0, 1)
    k = dark + (1 - dark) * (s * s * (3 - 2 * s))
    return np.clip(a.astype(np.float32) * k[None, :, None], 0, 255).astype(np.uint8)


def main():
    args = sys.argv[1:]
    if len(args) < 2:
        print(__doc__)
        return
    src, name = args[0], args[1]
    band = 0.012
    lift = 1.06
    cw = 0.034
    cdark = 0.24
    crop_bottom = CROP_BOTTOM
    rx = 0
    if "--cropx" in args:
        rx = int(args[args.index("--cropx") + 1])
    if "--seam" in args:
        band = float(args[args.index("--seam") + 1])
    if "--lift" in args:
        lift = float(args[args.index("--lift") + 1])
    if "--crop" in args:
        crop_bottom = int(args[args.index("--crop") + 1])
    if "--corner" in args:
        cw = float(args[args.index("--corner") + 1])
        cdark = float(args[args.index("--corner") + 2])

    im = Image.open(src).convert("RGB")
    w, h = im.size
    im = im.crop((0, 0, w, h - crop_bottom))

    # 生成图不一定是 2:1（常见 1080×486 ≈ 2.22:1），必须补成 2:1：
    # 等距圆柱按 2:1 才有正确的角度换算，比例不对时圆筒上的水平角和竖直角对不上，
    # 人会被拉宽、接缝处抬头会歪。
    # 优先从**右侧**裁（右下角就是水印所在），不够再从两侧平均收。
    w, h = im.size
    if rx > 0:
        im = im.crop((0, 0, max(8, w - rx), h))
        w, h = im.size
    if w > 2 * h:
        im = im.crop((0, 0, 2 * h, h))
    elif w < 2 * h:
        im = im.crop((0, 0, w, max(8, w // 2)))

    a = np.asarray(im)
    if band > 0:
        a = seam_fix(a, band)
    if cw > 0:
        a = corner(a, cw, cdark)
    im = Image.fromarray(a)

    # 输出成 2 的幂（4096×2048）：WebGL1 只有 POT 纹理能生成 mipmap，
    # 没有 mipmap 的 LINEAR 在缩小时会同时糊掉细节和抖出摩尔纹 ——
    # 4023×1936 这种尺寸贴到 1080 宽的画布上，缩了 3.7 倍，正是「糊」的主因。
    im = im.resize((POT_W, POT_H), Image.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.4, percent=62, threshold=2))
    if lift != 1.0:
        im = ImageEnhance.Brightness(im).enhance(lift)
        im = ImageEnhance.Contrast(im).enhance(1.03)

    out = os.path.join(ROOT, name + ".jpg")
    im.save(out, quality=88, subsampling=1, optimize=True)
    print("wrote", out, im.size, round(os.path.getsize(out) / 1024), "KB")

    # 接缝一条：最后 260 + 最前 260，并排看能不能接上
    os.makedirs(TMP, exist_ok=True)
    W, H = im.size
    k = 260
    strip = Image.new("RGB", (k * 2, H))
    strip.paste(im.crop((W - k, 0, W, H)), (0, 0))
    strip.paste(im.crop((0, 0, k, H)), (k, 0))
    p = os.path.join(TMP, name + "-seam.png")
    strip.save(p)
    print("seam", p, strip.size)

    if "--grid" in args:
        grid(im, name)


def grid(im, name):
    """0.05 一条细线、0.1 一条带数的线 —— 360 图上读人物坐标用。"""
    from PIL import ImageDraw
    w, h = im.size
    s = 1600 / w
    g = im.resize((int(w * s), int(h * s)), Image.LANCZOS)
    w, h = g.size
    d = ImageDraw.Draw(g, "RGBA")
    for i in range(1, 40):
        x = w * i / 40
        d.line([(x, 0), (x, h)], fill=(120, 220, 255, 96 if i % 2 == 0 else 40), width=1)
    for i in range(1, 20):
        y = h * i / 20
        d.line([(0, y), (w, y)], fill=(255, 190, 110, 90 if i % 2 == 0 else 40), width=1)
    d.line([(w * 0.5, 0), (w * 0.5, h)], fill=(255, 90, 70, 190), width=2)
    for i in range(0, 40, 2):
        for j in range(0, 20, 2):
            d.text((w * i / 40 + 4, h * j / 20 + 3), "%.2f,%.2f" % (i / 40, j / 20),
                   fill=(150, 235, 255, 220))
    p = os.path.join(TMP, name + "-grid.png")
    g.save(p)
    print("grid", p, g.size)


if __name__ == "__main__":
    main()
