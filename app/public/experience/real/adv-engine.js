/* =========================================================
   长征一条路的来处 · 文字冒险引擎
   ---------------------------------------------------------
   分工：
     real/nodes.js      → 影像、史料（与"静观场景"共用同一份，不另写）
     real/adv-story.js  → 这一站的每一条岔路、每一个结局
     本文件             → 推景、打字、选择、记账、结局
   原则：
     史料只引用、不新造；选错不判"失败"，只让你少知道一点。
   ========================================================= */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var NODES = window.RS_NODES || [];
  var STORY = window.RS_STORY || {};
  var KEY = "rs_adv_v1";

  /* ---------------- 存档 ---------------- */
  var save = (function () {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; }
    catch (e) { return {}; }
  })();
  save.notes = save.notes || {};
  save.ends = save.ends || {};
  /* 场景层也在往同一份存档里写（史料与成就）。
     引擎手里的 save 是进页时的快照 —— 直接写回会把场景层刚加的东西抹掉，
     所以每次落盘前先读一遍现状，按并集合。 */
  function mergeIds(a, b) {
    var u = (a || []).slice();
    for (var i = 0; i < (b || []).length; i++) if (u.indexOf(b[i]) < 0) u.push(b[i]);
    return u;
  }
  function persist() {
    try {
      var cur = {};
      try { cur = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { cur = {}; }
      var notes = cur.notes || {};
      for (var k in save.notes) notes[k] = mergeIds(notes[k], save.notes[k]);
      cur.notes = notes; save.notes = notes;
      var ends = cur.ends || {};
      for (var k2 in save.ends) ends[k2] = mergeIds(ends[k2], save.ends[k2]);
      cur.ends = ends; save.ends = ends;
      if (save.sound != null) cur.sound = save.sound;
      cur.ach = cur.ach || save.ach || {};
      save.ach = cur.ach;
      localStorage.setItem(KEY, JSON.stringify(cur));
    } catch (e) {}
  }

  /* ---------------- 合成音 ---------------- */
  function rnd(a, b) { return a + Math.random() * (b - a); }
  var A = (function () {
    var ac = null, master = null, on = save.sound !== false, nb = null, layer = {};

    function mkNoise() {
      var len = Math.floor(ac.sampleRate * 2);
      var b = ac.createBuffer(1, len, ac.sampleRate);
      var d = b.getChannelData(0), last = 0, i;
      for (i = 0; i < len; i++) {
        var wn = Math.random() * 2 - 1;
        last = (last + 0.02 * wn) / 1.02;
        d[i] = last * 3.2;
      }
      for (i = 0; i < len; i++) d[i] += (Math.random() * 2 - 1) * 0.06;
      return b;
    }
    function makeLayer(type, freq, q, detune) {
      var s = ac.createBufferSource();
      s.buffer = nb; s.loop = true; s.playbackRate.value = detune || 1;
      var f = ac.createBiquadFilter();
      f.type = type; f.frequency.value = freq; f.Q.value = q;
      var g = ac.createGain(); g.gain.value = 0;
      s.connect(f); f.connect(g); g.connect(master);
      s.start(0, Math.random() * 1.5);
      return { s: s, f: f, g: g };
    }
    function init() {
      if (ac) return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = on ? 0.88 : 0;
      master.connect(ac.destination);
      nb = mkNoise();
      layer.water = makeLayer("lowpass", 430, 0.7);
      layer.wind = makeLayer("bandpass", 760, 0.6, 0.92);
      layer.fire = makeLayer("bandpass", 1500, 0.9, 1.07);
      layer.room = makeLayer("lowpass", 180, 1.2);
      var lfo = ac.createOscillator(), lg = ac.createGain();
      lfo.type = "sine"; lfo.frequency.value = 0.11; lg.gain.value = 0.42;
      lfo.connect(lg); lg.connect(layer.wind.g.gain); lfo.start();
      if (ac.state === "suspended") ac.resume();
    }
    function set(amb) {
      if (!ac) return;
      var t = ac.currentTime;
      var ramp = function (g, v) { g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(v, t, 0.9); };
      ramp(layer.water.g, (amb.water || 0) * 0.5);
      ramp(layer.wind.g, (amb.wind || 0) * 0.34);
      ramp(layer.fire.g, (amb.fire || 0) * 0.3);
      ramp(layer.room.g, (amb.room || 0) * 0.26);
    }
    function blip(kind, k) {
      if (!ac || !on) return;
      var t = ac.currentTime, dur = 0.16;
      var s = ac.createBufferSource(); s.buffer = nb;
      var f = ac.createBiquadFilter(), g = ac.createGain();
      s.connect(f); f.connect(g); g.connect(master);
      k = k || 1;
      if (kind === "chain") {
        f.type = "bandpass"; f.frequency.value = 2100 + rnd(-260, 260); f.Q.value = 13;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.18 * k, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.42);
        dur = 0.45;
        var o = ac.createOscillator(), og = ac.createGain();
        o.type = "triangle"; o.frequency.value = 780 + rnd(-90, 90);
        og.gain.setValueAtTime(0.045, t);
        og.gain.exponentialRampToValueAtTime(0.0005, t + 0.3);
        o.connect(og); og.connect(master); o.start(t); o.stop(t + 0.32);
      } else if (kind === "step") {
        f.type = "lowpass"; f.frequency.value = 620;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.12 * k, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.2);
        dur = 0.22;
      } else if (kind === "splash") {
        f.type = "highpass"; f.frequency.value = 1400;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.10 * k, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.34);
        dur = 0.36;
      } else if (kind === "heart") {
        f.type = "lowpass"; f.frequency.value = 120;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.28 * k, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.42);
        dur = 0.45;
      } else {
        f.type = "bandpass"; f.frequency.value = 340; f.Q.value = 1;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.15 * k, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.7);
        dur = 0.7;
      }
      s.start(t, Math.random()); s.stop(t + dur);
    }
    return {
      init: init, set: set, blip: blip,
      toggle: function () {
        on = !on; save.sound = on; persist();
        if (master) master.gain.value = on ? 0.88 : 0;
        return on;
      },
      get on() { return on; },
      resume: function () { if (ac && ac.state === "suspended") ac.resume(); }
    };
  })();

  /* ---------------- 状态 ---------------- */
  var node = null, story = null, fromUrl = null, INSTANT = false;
  var S = { pid: null, stam: 8, max: 8, flags: [], path: [], clock: "", typed: false, busy: false, ended: false };
  var chToken = 0;   // 选项批次令牌：新一批渲染后作废上一批的收拢定时器

  /* ---------------- 颗粒 ---------------- */
  (function grain() {
    var c = document.createElement("canvas");
    c.width = c.height = 160;
    var g = c.getContext("2d");
    var d = g.createImageData(160, 160);
    for (var i = 0; i < d.data.length; i += 4) {
      var v = 120 + Math.random() * 135;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 255;
    }
    g.putImageData(d, 0, 0);
    $("grain").style.backgroundImage = "url(" + c.toDataURL() + ")";
  })();

  /* ---------------- 底图 ---------------- */
  var bgFlip = 0;
  var bgKey = "";   // 同一段图不重淡入，否则每点一次画面就白一下
  var bgIsCover = false;

  /* 底图上本来就有人的地方，单独复制一层出来做极小的位移。
     两层像素完全重合，只有偏移的那一两像素会显形 —— 人就活了。
     遮罩用百分比，相对视口；底图是拉伸铺满的，
     所以底图归一化坐标直接乘 100 就对上。 */
  function buildBreath(hostEl, img, w, h, sx, sy) {
    var olds = document.querySelectorAll(".bg .bb");
    for (var i = 0; i < olds.length; i++) {
      if (olds[i].parentNode) olds[i].parentNode.removeChild(olds[i]);
    }
    if (!hostEl) return;
    var list = (window.RS_BREATH || {})[(node && node.id)] || [];
    if (!list.length) return;
    var size = (100 / w) + "% " + (100 / h) + "%";
    var pos = (w >= 0.999 ? 50 : (sx / (1 - w)) * 100) + "% " +
              (h >= 0.999 ? 50 : (sy / (1 - h)) * 100) + "%";
    // 底图可能只显示 src 那一块（推近的段）。图上归一化坐标要换算到
    // 这一段实际占的视口比例，否则裁近之后人就跑偏了。
    var zoom = Math.min(2.4, Math.max(0.9, 1 / Math.max(0.42, Math.min(w, h))));
    for (var j = 0; j < list.length; j++) {
      var b = list[j];
      if (!b || !b.rx || !b.ry) continue;
      var vx = (b.x - sx) / w, vy = (b.y - sy) / h;
      var vrx = b.rx / w, vry = b.ry / h;
      // 整块都在这一段的画面之外，就不用画了
      if (vx < -0.15 || vx > 1.15 || vy < -0.15 || vy > 1.15) continue;
      var d = document.createElement("div");
      d.className = "bb " + (b.kind || "breathe");
      d.style.backgroundImage = "url(" + img + ")";
      d.style.backgroundSize = size;
      d.style.backgroundPosition = pos;
      // 用柔边遮罩而不是硬切：位移层在椭圆边缘淡到透明，
      // 两层自然叠在一起，不会在人物轮廓上切出一条错位的缝。
      // 不透明区留到 72%，只有最外一圈淡出 —— 太早淡会把位移吃掉。
      var mk = "radial-gradient(ellipse " + (vrx * 112).toFixed(2) + "% " +
               (vry * 112).toFixed(2) + "% at " +
               (vx * 100).toFixed(2) + "% " + (vy * 100).toFixed(2) + "%, " +
               "rgba(0,0,0,1) 0%, rgba(0,0,0,1) 72%, rgba(0,0,0,0) 100%)";
      d.style.setProperty("-webkit-mask-image", mk);
      d.style.setProperty("mask-image", mk);
      d.style.setProperty("-webkit-mask-repeat", "no-repeat");
      d.style.setProperty("mask-repeat", "no-repeat");
      // 顺手把椭圆记在元素上，自检脚本直接读，不用去解析 CSS
      d.setAttribute("data-bb", [vx.toFixed(4), vy.toFixed(4),
        vrx.toFixed(4), vry.toFixed(4)].join(","));
      d.style.setProperty("--dur", (b.dur || 5) + "s");
      d.style.setProperty("--dly", (b.dly || 0) + "s");
      d.style.setProperty("--amp", Math.min(9, (b.amp || 1.6) * 1.35 * zoom).toFixed(2) + "px");
      d.style.setProperty("--sway", ((b.sway || 0) * zoom).toFixed(2) + "px");
      d.style.setProperty("--sc", b.sc || 1.0006);
      hostEl.appendChild(d);
    }
  }

  function setBg(bi, pan, cover) {
    var stages = (node && node.stages) || [];
    var st = stages[bi] || stages[0] || {};
    var img = cover || st.img || (node && node.img) || "";
    var rect = st.src || [0, 0, 1, 1];
    var x = rect[0], y = rect[1], w = rect[2], h = rect[3];

    var key = (node && node.id) + "|" + img + "|" + (cover ? "cover" : rect.join(","));
    if (key === bgKey) return;
    bgKey = key;
    bgIsCover = !!cover;

    bgFlip = 1 - bgFlip;
    var next = $("bg" + bgFlip);
    var prev = $("bg" + (1 - bgFlip));

    next.style.backgroundImage = "url(" + img + ")";
    next.style.backgroundSize = cover ? "cover" : (100 / w) + "% " + (100 / h) + "%";
    next.style.backgroundPosition = cover ? "center" :
      (w >= 0.999 ? 50 : (x / (1 - w)) * 100) + "% " +
      (h >= 0.999 ? 50 : (y / (1 - h)) * 100) + "%";

    next.classList.remove("pan");
    void next.offsetWidth;
    if (pan !== false) next.classList.add("pan");
    next.classList.add("on");
    prev.classList.remove("on");

    if (cover) return;
    // 底图上画着的人：让他们呼吸
    buildBreath(next, img, w, h, x, y);

    // 活层跟着这一段走 —— 火、烟、尘、人都挂在这里
    if (window.RS_LIVE) {
      try { RS_LIVE.enter(node.id, bi, pan !== false, st.src || null); } catch (e) {}
    }
  }

  /* ---------------- 打字 ---------------- */
  var typeRaf = 0;

  // 把「…」整体标成暖色（只处理已成对的引号）
  function colorQuotes(s) {
    return s.replace(/「[^「」]*」/g, function (m) {
      return '<span style="color:#e8cfa2">' + m + "</span>";
    });
  }

  /* 逐字打字：支持 <b> <br>，用"每次重设 innerHTML"的方式保证标签闭合正确 */
  function typeInto(html, host, cps, done) {
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

    var out = "", open = [], idx = 0, acc = 0, prevT = 0;
    var box = document.createElement("p");
    host.appendChild(box);

    function flush(cursor) {
      var close = open.slice().reverse().map(function (t) { return "</" + t + ">"; }).join("");
      box.innerHTML = colorQuotes(out + close) +
        (cursor ? '<span class="cue"></span>' : "");
    }

    function frame(t) {
      if (!prevT) prevT = t;
      var dt = Math.min(64, t - prevT);
      prevT = t;
      acc += cps > 0 ? (dt / 1000) * cps : 9999;

      while (idx < tokens.length && acc >= 0) {
        var tk = tokens[idx];
        if (typeof tk === "string") {
          if (acc <= 0) break;
          out += tk;
          if (tk === "。" || tk === "？" || tk === "！") acc -= 9;
          idx++; acc -= 1;
        } else if (tk.tag === "<b>") {
          out += "<b>"; open.push("b"); idx++;
        } else if (tk.tag === "</b>") {
          out += "</b>"; open.pop(); idx++;
        } else {
          out += "<br>"; idx++;
        }
      }

      if (idx >= tokens.length) {
        flush(false);
        done && done();
        return;
      }
      flush(true);
      typeRaf = requestAnimationFrame(frame);
    }
    if (cps > 0) typeRaf = requestAnimationFrame(frame);
    else {
      while (idx < tokens.length) {
        var t2 = tokens[idx];
        if (typeof t2 === "string") out += t2;
        else if (t2.tag === "<b>") { out += "<b>"; open.push("b"); }
        else if (t2.tag === "</b>") { out += "</b>"; open.pop(); }
        else out += "<br>";
        idx++;
      }
      flush(false);
      done && done();
    }
  }

  function renderText(paras, then) {
    var host = $("text");
    host.innerHTML = "";
    var ch = $("choices");
    // 旧选项不是"消失"，是收拢退场 —— 给这一下留 0.26 秒
    if (ch.children.length) {
      var myCh = chToken;
      ch.classList.add("fold");
      setTimeout(function () {
        if (myCh === chToken) { ch.classList.remove("fold"); ch.innerHTML = ""; }
      }, 280);
    } else {
      ch.innerHTML = "";
    }
    S.typed = false;
    var i = 0;
    (function step() {
      if (i >= paras.length) {
        S.typed = true;
        then && then();
        return;
      }
      typeInto(paras[i], host, INSTANT ? 0 : 52, function () {
        i++;
        setTimeout(step, INSTANT ? 0 : 150);
      });
    })();
  }

  function skipTyping() {
    if (!S.pid || S.ended) return;
    var p = story.p[S.pid];
    if (!p) return;
    cancelAnimationFrame(typeRaf);
    $("text").innerHTML = (p.t || []).map(function (x) {
      return "<p>" + colorQuotes(x) + "</p>";
    }).join("");
    S.typed = true;
    S.busy = false; // 跳字后必须解锁，否则选项点不动
    if (p.end) finish(p.end);
    else renderChoices(p.c || []);
  }

  /* ---------------- 体力 / 状态 ---------------- */
  function paintStam() {
    var r = S.max ? S.stam / S.max : 0;
    $("stamBar").style.transform = "scaleX(" + clamp(r, 0, 1) + ")";
    $("stamNum").textContent = S.stam + " / " + S.max;
    $("stam").classList.toggle("low", S.stam <= 2);
  }
  function paintFlags() {
    $("flags").innerHTML = S.flags.map(function (f) { return "<span>" + f + "</span>"; }).join("");
  }
  function addFlag(label) {
    if (!label || S.flags.indexOf(label) >= 0) return;
    S.flags.push(label);
    paintFlags();
  }

  /* ---------------- 史料 ---------------- */
  function allNotes() { return (node && node.notes) || []; }
  function unlock(idx) {
    if (idx == null) return;
    var arr = Array.isArray(idx) ? idx : [idx];
    arr.forEach(function (i) {
      var nt = allNotes()[i];
      if (!nt) return;
      var cur = save.notes[node.id] || (save.notes[node.id] = []);
      if (cur.indexOf(i) >= 0) return;
      cur.push(i);
      persist();
      toast("获得史料 · <b>" + nt.title + "</b>");
      A.blip("chain", 0.7);
      var b = $("bArch");
      b.classList.remove("pulse"); void b.offsetWidth; b.classList.add("pulse");
    });
    paintArch();
  }
  function paintArch() {
    $("bArchN").textContent = (save.notes[node.id] || []).length + "/" + allNotes().length;
  }
  function paintDrawerStatus() {
    var got = save.notes[node.id] || [];
    $("drSub").textContent = "已解锁 " + got.length + " / " + allNotes().length +
      " · 成就 " + Object.keys(save.ach || {}).length;
  }
  function drawerNoteBody(nt, heading) {
    return '<span class="lv ' + (nt.precision || "") + '">' + (nt.lv || "") + "</span>" +
      (heading ? "<h4>" + nt.title + "</h4>" : "") +
      '<div class="b">' + (nt.body || "") + "</div>" +
      (nt.src ? '<div class="s">' + nt.src + "</div>" : "") +
      (nt.warn ? '<div class="w">' + nt.warn + "</div>" : "");
  }
  function renderDrawer() {
    var list = allNotes(), got = save.notes[node.id] || [];
    var achIds = Object.keys(save.ach || {});
    var space = (window.RS_SPACE || {})[node.id] || {};
    var noteSpots = space.notes || [], castSpots = space.cast || [];
    paintDrawerStatus();
    var html = list.map(function (nt, i) {
      if (got.indexOf(i) >= 0) return '<div class="nt">' + drawerNoteBody(nt, true) + "</div>";
      if (noteSpots[i] === null) {
        return '<details class="nt" data-archive-note="' + i + '"><summary>' + nt.title +
          "</summary>" + drawerNoteBody(nt) + "</details>";
      }
      return "";
    }).join("");
    if (window.RS_EXPLORE && RS_EXPLORE.open && RS_EXPLORE.openArchiveCast) {
      var cast = ((window.RS_CAST || {})[node.id] || []).map(function (person, i) {
        return castSpots[i] === null
          ? '<button type="button" data-archive-cast="' + i + '">' + person.who + "</button>"
          : "";
      }).join("");
      if (cast) html += '<div class="nt drCast"><h4>路上的人</h4>' + cast + "</div>";
    }
    if (!html) html = '<div id="drEmpty">还没有解开任何一条。<br>' +
      "走近些，点开画面里亮着的地方 —— 人在那儿，东西也在那儿。</div>";
    if (achIds.length && window.RS_EXPLORE && RS_EXPLORE.def) {
      html += '<div class="nt"><h4>成 就</h4><div class="b">' +
        achIds.map(function (id) {
          var d = RS_EXPLORE.def(id) || [id, ""];
          return '<div class="achrow"><span class="a">' + d[0] + "</span>" +
            '<span class="b">' + (d[1] || "") + "</span></div>";
        }).join("") + "</div></div>";
    }
    $("drBody").innerHTML = html;
  }

  /* ---------------- 提示 ---------------- */
  var toastT = 0;
  function toast(html) {
    var t = $("toast");
    t.innerHTML = html;
    t.classList.add("on");
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove("on"); }, 2700);
  }

  /* ---------------- 钟 ---------------- */
  function paintClock(hop) {
    var el = $("hClock");
    el.textContent = S.clock;
    if (hop) {
      el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
    }
  }
  function bump(min) {
    var m = /(\d{4})\.(\d{1,2})\.(\d{1,2})\s+(\d{1,2}):(\d{2})/.exec(S.clock || "");
    if (!m) return S.clock;
    var mm = parseInt(m[5], 10) + min, hh = parseInt(m[4], 10), day = parseInt(m[3], 10);
    hh += Math.floor(mm / 60); mm %= 60;
    if (hh >= 24) { hh -= 24; day += 1; }
    function p2(n) { return n < 10 ? "0" + n : "" + n; }
    return m[1] + "." + m[2] + "." + p2(day) + " " + p2(hh) + ":" + p2(mm);
  }

  /* ---------------- 行程（代入感） ----------------
     数字都是约略值：里程按路线估算，海拔取该地大致高度。
     目的不是精确，是让你知道「已经走出去多远、爬了多高」。 */
  function fmtLi(li) {
    if (!li) return "起点";
    if (li >= 10000) {
      var w = (li / 10000).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
      return "约 " + w + " 万里";
    }
    return "约 " + li + " 里";
  }
  function paintWalk() {
    var w = node && node.walk;
    var el = $("hWalk");
    if (!w) { el.textContent = ""; el.style.display = "none"; return; }
    el.style.display = "";
    if (w.custom) { el.textContent = w.custom; return; }
    el.textContent = "第 " + w.day + " 天　·　" + fmtLi(w.li) +
      (w.alt ? "　·　海拔约 " + w.alt + " 米" : "");
  }

  /* ---------------- 同行者 ----------------
     队伍里那个没留下名字的小鬼。他不是史料人物 ——
     是让「一个人走」这件事有个伴的叙述装置。
     只在体力变化时露一句，三秒后自己退场。 */
  var MATE = {
    hi: [
      "背锅的那个小鬼跟在你侧后，脚步和你一个节奏。",
      "他把你的水壶递过来，晃了晃，里面还有半壶。",
      "前面的人在传话，一句一句传到你这里，已经听不清原话。",
      "他问还有多远。你说不知道。他就不问了。"
    ],
    mid: [
      "他把你的枪接过去扛了一会儿，没说为什么。",
      "他走在你旁边，一直没有说话。你也没有。",
      "他开始数自己的步子，数到一百就重来。",
      "他蹲下去把绑腿重新缠了一遍，缠得比刚才紧。"
    ],
    low: [
      "他的鞋底磨穿了，走一步，脚趾头在地上蹭一下。",
      "你听见他的呼吸，一下一下，比脚步还响。",
      "他问你渴不渴。你说不渴。他知道你在说谎。",
      "他把最后一点干粮掰成两半，把大的那半塞给你。"
    ],
    zero: [
      "他扶了你一把。他自己也站不太稳。",
      "他把你的胳膊架在自己肩上，你的重量有一半在他身上。",
      "他一直在说话，说的什么你听不清，只知道有人在说话。"
    ]
  };
  var BODY = {
    low: [
      "脚上的泡破了，每一步都踩在自己的水上。",
      "腰上的皮带又松了一格。",
      "你尝到嘴里的血腥味，是牙龈出的血。"
    ],
    zero: [
      "你数不清自己走了多少步，也数不清还有多少步。",
      "耳朵里有声音，像有很多人在很远的地方说话。"
    ]
  };
  var mateTick = 0, mateT = 0;
  function paintMate(force) {
    if (!node || node.noMate) return;
    mateTick++;
    if (!force && mateTick % 2 === 0) return;
    var r = S.max ? S.stam / S.max : 0;
    var pool, tag;
    if (S.stam <= 0) { pool = MATE.zero; tag = "同 行"; }
    else if (r <= 0.25) { pool = Math.random() < 0.5 ? BODY.zero : MATE.low; tag = pool === BODY.zero ? "身 体" : "同 行"; }
    else if (r <= 0.6) { pool = Math.random() < 0.34 ? BODY.low : MATE.mid; tag = pool === BODY.low ? "身 体" : "同 行"; }
    else { pool = MATE.hi; tag = "同 行"; }
    var line = pool[(S.path.length + node.seq) % pool.length];
    var el = $("mate");
    el.innerHTML = "<b>" + tag + "</b>" + line;
    el.classList.add("on");
    clearTimeout(mateT);
    mateT = setTimeout(function () { el.classList.remove("on"); }, 3400);
  }

  /* ---------------- 主流程 ---------------- */
  function go(pid) {
    var p = story.p[pid];
    if (!p) { console.warn("缺段：", pid); return; }
    S.pid = pid;
    S.busy = true;

    if (p.bg != null || bgIsCover) setBg(p.bg == null ? 0 : p.bg, true);
    if (p.where) $("hPlace").textContent = p.where;
    if (p.clock) { S.clock = p.clock; paintClock(); }

    if (p.flash) {
      var f = $("flash");
      f.style.background = p.flash === "white" ? "#fff" : p.flash;
      f.classList.remove("go"); void f.offsetWidth; f.classList.add("go");
    }
    if (p.shake) {
      document.body.classList.add("shake");
      setTimeout(function () { document.body.classList.remove("shake"); }, 440);
      A.blip("heart", 0.8);
    }
    if (p.get != null) unlock(p.get);
    if (p.flag) addFlag(p.flag);
    if (p.snd) A.blip(p.snd, 1);

    renderText(p.t || [], function () {
      S.busy = false;
      if (p.end) { finish(p.end); return; }
      renderChoices(p.c || []);
    });
  }

  function renderChoices(list) {
    var host = $("choices");
    chToken++;                       // 作废上一批的收拢定时器
    host.classList.remove("fold");
    host.innerHTML = "";
    list.forEach(function (c, i) {
      var locked = c.lock === true;
      var b = document.createElement("button");
      b.className = "ch" + (locked ? " lock" : "");
      b.type = "button";
      var cost = c.cost ? '<span class="c">体力 −' + c.cost + "</span>" : "";
      var why = locked && c.why ? "<br><em>（" + c.why + "）</em>" : "";
      b.innerHTML = '<span class="n">' + (i + 1) + "</span>" +
        '<span class="t">' + c.t + why + "</span>" + cost;
      if (!locked) b.addEventListener("click", function () { pick(c, b); });
      host.appendChild(b);
      setTimeout(function () { b.classList.add("in"); }, i * 75);
    });

    // 随时可以承认撑不住 —— 这一路本来就有很多人是这样走完的
    if (story.out && story.p[story.out]) {
      var g = document.createElement("button");
      g.type = "button";
      g.className = "ch stay";
      g.innerHTML = '<span class="n">·</span><span class="t">（停一下。腿已经不听使唤了。）</span>';
      g.addEventListener("click", function () {
        if (S.busy || S.ended) return;
        A.blip("heart", 0.7);
        S.path.push("（撑不住了）");
        S.stam = 0; paintStam(); paintMate(true);
        fxPick(null, g);
        go(story.out);
      });
      host.appendChild(g);
      setTimeout(function () { g.classList.add("in"); }, list.length * 75);
    }
  }

  /* 选择之后的那一下 —— 这一路是走出来的，不是点出来的。
     按钮沉下去、其余让位、镜头往前倾半步、画面里的火被带得窜一下。 */
  function fxPick(c, btn) {
    var host = $("choices");
    var my = ++chToken;
    if (btn && btn.classList) btn.classList.add("act");
    if (host) {
      for (var i = 0; i < host.children.length; i++) {
        var x = host.children[i];
        if (x !== btn) x.classList.add("away");
      }
      // 批次令牌：新一批选项渲染出来之后，旧的收拢定时器要作废
      setTimeout(function () { if (my === chToken) host.classList.add("fold"); }, 200);
    }
    var wrap = $("bgWrap");
    if (wrap) {
      wrap.classList.remove("lurch");
      void wrap.offsetWidth;
      wrap.classList.add("lurch");
      setTimeout(function () { wrap.classList.remove("lurch"); }, 950);
    }
    if (window.RS_LIVE) { try { RS_LIVE.pulse(); } catch (e) {} }
  }

  function pick(c, btn) {
    if (S.busy || S.ended) return;
    A.resume();
    A.blip("step", 0.65);
    fxPick(c, btn);

    S.path.push(c.t.replace(/<[^>]+>/g, ""));
    if (c.flag) addFlag(c.flag);
    if (c.cost) { S.stam = clamp(S.stam - c.cost, 0, S.max); paintStam(); paintMate(); }
    S.clock = bump(story.step || 4);
    paintClock(true);

    if (S.stam <= 0 && !c.keep) { go(story.out || "out"); return; }
    go(c.to);
  }

  /* ---------------- 结局 ---------------- */
  function findNode(id) {
    for (var i = 0; i < NODES.length; i++) if (NODES[i].id === id) return NODES[i];
    return null;
  }

  function finish(eid) {
    S.ended = true;
    var e = (story.ends || {})[eid] || { k: "结 局", h: "你停在这里" };
    var ends = save.ends[node.id] || (save.ends[node.id] = []);
    if (ends.indexOf(eid) < 0) { ends.push(eid); persist(); }

    $("eKind").textContent = e.k || "结 局";
    $("eTitle").textContent = e.h || "";
    $("eSub").innerHTML = e.sub || "";

    var rows = e.rows || [];
    if (!rows.length) {
      rows = [{ k: "这 一 趟", v: "你没有自己走完这一段。史料已经留在档案里 —— 换一种走法，会碰到别的条目。" }];
      if (node.constraint) rows.push({ k: "当 时 的 情 形", v: node.constraint });
    }
    $("eCols").innerHTML = rows.map(function (r) {
      return '<div class="row"><div class="k">' + r.k + '</div><div class="v">' + r.v + "</div></div>";
    }).join("");
    $("eCols").style.display = "";

    $("eTrail").innerHTML = '<span style="letter-spacing:.2em">你走的路　</span>' +
      S.path.map(function (t, i) { return "<br>" + (i + 1) + ". " + t; }).join("");

    var got = (save.notes[node.id] || []).length;
    $("eGain").textContent = "这一趟解开史料 " + got + " / " + allNotes().length +
      "　·　结局 " + ends.length + " / " + Object.keys(story.ends || {}).length;

    var nextN = story.next ? findNode(story.next) : null;
    var acts = ['<button class="ghost primary" id="eAgain">换一种走法</button>'];
    if (nextN) {
      var lbl = node.line === "side" ? "回主线 · " + nextN.short : "下一站 · " + nextN.short;
      acts.push('<button class="ghost" id="eNext">' + lbl + " →</button>");
    }
    acts.push('<button class="ghost" id="eScene">回到这里看看</button>');
    acts.push('<button class="ghost" id="eArch">打开档案</button>');
    acts.push('<button class="ghost" id="eBack">' + (fromUrl ? "回到这一站" : "回到路线") + "</button>");
    $("eActs").innerHTML = acts.join("");

    $("eAgain").addEventListener("click", restart);
    if (nextN) $("eNext").addEventListener("click", function () { location.href = "play.html#" + nextN.id; });
    $("eScene").addEventListener("click", function () {
      resetRun();
      enterScene();
    });
    $("eArch").addEventListener("click", openDrawer);
    $("eBack").addEventListener("click", leave);

    $("end").classList.remove("gone");
    $("deck").style.opacity = "0";
    $("text").innerHTML = "";
    $("choices").innerHTML = "";
    A.set({ water: 0.16, wind: 0.12, fire: 0, room: 0.08 });
  }

  function resetRun() {
    S.stam = story.stamina || 8;
    S.max = S.stam;
    S.flags = []; S.path = []; S.ended = false; S.busy = false;
    S.clock = story.clock0 || node.stamp || "";
    S.pid = null;
    mateTick = 0;
    bgKey = "";
    cancelAnimationFrame(typeRaf);
    $("mate").classList.remove("on");
    $("end").classList.add("gone");
    $("deck").style.opacity = "1";
    $("text").innerHTML = "";
    $("choices").innerHTML = "";
    paintStam(); paintFlags(); paintClock();
  }

  function restart() {
    resetRun();
    go(story.start || "a");
  }

  function leave() {
    // 从主应用弹窗进来 → 回弹窗；否则回路线总览（experience/ 下没有 index.html）
    location.href = fromUrl || "journey.html";
  }

  /* ---------------- 抽屉 ---------------- */
  var drawerOpen = false;
  var drawerOpener = null;
  function openDrawer(e) {
    drawerOpener = e && e.currentTarget;
    renderDrawer();
    $("drawer").inert = false;
    $("drawer").classList.add("on");
    drawerOpen = true;
    $("drClose").focus();
  }
  function closeDrawer() {
    $("drawer").classList.remove("on");
    $("drawer").inert = true;
    drawerOpen = false;
    if (drawerOpener) drawerOpener.focus();
  }

  /* ---------------- 场景层 ----------------
     进站先站到那块地方上 —— 画面比屏幕大，人在画面里，点谁谁开口。
     点「跟着队伍往下走」才进原来那套剧本。 */
  function enterScene() {
    if (!window.RS_EXPLORE || !RS_EXPLORE.mount) { go(story.start || "a"); return; }
    $("end").classList.add("gone");
    $("deck").style.opacity = "0";
    $("text").innerHTML = "";
    $("choices").innerHTML = "";
    S.ended = false;
    S.busy = false;
    RS_EXPLORE.mount({
      node: node,
      instant: INSTANT,
      cb: {
        onStory: function (pid) { exitScene(); go(pid || story.start || "a"); }
      },
      hooks: { unlock: unlock, blip: A.blip, toast: toast, findNode: findNode }
    });
    var b = $("bStory");
    if (b) b.textContent = node.line === "side" ? "走进这一段 →" : "跟着队伍往下走 →";
  }
  function exitScene() {
    if (window.RS_EXPLORE && RS_EXPLORE.open) { try { RS_EXPLORE.unmount(); } catch (e) {} }
    $("deck").style.opacity = "1";
  }

  /* ---------------- 启动 ---------------- */
  function parseHash() {
    var raw = (location.hash || "").replace(/^#/, "");
    var parts = raw.split("&"), o = { id: parts[0] || "node-01" };
    for (var i = 1; i < parts.length; i++) {
      var kv = parts[i].split("=");
      o[kv[0]] = kv[1] == null ? true : decodeURIComponent(kv[1]);
    }
    return o;
  }

  function boot() {
    var h = parseHash();
    node = findNode(h.id) || NODES[0];
    story = STORY[node.id];
    if (!story) {
      document.body.innerHTML = '<p style="color:#fff;padding:40px;font-family:sans-serif">这一站还没有写。</p>';
      return;
    }

    var q = new URLSearchParams(location.search);
    if (q.get("from")) fromUrl = q.get("from");
    INSTANT = q.get("t") === "0";

    document.title = node.short + " · 长征一条路的来处";
    $("hTitle").textContent = node.short;
    $("hPlace").textContent = node.place;

    var tint = node.grade && node.grade.tint;
    if (tint) {
      $("tint").style.background = "rgb(" + tint[0] + "," + tint[1] + "," + tint[2] + ")";
      $("tint").style.opacity = (node.grade.tintA || 0.2) * 1.4;
    }

    var panorama = (window.RS_SPACE || {})[node.id];
    setBg(0, false, panorama && panorama.img);

    var isSide = node.line === "side";
    $("iKicker").textContent = isSide
      ? "另 外 一 处　·　不 在 队 伍 的 路 上"
      : "第 " + node.seq + " 站　·　主 线";
    $("iTitle").textContent = node.short;
    $("iMeta").textContent = (story.stamp || node.stamp || "") + "　·　" + (story.place || node.place || "");
    $("iLead").innerHTML = story.lead || "";
    $("iFoot").innerHTML = (story.foot || "") +
      "<br>这一视角属于当年队伍中一名没有留下姓名的战士 —— 本项目不为他编造姓名。" +
      (node.noMate ? "" : "<br>跟着你的那个小鬼同样是叙述装置，不是史料人物。");
    paintWalk();

    S.max = story.stamina || 8;
    S.stam = S.max;
    S.clock = story.clock0 || node.stamp || "";
    paintStam(); paintFlags(); paintClock(); paintArch();
    $("bSnd").textContent = A.on ? "声音" : "静音";
    if (fromUrl) $("bExit").textContent = "回到这一站";

    $("iGo").addEventListener("click", function () {
      A.init(); A.set(node.amb || {}); A.resume();
      $("intro").classList.add("gone");
      enterScene();
    });
    $("bStory").addEventListener("click", function () {
      if (S.ended || S.path.length) resetRun();
      A.resume(); A.blip("step", 0.7);
      exitScene();
      go(story.start || "a");
    });

    $("bArch").addEventListener("click", openDrawer);
    $("drClose").addEventListener("click", closeDrawer);
    $("drBody").addEventListener("toggle", function (e) {
      var detail = e.target;
      if (!drawerOpen || !detail.open || !detail.hasAttribute("data-archive-note")) return;
      unlock(Number(detail.dataset.archiveNote));
      if (window.RS_EXPLORE && RS_EXPLORE.open && RS_EXPLORE.refreshArchive) {
        RS_EXPLORE.refreshArchive();
      }
      paintDrawerStatus();
    }, true);
    $("drBody").addEventListener("click", function (e) {
      var choice = e.target.closest("[data-archive-cast]");
      if (!choice || !window.RS_EXPLORE || !RS_EXPLORE.open || !RS_EXPLORE.openArchiveCast) return;
      closeDrawer();
      RS_EXPLORE.openArchiveCast(Number(choice.dataset.archiveCast));
    });
    $("drawer").addEventListener("keydown", function (e) {
      if (e.key !== "Escape") e.stopPropagation();
    });
    $("bSnd").addEventListener("click", function () { $("bSnd").textContent = A.toggle() ? "声音" : "静音"; });
    $("bExit").addEventListener("click", leave);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawerOpen) { closeDrawer(); e.stopPropagation(); return; }
      if (drawerOpen) return;
      if (document.body.classList.contains("explore")) return;
      if (e.key === " " || e.key === "Enter") {
        if (!S.typed && S.pid) { skipTyping(); e.preventDefault(); }
        return;
      }
      var n = parseInt(e.key, 10);
      if (n >= 1 && n <= 9) {
        var btns = $("choices").querySelectorAll(".ch:not(.lock)");
        if (btns[n - 1]) { btns[n - 1].click(); e.preventDefault(); }
      }
    });

    // 深链：play.html#node-07&go=c 直接落到某一段（自检用）
    if (h.go) {
      $("intro").classList.add("gone");
      go(h.go);
    } else {
      $("intro").classList.remove("gone");
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
