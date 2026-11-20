/* =========================================================
   长征一条路的来处 · 活层（Living Layer）
   ---------------------------------------------------------
   底图是静的，可人是活的。
   这一层只做两件事：
     1. 让画面里本来就该动的东西动 —— 火、烟、汽、灰、雨、水光、尘
     2. 让画面里本来就该有的人动 —— 走过、站着、蹲着、挑着、挤成一排

   三条自我约束（前几次返工都是栽在这里）：
     · 人物只做剪影：小、暗、慢、少，不画脸。宁可少一个，不要露一次。
     · 坐标一律归一化，跟着底图的推镜一起缩放，绝不脱层。
     · 不动就不画：prefers-reduced-motion 或页面不可见时直接停。
   ========================================================= */
(function () {
  "use strict";

  var cv = null, g = null, W = 1, H = 1, dpr = 1;
  var cur = { id: null, st: 0, pan: true, t: 0, on: false, sx: 0, sy: 0, sw: 1, sh: 1 };
  var rts = [];
  /* 一次性的回应动画单独放，换段时不跟着重建 ——
     不然"选择之后画面动一下"会被下一段的 build 直接抹掉。 */
  var fxq = [];
  var raf = 0, last = 0, hidden = false;
  var kick = 0;
  var reduced = false;
  try { reduced = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  /* 底图每一段可能有裁切（src 矩形）。活层的坐标一律按原图归一化，
     画的时候再映射到"当前这一段露出来的那一块"，这样换段不会错位。 */
  function fx(u) { return ((u - cur.sx) / cur.sw) * W; }
  function fy(v) { return ((v - cur.sy) / cur.sh) * H; }
  function fh(k) { return (k / cur.sh) * H; }

  function rnd(a, b) { return a + (b - a) * Math.random(); }
  function rgba(c, a) { return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a.toFixed(3) + ")"; }

  /* ---------------- 柔光精灵（一次生成，反复贴） ---------------- */
  var SP = {};
  function soft(col) {
    var k = col.join(",");
    if (SP[k]) return SP[k];
    var s = 96, c = document.createElement("canvas");
    c.width = c.height = s;
    var x = c.getContext("2d");
    var gr = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, rgba(col, 0.95));
    gr.addColorStop(0.34, rgba(col, 0.40));
    gr.addColorStop(0.68, rgba(col, 0.10));
    gr.addColorStop(1, rgba(col, 0));
    x.fillStyle = gr;
    x.fillRect(0, 0, s, s);
    SP[k] = c;
    return c;
  }
  function blob(img, cx, cy, r, a) {
    if (r < 0.4 || a <= 0.004) return;
    g.globalAlpha = a > 1 ? 1 : a;
    g.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  }

  /* =========================================================
     人 —— 一副骨架，按步态相位摆出去
     画完是一团剪影，看不清脸，这就对了
     ========================================================= */
  function seg(x1, y1, x2, y2, w) {
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
  }

  function figure(o) {
    var h = o.h, ph = o.ph || 0, tone = o.tone || "rgba(9,10,12,1)";
    if (h < 4) return;
    var lean = o.lean || 0;
    var A = o.legA == null ? 0.30 : o.legA;
    var AA = o.armA == null ? 0.24 : o.armA;

    var hipY = o.y - h * 0.462;
    var hipX = o.x + lean * h * 0.05;
    var shY = o.y - h * 0.798;
    var shX = o.x + lean * h * 0.135;
    var hipHalf = h * 0.086;
    var shHalf = h * 0.114;
    var headR = h * 0.076;
    var headY = shY - h * 0.098;
    var headX = shX + lean * h * 0.055;

    g.strokeStyle = tone;
    g.fillStyle = tone;
    g.lineCap = "round";
    g.lineJoin = "round";

    /* 手臂先画，压在躯干后面 */
    for (var j = 0; j < 2; j++) {
      var ss = j ? 1 : -1;
      var ax0 = shX + ss * shHalf * 0.70;
      var ay0 = shY + h * 0.014;
      var aa = -ss * Math.sin(ph) * AA;
      var bend = ss > 0 ? 0.34 : 0.26;
      if (o.arms && o.arms[j]) { aa = o.arms[j][0] * ss; bend = o.arms[j][1]; }
      var aex = ax0 + Math.sin(aa) * h * 0.192;
      var aey = ay0 + Math.cos(aa) * h * 0.192;
      var b2 = aa - bend;
      var awx = aex + Math.sin(b2) * h * 0.180;
      var awy = aey + Math.cos(b2) * h * 0.180;
      seg(ax0, ay0, aex, aey, h * 0.062);
      seg(aex, aey, awx, awy, h * 0.054);
    }

    /* 腿 */
    for (var i = 0; i < 2; i++) {
      var s = i ? 1 : -1;
      var hx0 = hipX + s * hipHalf * 0.58;
      var ang = s * Math.sin(ph) * A;
      var kb = 0.10 + 0.58 * Math.max(0, s * Math.sin(ph + 0.55));
      var kx = hx0 + Math.sin(ang) * h * 0.232;
      var ky = hipY + Math.cos(ang) * h * 0.232;
      var a2 = ang - kb;
      var fx = kx + Math.sin(a2) * h * 0.228;
      var fy = ky + Math.cos(a2) * h * 0.228;
      var tx = fx + Math.sin(a2 + 0.62) * h * 0.050;
      var ty = fy + h * 0.012;
      seg(hx0, hipY, kx, ky, h * 0.086);
      seg(kx, ky, fx, fy, h * 0.072);
      seg(fx, fy, tx, ty, h * 0.054);
    }

    /* 躯干：肩到髋是一个梯形，不是一根线 */
    g.beginPath();
    g.moveTo(shX - shHalf, shY - h * 0.004);
    g.quadraticCurveTo(shX - shHalf * 0.92, shY + h * 0.16, hipX - hipHalf, hipY);
    g.lineTo(hipX + hipHalf, hipY);
    g.quadraticCurveTo(shX + shHalf * 0.92, shY + h * 0.16, shX + shHalf, shY - h * 0.004);
    g.closePath();
    g.fill();
    g.lineWidth = h * 0.020;
    g.stroke();

    /* 颈 + 头 */
    seg(shX, shY, headX, headY + headR * 0.55, h * 0.052);
    g.beginPath();
    g.arc(headX, headY, headR, 0, 6.2832);
    g.fill();

    /* 帽 / 头巾：剪影唯一的身份线索 */
    var kd = o.kind || "peasant";
    if (kd === "soldier") {
      g.beginPath();
      g.ellipse(headX, headY - headR * 0.52, headR * 1.18, headR * 0.46, 0, 0, 6.2832);
      g.fill();
    } else if (kd === "peasant") {
      g.beginPath();
      g.ellipse(headX, headY - headR * 0.40, headR * 1.22, headR * 0.58, 0, 0, 6.2832);
      g.fill();
      // 头巾后垂的一角
      g.beginPath();
      g.moveTo(headX - headR * 0.9, headY - headR * 0.30);
      g.lineTo(headX - headR * 1.45, headY + headR * 0.55);
      g.lineTo(headX - headR * 0.62, headY + headR * 0.30);
      g.closePath();
      g.fill();
    } else if (kd === "child") {
      g.beginPath();
      g.arc(headX, headY - headR * 0.42, headR * 0.86, 0, 6.2832);
      g.fill();
    }
  }

  /* 落地的那一小块暗 —— 没有它，人就是贴上去的 */
  function ground(x, y, h, a) {
    var img = soft([0, 0, 0]);
    g.save();
    g.translate(x, y + h * 0.004);
    g.scale(1, 0.20);
    blob(img, 0, 0, h * 0.30, a == null ? 0.34 : a);
    g.restore();
  }

  /* =========================================================
     图元工厂：每个返回 { step(dt), paint() }
     ========================================================= */

  /* 烟 —— 柴烟、灶烟、香烟、晨雾都归它 */
  function mkSmoke(it) {
    var n = it.n || 10, parts = [], t = 0;
    var col = it.col || [178, 176, 170];
    var img = soft(col);
    function one(first) {
      var life = rnd(it.life || 6, (it.life || 6) * 1.9);
      return {
        age: first ? rnd(0, life) : 0,
        life: life,
        x: it.x + rnd(-(it.spread || 0.030), it.spread || 0.030),
        y: it.y + rnd(0, 0.014),
        r0: it.r0 || 0.010,
        r1: it.r1 || 0.070,
        rise: (it.rise || 0.040) * rnd(0.7, 1.35),
        sw: rnd(0.006, 0.026),
        sp: rnd(0.4, 1.4),
        ph: rnd(0, 6.2832),
        a: (it.a == null ? 0.20 : it.a) * rnd(0.6, 1.25)
      };
    }
    for (var i = 0; i < n; i++) parts.push(one(true));
    return {
      step: function (dt) {
        t += dt;
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          p.age += dt;
          if (p.age > p.life) {
            var q = one(false);
            for (var k in q) p[k] = q[k];
            continue;
          }
          p.y -= p.rise * dt * (1 + p.age / p.life);
        }
      },
      paint: function () {
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i], u = p.age / p.life;
          var r = fh(p.r0 + (p.r1 - p.r0) * u);
          var cx = fx(p.x + Math.sin(p.ph + t * p.sp) * p.sw * u);
          var cy = fy(p.y);
          blob(img, cx, cy, r, p.a * Math.min(1, u * 4) * (1 - u) * (1 - u));
        }
      }
    };
  }

  /* 火星 / 灰 —— 轻，飘，亮一下就没 */
  function mkEmber(it) {
    var n = it.n || 14, parts = [], t = 0;
    var col = it.col || [255, 178, 96];
    var size = it.size || 1.6;
    function one(first) {
      return {
        age: first ? rnd(0, 3) : 0,
        life: rnd(1.4, 4.0),
        x: it.x + rnd(-(it.spread || 0.035), it.spread || 0.035),
        y: it.y + rnd(0, 0.010),
        vx: rnd(-0.014, 0.014),
        vy: -rnd(0.010, 0.048) * (it.rise || 1),
        ph: rnd(0, 6.2832)
      };
    }
    for (var i = 0; i < n; i++) parts.push(one(true));
    return {
      step: function (dt) {
        t += dt;
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          p.age += dt;
          if (p.age > p.life) {
            var q = one(false);
            for (var k in q) p[k] = q[k];
            continue;
          }
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx += rnd(-0.006, 0.006) * dt;
        }
      },
      paint: function () {
        g.globalCompositeOperation = "lighter";
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i], u = p.age / p.life;
          var a = (it.a == null ? 0.62 : it.a) * Math.sin(u * 3.1416) * (0.6 + 0.4 * Math.sin(t * 6 + p.ph));
          if (a <= 0.01) continue;
          g.globalAlpha = a;
          g.fillStyle = rgba(col, 1);
          g.beginPath();
          g.arc(fx(p.x), fy(p.y), size * (1 - u * 0.45) * (H / cur.sh / 900) * 1.6 + 0.4, 0, 6.2832);
          g.fill();
        }
        g.globalCompositeOperation = "source-over";
        g.globalAlpha = 1;
      }
    };
  }

  /* 火 —— 火苗跳动 + 照明脉动，这一层最能把静态照“叫醒” */
  function mkFlame(it) {
    var n = it.n || 4, parts = [], t = 0, gust = 0, nextG = rnd(2.5, 8);
    var col = it.col || [255, 160, 74];
    var img = soft(col), img2 = soft([255, 226, 168]);
    for (var i = 0; i < n; i++) {
      parts.push({ dx: rnd(-0.010, 0.010), dy: rnd(-0.004, 0.004), r: rnd(0.012, 0.034) * (it.scale || 1), ph: rnd(0, 6.2832), sp: rnd(1.1, 2.6) });
    }
    return {
      step: function (dt) {
        t += dt;
        // 偶发气流：像有人从旁边走过，火苗会偏一下再回正
        if (it.gust !== false) {
          nextG -= dt;
          if (nextG <= 0) {
            gust = rnd(0.35, 1.0) * (Math.random() < 0.5 ? -1 : 1);
            nextG = rnd(5, 15);
          }
          gust -= gust * Math.min(1, dt * 2.2);
        }
      },
      paint: function () {
        g.globalCompositeOperation = "lighter";
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          var f = 0.72 + 0.28 * Math.sin(t * p.sp + p.ph) + 0.12 * Math.sin(t * p.sp * 2.7 + p.ph);
          if (kick) f *= 1 + kick * 0.55;
          var cx = fx(it.x + p.dx + Math.sin(t * 1.7 + p.ph) * 0.003 + gust * 0.016);
          var cy = fy(it.y + p.dy - Math.abs(Math.sin(t * p.sp * 0.8 + p.ph)) * 0.006);
          blob(img, cx, cy, fh(p.r) * f * (1 + Math.min(0.5, Math.abs(gust) * 0.5)), (it.a == null ? 0.42 : it.a) * f);
          if (i < 2) blob(img2, cx, cy + fh(p.r) * 0.15, fh(p.r) * f * 0.5, (it.a2 == null ? 0.30 : it.a2) * f);
        }
        g.globalCompositeOperation = "source-over";
        g.globalAlpha = 1;
      }
    };
  }

  /* 大面积柔光脉动 —— 灯光、火堆照亮周围一圈空气 */
  function mkGlow(it) {
    var t = 0, col = it.col || [255, 180, 110], img = soft(col);
    return {
      step: function (dt) { t += dt; },
      paint: function () {
        g.globalCompositeOperation = "lighter";
        var f = 0.80 + 0.20 * Math.sin(t * (it.sp || 0.9) + 1.2) + 0.06 * Math.sin(t * 3.1);
        if (kick) f *= 1 + kick * 0.40;
        blob(img, fx(it.x), fy(it.y), fh(it.r || 0.20) * (0.97 + 0.03 * f), (it.a || 0.10) * f);
        g.globalCompositeOperation = "source-over";
        g.globalAlpha = 1;
      }
    };
  }

  /* =========================================================
     脉冲 —— 选择之后，画面要回应一下
     ---------------------------------------------------------
     不是加特效，是让本来就在动的东西被"惊动"：
     火苗窜一下、浮尘被带起来、雨阵短时加密。
     1.8 秒后自己退场，不留痕迹。
     ========================================================= */
  function mkPulse(it) {
    var t = 0, dur = it.dur || 1.8, kind = it.kind || "breath";
    var img = soft(it.col || [255, 196, 138]);
    var dust = [], rain = [];
    for (var i = 0; i < 16; i++) {
      dust.push({
        x: rnd(it.x0 == null ? 0.06 : it.x0, it.x1 == null ? 0.94 : it.x1),
        y: rnd(0.66, 0.98),
        vx: rnd(-0.055, 0.055),
        vy: rnd(-0.075, -0.012),
        r: rnd(0.6, 2.1),
        a: rnd(0.14, 0.42),
        ph: rnd(0, 6.2832)
      });
    }
    for (var j = 0; j < 30; j++) {
      rain.push({
        x: rnd(-0.06, 1.06),
        y: rnd(-0.15, 1.0),
        v: rnd(1.5, 2.6),
        len: rnd(0.020, 0.055),
        a: rnd(0.10, 0.26)
      });
    }
    return {
      dead: false,
      step: function (dt) {
        t += dt;
        if (t > dur) { this.dead = true; return; }
        if (kind === "rain") {
          for (var i = 0; i < rain.length; i++) {
            var p = rain[i];
            p.y += p.v * dt;
            if (p.y > 1.08) { p.y = rnd(-0.16, -0.02); p.x = rnd(-0.06, 1.06); }
          }
        }
      },
      paint: function () {
        if (this.dead) return;
        var u = t / dur;
        var out = 1 - u;

        if (kind === "rain") {
          /* 雨忽然密了一阵，又收回去 */
          var ka = Math.min(1, u / 0.15) * out * out;
          g.strokeStyle = "rgba(206,218,232,1)";
          g.lineWidth = Math.max(0.7, H * 0.0010);
          for (var i = 0; i < rain.length; i++) {
            var p = rain[i];
            g.globalAlpha = p.a * ka;
            g.beginPath();
            g.moveTo(fx(p.x), fy(p.y));
            g.lineTo(fx(p.x) - fh(p.len) * 0.16, fy(p.y + p.len));
            g.stroke();
          }
          g.globalAlpha = 1;
          return;
        }

        /* 底部被带起来的一层尘/汽 */
        if (kind !== "still") {
          g.fillStyle = "rgba(232,226,210,1)";
          for (var k = 0; k < dust.length; k++) {
            var d = dust[k];
            var e = Math.min(1, u / 0.9);
            var dx = d.x + d.vx * e;
            var dy = d.y + d.vy * e + 0.03 * e * e;
            var da = d.a * Math.min(1, u / 0.12) * out;
            g.globalAlpha = da;
            g.beginPath();
            g.arc(fx(dx), fy(dy), Math.max(0.6, (d.r / cur.sh) * (H / 900) * 1.5), 0, 6.2832);
            g.fill();
          }
          g.globalAlpha = 1;
        }

        /* 一片很淡的暖光从画面里散开 —— 像眼睛适应了一下 */
        if (kind === "breath") {
          var kr = fh(0.10 + 0.46 * u);
          var ka2 = 0.13 * Math.sin(Math.min(1, u / 0.28) * 1.5708) * out;
          g.globalCompositeOperation = "lighter";
          blob(img, fx(it.x == null ? 0.5 : it.x), fy(it.y == null ? 0.62 : it.y), kr, ka2);
          g.globalCompositeOperation = "source-over";
          g.globalAlpha = 1;
        }
      }
    };
  }

  /* 雨 / 檐滴 / 雪，同一个下落器 */
  function mkFall(it) {
    var n = it.n || 80, parts = [], t = 0;
    var col = it.col || [198, 210, 224];
    var box = { x0: it.x0 == null ? -0.05 : it.x0, x1: it.x1 == null ? 1.05 : it.x1, y0: it.y0 == null ? -0.05 : it.y0, y1: it.y1 == null ? 1.05 : it.y1 };
    var slant = it.slant == null ? 0.10 : it.slant;
    var snow = it.t === "snow";
    function one(first) {
      return {
        x: rnd(box.x0, box.x1),
        y: first ? rnd(box.y0, box.y1) : rnd(box.y0, box.y0 + 0.1),
        v: rnd(0.5, 1.15) * (it.speed || 1),
        len: rnd(0.010, 0.034) * (it.len || 1),
        a: rnd(0.08, 0.24) * (it.a == null ? 1 : it.a) * 1.2,
        ph: rnd(0, 6.2832)
      };
    }
    for (var i = 0; i < n; i++) parts.push(one(true));
    return {
      step: function (dt) {
        t += dt;
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          p.y += p.v * dt;
          if (!snow) p.x -= p.v * dt * slant;
          else p.x += Math.sin(t * 0.8 + p.ph) * 0.010 * dt;
          if (p.y > box.y1) { var q = one(false); for (var k in q) p[k] = q[k]; }
          if (p.x < box.x0 - 0.1) p.x = box.x1 + 0.05;
          if (p.x > box.x1 + 0.1) p.x = box.x0 - 0.05;
        }
      },
      paint: function () {
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          if (snow) {
            g.globalAlpha = p.a * 0.8;
            g.fillStyle = rgba(col, 1);
            g.beginPath();
            g.arc(fx(p.x), fy(p.y), Math.max(0.6, fh(p.len) * 0.5), 0, 6.2832);
            g.fill();
          } else {
            g.globalAlpha = p.a;
            g.strokeStyle = rgba(col, 1);
            g.lineWidth = Math.max(0.6, fh(0.0009));
            g.beginPath();
            g.moveTo(fx(p.x), fy(p.y));
            g.lineTo(fx(p.x - p.len * slant * 3), fy(p.y + p.len));
            g.stroke();
          }
        }
        g.globalAlpha = 1;
      }
    };
  }

  /* 水光 —— 河面上碎成一片抖动的亮 */
  function mkGlint(it) {
    var n = it.n || 40, parts = [], t = 0;
    var col = it.col || [226, 214, 190];
    function one() {
      return { u: Math.random(), v: Math.random(), ph: rnd(0, 6.2832), sp: rnd(0.7, 2.4), ln: rnd(0.004, 0.030), a: rnd(0.25, 0.85) };
    }
    for (var i = 0; i < n; i++) parts.push(one());
    return {
      step: function (dt) { t += dt; },
      paint: function () {
        g.globalCompositeOperation = "lighter";
        g.strokeStyle = rgba(col, 1);
        g.lineCap = "round";
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          var a = p.a * (0.35 + 0.65 * Math.abs(Math.sin(t * p.sp + p.ph)));
          if (a <= 0.03) continue;
          g.globalAlpha = a * (it.a == null ? 0.5 : it.a) * 1.5;
          g.lineWidth = Math.max(0.7, fh(0.0011));
          var x = fx(it.x + p.u * it.w), y = fy(it.y + p.v * it.h + Math.sin(t * p.sp * 0.6 + p.ph) * 0.002);
          var hl = (p.ln / cur.sw) * W * 0.5;
          g.beginPath();
          g.moveTo(x - hl, y);
          g.lineTo(x + hl, y);
          g.stroke();
        }
        g.globalCompositeOperation = "source-over";
        g.globalAlpha = 1;
      }
    };
  }

  /* 尘 / 谷屑 / 稗子 —— 空气里有东西在飘，画面就不闷 */
  function mkDust(it) {
    var n = it.n || 30, parts = [], t = 0;
    var col = it.col || [226, 222, 208];
    function one(first) {
      return {
        x: rnd(it.x0 == null ? 0 : it.x0, it.x1 == null ? 1 : it.x1),
        y: rnd(it.y0 == null ? 0.2 : it.y0, it.y1 == null ? 1 : it.y1),
        vx: rnd(0.004, 0.022) * (it.dir == null ? 1 : it.dir),
        vy: rnd(-0.010, 0.004),
        ph: rnd(0, 6.2832),
        r: rnd(0.5, 1.5) * (it.size || 1),
        a: rnd(0.15, 0.55) * (it.a == null ? 1 : it.a)
      };
    }
    for (var i = 0; i < n; i++) parts.push(one(true));
    return {
      step: function (dt) {
        t += dt;
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          p.x += p.vx * dt;
          p.y += (p.vy + Math.sin(t * 0.9 + p.ph) * 0.010) * dt;
          if (p.x > 1.15) p.x = -0.1;
          if (p.x < -0.15) p.x = 1.1;
          if (p.y > 1.1) p.y = 0.15;
          if (p.y < 0.05) p.y = 1.0;
        }
      },
      paint: function () {
        g.fillStyle = rgba(col, 1);
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          g.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(t * 1.4 + p.ph));
          g.beginPath();
          g.arc(fx(p.x), fy(p.y), Math.max(0.5, (p.r / cur.sh) * (H / 900) * 1.7), 0, 6.2832);
          g.fill();
        }
        g.globalAlpha = 1;
      }
    };
  }

  /* 站着的人 —— 重心左右倒，偶尔抬一下手 */
  function mkFolk(it) {
    var t = 0, ph = it.ph == null ? rnd(0, 6.2832) : it.ph;
    var kd = it.kind || "peasant";
    return {
      step: function (dt) { t += dt; },
      paint: function () {
        var sx = Math.sin(t * 0.19 + ph) * 0.9 + Math.sin(t * 0.07 + ph * 1.7) * 0.6;
        var hy = fh(it.h);
        var x = fx(it.x + sx * 0.0012);
        var y = fy(it.y);
        ground(x, y, hy, it.sh == null ? 0.30 : it.sh);
        g.globalAlpha = it.a == null ? 0.86 : it.a;
        figure({
          x: x, y: y, h: hy,
          ph: t * 0.55 + ph,
          tone: it.tone || "rgba(9,10,12,1)",
          kind: kd,
          lean: it.lean || 0,
          legA: 0.045,
          armA: it.armA == null ? 0.06 : it.armA,
          arms: it.arms
        });
        g.globalAlpha = 1;
      }
    };
  }

  /* 走过一个人 —— 从一边进来，出画，隔一会儿再来 */
  function mkWalk(it) {
    var dir = it.dir == null ? 1 : it.dir;
    var x0 = it.x0 == null ? (dir > 0 ? -0.10 : 1.10) : it.x0;
    var x1 = it.x1 == null ? (dir > 0 ? 1.10 : -0.10) : it.x1;
    var baseH = it.h || 0.20;
    var dur = it.dur || 16;
    var gap = it.gap == null ? 10 : it.gap;
    var t = 0, st = "wait", wt = rnd(0, gap), u = 0, hh = baseH, yy = it.y;
    var kd = it.kind || "peasant";
    return {
      step: function (dt) {
        t += dt;
        if (st === "wait") {
          wt -= dt;
          if (wt <= 0) { st = "walk"; u = 0; hh = baseH * rnd(0.88, 1.14); yy = it.y + rnd(-0.012, 0.012); }
        } else {
          u += dt / dur;
          if (u >= 1) { st = "wait"; wt = gap * rnd(0.6, 1.5); }
        }
      },
      paint: function () {
        if (st !== "walk") return;
        var e = u;
        var x = fx(x0 + (x1 - x0) * e);
        var hy = fh(hh), y = fy(yy);
        var steps = it.steps || 14;
        var ph = e * steps * 6.2832;
        var edge = Math.min(1, Math.min(e, 1 - e) * 7);
        g.globalAlpha = (it.a == null ? 0.80 : it.a) * edge;
        ground(x, y, hy, 0.26);
        var arms = it.arms;
        if (it.pole) arms = [[0.62, 0.15], [0.38, 0.20]];
        figure({
          x: x, y: y, h: hy, ph: ph,
          tone: it.tone || "rgba(9,10,12,1)",
          kind: kd, lean: dir * 0.22,
          legA: 0.42, armA: 0.38,
          arms: arms
        });
        /* 挑担：一根横木，两头挂筐，随步子上下颤 */
        if (it.carry) {
          var bob = Math.sin(ph * 2) * hy * 0.010;
          var sy = y - hy * 0.760 + bob;
          var half = hy * (it.carryW || 0.34);
          var cx = x + dir * hy * 0.02;
          g.lineWidth = Math.max(1, hy * 0.016);
          g.strokeStyle = it.tone || "rgba(9,10,12,1)";
          g.beginPath();
          g.moveTo(cx - half, sy);
          g.lineTo(cx + half, sy);
          g.stroke();
          for (var d = -1; d <= 1; d += 2) {
            var bx = cx + d * half;
            var by = sy + hy * 0.10 + Math.sin(ph * 2 + (d > 0 ? 0.9 : 0)) * hy * 0.006;
            g.beginPath();
            g.ellipse(bx, by, hy * 0.052, hy * 0.060, 0, 0, 6.2832);
            g.fillStyle = it.tone || "rgba(9,10,12,1)";
            g.fill();
            g.beginPath();
            g.moveTo(bx, sy);
            g.lineTo(bx, by - hy * 0.055);
            g.lineWidth = Math.max(0.8, hy * 0.008);
            g.strokeStyle = it.tone || "rgba(9,10,12,1)";
            g.stroke();
          }
        }
        g.globalAlpha = 1;
      }
    };
  }

  /* 挑担 / 背筐 —— 就是走路的人加一副担子 */
  function mkCarrier(it) {
    var o = {};
    for (var k in it) o[k] = it[k];
    o.carry = true;
    o.carryW = it.carryW || 0.36;
    o.kind = it.kind || "peasant";
    return mkWalk(o);
  }

  /* 一排人 —— 等船的、看墙的、坐坡上的 */
  function mkCrowd(it) {
    var list = [], n = it.n || 6, t = 0;
    var x0 = it.x0 == null ? 0.12 : it.x0, x1 = it.x1 == null ? 0.88 : it.x1;
    for (var i = 0; i < n; i++) {
      var u = n === 1 ? 0.5 : i / (n - 1);
      list.push({
        x: x0 + (x1 - x0) * u + rnd(-0.012, 0.012),
        y: it.y + rnd(-0.008, 0.010),
        h: (it.h || 0.13) * rnd(0.86, 1.12),
        ph: rnd(0, 6.2832),
        kind: Math.random() < (it.soldier || 0) ? "soldier" : (it.kind || "peasant"),
        a: (it.a == null ? 0.62 : it.a) * rnd(0.75, 1.1)
      });
    }
    return {
      step: function (dt) { t += dt; },
      paint: function () {
        for (var i = 0; i < list.length; i++) {
          var p = list[i];
          var sx = Math.sin(t * 0.16 + p.ph) * 0.0010;
          var hy = fh(p.h);
          ground(fx(p.x), fy(p.y), hy, 0.22);
          g.globalAlpha = p.a;
          figure({
            x: fx(p.x + sx), y: fy(p.y), h: hy,
            ph: t * 0.5 + p.ph, tone: it.tone || "rgba(9,10,12,1)",
            kind: p.kind, legA: 0.03, armA: 0.05
          });
        }
        g.globalAlpha = 1;
      }
    };
  }

  var FACTORY = {
    smoke: mkSmoke, ember: mkEmber, flame: mkFlame, glow: mkGlow,
    rain: mkFall, snow: mkFall, glint: mkGlint, dust: mkDust,
    folk: mkFolk, walk: mkWalk, walker: mkWalk, carrier: mkCarrier, crowd: mkCrowd,
    pulse: mkPulse
  };

  /* 世界的"被惊动"值：选择按下去的那一刻置 1，然后自己退回去。
     火、光跟着它窜一下 —— 不是特写，是余光里的一点反应。 */
  function bumpKick(v) { kick = v; }
  function decayKick(dt) { kick *= Math.exp(-dt * 2.4); if (kick < 0.004) kick = 0; }

  /* =========================================================
     装配
     ========================================================= */
  function build(id, st) {
    rts = [];
    var S = window.RS_LIVE_SCENES || {};
    var sc = S[id];
    if (!sc) return;
    var lists = [];
    if (sc.all) lists.push(sc.all);
    var key = "s" + st;
    if (sc[key]) lists.push(sc[key]);
    else if (sc.s0) lists.push(sc.s0);
    for (var i = 0; i < lists.length; i++) {
      var arr = lists[i];
      for (var j = 0; j < arr.length; j++) {
        var it = arr[j];
        var f = FACTORY[it.t];
        if (!f) { if (window.console) console.warn("活层：未知图元", it.t); continue; }
        try { rts.push(f(it)); } catch (e) { }
      }
    }
  }

  /* =========================================================
     循环
     ========================================================= */
  function resize() {
    if (!cv) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth || window.innerWidth;
    H = cv.clientHeight || window.innerHeight;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function frame(ts) {
    raf = 0;
    if (!cv || !cur.on) return;
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
    last = ts;
    cur.t += dt;

    // 与底图 .bg.pan 同步：1.02 → 1.13，46 秒走完
    if (cur.pan) {
      var k = 1.02 + 0.11 * Math.min(1, cur.t / 46);
      cv.style.transform = "scale(" + k.toFixed(4) + ")";
    }

    decayKick(dt);
    g.clearRect(0, 0, W, H);
    for (var i = 0; i < rts.length; i++) {
      var r = rts[i];
      r.step(dt);
      if (r.dead) { rts.splice(i, 1); i--; continue; }
      r.paint();
    }
    for (var j = 0; j < fxq.length; j++) {
      var q = fxq[j];
      q.step(dt);
      if (q.dead) { fxq.splice(j, 1); j--; continue; }
      q.paint();
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (raf || hidden || !cur.on) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  /* =========================================================
     对外
     ========================================================= */
  function enter(nodeId, stage, panOn, rect) {
    if (!cv) init();
    if (!cv) return;
    // 这一段底图露出来的是原图的哪一块
    cur.sx = rect && rect.length === 4 ? rect[0] : 0;
    cur.sy = rect && rect.length === 4 ? rect[1] : 0;
    cur.sw = rect && rect.length === 4 ? rect[2] : 1;
    cur.sh = rect && rect.length === 4 ? rect[3] : 1;
    if (reduced) { // 用户要求减少动态：只画一帧静场
      cur.id = nodeId; cur.st = stage || 0; cur.pan = false; cur.t = 0; cur.on = true;
      build(nodeId, stage || 0);
      g.clearRect(0, 0, W, H);
      for (var i = 0; i < rts.length; i++) rts[i].paint();
      cv.style.opacity = "1";
      return;
    }
    if (cur.id !== nodeId) fxq.length = 0;
    cur.id = nodeId;
    cur.st = stage || 0;
    cur.pan = panOn !== false;
    cur.t = 0;
    cur.on = true;
    cv.style.transform = "scale(1.02)";
    build(cur.id, cur.st);
    cv.style.opacity = "1";
    start();
  }

  function clear() {
    cur.on = false;
    fxq.length = 0;
    kick = 0;
    stop();
    if (g) g.clearRect(0, 0, W, H);
    if (cv) cv.style.opacity = "0";
  }

  function init() {
    cv = document.getElementById("liveLayer");
    if (!cv) {
      cv = document.createElement("canvas");
      cv.id = "liveLayer";
      var wrap = document.getElementById("bgWrap");
      if (wrap) wrap.appendChild(cv);
    }
    if (!cv) return;
    cv.style.position = "absolute";
    cv.style.inset = "0";
    cv.style.width = "100%";
    cv.style.height = "100%";
    cv.style.pointerEvents = "none";
    cv.style.transformOrigin = "50% 50%";
    cv.style.opacity = "0";
    cv.style.transition = "opacity 1.1s ease";
    cv.style.willChange = "transform,opacity";
    g = cv.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", function () {
      hidden = document.hidden;
      if (hidden) stop(); else start();
    });
  }

  /* 选择按下去 —— 让画面回应一下。
     kind 不给就按这一站的配置走；默认是最轻的"呼吸"。 */
  function pulse(kind) {
    if (!cv || !cur.on || reduced) return;
    var S = window.RS_LIVE_SCENES || {};
    var sc = S[cur.id] || {};
    var kd = kind || sc.pulse || "breath";
    kick = 1;
    var it = { kind: kd, dur: 1.8 };
    if (kd === "rain") it.col = [206, 218, 232];
    else if (sc.pulseCol) it.col = sc.pulseCol;
    if (sc.pulseAt) { it.x = sc.pulseAt[0]; it.y = sc.pulseAt[1]; }
    fxq.push(mkPulse(it));
    start();
  }

  window.RS_LIVE = {
    enter: enter,
    clear: clear,
    init: init,
    pulse: pulse,
    pause: stop,
    resume: start,
    get count() { return rts.length; },
    get fx() { return fxq.length; },
    get scene() { return cur.id + "#" + cur.st; }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
