/* =========================================================
   长征一条路的来处 · 场景层（Scene / 探索）
   ---------------------------------------------------------
   进站之后不是直接开始说话，是先站到那块地方上：
     · 画面比屏幕大 —— 拖着看，滚轮、方向键、手指都能挪
     · 画面里亮着一些点 —— 人和东西，走过去点开
     · 点人 → 他先开口，你听完再回一句
     · 有些点不显眼（岔路、远处的人影），要自己挪过去才看得见
   看全一站的细节、跟人搭上话、发现一条岔路，都给一个成就。

   数据：
     node.notes 的 u/v  → 物件点（不另写坐标，史料自己就是锚点）
     RS_CAST[nodeId]    → 人物（台词在 real/cast.js）
     RS_ROUTE           → 反查这一站挂了几条岔路
   ========================================================= */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var KEY = "rs_adv_v1";

  var on = false, node = null, cb = null, hooks = null;
  var W = 0, H = 0, Z = 1.62;
  var raf = 0, spots = [], spotsHost = null, INSTANT = false, peekT = 0;
  var NODES = window.RS_NODES || [];

  /* 有宽景图的站走「柱面世界」：人是站在一间屋子里转头看，
     没有的就退回原来那套「一块比屏幕大的平面」。 */
  var SP = null, panoOn = false;

  /* ---------------- 存档（与引擎同一份） ---------------- */
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; }
    catch (e) { return {}; }
  }
  function saveIt(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function notesOf(id) { var s = load(); return (s.notes || {})[id] || []; }
  function seenNote(id, i) { return notesOf(id).indexOf(i) >= 0; }

  function findNode(id) {
    for (var i = 0; i < NODES.length; i++) if (NODES[i].id === id) return NODES[i];
    return null;
  }
  function forksOf(id) {
    var R = window.RS_ROUTE || [], out = [];
    for (var i = 0; i < R.length; i++) if (R[i].line === "side" && R[i].hang === id) out.push(R[i]);
    return out;
  }

  /* 远处那层是把底图照抄一份、搁到很后面。
     像素必须和原图一模一样 —— 所以样式直接从当前那张 .bg 上抄。
     唯独 filter 不抄：远的那层要发灰发虚，这点差别正是「空气在中间」的证据。 */
  var DEPTH_FILTER = {
    depthA: "brightness(1.05) blur(.6px)"
  };
  function syncDepth() {
    var b0 = $("bg0"), b1 = $("bg1");
    if (!b0) return;
    var o0 = parseFloat(getComputedStyle(b0).opacity) || 0;
    var o1 = b1 ? parseFloat(getComputedStyle(b1).opacity) || 0 : 0;
    var src = o1 > o0 ? b1 : b0;
    var cs = getComputedStyle(src);
    Object.keys(DEPTH_FILTER).forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.style.backgroundImage = cs.backgroundImage;
      el.style.backgroundSize = cs.backgroundSize;
      el.style.backgroundPosition = cs.backgroundPosition;
      el.style.filter = DEPTH_FILTER[id] || "none";
    });
  }

  /* ---------------- 成就 ---------------- */
  var FIRST = {
    "a-first-see": ["看 清 楚 了", "第一次在场景里点开一样东西。"],
    "a-first-talk": ["搭 上 话", "第一次跟路上的人说上话。"],
    "a-drag": ["挪 过 眼 光", "把画面拖到了别人不会去看的那一边。"]
  };
  function achDef(id) {
    if (FIRST[id]) return FIRST[id];
    var m = /^(\w+):(.+)$/.exec(id);
    if (!m) return null;
    var kind = m[1], sn = findNode(m[2]);
    if (!sn) return null;
    if (kind === "see") return ["看 尽 · " + sn.short, "这一站的细节，你都看过了。"];
    if (kind === "talk") return ["搭 上 话 · " + sn.short, "在这里，你至少跟一个人说上了话。"];
    if (kind === "fork") return ["岔 口 · " + sn.short, "队伍往前，你往旁边看了一眼 —— 那边也有人。"];
    return null;
  }
  var achT = 0, achTimer = 0, achQ = [];
  function ach(id) {
    var s = load();
    s.ach = s.ach || {};
    if (s.ach[id]) return false;
    s.ach[id] = 1; saveIt(s);
    var d = achDef(id) || ["—", ""];
    if (achTimer || achQ.length) { achQ.push(d); return true; }
    pop(d[0], d[1]);
    if (hooks && hooks.blip) { try { hooks.blip("chain", 0.8); } catch (e) {} }
    return true;
  }
  function pop(n, d) {
    var el = $("achPop");
    el.innerHTML = '<div class="k">成 就</div><div class="n">' + n + "</div>" +
      (d ? '<div class="d">' + d + "</div>" : "");
    el.classList.add("on");
    clearTimeout(achT);
    achTimer = 1;
    achT = setTimeout(function () {
      el.classList.remove("on");
      achT = setTimeout(function () {
        achTimer = 0;
        var q = achQ.shift();
        if (q) pop(q[0], q[1]);
      }, 460);
    }, 3000);
  }

  /* ---------------- 相机 ----------------
     不是「一张图在屏幕上平移」，是「人站在那儿，转头看」。
     世界坐标：视口中心为原点，x 右、y 下、z 朝观众。
     PER 必须与 CSS 里 #stageOuter 的 perspective 一致，否则热点会飘。 */
  var PER = 880, BASE_RX = 2.2, RAD = Math.PI / 180;
  /* 远近三层的深度。CSS 里那几个 scale 只是冷启动时的默认值，
     真正的值在 measure() 里按 PER 算 —— 因为透视距离一变，
     要对齐同一张图，缩放就得跟着变，写死在 CSS 里必然错。 */
  var Z_FAR = -620, Z_NEAR = 560;
  var cam = { tx: 0, ty: 0, gx: 0, gy: 0, rx: BASE_RX, ry: 0, grx: BASE_RX, gry: 0,
    zoom: 1, gzoom: 1, drag: false,
    /* 柱面模式用的两个角。pitch 为正 = 往上看 */
    yaw: 0, gyaw: 0, pitch: 0, gpitch: 0 };
  var mouse = { x: 0.5, y: 0.5, has: false };
  function ZZ() { return Z * cam.zoom; }

  /* 柱面能转到哪儿。一圈闭死（arc = 360，屋里那种）就不该「夹住」，该「绕回去」：
     夹住的话转到一百二十几度就顶死了，人立刻知道那边有一堵墙 —— 而屋里没有这堵墙。
     绕回去是无声的：sin/cos 本来就是周期的，360° 与 0° 是同一个方向。 */
  function yawTo(v) {
    if (panoOn && window.RS_PANO && RS_PANO.closed) {
      return ((v + 180) % 360 + 360) % 360 - 180;
    }
    if (panoOn && window.RS_PANO) {
      var L = RS_PANO.limYaw();
      return clamp(v, -L, L);
    }
    return v;
  }

  /* 转多少度，画面就往反方向流多少像素。
     人转头看东西，近处的东西从眼前掠过去 —— 位移大约就是 f·tan(θ)，
     f 取透视距离。折算下来 1 度约等于十几像素，这里取 14。
     光有旋转没有这份平移，中间那块像素是钉死的，看起来像在摆一张画。 */
  var YAW_SLIDE = 14;
  function effTX() { return cam.tx - cam.ry * YAW_SLIDE; }

  function measure() {
    W = window.innerWidth; H = window.innerHeight;
    PER = W < 720 ? 720 : 880;
    Z = W < 720 ? 1.52 : (W / H > 2.1 ? 1.6 : 1.72);
    var so = $("stageOuter");
    if (panoOn && window.RS_PANO) {
      RS_PANO.measure(W, H);
      if (so) so.style.perspective = RS_PANO.state.P.toFixed(1) + "px";
      RS_PANO.relayout();
      /* 暗框贴着镜头放，圆筒在它后面转 —— 这一圈暗就在眼前扫过去 */
      var pn = $("paneNear");
      if (pn) pn.style.transform = "translateZ(0px) scale(1.04)";
      return;
    }
    if (so) so.style.perspective = PER + "px";
    [["depthA", Z_FAR], ["paneNear", Z_NEAR]].forEach(function (p) {
      var el = $(p[0]);
      if (el) el.style.transform = "translateZ(" + p[1] + "px) scale(" +
        ((PER - p[1]) / PER).toFixed(4) + ")";
    });
    cam.tx = clamp(cam.tx, -limX(), limX());
    cam.ty = clamp(cam.ty, -limY(), limY());
  }
  /* 视角一转，远的那一侧就往里收 —— 留一份余量，不然拖到头会露黑边。
     转得越狠，这份余量就得留得越宽。 */
  function limX() { return Math.max(0, (ZZ() - 1) * W / 2 - W * 0.13); }
  function limY() { return Math.max(0, (ZZ() - 1) * H / 2 - H * 0.10); }

  /* 世界点 → 屏幕点。z 不同，转视角时的摆幅就不同：这就是纵深。 */
  function proj(x, y, z) {
    if (panoOn && window.RS_PANO) return RS_PANO.project(x, y);
    var s = ZZ();
    var X = (x * W - W / 2) * s;
    var Y = (y * H - H / 2) * s;
    var Zz = (z || 0) * s;
    var ry = cam.ry * RAD, rx = cam.rx * RAD;
    var cy = Math.cos(ry), sy = Math.sin(ry);
    var cx = Math.cos(rx), sx = Math.sin(rx);
    var X1 = X * cy + Zz * sy;
    var Z1 = -X * sy + Zz * cy;
    var Y2 = Y * cx - Z1 * sx;
    var Z2 = Y * sx + Z1 * cx;
    var k = PER / Math.max(240, PER - Z2);
    return { x: W / 2 + effTX() + X1 * k, y: H / 2 + cam.ty + Y2 * k };
  }

  function apply() {
    if (panoOn && window.RS_PANO) {
      /* 柱面：世界＝一个圆筒，转视角就是圆筒绕人转。热点用同一套投影，
         所以这里只要把角度交给它，别再叠任何平移 —— 叠了就飘。 */
      RS_PANO.setCam(cam.yaw, cam.pitch, cam.zoom);
      RS_PANO.applyCam();
      layout();
      return;
    }
    var st = $("stage");
    if (st) st.style.transform =
      "translate3d(" + effTX().toFixed(2) + "px," + cam.ty.toFixed(2) + "px,0) " +
      "rotateX(" + cam.rx.toFixed(3) + "deg) rotateY(" + cam.ry.toFixed(3) + "deg) " +
      "scale(" + ZZ().toFixed(4) + ")";
    layout();
  }

  /* 视角的倾角 = 挪到边上自然偏一点 + 鼠标在哪儿就往哪儿探一点。
     两样都很小（合计不超过 4 度），大了就晕。 */
  function tiltTargets() {
    /* 柱面模式下视角本身就跟着手走，不再额外「探一下头」——
       两股力叠在一起会打架，看着像被什么东西拽住。 */
    if (panoOn) return;
    var nx = limX() ? cam.gx / limX() : 0;
    var ny = limY() ? cam.gy / limY() : 0;
    var free = !ptr && mouse.has && !P.open;
    /* 竖屏窄，转同样角度画面走得少 —— 放宽一点才够「看一圈」 */
    var mY = W < 720 ? 11.5 : 9.4;
    var mX = W < 720 ? 7.4 : 7.2;
    cam.grx = clamp(BASE_RX + ny * 2.6 + (free ? (0.5 - mouse.y) * 2.6 : 0), -4.6, mX);
    cam.gry = clamp(nx * (mY - 0.2) + (free ? (mouse.x - 0.5) * 4.4 : 0), -mY, mY);
  }

  function focusOn(x, y) {
    if (panoOn && window.RS_PANO) {
      /* 把人转到正前方，再往前凑一点。
         角度是算出来的，不是猜的：正前方 = 该点的方位角，取负。 */
      cam.gyaw = yawTo((x - 0.5) * RS_PANO.arc);
      var st = RS_PANO.state;
      var fall = Math.atan(((y - 0.5) * st.arc * RAD * st.ar)) / RAD;
      cam.gpitch = clamp(-fall, -RS_PANO.limPitch(), RS_PANO.limPitch());
      cam.gzoom = 1.10;
      tween();
      return;
    }
    /* 往那个人跟前走一步：整块画面放大一点，但近处的东西涨得比远处多 ——
       这就是真的往前走了，不是把图放大。 */
    if (x != null) cam.gzoom = 1.085;
    cam.gx = clamp(-(x * W - W / 2) * ZZ(), -limX(), limX());
    cam.gy = clamp(-(y * H - H / 2) * ZZ(), -limY(), limY());
    tiltTargets();
    tween();
  }
  function tween() {
    if (raf) return;
    if (panoOn) {
      (function stepP() {
        raf = 0;
        /* 目标角要走「短的那边」。一圈闭死的时候，179° 到 -179° 是往前 2°，
           不是往回 358° —— 直接相减会看见画面突然倒着甩一圈。 */
        var dy = cam.gyaw - cam.yaw;
        if (window.RS_PANO && RS_PANO.closed) {
          dy = ((dy + 180) % 360 + 360) % 360 - 180;
        }
        cam.yaw += dy * 0.14;
        if (window.RS_PANO && RS_PANO.closed) {
          cam.yaw = ((cam.yaw + 180) % 360 + 360) % 360 - 180;
        }
        cam.pitch += (cam.gpitch - cam.pitch) * 0.14;
        cam.zoom += (cam.gzoom - cam.zoom) * 0.09;
        if (Math.abs(dy) < 0.01 && Math.abs(cam.gpitch - cam.pitch) < 0.01 &&
            Math.abs(cam.gzoom - cam.zoom) < 0.0004) {
          cam.yaw = cam.gyaw; cam.pitch = cam.gpitch; cam.zoom = cam.gzoom;
          apply();
          return;
        }
        apply();
        raf = requestAnimationFrame(stepP);
      })();
      return;
    }
    (function step() {
      raf = 0;
      cam.tx += (cam.gx - cam.tx) * 0.15;
      cam.ty += (cam.gy - cam.ty) * 0.15;
      cam.rx += (cam.grx - cam.rx) * 0.12;
      cam.ry += (cam.gry - cam.ry) * 0.12;
      cam.zoom += (cam.gzoom - cam.zoom) * 0.055;
      /* 越走越近，可挪的范围就越小，随时把位置收回边界内；
         转角带出来的那份平移也算进去，不然最容易露黑边的是它 */
      var eT = effTX(), cl = clamp(eT, -limX(), limX());
      if (cl !== eT) { cam.tx += cl - eT; cam.gx += cl - eT; }
      cam.ty = clamp(cam.ty, -limY(), limY());
      cam.gy = clamp(cam.gy, -limY(), limY());
      if (Math.abs(cam.gx - cam.tx) < 0.3 && Math.abs(cam.gy - cam.ty) < 0.3 &&
          Math.abs(cam.grx - cam.rx) < 0.02 && Math.abs(cam.gry - cam.ry) < 0.02 &&
          Math.abs(cam.gzoom - cam.zoom) < 0.0004) {
        cam.tx = cam.gx; cam.ty = cam.gy; cam.rx = cam.grx; cam.ry = cam.gry;
        cam.zoom = cam.gzoom;
        apply();
        return;
      }
      apply();
      raf = requestAnimationFrame(step);
    })();
  }

  /* ---------------- 热点 ---------------- */
  function mkSpot(o) {
    var el = document.createElement("button");
    el.type = "button";
    el.className = "spot " + o.kind + (o.hidden ? " hidden" : "");
    el.innerHTML = '<i></i><span class="lb">' + o.label + "</span>";
    el.setAttribute("aria-label", o.label);
    el.style.setProperty("--pd", ((spotsHost.children.length * 0.43) % 3.4).toFixed(2) + "s");
    var s = {
      kind: o.kind, x: o.x, y: o.y, el: el, label: o.label,
      data: o.data, hidden: !!o.hidden, seen: !!o.seen,
      /* 画面越靠下，东西离人越近。热点按这个深度走，
         转视角的时候它才会跟着自己的那一层错开。 */
      z: o.z != null ? o.z : (o.y - 0.56) * 300
    };
    if (s.seen) el.classList.add("seen");
    el.addEventListener("click", function (e) {
      e.stopPropagation();
      /* 已经在跟别人说话，就直接换过去；静默关，不要走上一段的收尾回调 */
      if (P.open) closePanel(true);
      go(s);
    });
    spotsHost.appendChild(el);
    return s;
  }

  function layout() {
    for (var i = 0; i < spots.length; i++) {
      var s = spots[i], p = proj(s.x, s.y, s.z);
      s.el.style.transform = "translate3d(" + p.x.toFixed(1) + "px," + p.y.toFixed(1) +
        "px,0) translate(-50%,-50%)";
      s.el.classList.toggle("far", p.x < -30 || p.x > W + 30 || p.y < -30 || p.y > H + 30);
      var d = Math.sqrt(Math.pow(p.x / W - 0.5, 2) + Math.pow(p.y / H - 0.5, 2));
      var near;
      if (s.hidden && s.kind === "fork") {
        /* 岔路：不是走近才亮，是拖到边上、余光扫到才亮 */
        var ed = Math.min(p.x, W - p.x, p.y, H - p.y);
        near = ed < 175 && p.x > -50 && p.x < W + 50 && p.y > -50 && p.y < H + 50;
      } else if (s.hidden) {
        /* 躲起来的人：走到跟前才看清 */
        near = d < 0.22;
      } else {
        near = d < 0.185;
      }
      s.el.classList.toggle("near", near);
      /* 左上角是 HUD 的地盘：点还在，但别在那儿挤一行字 */
      s.el.classList.toggle("top", p.y < 158 && p.x < Math.min(430, W * 0.44));
    }
    edges();
    positionBubble(false);
  }
  function edges() {
    var l = false, r = false;
    for (var i = 0; i < spots.length; i++) {
      var s = spots[i];
      if (s.hidden) continue;
      var p = proj(s.x, s.y, s.z);
      if (p.y < -60 || p.y > H + 60) continue;
      if (p.x < -30) l = true;
      if (p.x > W + 30) r = true;
    }
    var el = $("edgeL"), er = $("edgeR");
    if (el) el.classList.toggle("on", l);
    if (er) er.classList.toggle("on", r);
  }

  function buildSpots() {
    spots = [];
    spotsHost.innerHTML = "";

    (node.notes || []).forEach(function (nt, i) {
      if (nt.u == null || nt.v == null) return;
      /* 空间表里给 null = 这一条**不在这张画里**（说明文字照旧留在卡片上，
         只是画面上不落点）。不能写成「有就用、没有就退回 node 的 u/v」——
         那样 null 会被当成「没写」，点又回到史料表里的老坐标上，
         落在一个跟文字对不上的地方。 */
      var arr = SP && SP.notes;
      var uv = (arr && i < arr.length) ? arr[i] : [nt.u, nt.v];
      if (!uv) return;
      spots.push(mkSpot({
        kind: "note", x: uv[0], y: uv[1],
        label: nt.short || nt.title,
        data: i, seen: seenNote(node.id, i)
      }));
    });

    ((window.RS_CAST || {})[node.id] || []).forEach(function (c, j) {
      var arr = SP && SP.cast;
      var uv = (arr && j < arr.length) ? arr[j] : [c.x, c.y];
      if (!uv) return;
      spots.push(mkSpot({
        kind: "cast", x: uv[0], y: uv[1], label: c.who,
        data: c, hidden: c.hidden
      }));
    });

    forksOf(node.id).forEach(function (f, i) {
      var uv = (SP && SP.fork && SP.fork[i]) || [i % 2 ? 0.058 : 0.942, 0.40 + (i % 3) * 0.13];
      spots.push(mkSpot({
        kind: "fork",
        x: uv[0], y: uv[1],
        label: "那边有路",
        hidden: true, data: f
      }));
    });

    paintHint();
    layout();
    /* 开场三秒：所有名字现一下再收回去 */
    spotsHost.classList.add("peek");
    clearTimeout(peekT);
    peekT = setTimeout(function () { spotsHost.classList.remove("peek"); }, 3200);
  }

  /* ---------------- 底部提示 ---------------- */
  function paintHint() {
    var got = notesOf(node.id).length, n = (node.notes || []).length;
    var dots = "";
    for (var i = 0; i < n; i++) dots += '<i class="' + (i < got ? "g" : "") + '"></i>';
    var cast = spots.some(function (spot) { return spot.kind === "cast"; });
    var fork = forksOf(node.id).length;
    $("hintLn").innerHTML = panoOn
      ? "这里可以<b>转一整圈</b> —— 拖着看，或者按方向键。档案里还有更多细节。"
      : (cast
        ? "画面比屏幕大 —— 拖着看。亮着的地方<b>有人，也有东西</b>。"
        : "画面比屏幕大 —— 拖着看。亮着的地方，都是<b>这里发生过的事</b>。");
    if (fork) $("hintLn").innerHTML += " 有些路<b>不在地图上</b>。";
    $("hintDots").innerHTML = dots + "<span>" + got + " / " + n + " 处细节</span>";
  }

  /* ---------------- 面板：贴着那个人开 ----------------
     以前是「从底下推上来一条」，那等于把画面盖掉 —— 读起来就是进了另一个
     页面。现在是一张跟着热点走的小卡：点到谁，卡就开在谁旁边，人不走、
     视角也不动，你还可以一边看一边转。 */
  var P = { open: false, who: "", lines: [], i: 0, typed: true, opt: null,
    after: null, raf: 0, chosen: false, fast: false, optShown: false,
    spot: null, hiEl: null };
  var T = { box: null, html: "" };
  /* 气泡的摆放状态。w/h 只在内容变了才量一次 —— 每帧量会逼着浏览器重排 */
  var B = { dirty: true, w: 0, h: 0, side: "", ax: -1, ay: -1, aa: -1 };

  function colorQ(s) {
    return s.replace(/「[^「」]*」/g, function (m) {
      return '<span style="color:#e8cfa2">' + m + "</span>";
    });
  }

  function openPanel(who, tag, spot) {
    P.open = true;
    P.who = who;
    P.typed = true;
    P.spot = spot || null;
    $("encWho").innerHTML = (tag ? "<em>" + tag + "</em>" : "") + who;
    $("encTxt").innerHTML = "";
    $("encOpts").innerHTML = "";
    $("encFoot").textContent = "空格 继续　·　Esc 退开";
    var el = $("enc");
    /* 先摆好位置再淡入：否则第一帧会从左上角飞过来 */
    el.classList.remove("on");
    el.classList.toggle("bub", !!P.spot);
    B.dirty = true; B.ax = -1;
    positionBubble(true);
    el.classList.add("on");
    $("hint").classList.remove("on");
    document.body.classList.add("inenc");
  }

  function closePanel(silent) {
    if (!P.open) return;
    P.open = false;
    cancelAnimationFrame(P.raf);
    var el = $("enc");
    el.classList.remove("on");
    $("encOpts").innerHTML = "";
    document.body.classList.remove("inenc");
    if (P.hiEl) { P.hiEl.classList.remove("hi"); P.hiEl = null; }
    P.spot = null;
    cam.gzoom = 1;
    if (on) { $("hint").classList.add("on"); tiltTargets(); tween(); }
    var a = silent ? null : P.after;
    P.after = null;
    if (a) setTimeout(a, 300);
  }

  /* 把气泡摆到人旁边。
     优先放右边；右边放不下翻到左边；两边都放不下就贴着边 —— 但**绝不**
     盖住那个点本身，否则「谁在说话」就看不出来了。
     三角（::after）的高度由 --ay 给，永远指着那个人的头。 */
  function positionBubble(force) {
    var el = $("enc");
    if (!el || !P.open || !P.spot) return;
    if (B.dirty || force) {
      B.w = el.offsetWidth || 340;
      B.h = el.offsetHeight || 180;
      B.dirty = false;
    }
    var p = proj(P.spot.x, P.spot.y, P.spot.z);
    /* 人转到身后去了：气泡别跟着飞到屏幕角上（那会像个 bug），就停在原地、
       淡下去 —— 话还在，只是那个人暂时不在视野里。转回来它自己会跟回来。 */
    var seen = p.vis !== false &&
      p.x > -W * 0.35 && p.x < W * 1.35 && p.y > -H * 0.35 && p.y < H * 1.35;
    el.classList.toggle("away", !seen);
    if (!seen) return;
    var pad = 16, gap = 44;
    var bx, side;
    if (p.x + gap + B.w + pad < W) { bx = p.x + gap; side = "lft"; }
    else if (p.x - gap - B.w > pad) { bx = p.x - gap - B.w; side = "rgt"; }
    else { bx = clamp(p.x + 26, pad, Math.max(pad, W - B.w - pad)); side = "lft"; }
    var by = clamp(p.y - B.h * 0.46, 92, Math.max(92, H - B.h - pad));
    var ay = clamp(p.y - by, 16, Math.max(16, B.h - 16));
    if (!force && side === B.side &&
        Math.abs(bx - B.ax) < 0.8 && Math.abs(by - B.ay) < 0.8 &&
        Math.abs(ay - B.aa) < 0.8) return;
    B.ax = bx; B.ay = by; B.aa = ay; B.side = side;
    el.style.setProperty("--bx", bx.toFixed(0) + "px");
    el.style.setProperty("--by", by.toFixed(0) + "px");
    el.style.setProperty("--ay", ay.toFixed(0) + "px");
    el.classList.toggle("lft", side === "lft");
    el.classList.toggle("rgt", side === "rgt");
  }

  function startLines(lines, opt, after) {
    P.lines = lines.slice();
    P.i = 0; P.opt = opt || null; P.after = after || null;
    P.chosen = false; P.optShown = false;
    $("encOpts").innerHTML = "";
    nextLine();
  }

  function nextLine() {
    $("encOpts").innerHTML = "";
    B.dirty = true;
    if (P.i >= P.lines.length) { afterLines(); return; }
    var s = P.lines[P.i++];
    typeLine(s, $("encTxt"), function () { P.typed = true; });
  }

  function afterLines() {
    if (P.opt && P.opt.length && !P.chosen) {
      if (!P.optShown) renderOpts();
      return;
    }
    P.typed = true;
    $("encFoot").textContent = "空格 退开";
  }

  function renderOpts() {
    var host = $("encOpts");
    host.innerHTML = "";
    B.dirty = true;
    P.optShown = true;
    $("encFoot").textContent = "选一句　·　数字键也行";
    P.opt.forEach(function (o, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "ch";
      b.innerHTML = '<span class="n">' + (i + 1) + '</span><span class="t">' + o.t + "</span>";
      b.addEventListener("click", function () {
        if (P.chosen) return;
        P.chosen = true;
        host.innerHTML = "";
        pickOpt(o);
      });
      host.appendChild(b);
      setTimeout(function () { b.classList.add("in"); }, i * 60);
    });
  }

  function pickOpt(o) {
    if (o.note != null && hooks) { try { hooks.unlock(o.note); } catch (e) {} }
    if (o.go) {
      var to = o.go;
      closePanel();
      setTimeout(function () { location.href = "play.html#" + to; }, 380);
      return;
    }
    if (o.story && cb && cb.onStory) {
      var pid = o.story;
      closePanel();
      setTimeout(function () { cb.onStory(pid); }, 380);
      return;
    }
    var arr = o.r || [];
    if (arr.length) {
      P.lines = arr.slice(); P.i = 0;
      nextLine();
    } else afterLines();
  }

  function typeLine(html, host, done) {
    cancelAnimationFrame(P.raf);
    var tokens = [], re = /(<b>|<\/b>|<br\s*\/?>)/g, last = 0, m;
    while ((m = re.exec(html))) {
      if (m.index > last) {
        var seg = html.slice(last, m.index);
        for (var k = 0; k < seg.length; k++) tokens.push(seg[k]);
      }
      tokens.push({ tag: m[0] });
      last = m.index + m[0].length;
    }
    if (last < html.length) {
      var tail = html.slice(last);
      for (var j = 0; j < tail.length; j++) tokens.push(tail[j]);
    }
    var box = document.createElement("p");
    host.appendChild(box);
    T.box = box; T.html = html;
    /* 看东西不是听人说话 —— 史料一屏给全，不逐字吊着 */
    if (P.fast) {
      box.innerHTML = colorQ(html);
      P.typed = true;
      done && done();
      return;
    }
    var out = "", open = [], idx = 0, acc = 0, prevT = 0;
    P.typed = false;
    function flush() {
      var close = open.slice().reverse().map(function (t) { return "</" + t + ">"; }).join("");
      box.innerHTML = colorQ(out + close);
      host.scrollTop = host.scrollHeight;
      /* 每打出一行字，气泡就长高一点 —— 高度得重量，位置才跟着让 */
      B.dirty = true;
      positionBubble(false);
    }
    function frame(t) {
      if (!prevT) prevT = t;
      var dt = Math.min(64, t - prevT); prevT = t;
      acc += INSTANT ? 9999 : (dt / 1000) * 46;
      while (idx < tokens.length && acc >= 0) {
        var tk = tokens[idx];
        if (typeof tk === "string") {
          if (acc <= 0) break;
          out += tk;
          if (tk === "。" || tk === "？" || tk === "！") acc -= 6;
          idx++; acc -= 1;
        } else if (tk.tag === "<b>") { out += "<b>"; open.push("b"); idx++; }
        else if (tk.tag === "</b>") { out += "</b>"; open.pop(); idx++; }
        else { out += "<br>"; idx++; }
      }
      flush();
      if (idx >= tokens.length) { P.typed = true; done && done(); return; }
      P.raf = requestAnimationFrame(frame);
    }
    P.raf = requestAnimationFrame(frame);
  }

  function skipLine() {
    cancelAnimationFrame(P.raf);
    if (T.box) T.box.innerHTML = colorQ(T.html);
    P.typed = true;
  }

  function advance() {
    if (!P.open) return;
    if (!P.typed) { skipLine(); return; }
    if (P.i < P.lines.length) { nextLine(); return; }
    if (P.opt && P.opt.length && !P.chosen) {
      if (!P.optShown) renderOpts();
      return;
    }
    closePanel();
  }

  /* ---------------- 点开 ---------------- */
  function go(s) {
    /* 就地：不再把人转到正前方、也不再推近。
       一转一推，人就以为「进了一个新页面」—— 空间感白做了。
       视角留给你自己，气泡自己会跟过去。 */
    if (P.hiEl) P.hiEl.classList.remove("hi");
    s.el.classList.add("hi");
    P.hiEl = s.el;
    if (s.kind === "note") return openNote(s);
    if (s.kind === "fork") return openFork(s);
    return openCast(s);
  }

  function openNote(s) {
    var i = s.data, nt = (node.notes || [])[i];
    if (!nt) return;
    openPanel(nt.short || nt.title, "看 见", s);
    P.fast = true;
    var body = (nt.body || "") +
      (nt.src ? "<br><br>" + nt.src : "") +
      (nt.warn ? "<br>" + nt.warn : "");
    P.after = function () {
      var isNew = !seenNote(node.id, i);
      if (isNew && hooks) { try { hooks.unlock(i); } catch (e) {} }
      s.seen = true;
      s.el.classList.add("seen");
      paintHint();
      checkAllSee();
    };
    startLines(["<b>" + nt.title + "</b>", body], null, P.after);
    if (hooks && hooks.blip) { try { hooks.blip("step", 0.45); } catch (e) {} }
    ach("a-first-see");
  }

  function checkAllSee() {
    var got = notesOf(node.id).length, all = (node.notes || []).length;
    if (all && got >= all) ach("see:" + node.id);
  }

  function openFork(s) {
    var f = s.data;
    openPanel("岔 路", "发 现", s);
    P.fast = false;
    ach("fork:" + f.id);
    P.after = null;
    startLines([
      "队伍往东去了。你回头看了一眼 —— 那边也有一条路，往西。",
      "不是主路。走的人少，草都长到膝盖上了。"
    ], [
      { t: "过去看看 →", go: f.id },
      { t: "跟上队伍", r: ["你没有过去。那条路就一直那么荒着。"] }
    ], null);
  }

  function openCast(s) {
    var c = s.data;
    openPanel(c.who, c.tag || "路 上 的 人", s.el ? s : null);
    P.fast = false;
    ach("a-first-talk");
    ach("talk:" + node.id);
    P.after = function () {
      if (c.note != null && hooks) {
        try { hooks.unlock(c.note); } catch (e) {}
        paintHint();
        checkAllSee();
      }
    };
    var opt = (c.ask || []).map(function (a) {
      return { t: a.t, r: a.r, note: a.note, story: a.story };
    });
    startLines((c.lines || []).slice(), opt.length ? opt : null, P.after);
    if (hooks && hooks.blip) { try { hooks.blip("step", 0.42); } catch (e) {} }
  }

  /* ---------------- 输入 ---------------- */
  var ptr = null;
  function bindInput() {
    var out = $("stageOuter");

    out.addEventListener("pointerdown", function (e) {
      if (e.target.closest && (e.target.closest(".spot") || e.target.closest("#enc"))) return;
      /* 气泡开着也照样能拖 —— 一边听一边转，才不会觉得画面被拿走了 */
      ptr = { x: e.clientX, y: e.clientY, tx: cam.gx, ty: cam.gy, lx: e.clientX, vx: 0,
        yaw: cam.gyaw, pitch: cam.gpitch, moved: false, wasOpen: P.open };
      cam.drag = true;
      document.body.classList.add("dragging");
      try { out.setPointerCapture(e.pointerId); } catch (err) {}
    });
    out.addEventListener("pointermove", function (e) {
      if (!ptr) {
        /* 手没按着的时候，画面跟着你探头。只有两三度，但整块空间就活了。 */
        if (!on || P.open || e.pointerType === "touch") return;
        mouse.x = e.clientX / Math.max(1, W);
        mouse.y = e.clientY / Math.max(1, H);
        mouse.has = true;
        tiltTargets();
        tween();
        return;
      }
      var dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) ptr.moved = true;
      ptr.vx = e.clientX - ptr.lx;
      ptr.lx = e.clientX;
      if (panoOn && window.RS_PANO) {
        /* 手往右拖 = 把世界往右拉 = 人在往左看。1 像素对应多少度由焦距定，
           不用猜系数：dθ = dx / P。 */
        var dpp = RS_PANO.degPerPx();
        cam.yaw = cam.gyaw = yawTo(ptr.yaw - dx * dpp);
        cam.pitch = cam.gpitch = clamp(ptr.pitch + dy * dpp,
          -RS_PANO.limPitch(), RS_PANO.limPitch());
        apply();
        return;
      }
      cam.tx = cam.gx = clamp(ptr.tx + dx, -limX(), limX());
      cam.ty = cam.gy = clamp(ptr.ty + dy, -limY(), limY());
      tiltTargets();
      /* 拖的时候不缓动，跟手 —— 缓一下就像在推一张图，而不是转头 */
      cam.rx = cam.grx; cam.ry = cam.gry;
      apply();
    });
    function up() {
      if (!ptr) return;
      var moved = ptr.moved, vx = ptr.vx, wasOpen = ptr.wasOpen;
      ptr = null; cam.drag = false;
      document.body.classList.remove("dragging");
      if (!moved) {
        /* 点空地 = 退开。点在人 / 东西上是 spot 自己的 click，不会走到这儿 */
        if (wasOpen) { closePanel(); return; }
        tiltTargets(); tween(); return;
      }
      ach("a-drag");
      if (panoOn && window.RS_PANO) {
        cam.gyaw = yawTo(cam.gyaw - vx * RS_PANO.degPerPx() * 6);
        tween();
        return;
      }
      cam.gx = clamp(cam.gx + vx * 7, -limX(), limX());
      cam.gy = clamp(cam.gy, -limY(), limY());
      tiltTargets();
      tween();
    }
    out.addEventListener("pointerup", up);
    out.addEventListener("pointercancel", up);
    document.addEventListener("pointerleave", function () {
      if (!on) return;
      mouse.has = false;
      tiltTargets();
      tween();
    });

    window.addEventListener("wheel", function (e) {
      if (!on) return;
      if (e.target.closest && e.target.closest("#drawer")) return;
      /* 指针在气泡里就让它自己滚 —— 正在看史料的时候被拽着转头很烦 */
      if (e.target.closest && e.target.closest("#enc")) return;
      e.preventDefault();
      var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (panoOn && window.RS_PANO) {
        cam.gyaw = yawTo(cam.gyaw + d * 0.075);
        cam.gpitch = clamp(cam.gpitch - e.deltaY * 0.05,
          -RS_PANO.limPitch(), RS_PANO.limPitch());
        tween();
        return;
      }
      cam.gx = clamp(cam.gx - d * 1.05, -limX(), limX());
      cam.gy = clamp(cam.gy - e.deltaY * 0.22, -limY(), limY());
      tiltTargets();
      tween();
    }, { passive: false });

    window.addEventListener("keydown", function (e) {
      if (!on) return;
      if (e.key === "Escape") { if (P.open) closePanel(); return; }
      if (P.open) {
        if (e.key === " " || e.key === "Enter") {
          var btn = $("encOpts").querySelector(".ch");
          if (P.typed && P.i >= P.lines.length && btn) btn.click();
          else advance();
          e.preventDefault();
        }
        var n = parseInt(e.key, 10);
        if (n >= 1 && n <= 9) {
          var bs = $("encOpts").querySelectorAll(".ch");
          if (bs[n - 1]) { bs[n - 1].click(); e.preventDefault(); }
        }
        return;
      }
      var st = 130, hit = true;
      if (panoOn && window.RS_PANO) {
        var a = 6.5;
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A")
          cam.gyaw = yawTo(cam.gyaw - a);
        else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D")
          cam.gyaw = yawTo(cam.gyaw + a);
        else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W")
          cam.gpitch = clamp(cam.gpitch + a * 0.6, -RS_PANO.limPitch(), RS_PANO.limPitch());
        else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S")
          cam.gpitch = clamp(cam.gpitch - a * 0.6, -RS_PANO.limPitch(), RS_PANO.limPitch());
        else hit = false;
        if (hit) { tween(); e.preventDefault(); }
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") cam.gx = clamp(cam.gx + st, -limX(), limX());
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") cam.gx = clamp(cam.gx - st, -limX(), limX());
      else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") cam.gy = clamp(cam.gy + st, -limY(), limY());
      else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") cam.gy = clamp(cam.gy - st, -limY(), limY());
      else hit = false;
      if (hit) { tiltTargets(); tween(); e.preventDefault(); }
    });

    window.addEventListener("resize", function () { if (on) { measure(); apply(); } });
  }

  /* ---------------- 对外 ---------------- */
  function mount(o) {
    node = o.node; cb = o.cb || {}; hooks = o.hooks || {};
    INSTANT = !!o.instant;
    if ($("stageOuter") && !$("stageOuter").dataset.bind) {
      $("stageOuter").dataset.bind = "1";
      bindInput();
    }
    spotsHost = $("spots");
    spotsHost.innerHTML = "";
    on = true;
    P.open = false;
    P.spot = null;
    if ($("enc")) $("enc").classList.remove("bub");

    SP = (window.RS_SPACE || {})[node.id] || null;
    panoOn = !!(SP && SP.img && window.RS_PANO);
    document.body.classList.toggle("pano", panoOn);
    document.body.classList.add("explore");
    document.body.classList.remove("inenc");
    if (panoOn) {
      RS_PANO.build(SP);
      cam.yaw = cam.gyaw = SP.yaw || 0;
      /* 圆筒只能显示竖向内容的四成多（R 与 P 的比例定死的），正视时
         地平线落在画面中线，人的下半身和脚下全在屏幕外 —— 那正是「贴脸」
         的另一半原因。进来先低头 7°：人全身入画，脚边的地面也露出来。
         「站在屋里」这个判断，一半是靠脚下那块地给的。 */
      cam.pitch = cam.gpitch = -6;
      cam.zoom = cam.gzoom = 1;
    }
    measure();
    if (!panoOn) syncDepth();
    /* 从「一张图铺满屏」起步，再推到 1.72 —— 一进来是往那块地方里走了一步，
       不是画面被放大。这一步本身就是最直白的一句：这里是能走进去的。 */
    cam.zoom = panoOn ? 1 : 1 / Z;
    cam.gzoom = 1;
    cam.tx = cam.gx = 0; cam.ty = cam.gy = 0;
    cam.grx = cam.rx = BASE_RX; cam.gry = cam.ry = 0;
    apply();
    buildSpots();
    tiltTargets();
    /* 先偏着头看那边，再转回正面：一进来就知道这地方能转头看 */
    if (panoOn) {
      cam.yaw = cam.gyaw - 6.4;
      cam.pitch = cam.gpitch - 1.4;
    } else {
      cam.ry = cam.gry - 5.2;
    }
    apply();
    tween();
    $("hint").classList.add("on");
    $("deck").style.opacity = "0";
  }

  function unmount() {
    on = false;
    document.body.classList.remove("explore");
    document.body.classList.remove("inenc");
    document.body.classList.remove("dragging");
    document.body.classList.remove("pano");
    cancelAnimationFrame(P.raf);
    cancelAnimationFrame(raf);
    raf = 0;
    P.open = false;
    cam.gzoom = cam.zoom = 1;
    if (window.RS_PANO) { try { RS_PANO.hide(); } catch (e) {} }
    panoOn = false; SP = null;
    $("enc").classList.remove("on");
    $("enc").classList.remove("bub");
    P.spot = null; P.hiEl = null;
    $("hint").classList.remove("on");
    if ($("edgeL")) $("edgeL").classList.remove("on");
    if ($("edgeR")) $("edgeR").classList.remove("on");
    if (spotsHost) spotsHost.innerHTML = "";
    if (spotsHost) spotsHost.classList.remove("peek");
    clearTimeout(peekT);
    spots = [];
    if ($("stage")) $("stage").style.transform = "";
    $("deck").style.opacity = "1";
  }

  window.RS_EXPLORE = {
    mount: mount,
    unmount: unmount,
    advance: advance,
    close: closePanel,
    openArchiveCast: function (index) {
      if (!on || !SP || !SP.cast || SP.cast[index] !== null) return false;
      var cast = (window.RS_CAST || {})[node.id] || [];
      if (!cast[index]) return false;
      if (P.open) closePanel();
      openCast({ data: cast[index] });
      return true;
    },
    refreshArchive: function () {
      if (!on) return;
      paintHint();
      checkAllSee();
    },
    def: achDef,
    get open() { return on; },
    get panel() { return P.open; },
    get spots() {
      return spots.map(function (s, i) {
        var p = proj(s.x, s.y, s.z);
        return {
          i: i, kind: s.kind, label: s.label,
          x: Math.round(p.x), y: Math.round(p.y),
          hidden: s.hidden, seen: s.seen
        };
      });
    },
    get cam() {
      return { tx: cam.tx, ty: cam.ty, gx: cam.gx, gy: cam.gy,
        rx: cam.rx, ry: cam.ry, yaw: cam.yaw, pitch: cam.pitch,
        zoom: cam.zoom, z: Z, per: PER, pano: panoOn,
        limX: limX(), limY: limY() };
    },
    /* 圆筒每帧都在动（呼吸、慢摆），热点得跟着重投一次 —— 由 pano.js 的
       帧循环调用。别在别处高频调：它遍历所有热点，写 DOM。 */
    refresh: layout,
    /* 柱面模式：直接转到某个方位角 / 俯仰角（度）。测试用。 */
    look: function (yaw, pitch) {      if (!panoOn || !window.RS_PANO) return false;
      cam.gyaw = clamp(yaw == null ? cam.gyaw : yaw, -RS_PANO.limYaw(), RS_PANO.limYaw());
      cam.gpitch = clamp(pitch == null ? cam.gpitch : pitch,
        -RS_PANO.limPitch(), RS_PANO.limPitch());
      tween();
      return true;
    },
    get pano() { return (window.RS_PANO && RS_PANO.state) || null; },
    nudge: function (dx, dy) {
      cam.gx = clamp(cam.gx + (dx || 0), -limX(), limX());
      cam.gy = clamp(cam.gy + (dy || 0), -limY(), limY());
      tiltTargets();
      tween();
    },
    /* 把视角转到某个角度 —— 用来验证「转视角」是不是真的在转 */
    tilt: function (rx, ry) {
      cam.grx = clamp(rx == null ? BASE_RX : rx, -12, 12);
      cam.gry = clamp(ry == null ? 0 : ry, -12, 12);
      tween();
    },
    /* 走到画面上的某一点（两种模式都适用） */
    focus: function (x, y) { focusOn(x, y); },
    hit: function (i) { if (spots[i]) go(spots[i]); }
  };
})();
