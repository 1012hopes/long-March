# -*- coding: utf-8 -*-
"""给 360 全景图估一张深度图（0 = 远 / 天，1 = 近 / 脚下）。

make-depth.py 是给**平面底图**用的：地平线取 v≈0.52，只处理 real/img/*.jpg。
360 图不一样 —— 它是等距圆柱，v=0.5 是地平线，v=0 是天顶，v=1 是脚底，
所以线索要按这个几何重排。

没有网络、没有深度模型，只能靠画面自己的线索：
  · 地面：v 从 0.5 往下，越靠下越近（脚下最近）
  · 天：v 从 0.46 往上，又亮又低饱和的 —— 最远
  · 地平线那条带：默认远。这是视差的「零点」，远景不动、近景才会滑
  · 暗处的高频细节：近（同一面墙上，近的东西纹路才清楚）
最后双边滤波压平 —— 深度图要「块」，不要「粒」。粒会让视差抖成噪点。

用法：
  python scripts/make-depth360.py            全部 360 图
  python scripts/make-depth360.py yudu360    指定几张
输出：
  real/img/depth/<名字>.png    1024×512 灰度，pano.js 当第二张纹理用
"""
import os, sys, glob
import numpy as np
import cv2

ROOT = r"E:/数媒/长征一条路的来处/app/public/experience/real/img/wide"
OUT = r"E:/数媒/长征一条路的来处/app/public/experience/real/img/depth"
DW, DH = 1024, 512

# 真正在屋里的三站：银元、沙洲村、彝海护旗。站在这儿，四面墙都在两三米内，
# 按野外的「地平线一律当远景」处理，整间屋子只剩地板在动 —— 像站在滑毯上。
# 其余站（含遵义的院外、皮带的草地、发电机的沼泽）都在户外，走上面那套。
INDOOR = {
    "yinyuan360", "shazhou360b", "huqi360",
    "yinyuan360-flare", "shazhou360c-flare", "huqi360-sunburst",
}


def imread_u(path):
    buf = np.fromfile(path, dtype=np.uint8)
    return cv2.imdecode(buf, cv2.IMREAD_COLOR)


def imwrite_u(path, img):
    ok, buf = cv2.imencode(".png", img)
    if ok:
        buf.tofile(path)
    return ok


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / max(1e-6, (e1 - e0)), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def depth_of(path, indoor=False):
    bgr = imread_u(path)
    if bgr is None:
        return None
    im = cv2.resize(bgr, (DW, DH), interpolation=cv2.INTER_AREA)
    lab = cv2.cvtColor(im, cv2.COLOR_BGR2LAB).astype(np.float32)
    L = lab[:, :, 0] / 255.0
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV).astype(np.float32)
    S = hsv[:, :, 1] / 255.0

    yy = np.linspace(0, 1, DH, dtype=np.float32)[:, None] * np.ones((1, DW), np.float32)

    # 1) 地面：地平线 0.5 往下，越下越近
    ground = smoothstep(0.50, 1.00, yy) ** 0.85 * 0.95

    # 2) 天：上半部、亮、低饱和 —— 最远。0.85 压到底，天必须是视差的零点
    #    注意这里的方向：必须是「越往上越算天」。写成 smoothstep(0.46, 0.06, yy)
    #    时，下半部 yy>0.46 会因区间反向而返回 1 —— 夹金山那种满山白雪
    #    （又亮又低饱和）整幅地面就被当成天压成 0，深度图一片死平，视差全无。
    bright = smoothstep(0.40, 0.70, L)
    pale = 1.0 - smoothstep(0.12, 0.40, S)
    sky = bright * pale * (1.0 - smoothstep(0.06, 0.46, yy))
    sky = cv2.GaussianBlur(sky, (0, 0), DW * 0.02)

    # 3) 暗处的高频细节：屋里的近物暗但不平
    blur = cv2.GaussianBlur(L, (0, 0), DW * 0.012)
    detail = np.abs(L - blur)
    detail = detail / (np.percentile(detail, 97) + 1e-6)
    near_dark = (1.0 - smoothstep(0.16, 0.48, L)) * np.clip(detail * 3.0, 0, 1)
    near_dark = cv2.GaussianBlur(near_dark, (0, 0), DW * 0.018) * (
        0.30 + 0.70 * smoothstep(0.28, 0.95, yy))

    # 4) 地平线附近压平：这一带是「远处」，视差在这里归零，画面才稳
    horizon = 1.0 - smoothstep(0.0, 0.10, np.abs(yy - 0.50))

    if indoor:
        # 屋里反过来：四面是墙、头顶是梁，都在两三米内，**整间屋子都该跟着甩**。
        # 唯一真的远的是门洞和窗 —— 亮、低饱和、贴着地平线那一窄条。
        # 把地平线压平那一步必须跳过，否则屋子会变成「只有地板在动」，
        # 比不做还怪：像站在一块滑动的地毯上。
        holes = bright * pale * (1.0 - smoothstep(0.0, 0.13, np.abs(yy - 0.50)))
        holes = cv2.GaussianBlur(holes, (0, 0), DW * 0.014)
        d = 0.46 + 0.42 * ground + 0.26 * near_dark
        d = d * (1.0 - 0.82 * holes)
        d = np.clip(d, 0, 1)
    else:
        d = 0.58 * ground + 0.30 * near_dark + 0.08 * smoothstep(0.55, 0.95, yy)
        d = d * (1.0 - 0.85 * sky)
        d = d * (1.0 - 0.55 * horizon) + 0.20 * horizon
        d = np.clip(d, 0, 1)

    # 5) 压平：要「块」不要「粒」
    d8 = (d * 255).astype(np.uint8)
    d8 = cv2.bilateralFilter(d8, 15, 46, DW * 0.045)
    d = cv2.GaussianBlur(d8.astype(np.float32) / 255.0, (0, 0), DW * 0.008)
    d = np.clip((d - 0.5) * 1.15 + 0.5, 0, 1)
    return d


def main():
    os.makedirs(OUT, exist_ok=True)
    names = [a for a in sys.argv[1:] if not a.startswith("-")]
    files = sorted(glob.glob(os.path.join(ROOT, "*.jpg")))
    if names:
        files = [f for f in files
                 if os.path.splitext(os.path.basename(f))[0] in names]
    n = 0
    for f in files:
        name = os.path.splitext(os.path.basename(f))[0]
        d = depth_of(f, name in INDOOR)
        if d is None:
            print("skip", f)
            continue
        p = os.path.join(OUT, name + ".png")
        imwrite_u(p, (d * 255).astype(np.uint8))
        n += 1
        print("depth", name, "mean %.2f" % float(d.mean()))
    print("done", n)


if __name__ == "__main__":
    main()
