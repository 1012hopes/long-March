/* =========================================================
   长征一条路的来处 · 录制层（把「走这一段」录成 mp4）
   ---------------------------------------------------------
   为什么不在页面里直接录 DOM：
     MediaRecorder 只能吃 canvas 流，字幕/黑场/夜色都是 DOM，
     录出来会是一段没有字、没有暗下来的裸画面。
   为什么不用截屏流：
     截屏拿不到声音，而这段路一半的分量在那口气和脚下的响。
   所以这里做的事很笨但可控：**自己合成一帧**——
     把 WebGL 画布画进来，再照 DOM 的当前状态把夜色、黑场、
     暗角、字幕依次抟上去，生成一条 canvas 流；
     声音从行军层那条 master 上分一路出来，一起塞进 MediaRecorder。
     结果是 1920×1080 的 H.264 + AAC，直接落在 video/ 下。

   DOM 上的每个量都**读实时值**（opacity / textContent），不自己算时间轴 ——
   字幕的 1.15 秒淡入、黑场的缓入缓出都在 CSS 里，重算一遍必然对不上。

   只在 ?rec=1 时由 scripts/rec-march.mjs 调起来；平时不加载。
   ========================================================= */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var cv = null, ctx = null, mr = null, raf = 0;
  var W = 0, H = 0, sc = 1, capK = 1.18, name = 'out.mp4';
  var started = 0, stopped = false, recOn = false;
  var chunks = 0;

  function post(blob, mode) {
    var url = '/__rec?name=' + encodeURIComponent(name) + (mode ? '&mode=' + mode : '');
    return fetch(url, { method: 'POST', body: blob || '' }).catch(function () {});
  }

  /* ---------- 字幕 ----------
     CSS 是 left/right 8vw、bottom 13vh、17px/1.95、字距 .10em；
     日期那行 12px、字距 .34em、不透明度 .62、下边距 .85em。
     画布按窗口宽度等比换算，所以在任何分辨率下版式一致。 */
  function drawCap(capEl) {
    if (!capEl) return;
    var op = parseFloat(getComputedStyle(capEl).opacity);
    if (!(op > 0.008)) return;
    var b = capEl.querySelector('b');
    var date = b ? b.textContent : '';
    var text = (capEl.textContent || '').slice(date.length);
    if (!text && !date) return;

    var fs = 17 * sc * capK, lh = fs * 1.95;
    var dfs = 12 * sc * capK, dlh = dfs * 1.95, dmg = dfs * 0.85;
    var bottom = H - 0.13 * H;
    var maxW = W - 2 * (0.08 * W);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e9e4d9';
    ctx.shadowColor = 'rgba(0,0,0,.95)';
    ctx.shadowBlur = 22 * sc;
    ctx.shadowOffsetY = 2 * sc;

    if (text) {
      ctx.globalAlpha = op;
      ctx.font = '400 ' + fs.toFixed(1) + 'px "Noto Serif SC","Songti SC",serif';
      ctx.letterSpacing = (fs * 0.10).toFixed(2) + 'px';
      ctx.fillText(text, W / 2, bottom - lh / 2, maxW);
    }
    if (date) {
      ctx.globalAlpha = op * 0.62;
      ctx.font = '400 ' + dfs.toFixed(1) + 'px "Noto Serif SC","Songti SC",serif';
      ctx.letterSpacing = (dfs * 0.34).toFixed(2) + 'px';
      ctx.fillText(date, W / 2, bottom - lh - dmg - dlh / 2, maxW);
    }
    ctx.restore();
  }

  /* ---------- 一帧 ----------
     DOM 里的层序是 shade → glass → vig → cap，这里照抄。 */
  function paint() {
    var gl = document.querySelector('canvas');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    if (gl && gl.width) {
      ctx.fillStyle = '#06080c';
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(gl, 0, 0, W, H);
    } else {
      ctx.fillStyle = '#06080c';
      ctx.fillRect(0, 0, W, H);
    }

    var sh = $('marchShade');
    var gls = $('marchGlass');
    var vg = 0;
    if (sh) vg = parseFloat(sh.style.opacity || '0');
    if (vg > 0.002) {
      ctx.globalAlpha = Math.min(1, vg);
      ctx.fillStyle = '#06080c';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (gls) {
      var n = parseFloat(gls.style.opacity || '0');
      if (n > 0.002) {
        ctx.globalAlpha = Math.min(1, n);
        ctx.fillStyle = '#050912';
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }
    }

    /* 暗角：CSS 是 inset 0 0 16vmin rgba(0,0,0,.26) 的 box-shadow，
       这里用一圈从中心往外的径向渐变近似 —— 中段全透明，到边缘才压。 */
    var m = Math.min(W, H);
    if (!paint._g || paint._gw !== W) {
      var g = ctx.createRadialGradient(W / 2, H / 2, m * 0.30, W / 2, H / 2, m * 0.86);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,.34)');
      paint._g = g; paint._gw = W;
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = paint._g;
    ctx.fillRect(0, 0, W, H);

    drawCap($('marchCap'));
    ctx.restore();
  }

  function loop() {
    if (!recOn) return;
    raf = requestAnimationFrame(loop);
    paint();
    /* 等到行军真的起步了再开录：那之前画面还停在站点上，
       录进去就是一段站着不动的尾巴。 */
    if (!mr && window.RS_MARCH && RS_MARCH.running) begin();
  }

  function begin() {
    var stream = cv.captureStream(30);
    var a = (window.RS_REC && RS_REC._src) || null;
    if (a) {
      try {
        a.dest.stream.getAudioTracks().forEach(function (t) { stream.addTrack(t); });
      } catch (e) {}
    }
    var type = 'video/mp4;codecs=avc1.4D401F,mp4a.40.2';
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported(type)) type = 'video/webm;codecs=vp9,opus';
    try {
      mr = new MediaRecorder(stream, {
        mimeType: type, videoBitsPerSecond: 9000000, audioBitsPerSecond: 160000
      });
    } catch (e) {
      mr = new MediaRecorder(stream, { mimeType: 'video/webm' });
    }
    mr.ondataavailable = function (e) {
      if (e.data && e.data.size) { chunks++; post(e.data); }
    };
    mr.onstop = function () {
      post('', 'end');
      stopped = true;
    };
    mr.start(1000);
    started = performance.now();
  }

  function finish() {
    if (!mr || mr.state === 'inactive') return;
    try { mr.stop(); } catch (e) {}
    if (raf) cancelAnimationFrame(raf);
  }

  window.RS_REC = {
    active: false,
    holdEnd: false,
    _src: null,

    /* 行军层建好 master 之后回调过来，这里再分出一路音频。 */
    gotAudio: function (master, ac) {
      if (!master || !ac || !ac.createMediaStreamDestination) return;
      try {
        var dest = ac.createMediaStreamDestination();
        master.connect(dest);
        this._src = { dest: dest };
      } catch (e) {}
    },

    start: function (opts) {
      opts = opts || {};
      name = opts.name || 'out.mp4';
      W = opts.w || 1920;
      H = opts.h || 1080;
      sc = W / Math.max(1, window.innerWidth);
      if (!cv) {
        cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        cv.id = 'recCanvas';
        ctx = cv.getContext('2d', { alpha: false });
      }
      this.active = true;
      this.holdEnd = true;
      recOn = true;
      stopped = false;
      post('', 'reset');
      loop();
      return true;
    },

    /* 段落收尾：把最后那一秒黑留完再停，否则片尾是硬切。
       片子的最后一帧应该是黑的，不是"停在半空"。 */
    finishSoon: function () {
      if (this._fin) return;
      this._fin = 1;
      setTimeout(finish, 1500);
    },

    /* 行军层收尾时还会问一句：还有没有别的事要干完 */
    get state() {      return {
        on: recOn, rec: mr ? mr.state : null, chunks: chunks,
        t: started ? +((performance.now() - started) / 1000).toFixed(1) : 0,
        done: stopped, size: [W, H]
      };
    },

    stop: finish
  };
})();
