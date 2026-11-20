/* =========================================================
   长征一条路的来处 · 成片层（segment as film）
   ---------------------------------------------------------
   行军段可以是实时算的，也可以是录好的片子。
   录好的片子更好看：现在这台机器上实时版能跑，但换一台低端机就会掉帧、
   而这一段全靠「脚步稳不稳」撑住。所以把整段路先拍成 mp4，
   运行时只是放片。

   顺带把「岔路」做进去了 —— 这是实时版做不出、而片子最擅长的东西：
     · 放到某个时间点**停住**（video.pause()，画面就定格在那一帧）
     · 选项浮上来，人做决定
     · 每一个选项接**另一条片子**
   停住不是"暂停播放"这种技术动作，是叙事上的：走到这里，你得想一下。

   依赖：无（自己建 DOM）。行军层会在有片子的站优先走这里。
   ========================================================= */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  /* 片子放在 experience/video/，相对 play.html 就是 video/ ——
     不是 real/video/（real 只放脚本）。写错这一层，浏览器会安静地
     停在「第 0 秒、paused」，看起来像播放器坏了，其实是 404。 */
  var DIR = 'video/';

  /* ---------------- 片目录 ----------------
     一条 leg 可以是「一段到底」，也可以是「播到 at 秒停住，选完之后接哪一条」。
     at 要落在**没有字幕**的空档上（字幕已经烧进片子了，再叠一层会打架）。 */
  var FILM = {
    'node-00': {
      src: 'leg-node-00.mp4',
      to: 'node-01'
    },
    'node-01': {
      src: 'leg-node-01.mp4',
      to: 'node-01b',
      /* 36.8 秒：字幕「不许点火。不许说话。」刚淡掉，下一句还没出来 ——
         画面干净，停在这里才不像截了一张带字的图。 */
      stop: 36.8,
      q: '铁丝网就在前面十几步。夜里的风把草吹得响。',
      opts: [
        { t: '剪开它。第一个过去。', clip: 'br-wire-a.mp4', note: '静默，靠手' },
        { t: '往西绕。多走半天。', clip: 'br-wire-b.mp4', note: '慢，但人齐' }
      ]
    },
    'node-01b': {
      src: 'leg-node-01b.mp4',
      to: 'node-02'
    }
  };

  var root = null, vid = null, veil = null, qbox = null;
  var onEndCb = null, cur = null, stopped = false, actx = null;

  function inject() {
    if ($('clipStyle')) return;
    var s = document.createElement('style');
    s.id = 'clipStyle';
    s.textContent = [
      '#clipRoot{position:fixed;inset:0;z-index:72;background:#000;opacity:0;',
      'pointer-events:none;transition:opacity .55s linear}',
      '#clipRoot.on{opacity:1;pointer-events:auto}',
      '#clipV{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}',
      '#clipVeil{position:absolute;inset:0;background:#06080c;opacity:0;pointer-events:none;',
      'transition:opacity .5s linear}',
      /* 停住那一刻的选项：压得很低，像从画面下面浮上来 */
      /* 停住那一刻的选项：底下压一层从下往上的黑，像片尾字幕那种压法 ——
         不然亮一点的镜头里，字是浮在石头上的。 */
      '#clipQ{position:absolute;left:0;right:0;bottom:0;padding:26vh 6vw 11vh;',
      'background:linear-gradient(to top,rgba(4,6,10,.94) 0%,rgba(4,6,10,.78) 40%,rgba(4,6,10,0) 100%);',
      'opacity:0;transform:translateY(14px);transition:opacity .8s ease,transform .8s ease;',
      'pointer-events:none}',
      '#clipQ.on{opacity:1;transform:none;pointer-events:auto}',
      '#clipQ .qq{max-width:52ch;margin:0 auto 30px;text-align:center;color:rgba(233,228,217,.86);',
      'font:400 15px/1.95 Noto Serif SC,Songti SC,serif;letter-spacing:.10em;',
      'text-shadow:0 2px 18px rgba(0,0,0,.95),0 0 3px rgba(0,0,0,.8)}',
      '#clipQ .opts{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}',
      '#clipQ button{appearance:none;cursor:pointer;min-width:230px;max-width:340px;',
      'display:flex;align-items:flex-start;gap:12px;text-align:left;',
      'padding:15px 20px;border:1px solid rgba(233,228,217,.24);border-radius:2px;',
      'background:rgba(9,11,15,.72);backdrop-filter:blur(3px);color:#e9e4d9;',
      'font:400 15px/1.6 Noto Serif SC,Songti SC,serif;letter-spacing:.05em;',
      'transition:border-color .35s,background .35s,transform .35s}',
      '#clipQ button:hover{border-color:rgba(233,228,217,.7);background:rgba(9,11,15,.88);transform:translateY(-2px)}',
      '#clipQ button .n{opacity:.42;font-size:12px;line-height:1.9;letter-spacing:.2em;flex:0 0 auto}',
      '#clipQ button em{display:block;font-style:normal;font-size:12px;opacity:.5;',
      'letter-spacing:.16em;margin-top:6px}',
      'body.clipping #deck,body.clipping #hint,body.clipping #spots,body.clipping #edgeL,',
      'body.clipping #edgeR,body.clipping #enc,body.clipping #toast,body.clipping #achPop,',
      'body.clipping #hud,body.clipping #marchBtn,body.clipping #marchRoot{',
      'opacity:0!important;visibility:hidden!important;pointer-events:none!important}'
    ].join('');
    document.head.appendChild(s);
  }

  function build() {
    if ($('clipRoot')) { root = $('clipRoot'); vid = $('clipV'); veil = $('clipVeil'); qbox = $('clipQ'); return; }
    inject();
    root = document.createElement('div');
    root.id = 'clipRoot';
    root.innerHTML =
      '<video id="clipV" playsinline preload="auto"></video>' +
      '<div id="clipVeil"></div>' +
      '<div id="clipQ"></div>';
    document.body.appendChild(root);
    vid = $('clipV'); veil = $('clipVeil'); qbox = $('clipQ');
  }

  function veilTo(v, ms) {
    if (!veil) return;
    veil.style.transition = 'opacity ' + (ms || 500) + 'ms linear';
    veil.style.opacity = String(v);
  }

  function show(on) {
    if (!root) return;
    if (on) document.body.classList.add('clipping');
    else document.body.classList.remove('clipping');
    root.classList.toggle('on', !!on);
  }

  function ask(q, opts, cb) {
    if (!qbox) return;
    var html = (q ? '<div class="qq">' + q + '</div>' : '') + '<div class="opts">';
    opts.forEach(function (o, i) {
      html += '<button type="button" data-i="' + i + '">' +
        '<span class="n">' + (i + 1) + '</span>' +
        '<span><span class="t">' + o.t + '</span>' +
        (o.note ? '<em>' + o.note + '</em>' : '') + '</span>' +
        '</button>';
    });
    html += '</div>';
    qbox.innerHTML = html;
    qbox.classList.add('on');
    var btns = qbox.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        if (stopped) return;
        var k = +this.getAttribute('data-i');
        qbox.classList.remove('on');
        setTimeout(function () { cb(opts[k], k); }, 260);
      });
    }
  }

  /* 换片：黑一下再开，别硬切 */
  function cutTo(src, then) {
    /* 停点那个监听必须撤掉 —— 分支片子比停点长，留着它会在同一个秒数
       再问一遍「剪还是绕」，人会被问第二次。 */
    vid.ontimeupdate = null;
    veilTo(1, 420);
    setTimeout(function () {
      vid.src = DIR + src;
      vid.play().then(function () {
        veilTo(0, 480);
        if (then) then();
      }).catch(function () {
        veilTo(0, 480);
        if (then) then();
      });
    }, 460);
  }

  function armStop(t, opts) {
    var hit = false;
    vid.ontimeupdate = function () {
      if (hit || stopped) return;
      if (vid.currentTime >= t) {
        hit = true;
        vid.pause();
        /* 定住。这一秒起，画面不动了 —— 决定在静止里做。 */
        ask(cur.q, opts, function (o) {
          if (!o || !o.clip) { vid.play(); return; }
          cutTo(o.clip, function () {
            vid.onended = function () {
              veilTo(1, 700);
              setTimeout(function () { finish(); }, 720);
            };
          });
        });
      }
    };
  }

  function finish() {
    if (stopped) return;
    stopped = true;
    var to = (cur && cur.to) || 'node-01';
    if (onEndCb) { try { onEndCb(to); return; } catch (e) {} }
    var qs = location.search || '';
    var url = location.pathname + qs + (qs ? '&' : '?') + 'r=' + Date.now() + '#' + to;
    location.href = url;
  }

  function reset() {
    stopped = false;
    if (!vid) return;
    vid.ontimeupdate = null;
    vid.onended = null;
    vid.pause();
    vid.removeAttribute('src');
    try { vid.load(); } catch (e) {}
  }

  window.RS_CLIP = {
    /* 这一站有没有成片 */
    from: function (id) { return FILM[id] || null; },
    has: function (id) { return !!FILM[id]; },

    /* 放一站。带 stop 的就停在那一秒等人选。 */
    play: function (id, cb) {
      var f = FILM[id];
      if (!f) return false;
      build();
      reset();
      cur = f;
      onEndCb = cb || null;
      show(true);
      veilTo(1, 0);
      vid.src = DIR + f.src;
      vid.onerror = function () {
        /* 片子取不到的时候别停在黑屏上什么都不说 */
        console.warn('RS_CLIP: 取不到片子 ' + vid.src);
      };
      vid.onended = function () {
        veilTo(1, 700);
        setTimeout(finish, 720);
      };
      var go = function () {
        veilTo(0, 600);
        if (f.stop && f.opts) armStop(f.stop, f.opts);
      };
      vid.play().then(go).catch(function (e) {
        console.warn('RS_CLIP: play 被拒 ' + (e && e.name) + ' ' + (e && e.message));
        go();
      });
      return true;
    },

    stop: function () {
      stopped = true;
      if (vid) vid.pause();
      show(false);
    },

    get state() {
      return {
        on: !!(root && root.classList.contains('on')),
        src: vid ? (vid.currentSrc || '').split('/').pop() : '',
        t: vid ? +vid.currentTime.toFixed(2) : 0,
        paused: vid ? !!vid.paused : null,
        asking: !!(qbox && qbox.classList.contains('on')),
        opts: qbox ? qbox.querySelectorAll('button').length : 0
      };
    }
  };
})();
