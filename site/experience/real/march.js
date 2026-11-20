/* =========================================================
   长征一条路的来处 · 行军段（第一视角 · 走一段路）
   ---------------------------------------------------------
   问题不是「画得不像」，是「没走过」。
   31 站是 31 扇窗，站进去能转圈，但站与站之间什么都没有 ——
   于是人不觉得走了一万里，只觉得看了三十几张明信片。

   这一层补的就是「之间」：从一站走到下一站，人一直在画面里没动过。

   ---- 为什么不建 3D 地形 ----
   建不了，也不该建。31 站全建一遍，成本是现在的几十倍，人物一动就露馅。
   而人对「我在往前走」的判据其实很粗糙：
     · 脚下的节奏 —— 一步一步，每一脚落地身子沉一下
     · 自己的呼吸 —— 走久了会粗，停下来会缓
     · 环境的渐进 —— 光在暗下去，水声在近起来
     · 视线在漂 —— 走路时没人盯着正前方，头会跟着路左右摆
   这四样给足，画面就算只是缓缓横移，人也信了。所以这里做的是**声音和身体**，
   不是地形。

   ---- 圆筒的诚实之处 ----
   一圈全景没有视差，横移它对它的物理意义是「原地转身」，不是「前进」。
   所以横移量给得很小（整段约 30°），它承担的是「边走边摆头」，
   不承担「走了多远」。多远由字幕和天色说 —— 那是它擅长的。

   ---- 时间线 ----
   现在有三段，接成一条：
     node-00 → node-01    94 秒   瑞金出发 → 于都河。白天到夜，七天。
     node-01 → node-01b  100 秒   于都河 → 第一道封锁线。全夜，最静的一段。
     node-01b → node-02  118 秒   封锁线 → 湘江。三十七天，两明两暗。
   走完一段落在下一站，那一站又挂着下一段的按钮 —— 路是一节一节接的。

   字幕只写能确定的日期和事实（10.10 出发、10.17 于都河、10.21 第一道
   封锁线、11.27 湘江），中间的里程不报 —— 编不出准确数字，就不编。
   「走了七天」「走了三十多天」是能算出来的；「过了江队伍少了大半」
   也是能算出来的，而且已是史实里最克制的一种说法。

   依赖：RS_PANO（build / setCam / setShift / setLift）、RS_SPACE
   ========================================================= */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  /* ---------------- 段落表 ----------------
     beats: [秒, 类型, 值]
       cap   字幕（空字符串 = 淡出）
       walk  1 起步 / 0 停步
       pace  步频（步/秒）。1.72 是平路常态，2.0 上下是被催着赶路
       hush  静默（0–1）：把风和远处的队伍压下去，过封锁线时用
       wire  铁丝：'rub' 钳口在磨，'snip' 剪断
       water 水声强度（0–1），到了河边要涨起来
       fade  黑场**不透明度**（1 = 全黑，0 = 清）。写小数就是半暗，
             用来遮一次切图 —— 换图是硬切，亮着切一眼就假。
       night 入夜程度（0–0.6）：叠一层冷暗，让「天黑了」这句字幕有着落
       swap  换到段落终点那一站的全景（值不用）
       end   收尾（值不用）
     同一秒可以挂好几条（按数组顺序触发）。开场要入夜的段子就把
     night 也写成 0.0 —— 否则前几秒会先亮一下再暗下去。
     drift 整段走下来图面横移多少（u）。0.085 约 30°。 */
  var LEGS = {
    'node-00>node-01': {
      from: 'node-00',
      to: 'node-01',
      len: 94,
      drift: 0.085,
      beats: [
        [0.0, 'fade', 1],
        [0.7, 'cap', '1934.10.10|从瑞金出发。'],
        [2.4, 'fade', 0],
        [3.2, 'walk', 1],
        [8.0, 'cap', ''],
        [12.0, 'cap', '队伍从村口出去，一路往西。'],
        [19.0, 'cap', ''],
        [24.0, 'cap', '脚下的石板换成了土，土又换成了碎石。'],
        [31.0, 'walk', 0],
        [31.4, 'cap', '后面有人喊了一声，队伍停了一下。'],
        [36.0, 'walk', 1],
        [37.0, 'cap', ''],
        [43.0, 'cap', '前面传下来一句话：跟上，别掉队。'],
        [50.0, 'cap', ''],
        [52.0, 'night', 0.26],
        [54.0, 'cap', '天黑了。就跟着前面那个人的背包走。'],
        [61.0, 'cap', ''],
        [65.0, 'water', 0.20],
        [66.0, 'cap', '空气湿了。'],
        [71.0, 'water', 0.38],
        [72.0, 'cap', '能听见水声。'],
        [76.5, 'cap', '走了七天。'],
        [78.0, 'walk', 0],
        [79.0, 'cap', ''],
        [79.6, 'fade', 0.90],
        [80.4, 'swap', 0],
        [80.5, 'water', 0.55],
        /* 换过来的于都夜渡本身就是夜里，那层冷暗要撤掉，否则叠成一片死黑 */
        [80.6, 'night', 0],
        [81.4, 'fade', 0.08],
        [82.0, 'cap', '1934.10.17|到了于都河。门板铺在船上，一座一座连过去。'],
        [89.0, 'cap', ''],
        [90.0, 'fade', 1],
        [94.0, 'end', 0]
      ]
    },

    /* 于都河 → 第一道封锁线。这一段的戏不在「走了多远」，在「有多静」：
       夜里不许点火、不许说话，前面一个人蹲下去剪铁丝。
       所以它几乎全是停着的 —— 走的时间不到一半，剩下全是脚步收住、
       呼吸放慢、环境声被压下去。锁链上那几声金属，是全段唯一的事件。 */
    'node-01>node-01b': {
      from: 'node-01',
      to: 'node-01b',
      scene: 'leg-road',
      len: 100,
      drift: 0.070,
      beats: [
        [0.0, 'fade', 1],
        [0.0, 'night', 0.30],
        [0.6, 'cap', '1934.10.17|渡完了。往西。'],
        [2.8, 'fade', 0],
        [3.4, 'walk', 1],
        [10.0, 'cap', ''],
        [13.0, 'cap', '走了三天。前面是信丰。'],
        [20.0, 'cap', ''],
        [24.0, 'cap', '天快亮的时候，队伍慢下来。'],
        [28.5, 'walk', 0],
        [29.0, 'cap', '不许点火。不许说话。'],
        [35.5, 'cap', ''],
        [37.0, 'hush', 1],
        [38.0, 'cap', '前面传回来：都蹲下。铁丝网。'],
        [39.6, 'wire', 'rub'],
        [41.2, 'wire', 'snip'],
        [42.8, 'wire', 'rub'],
        [44.2, 'wire', 'snip'],
        [45.6, 'wire', 'snip'],
        [47.0, 'cap', ''],
        [48.5, 'cap', '钳子咬住铁丝的声音，很近。'],
        [54.0, 'cap', ''],
        [56.0, 'hush', 0],
        [57.0, 'walk', 1],
        [57.5, 'cap', '爬过去。'],
        [61.0, 'cap', ''],
        [65.0, 'cap', '回头看，已经没有来路了。'],
        [71.0, 'cap', ''],
        [74.0, 'cap', '前面还有一道。'],
        [80.0, 'cap', ''],
        [83.0, 'water', 0.14],
        [85.0, 'walk', 0],
        [86.2, 'cap', '停。'],
        [88.0, 'cap', ''],
        [89.0, 'fade', 0.92],
        [90.0, 'swap', 0],
        [90.1, 'night', 0],
        [91.0, 'fade', 0.08],
        [91.6, 'cap', '1934.10.21|过了第一道封锁线。'],
        [97.0, 'cap', ''],
        [98.0, 'fade', 1],
        [100.0, 'end', 0]
      ]
    },

    /* 封锁线 → 湘江。中间是三十七天，这一段不能说「到了」，只能说「一直在走」。
       做法是把时间压成两段白天两段夜：亮一次、暗一次、再亮一次、再暗一次。
       途中让步频上去又下来（被催、又松），让一句「有人坐下就再没跟上」
       落在最亮的那一帧上 —— 减员这件事，得在看得清的时候发生。 */
    'node-01b>node-02': {
      from: 'node-01b',
      to: 'node-02',
      scene: 'leg-road',
      len: 118,
      drift: 0.090,
      beats: [
        [0.0, 'fade', 1],
        [0.0, 'night', 0.26],
        [0.6, 'cap', '1934.10 下旬|再往西，是湘南。'],
        [2.8, 'fade', 0],
        [3.4, 'walk', 1],
        [10.0, 'cap', ''],
        [13.0, 'cap', '白天走，夜里也走。'],
        [20.0, 'cap', ''],
        [23.0, 'cap', '背包越来越轻。'],
        [29.0, 'cap', ''],
        [32.0, 'night', 0],
        [34.0, 'cap', '天亮了。阴着。'],
        [40.0, 'cap', ''],
        [43.0, 'cap', '有人坐下歇一会儿，就再没跟上。'],
        [50.0, 'cap', ''],
        [53.0, 'pace', 2.0],
        [54.0, 'cap', '前面催得紧。'],
        [60.0, 'cap', ''],
        [63.0, 'pace', 1.72],
        [66.0, 'night', 0.34],
        [67.0, 'cap', '又是夜路。'],
        [73.0, 'cap', ''],
        [76.0, 'cap', '走了三十多天。'],
        [82.0, 'cap', ''],
        [85.0, 'cap', '前面传下来两个字：湘江。'],
        [91.0, 'cap', ''],
        [94.0, 'water', 0.30],
        [95.0, 'cap', '水声。很宽。'],
        [99.0, 'water', 0.55],
        [100.0, 'walk', 0],
        [100.4, 'cap', ''],
        [102.0, 'fade', 0.92],
        [103.0, 'swap', 0],
        [103.1, 'night', 0],
        [104.0, 'fade', 0.06],
        [104.6, 'cap', '1934.11.27|湘江。浮桥断了，水到胸口。'],
        [111.0, 'cap', ''],
        [112.0, 'cap', '过了江，队伍少了大半。'],
        [115.0, 'fade', 1],
        [118.0, 'end', 0]
      ]
    },

    /* ---- 岔路（只用于拍成片，不在站点列表里） ----
       到了铁丝网前，人得选：剪开，还是绕。
       两条路都通到封锁线那一站，但走过去的过程不一样 ——
       这个选择不该只改一行字幕，该改掉接下来这半分钟你看到的东西。
       所以它们各拍一条片子，由 clip.js 在停住那一刻接上。 */
    'wire-a': {
      from: 'wire-a',
      to: 'node-01b',
      scene: 'leg-road',
      len: 48,
      drift: 0.030,
      beats: [
        [0.0, 'fade', 1],
        [0.0, 'night', 0.34],
        [0.6, 'cap', '那一声很轻。轻得像什么都没发生。'],
        [1.4, 'fade', 0],
        [3.0, 'hush', 1],
        [8.0, 'cap', ''],
        [10.0, 'wire', 'rub'],
        [12.0, 'wire', 'snip'],
        [14.0, 'cap', '铁丝分开一条缝，只够一个人侧过去。'],
        [16.5, 'wire', 'rub'],
        [19.0, 'cap', ''],
        [21.0, 'walk', 1],
        [22.0, 'cap', '爬过去。别碰上面那根。'],
        [27.0, 'cap', ''],
        [29.0, 'hush', 0],
        [31.0, 'pace', 1.90],
        [33.0, 'cap', ''],
        [35.0, 'cap', '过去五个人了。'],
        [40.0, 'cap', ''],
        [41.0, 'cap', '回头看，来路已经没有了。'],
        [45.0, 'fade', 1],
        [47.0, 'cap', ''],
        [48.0, 'end', 0]
      ]
    },

    'wire-b': {
      from: 'wire-b',
      to: 'node-01b',
      scene: 'leg-road',
      len: 52,
      drift: 0.055,
      beats: [
        [0.0, 'fade', 1],
        [0.0, 'night', 0.34],
        [0.6, 'cap', '不剪。往西，绕过去。'],
        [1.4, 'fade', 0],
        [3.4, 'walk', 1],
        [9.0, 'cap', ''],
        [11.0, 'cap', '多走半天。谁都没说话。'],
        [17.0, 'cap', ''],
        [19.0, 'night', 0.14],
        [22.0, 'cap', '天快亮了。'],
        [26.0, 'cap', ''],
        [28.0, 'night', 0],
        [30.0, 'pace', 2.00],
        [31.0, 'cap', '绕过那道网，从一片稻田里穿过去。'],
        [37.0, 'cap', ''],
        [39.0, 'cap', '水到小腿。稻茬扎脚。'],
        [44.0, 'cap', ''],
        [46.0, 'fade', 1],
        [49.0, 'cap', ''],
        [52.0, 'end', 0]
      ]
    }
  };

  /* ---------------- 状态 ---------------- */
  var M = {
    leg: null, run: false, T: 0, bi: 0, raf: 0, last: 0,
    walk: 0, walkTo: 0, ph: 0, shift: 0, lift: 0,
    pace: 1.72, paceTo: 1.72,
    hush: 0, hushTo: 0, hushAt: 0,
    shade: 1, shadeTo: 1, water: 0, waterTo: 0, night: 0, nightTo: 0,
    swapped: false, breathAt: 0, breathIv: 0, done: false, skip: false
  };

  var ac = null, master = null, noiseBuf = null;
  var L = {};           /* 音频层 */
  var audioOn = false;

  /* ---------------- DOM ---------------- */
  var root = null, capEl = null, shadeEl = null, glassEl = null, btn = null;

  function inject() {
    if ($('marchStyle')) return;
    var s = document.createElement('style');
    s.id = 'marchStyle';
    s.textContent = [
      '#marchBtn{position:fixed;left:50%;bottom:120px;transform:translateX(-50%);z-index:64;',
      'padding:11px 26px;border:1px solid rgba(233,228,217,.30);border-radius:999px;',
      'background:rgba(10,12,16,.58);color:#e9e4d9;',
      'font:400 13px/1 Noto Serif SC,Songti SC,serif;letter-spacing:.26em;',
      'cursor:pointer;opacity:0;pointer-events:none;transition:opacity .6s,border-color .3s,background .3s}',
      '#marchBtn.on{opacity:1;pointer-events:auto}',
      '#marchBtn:hover{border-color:rgba(233,228,217,.72);background:rgba(10,12,16,.74)}',
      '#marchRoot{position:fixed;inset:0;z-index:70;pointer-events:none;opacity:0;transition:opacity .6s}',
      '#marchRoot.on{opacity:1;pointer-events:auto}',
      '#marchShade{position:absolute;inset:0;background:#06080c;opacity:1;pointer-events:none}',
      '#marchVig{position:absolute;inset:0;pointer-events:none;',
      'box-shadow:inset 0 0 16vmin 0 rgba(0,0,0,.26)}',
      '#marchCap{position:absolute;left:8vw;right:8vw;bottom:13vh;text-align:center;',
      'color:#e9e4d9;font:400 17px/1.95 Noto Serif SC,Songti SC,serif;letter-spacing:.10em;',
      'text-shadow:0 2px 22px rgba(0,0,0,.95),0 0 3px rgba(0,0,0,.8);',
      'opacity:0;transition:opacity 1.15s ease}',
      '#marchCap.on{opacity:1}',
      '#marchCap b{display:block;font-weight:400;font-size:12px;letter-spacing:.34em;',
      'opacity:.62;margin-bottom:.85em}',
      '#marchSkip{position:absolute;right:26px;bottom:20px;color:rgba(233,228,217,.40);',
      'font:400 12px/1 sans-serif;letter-spacing:.22em;cursor:pointer;pointer-events:auto;',
      'padding:8px;transition:color .3s}',
      '#marchSkip:hover{color:rgba(233,228,217,.8)}',
      '#marchGlass{position:absolute;inset:0;pointer-events:none;',
      'background:#050912;opacity:0}',
      /* 行军段要独占画面：场景层卸掉之后，play.html 那几条 UI 会被
         重新点亮（deck 的 opacity 被 unmount 写回 1），它们必须一起压掉 ——
         遮罩只有黑的那几秒是不透明的，其余时候透过去就看见了。 */
      'body.marching #deck,body.marching #hint,body.marching #spots,',
      'body.marching #edgeL,body.marching #edgeR,body.marching #enc,',
      'body.marching #toast,body.marching #achPop,',
      'body.marching #hud{opacity:0!important;visibility:hidden!important;pointer-events:none!important}'
    ].join('');
    document.head.appendChild(s);
  }

  function buildDom() {
    inject();
    if ($('marchRoot')) { root = $('marchRoot'); return; }
    root = document.createElement('div');
    root.id = 'marchRoot';
    root.innerHTML =
      '<div id="marchShade"></div>' +
      '<div id="marchGlass"></div>' +
      '<div id="marchVig"></div>' +
      '<div id="marchCap"></div>' +
      '<div id="marchSkip">跳　过　›</div>';
    document.body.appendChild(root);
    shadeEl = $('marchShade');
    glassEl = $('marchGlass');
    capEl = $('marchCap');
    $('marchSkip').addEventListener('click', function () { endLeg(true); });
  }

  function makeButton(leg) {
    if ($('marchBtn')) { btn = $('marchBtn'); btn.classList.add('on'); return; }
    btn = document.createElement('div');
    btn.id = 'marchBtn';
    btn.textContent = '出　发　·　走 这 一 段';
    btn.addEventListener('click', function () {
      /* 这一段已经拍成片子了就走片子（画面稳、有声音、还能在岔路口停住）。
         没有成片的站还走实时那一套。 */
      var id = leg.from;
      if (window.RS_CLIP && RS_CLIP.has && RS_CLIP.has(id)) {
        btn.classList.remove('on');
        RS_CLIP.play(id);
        return;
      }
      play(leg);
    });
    document.body.appendChild(btn);
    requestAnimationFrame(function () { btn.classList.add('on'); });
  }

  /* ---------------- 合成音 ----------------
     不加载任何音频文件：脚步是噪声打在带通上，呼吸是噪声包在慢包络里，
     远处的队伍是低带通噪声。全是现算的，所以没有素材体积，也不会串味。 */
  function initAudio() {
    if (ac) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ac = new AC(); } catch (e) { return false; }
    /* 有的浏览器就算在手势里创建也先给你一个 suspended，不 resume 就一直是安静的。
       initAudio 只从点击里调，所以这里 resume 是合规的。 */
    if (ac.state === 'suspended' && ac.resume) { try { ac.resume(); } catch (e) {} }

    master = ac.createGain();
    master.gain.value = 0.0001;
    master.connect(ac.destination);
    /* 录制层要在这条总线上分一路出去。放在 master 上而不是 destination 上，
       是为了让录下的音量跟现场听到的是同一个 —— 后面 fadeAudioOut 之类的
       变化也一起录进去。 */
    if (window.RS_REC && RS_REC.gotAudio) {
      try { RS_REC.gotAudio(master, ac); } catch (e) {}
    }

    var n = Math.floor(ac.sampleRate * 2);
    noiseBuf = ac.createBuffer(1, n, ac.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;

    function layer(type, f, q) {
      var src = ac.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      var flt = ac.createBiquadFilter();
      flt.type = type;
      flt.frequency.value = f;
      flt.Q.value = q;
      var g = ac.createGain();
      g.gain.value = 0.0001;
      src.connect(flt); flt.connect(g); g.connect(master);
      src.start(0);
      return { src: src, flt: flt, g: g };
    }

    /* 风：低通，很闷；队伍：中低带通，像隔着几十米的人声嗡；水：中高带通 */
    L.wind = layer('lowpass', 310, 0.7);
    L.murmur = layer('bandpass', 430, 1.6);
    L.water = layer('bandpass', 1050, 0.6);
    L.breath = layer('bandpass', 660, 1.0);

    /* 风不能是死的：一条 0.07Hz 的慢摆让它一呼一吸 */
    var lfo = ac.createOscillator(), lg = ac.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.07;
    lg.gain.value = 0.022;
    lfo.connect(lg); lg.connect(L.wind.g.gain);
    lfo.start();

    audioOn = true;
    var t = ac.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(0.0001, t);
    master.gain.linearRampToValueAtTime(0.82, t + 2.4);
    return true;
  }

  function setLv(l, v, tc) {
    if (!l || !ac) return;
    l.g.gain.setTargetAtTime(Math.max(0.0001, v), ac.currentTime, tc || 0.9);
  }

  /* 一脚踩下去：噪声爆（鞋底擦地）+ 一声低频（脚跟磕在土上）。
     两次的声像左右分开 —— 不然两只脚像在原地蹦。 */
  function step(vol) {
    if (!ac || !audioOn) return;
    var t = ac.currentTime + 0.012;
    var s = ac.createBufferSource();
    s.buffer = noiseBuf;
    s.playbackRate.value = 0.82 + Math.random() * 0.36;

    var f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 430 + Math.random() * 460;
    f.Q.value = 1.05;

    var g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.105);

    var out = g;
    if (ac.createStereoPanner) {
      var p = ac.createStereoPanner();
      p.pan.value = (Math.random() < 0.5 ? -1 : 1) * 0.17;
      g.connect(p); out = p;
    }
    s.connect(f); f.connect(g); out.connect(master);
    s.start(t, Math.random() * 1.2, 0.17);

    var o = ac.createOscillator(), og = ac.createGain();
    o.type = 'sine';
    o.frequency.value = 66 + Math.random() * 24;
    og.gain.setValueAtTime(0.0001, t);
    og.gain.linearRampToValueAtTime(vol * 0.42, t + 0.008);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.135);
    o.connect(og); og.connect(master);
    o.start(t); o.stop(t + 0.16);
  }

  /* 一次呼吸。走久了要粗、要短；停下来要长、要轻。
     包络挂在一个常驻的噪声源上，所以它是「一口气」，不是「一下」。 */
  function breath(hard) {
    if (!ac || !audioOn || !L.breath) return;
    var t = ac.currentTime;
    var g = L.breath.g.gain;
    var peak = hard ? 0.085 : 0.042;
    var inD = hard ? 0.52 : 0.78;
    var outD = hard ? 0.46 : 0.86;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.0001, t);
    g.linearRampToValueAtTime(peak, t + inD);
    g.linearRampToValueAtTime(peak * 0.42, t + inD + outD * 0.55);
    g.linearRampToValueAtTime(0.0001, t + inD + outD);
  }

  /* 铁丝网。两件事要分开做：
       rub  钳口咬住铁丝、来回磨 —— 一段很细的高频摩擦，声音小到像呼吸
       snip 剪断 —— 一个更短的爆，加一声 1.5kHz 的金属余音
     真实里这两个声音都极轻（夜里的封锁线没人敢弄响），
     所以音量比脚步还低；它不是「音效」，是让人相信前面真蹲着一个人在干活。 */
  function wire(what) {
    if (!ac || !audioOn) return;
    var t = ac.currentTime + 0.012;
    var s = ac.createBufferSource();
    s.buffer = noiseBuf;
    s.playbackRate.value = 1.5 + Math.random() * 0.5;

    var f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = (what === 'snip' ? 2700 : 1900) + Math.random() * 1200;
    f.Q.value = what === 'snip' ? 5.5 : 8.0;

    var g = ac.createGain();
    var peak = what === 'snip' ? 0.075 : 0.030;
    var dur = what === 'snip' ? 0.13 : 0.34;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + (what === 'snip' ? 0.006 : 0.12));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    var out = g;
    if (ac.createStereoPanner) {
      var p = ac.createStereoPanner();
      p.pan.value = -0.24;
      g.connect(p); out = p;
    }
    s.connect(f); f.connect(g); out.connect(master);
    s.start(t, Math.random() * 1.1, dur + 0.08);

    /* 剪断才有那一下金属的「铮」。摩擦没有。 */
    if (what === 'snip') {
      var o = ac.createOscillator(), og = ac.createGain();
      o.type = 'triangle';
      o.frequency.value = 1480 + Math.random() * 460;
      og.gain.setValueAtTime(0.0001, t + 0.004);
      og.gain.linearRampToValueAtTime(0.030, t + 0.010);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.30);
      o.connect(og); og.connect(master);
      o.start(t + 0.004); o.stop(t + 0.34);
    }
  }

  /* ---------------- 时间线 ---------------- */
  function cap(txt) {
    if (!capEl) return;
    if (!txt) { capEl.classList.remove('on'); return; }
    var p = txt.split('|');
    capEl.innerHTML = p.length > 1
      ? '<b>' + p[0] + '</b>' + p[1]
      : '<b></b>' + p[0];
    capEl.classList.add('on');
  }

  function fire(b) {
    var kind = b[1], v = b[2];
    if (kind === 'cap') cap(v);
    else if (kind === 'walk') M.walkTo = v ? 1 : 0;
    else if (kind === 'pace') M.paceTo = +v;
    else if (kind === 'hush') M.hushTo = +v;
    else if (kind === 'wire') wire(v);
    else if (kind === 'fade') M.shadeTo = +v;
    else if (kind === 'night') M.nightTo = +v;
    else if (kind === 'water') M.waterTo = v;
    else if (kind === 'swap') swapTo();
    else if (kind === 'end') endLeg(false);
  }

  /* 走到段落终点那一站。这一步必须藏在黑里（beats 里前面给了 0.9 的遮罩）：
     换图是硬切，没有过渡，亮着切就是一眼假。
     换完要把横移和眼位清零 —— 那是一段新地方，不该接着上一段的位移。 */
  function swapTo() {
    if (M.swapped || !M.leg) return;
    var sp = (window.RS_SPACE || {})[M.leg.to];
    if (!sp || !window.RS_PANO) return;
    M.swapped = true;
    try { RS_PANO.build(sp); } catch (e) {}
    RS_PANO.setCam(0, -6, 1);
    RS_PANO.setShift(0, 0);
    RS_PANO.setLift(0);
    M.shift = 0; M.lift = 0; M.ph = 0;
  }

  /* ---------------- 每帧 ---------------- */
  function tick(ts) {
    if (!M.run) return;
    M.raf = requestAnimationFrame(tick);
    if (!M.last) M.last = ts;
    var dt = (ts - M.last) / 1000;
    M.last = ts;
    if (dt > 0.25) dt = 0.25;
    M.T += dt;

    /* 走 / 停：不是开关，是慢慢加上去的 —— 人起步和收步都有个过程 */
    M.walk += (M.walkTo - M.walk) * Math.min(1, dt * 2.6);

    /* 步频。1.72 步/秒是平路的常态；赶路时到 2.0 上下，
       人不是突然变快的，是被前面催着一点点加起来的。 */
    M.pace += (M.paceTo - M.pace) * Math.min(1, dt * 1.1);

    /* 步频 1.72 步/秒。每跨过一个正弦周期踩一脚。 */
    if (M.walk > 0.03) {
      var prev = Math.sin(M.ph);
      M.ph += dt * Math.PI * 2 * M.pace;
      var cur = Math.sin(M.ph);
      if (prev <= 0 && cur > 0) {
        step(0.20 + Math.random() * 0.06);
        if (Math.random() < 0.16) step(0.11);   /* 偶尔有人踩在同一拍上 */
      }
      M.lift = Math.sin(M.ph) * 2.5 * M.walk;
    } else {
      M.lift += (0 - M.lift) * Math.min(1, dt * 5);
    }

    /* 呼吸：走得快就急，停下来就缓。默认跟着步频走，不另外配。 */
    var iv = M.breathIv > 0 ? M.breathIv
           : (M.walkTo > 0.5 ? 2.5 * (1.72 / Math.max(1.2, M.pace)) : 4.2);
    if (M.T - M.breathAt > iv) {
      M.breathAt = M.T;
      breath(M.walkTo > 0.5);
    }

    /* 横移：只在走的时候往前推，停就停住 —— 停着还在流，一眼假 */
    var leg = M.leg;
    if (M.walk > 0.03) {
      M.shift += (leg.drift / (leg.len * 0.72)) * dt * M.walk;
    }

    M.shade += (M.shadeTo - M.shade) * Math.min(1, dt * 2.2);
    if (shadeEl) shadeEl.style.opacity = M.shade.toFixed(3);

    /* 入夜：不是把画面调暗一点点，是叠一层冷 —— 天黑了这句话得有东西接着 */
    M.night += (M.nightTo - M.night) * Math.min(1, dt * 0.42);
    if (glassEl) glassEl.style.opacity = M.night.toFixed(3);

    var audioDirty = false;
    if (M.water !== M.waterTo) {
      M.water += (M.waterTo - M.water) * Math.min(1, dt * 0.55);
      setLv(L.water, M.water * 0.16, 0.7);
      audioDirty = true;
    }

    /* 静默：过封锁线的时候连风都得压下去 —— 环境声一大，
       「不许出声」那句字幕就落空了。只在变化时重设，不每帧都调。 */
    M.hush += (M.hushTo - M.hush) * Math.min(1, dt * 0.85);
    if (Math.abs(M.hush - M.hushAt) > 0.012) { M.hushAt = M.hush; audioDirty = true; }
    if (audioDirty) {
      var hk = 1 - M.hush * 0.74;
      setLv(L.wind, 0.030 * hk, 0.9);
      setLv(L.murmur, (0.010 + M.water * 0.016) * hk, 1.2);
    }

    /* 视线：走路时头会跟着路左右摆，不是盯着一点。幅度小，但必须有。 */
    var t = M.T;
    var yaw = 1.15 * Math.sin(t * 0.108) + 0.52 * Math.sin(t * 0.313 + 1.0)
            + 0.22 * Math.sin(t * 0.71 + 2.2);
    var pitch = -6 + 1.05 * Math.sin(t * 0.068 + 0.6) + 0.30 * Math.sin(t * 0.24);
    if (window.RS_PANO) {
      RS_PANO.setCam(yaw, pitch, 1);
      RS_PANO.setShift(M.shift, 0);
      RS_PANO.setLift(M.lift);
    }

    while (M.bi < leg.beats.length && M.T >= leg.beats[M.bi][0]) {
      fire(leg.beats[M.bi]);
      M.bi++;
    }
    if (M.T >= leg.len) endLeg(false);
  }

  /* ---------------- 起 / 收 ---------------- */
  function play(leg) {
    if (M.run) return;
    M.leg = leg;
    M.run = true; M.done = false; M.skip = false;
    M.T = 0; M.bi = 0; M.last = 0; M.ph = 0;
    M.walk = 0; M.walkTo = 0; M.shift = 0; M.lift = 0;
    M.pace = 1.72; M.paceTo = 1.72;
    M.hush = 0; M.hushTo = 0; M.hushAt = 0;
    M.breathIv = 0;
    M.shade = 1; M.shadeTo = 1; M.water = 0; M.waterTo = 0;
    M.night = 0; M.nightTo = 0; M.swapped = false;
    M.breathAt = 0;

    buildDom();
    if (btn) btn.classList.remove('on');

    /* 场景层这时候可能正挂着：它的 tween 每帧也在推相机，会跟这里抢。
       先卸掉，再由这一层自己把全景重新立起来。 */
    if (window.RS_EXPLORE && RS_EXPLORE.open) {
      try { RS_EXPLORE.unmount(); } catch (e) {}
    }

    /* scene：这一段走的是哪张底图。默认就是出发那一站 —— 但站点的图往往
       太「具体」：于都的图是站在浮桥上，封锁线的图是蹲在铁丝网前。拿它们
       横移九十秒，字幕说「走了三天」，画面还在桥上站着，一眼就假。
       所以「站与站之间」有自己的一张路图（RS_SPACE 的 leg-road）。 */
    var sp = (window.RS_SPACE || {})[leg.scene || leg.from];
    if (window.RS_PANO && sp) {
      try { RS_PANO.build(sp); } catch (e) {}
      RS_PANO.setCam(0, -6, 1);
      RS_PANO.setShift(0, 0);
      RS_PANO.setLift(0);
    }

    document.body.classList.add('marching');
    /* 画布的可见性是挂在 body.pano 上的（play.html 里那条
       body.pano #panoRoot{opacity:1}）。场景层一卸，这个类就跟着没了，
       于是圆筒停在 opacity 0 —— 那几秒里人看到的其实是底下那张平面图
       被放大裁过的一块。必须自己把类加回来。 */
    document.body.classList.add('pano');
    root.classList.add('on');
    if (shadeEl) shadeEl.style.opacity = '1';
    if (glassEl) glassEl.style.opacity = '0';

    /* 终点那张图先悄悄拉进缓存。第 80 秒那次切图藏在一层 0.9 的黑里，
       只有一秒钟出头 —— 图没下完的话，黑会拖成三秒，一眼就看出是加载。 */
    var sp2 = (window.RS_SPACE || {})[leg.to];
    if (sp2 && sp2.img) { var pre = new Image(); pre.src = sp2.img; }

    if (initAudio()) {
      setLv(L.wind, 0.030, 2.0);
      setLv(L.murmur, 0.010, 2.0);
      setLv(L.water, 0.0001, 1.0);
    }
    /* 极少数环境下 AudioContext 在手势里建出来仍是 suspended（安卓某些
       内嵌 WebView、窗口失焦时点的按钮）。补一次：下一次点/按键再唤一次，
       不然整段路是哑的 —— 而这段路全靠声音撑着。 */
    if (ac && ac.state === 'suspended') {
      var kick = function () { try { ac.resume(); } catch (e) {} };
      window.addEventListener('pointerdown', kick, { once: true });
      window.addEventListener('keydown', kick, { once: true });
    }

    M.raf = requestAnimationFrame(tick);
  }

  function fadeAudioOut() {
    if (!ac || !master) return;
    var t = ac.currentTime;
    try {
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0.0001, t + 0.9);
    } catch (e) {}
  }

  function endLeg(skip) {
    if (M.done) return;
    M.done = true;
    M.run = false;
    cancelAnimationFrame(M.raf);
    fadeAudioOut();
    if (capEl) capEl.classList.remove('on');
    if (shadeEl) shadeEl.style.opacity = '1';
    document.body.classList.remove('pano');

    var to = (M.leg && M.leg.to) || 'node-01';

    /* 录制模式：不跳站。跳了整页重开，录到的东西跟着页面一起没。
       把最后那一段黑留完，再由录制层收片。 */
    if (window.RS_REC && RS_REC.active) {
      if (RS_REC.finishSoon) { try { RS_REC.finishSoon(); } catch (e) {} }
      return;
    }

    /* 只改 hash 浏览器不会重新加载 —— 那样会停在上一站的内容里，
       只是地址栏变了。加一个一次性参数逼它整页重开。 */
    var qs = location.search || '';
    var url = location.pathname + qs + (qs ? '&' : '?') + 'r=' + Date.now() + '#' + to;
    var wait = skip ? 260 : 420;
    setTimeout(function () { location.href = url; }, wait);
  }

  /* ---------------- 入口 ----------------
     只在有路段出发的那一站挂按钮。读 hash 就够 —— 换站会整页重开。 */
  function boot() {
    var raw = (location.hash || '').replace(/^#/, '');
    var id = raw.split('&')[0];
    /* 没有 hash 的时候，adv-engine 的默认站就是 node-01（于都夜渡）。
       这里必须跟着一起默认，否则冷启动进页面看不到「出发」按钮 ——
       地址栏是干净的，人也没法自己加上去。 */
    if (!id) id = 'node-01';
    var leg = null;
    for (var k in LEGS) {
      if (LEGS.hasOwnProperty(k) && LEGS[k].from === id) { leg = LEGS[k]; break; }
    }
    if (!leg) return;
    makeButton(leg);
  }

  window.RS_MARCH = {
    play: function () {
      var raw = (location.hash || '').replace(/^#/, '').split('&')[0];
      for (var k in LEGS) {
        if (LEGS.hasOwnProperty(k) && LEGS[k].from === raw) { play(LEGS[k]); return true; }
      }
      return false;
    },
    legs: LEGS,
    /* 按 key 直接走一段（岔路、以及录制脚本用）。hash 那套只认 from。 */
    playKey: function (k) {
      if (!LEGS[k]) return false;
      play(LEGS[k]);
      return true;
    },
    get running() { return M.run; },
    /* 自检用：一眼看出这一层到底有没有在推相机、音频有没有起来 */
    get state() {
      return {
        run: M.run, T: +M.T.toFixed(2), walk: +M.walk.toFixed(2),
        pace: +M.pace.toFixed(2), hush: +M.hush.toFixed(2),
        shift: +M.shift.toFixed(5), lift: +M.lift.toFixed(3),
        shade: +M.shade.toFixed(3), water: +M.water.toFixed(3),
        night: +M.night.toFixed(3), swapped: M.swapped,
        audio: !!ac, ac: ac ? ac.state : null,
        cap: capEl ? (capEl.classList.contains('on') ? capEl.textContent.slice(0, 40) : '') : '',
        cls: document.body.className
      };
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
