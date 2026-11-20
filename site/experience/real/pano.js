/* =========================================================
   长征一条路的来处 · 柱面世界（WebGL 360）
   ---------------------------------------------------------
   一句话：把全景图贴在一个圆筒内壁上，人站在筒里，用 WebGL 一次画出来。

   ---- 为什么不用 CSS 3D 拼竖板了 ----
   拼过，两件事扛不住：
     · 一整圈的弧长铺开是九千多像素，超过浏览器单层纹理的上限，
       上半截直接被丢掉（画面只剩下面一带）；
     · 把整圈的板子都摆出来，一半落在相机背后，投影失去意义，浏览器把它
       裁成一个方正的黑洞。
   竖板本来就是权宜之计。真正的 360 观看器只有一条路：一个网格 + 一次绘制。

   ---- 几何 ----
     u ∈ [0,1) 绕一圈，φ = (0.5 - u)·arc
     筒面点 p = (-Rp·sinφ, (v-0.5)·Hp, -Rp·cosφ)
     Rp = R + D，Hp = Rp·arc·ar      （D = R·neck，见下）
     眼位 E = D·(sin yaw, 0, -cos yaw)
     p' = R_pitch · ( R_yaw · (p - E) )
     屏幕 = 中心 + (x, y)·P/(P - z)

   ---- 关于 neck（像不像照片的分界） ----
   绕着自己的眼睛转，等于把一张画在眼前转：画面里每个像素的相对位置
   一点都没变，眼睛立刻断定「这是平的」。真人转头是绕脖子转的，
   眼睛因此在世界上画出一小段圆弧 —— 转得越狠，眼睛离那面墙越近，
   那面墙就长得越快。这份「近的涨、远的缩」才是空间感的来源。
   圆筒半径取 Rp = R + D，所以正视时眼到墙仍是 R，打开 neck 画面不跳。

   ---- 关于「动」 ----
   一张静止的全景，转得再对也还是一张照片：**没有任何东西在变**。
   但「动」比「不动」更容易做坏 —— 动错了就是恐怖片。这里只让五样东西动：
     · 呼吸（uBc / uBk）：uv 空间里往**竖直一个方向**缩放，锚在脚下，
       一趟一口气，只往上、不往下（人不会缩到比静止时还小）。
       不要加左右位移 —— 一个人原地横着滑几像素，比不动还假。
     · 降水（uRainBox + 雨点纹理）：门外一定范围里，两层不同速度的雨丝
       往下落；范围占满整幅时不做柔边（否则绕一圈能看见一条没雨的竖带）。
       uRainSnow > 0.5 改下雪：圆点、慢、会飘，由哈希现算，不用那张贴图。
     · 水（uFc）：江面、急滩的采样坐标随两道交叉正弦波轻推。
       只有位移、没有加光 —— 加水就成牛奶了。
     · 火光（uGlow）：油灯和灶火各一小团，亮度按两个不同频率跳。
     · 站不稳（idle）：视角本身有 0.1° 级的慢摆。幅度必须小，大了就晕，
       而且整幅画一起飘会让人觉得「这地方不太对」。
   project() 也要用 effYaw/effPitch —— 否则热点不跟着这一摆走。

   ---- 关于「走」（uShift / uLift）----
   上面五样是「景物在动」，人还是站着的。行军段（march.js）要的是「人在动」，
   所以另有两个自由度：整幅图沿 u 平移（造前进的错觉）、眼位整体升降（脚步）。
     · 圆筒没有视差，横移的物理意义是「原地转身」而不是「前进」。所以量给得
       很小（整段三十度上下），它只承担「边走边摆头」，不承担「走了多远」。
     · 升降必须是真的位移，不能拿 pitch 代替 —— 抬头低头和身子沉下去，
       在眼睛里是两件完全不同的事。
   两者平时都锁 0。

   坐标一律是全景图上的归一化坐标 (u, v)，左上角 (0,0)。
   热点用同一套 project() 投到屏幕上 —— 差一项，点就会从人身上滑开。
   ========================================================= */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var RAD = Math.PI / 180;

  var st = {
    on: false, img: "",
    arc: 360, ar: 0.5, neck: 0,
    W: 0, H: 0, P: 900, R: 1200, half: 45,
    yaw: 0, pitch: 0, zoom: 1,
    effYaw: 0, effPitch: 0,
    Rp: 0, Hp: 0,
    /* shift 是**整幅纹理**的平移（u 方向 = 顺着圈走）、lift 是眼位升降。
       这两个不是给「看」用的，是给「走」用的：横移造前进感，升降是脚步。
       平时都锁 0，只有行军段（march.js）会推它们。 */
    shift: [0, 0], lift: 0,
    /* 视差：par 是当前强度（0 = 关），parK 是这一站的标称强度（space.js 的 par）。
       分两个是必要的 —— 关掉再打开必须回到原来那一档，而不是一律回到 1。
       hasDepth 是「这一站有没有深度图」；没有时 uPara 恒 0，画面与旧版一致。 */
    par: 0, parK: 1, hasDepth: false,
    bre: [], glow: [], flow: [], rain: null, snow: false, t0: 0, idle: true
  };

  var cv = null, gl = null, prog = null, tex = null, rainTex = null, idxN = 0, texMax = 4096;
  var depTex = null, depWanted = "";
  var U = {}, A = {}, uni = {}, lossy = false;
  var MAXB = 6, MAXG = 3, MAXF = 3;
  var breA = new Float32Array(MAXB * 4);
  var breK = new Float32Array(MAXB * 2);
  var glowA = new Float32Array(MAXG * 4);
  var flowA = new Float32Array(MAXF * 4);

  var VS = [
    "attribute vec2 aUV;",
    "uniform float uArc, uRp, uH, uYaw, uPitch, uEye, uP, uZoom;",
    "uniform float uLift;",
    "uniform vec2 uRes;",
    "varying vec2 vUV;",
    "varying float vZ;",
    "void main(){",
    "  float phi = (0.5 - aUV.x) * uArc;",
    "  vec3 p = vec3(-uRp*sin(phi), (aUV.y-0.5)*uH, -uRp*cos(phi));",
    /* 眼位整体升降。走路时身体每步会沉下去两厘米，人眼看到的是
       「整个世界一起上上下下」——不是抬头低头，所以不能拿 pitch 代替。 */
    "  p.y -= uLift;",
    "  p.x -= uEye*sin(uYaw);",
    "  p.z += uEye*cos(uYaw);",
    "  float cy=cos(uYaw), sy=sin(uYaw);",
    "  vec3 q = vec3(p.x*cy + p.z*sy, p.y, -p.x*sy + p.z*cy);",
    "  float cx=cos(uPitch), sx=sin(uPitch);",
    "  float x1 = q.x*uZoom;",
    "  float y1 = q.y*uZoom;",
    "  float y2 = y1*cx - q.z*sx;",
    "  float z2 = y1*sx + q.z*cx;",
    "  float k = uP/(uP - z2);",
    "  gl_Position = vec4(x1*k*2.0/uRes.x, -y2*k*2.0/uRes.y, 0.0, 1.0);",
    "  vUV = aUV;",
    "  vZ = z2;",
    "}"
  ].join("\n");

  /* 相机朝 -z 看，所以 z2 < 0 才在眼前。
     手工做透视除法就没有了「近裁剪」：筒子背上那半圈 z2 > 0，除法给出的
     k 仍然是正数，于是它们被镜像着放大、当成正面画上去 —— 画面上那块
     「放大的局部」就是它。片元里直接丢掉。 */
  var FS = [
    "precision mediump float;",
    "uniform sampler2D uTex;",
    "uniform sampler2D uRain;",
    "uniform sampler2D uDepth;",   // 深度图（0 远 / 1 近），没有这一站就给一张全 0
    "uniform float uPara;",        // 视差强度：0 = 关，1 = 标准
    /* 视差要用到「这张图铺开多少弧度」和「相机转到哪儿」。这两样顶点着色器里
       已经有了，但**不能同名**：VS 的默认精度是 highp、FS 这里是 mediump，
       GLSL 规定同名 uniform 的精度必须完全一致，否则 link 直接失败。
       所以另起两个名字单独传。 */
    "uniform float uArcP;",
    "uniform float uYawP;",
    "uniform float uTime;",
    "uniform vec2 uShift;",      // 整幅图的平移（行军段用）
    "uniform int uNB;",
    "uniform vec4 uBc[6];",     // cx, cy, rx, ry（u/v 各自的比例半径）
    "uniform vec2 uBk[6];",     // amp, phase
    "uniform int uNG;",
    "uniform vec4 uGlow[3];",   // u, v, 半径(按图高), 强度
    "uniform int uNF;",
    "uniform vec4 uFc[3];",     // u, v, ru, rv（水流区域，椭圆）
    "uniform vec4 uRainBox;",   // u0, v0, u1, v1
    "uniform float uRainK;",
    "uniform float uRainSnow;", // 0 = 雨（细长雨丝），1 = 雪（圆点、慢、会飘）
    "varying vec2 vUV;",
    "varying float vZ;",
    "void main(){",
    "  if (vZ > -1.0) discard;",
    "  vec2 uv = vUV;",
    /* ---- 呼吸：只有一个方向 ---- */
    "  for (int i = 0; i < 6; i++) {",
    "    if (i >= uNB) break;",
    "    vec4 bc = uBc[i];",
    "    vec2 d = (uv - bc.xy) / bc.zw;",
    "    float q = dot(d, d);",
    "    if (q < 1.0) {",
    "      float f = 1.0 - smoothstep(0.0, 1.0, q);",
    /* 只吸气：0 → 1 → 0，但永远不小于静止值。用 -cos 而不是 sin，
       是因为 sin 会让肩膀先往下沉一下，像被按了一把。 */
    "      float p = 0.5 - 0.5 * cos(uTime * 1.05 + uBk[i].y);",
    "      float ay = bc.y + bc.w;",     // 区域底边：人的脚下
    "      uv.y = ay + (uv.y - ay) * (1.0 + uBk[i].x * p * f);",
    "    }",
    "  }",
    /* ---- 水：不是加一层白，是把水面那块图的采样坐标轻轻推开 ---- */
    "  for (int i = 0; i < 3; i++) {",
    "    if (i >= uNF) break;",
    "    vec4 fc = uFc[i];",
    "    vec2 dw = (uv - fc.xy) / fc.zw;",
    "    float qw = dot(dw, dw);",
    "    if (qw < 1.0) {",
    "      float fw = 1.0 - smoothstep(0.0, 1.0, qw);",
    /* 两道交叉的正弦波叠起来就是一块会走的水面：高频那层是碎浪，
       低频那层是整片水在挪。横向位移给得比纵向大，水是「流」不是「抖」。 */
    "      float w1 = sin(uv.x * 318.0 + uTime * 2.10) * sin(uv.y * 187.0 - uTime * 1.35);",
    "      float w2 = sin(uv.x * 131.0 - uTime * 1.05) * sin(uv.y * 73.0 + uTime * 0.80);",
    "      uv += vec2(0.58, 0.26) * (w1 * 0.55 + w2 * 0.45) * fw * 0.0026;",
    "    }",
    "  }",
    /* 呼吸和水都在**图坐标**里做形变（人固定在图上，区域不能跟着平移跑），
       所以平移只加在最后那一次采样上。 */
    /* ---- 视差：让近的东西比远的滑得快 ----
       这是整站最像「在空间里」还是「看一张画」的分界。
       圆筒上每个点都在同一个半径上，所以纯旋转时整幅图刚性转动，一点深度
       信息都没有。真实的人在转头时眼睛是绕脖子画圆弧的（see neck），
       近处的门框因此甩过去一大截、远山几乎不动。
       这里按深度把采样坐标推开：位移 ∝ 深度 × sin(相对方位角)。
       · 正前方/正后方 sin=0 —— 不动，画面的中心永远是准的；
       · 正侧方最大 —— 转动时那一侧「流」得最快；
       · 深度 0 = 无限远，一点都不动。**这一条必须是零**：早先试过把零点
         放在 0.38（想「中间那层不动」），结果天离零点最远，转头时天甩得
         比地面还多 —— 腊子口那条沟一眼就看出来整片天在横移，全反了。
       系数 0.036 配 dep≈0.72 的地面，效果和当初 0.075 配 (dep−0.38) 一样，
       近景的力度没变，只是把多余的那份从天上收回来了。 */
    "  if (uPara > 0.001) {",
    "    float dep = texture2D(uDepth, vUV).r;",
    /* 只取「相对当前朝向 0 时」的增量：sin(θ+ψ) − sin(θ) = 2cos(θ+ψ/2)sin(ψ/2)。
       不这么写，静止时画面两侧就会被推开一圈（因为原来的图本来就假设眼睛在
       圆筒中心，那是一个不存在的点）。这样开机与旧版逐像素一致，只有真正
       转头时深度才浮出来 —— 也正好是人判断真假的那个瞬间。 */
    "    float th0 = (0.5 - vUV.x) * uArcP;",
    "    float dpsi = 2.0 * cos(th0 + uYawP * 0.5) * sin(uYawP * 0.5);",
    "    uv.x += uPara * dep * dpsi * 0.036;",
    "  }",
    "  vec3 c = texture2D(uTex, uv + uShift).rgb;",
    /* ---- 雨：窗外 / 门外那一片 ---- */
    "  if (uRainK > 0.001) {",
    "    vec2 rb = uRainBox.zw - uRainBox.xy;",
    "    vec2 r = (vUV - uRainBox.xy) / rb;",
    "    if (r.x > 0.0 && r.x < 1.0 && r.y > 0.0 && r.y < 1.0) {",
    /* 范围几乎占满整幅（野外下雨）时不能做柔边：u 是从 0 到 1 的一整圈，
       在 u 两端做淡出，转过去就会看见一条没有雨的竖带。所以整幅模式
       直接 mask = 1。 */
    "      float full = step(0.97, rb.x) * step(0.97, rb.y);",
    "      float mask = mix(smoothstep(0.0, 0.10, r.x) * smoothstep(0.0, 0.10, 1.0 - r.x)",
    "                 * smoothstep(0.0, 0.09, r.y) * smoothstep(0.0, 0.09, 1.0 - r.y), 1.0, full);",
    /* 采样坐标的 y 减去时间 → 雨丝往 v 增大的方向走，也就是往下落。
       两层不同尺度：近的稀而快，远的密而慢。 */
    "      float a = 0.0;",
    "      if (uRainSnow > 0.5) {",
    /* 雪不能用那张雨丝贴图 —— 雨丝放大还是雨丝。这里用格子哈希现算圆点，
       两层：近的大而快、远的小而慢，各自左右飘一点（飘是加在格子坐标上的，
       所以整片雪一起漂，不是每颗各走各的）。
       格子别太密：一密就成电视雪花点，一片白噪 —— 雪要「少而大」。 */
    "        vec2 g1 = vec2(vUV.x * 90.0, vUV.y * 58.0 - uTime * 1.05);",
    "        g1.x += sin(uTime * 0.48 + g1.y * 0.30) * 0.22;",
    "        vec2 i1 = floor(g1);",
    "        vec2 f1 = fract(g1);",
    "        float h1 = fract(sin(dot(i1, vec2(12.9898, 78.233))) * 43758.5453);",
    "        vec2 o1 = vec2(fract(h1 * 7.31), fract(h1 * 13.71)) * 0.90 + 0.05;",
    "        float r1 = 0.12 + 0.13 * fract(h1 * 3.71);",
    "        a += smoothstep(r1, r1 * 0.16, length(f1 - o1)) * step(0.52, h1) * 0.80;",
    "        vec2 g2 = vec2(vUV.x * 170.0 + 0.37, vUV.y * 110.0 - uTime * 0.58);",
    "        g2.x += sin(uTime * 0.33 + g2.y * 0.21) * 0.55;",
    "        vec2 i2 = floor(g2);",
    "        vec2 f2 = fract(g2);",
    "        float h2 = fract(sin(dot(i2, vec2(39.346, 11.135))) * 24634.6345);",
    "        vec2 o2 = vec2(fract(h2 * 5.13), fract(h2 * 9.97)) * 0.90 + 0.05;",
    "        float r2 = 0.09 + 0.09 * fract(h2 * 3.13);",
    "        a += smoothstep(r2, r2 * 0.16, length(f2 - o2)) * step(0.62, h2) * 0.40;",
    "        c += vec3(0.88, 0.92, 0.98) * a * mask * uRainK;",
    "      } else {",
    "        a = texture2D(uRain, vec2(vUV.x * 22.0, vUV.y * 8.0 - uTime * 0.55)).r * 0.80",
    "          + texture2D(uRain, vec2(vUV.x * 37.0 + 0.31, vUV.y * 13.0 - uTime * 0.95)).r * 0.55;",
    "        c += vec3(0.58, 0.66, 0.74) * a * mask * uRainK;",
    "      }",
    "    }",
    "  }",
    /* ---- 火：油灯、灶火 ---- */
    "  for (int i = 0; i < 3; i++) {",
    "    if (i >= uNG) break;",
    "    vec4 g = uGlow[i];",
    /* u 一圈是 2 倍图高，所以横向要先乘 2，光斑才是圆的而不是竖长条 */
    "    float dist = length(vec2((vUV.x - g.x) * 2.0, vUV.y - g.y));",
    "    float m = 1.0 - smoothstep(0.0, g.z, dist);",
    "    float fl = 1.0 + g.w * (0.55 * sin(uTime * 7.3 + g.x * 41.0)",
    "                          + 0.45 * sin(uTime * 12.7 + 1.3));",
    "    c *= mix(1.0, fl, m * m);",
    "  }",
    "  gl_FragColor = vec4(c, 1.0);",
    "}"
  ].join("\n");

  function eyeD() { return st.R * st.neck; }
  function wallR() { return st.R + eyeD(); }

  /* 相机参数不能只按「一张平面」算。
     圆筒是弯的，屏幕边缘对应的不是 atan(A/P)，而是解这个：
         A·(P + R·cosθ) = P·R·sinθ
     θ 是视野半角。同样一块屏幕，圆筒越弯，能看见的角就越大 ——
     按平面近似会把「看得见的范围」算大，一转就翻出图外，边上露黑。
     这里反过来定：竖直半角锁死，屋子的「高低」不随屏幕变，再由 R 反推 P。

     ---- 为什么是 38°（竖直视野 76°）----
     原来是 24°（48°）。48° 相当于一支中长焦：画面里那两个人几乎贴到脸上，
     墙只剩一小块，屋子读不出来。真实站在屋里环视时，人的视野是 60°–75°，
     24° 一开始就写窄了。38° 是试出来的上限：同一张图能同时容下门、窗、床、
     人、三个战士和灶，人才回到「坐在屋子中间」的大小；再宽边缘的门和锅就
     开始被横向拉开了。 */
  var VHALF = 45;
  function solveHalf(A2, B2, tv) {
    var R = 1.45 * (B2 / tv);
    var P = B2 * R / (R * tv - B2);
    var d = Math.sqrt(P * P + A2 * A2);
    var s = A2 * P / (R * d);
    if (s > 1) s = 1;
    var half = Math.atan2(A2, P) + Math.asin(s);
    return { R: R, P: P, half: half / RAD };
  }

  function measure(W, H) {
    st.W = W; st.H = H;
    var o = solveHalf(W / 2, H / 2, Math.tan(VHALF * RAD));
    st.R = o.R; st.P = o.P; st.half = o.half;
    st.Rp = wallR();
    st.Hp = st.Rp * (st.arc * RAD) * st.ar;
    resize();
  }

  function ensureCanvas() {
    var host = $("panoRoot");
    if (!host) {
      host = document.createElement("div");
      host.id = "panoRoot";
      var stage = $("stage");
      stage.insertBefore(host, stage.firstChild);
    }
    cv = host.querySelector("canvas");
    if (!cv) {
      cv = document.createElement("canvas");
      cv.id = "panoCv";
      host.appendChild(cv);
    }
    return host;
  }

  function resize() {
    if (!cv) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = Math.max(1, Math.round(st.W * dpr));
    var h = Math.max(1, Math.round(st.H * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  }

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(s) || "shader");
    }
    return s;
  }

  function initGL() {
    ensureCanvas();
    if (!cv) return false;
    try {
      /* 录制层要在另一个 rAF 里把这张画布 drawImage 进合成画布。
         没有 preserveDrawingBuffer，WebGL 的帧缓冲在合成之后就丢弃了，
         读到的是空白 —— 录出来会是一片黑（或上一帧的残影）。 */
      var keep = /(^|[?&])rec=1(&|$)/.test(location.search);
      gl = cv.getContext("webgl", {
        antialias: true, alpha: false, depth: false, preserveDrawingBuffer: keep
      });
      if (!gl) gl = cv.getContext("experimental-webgl");
      if (!gl) gl = cv.getContext("experimental-webgl");
    } catch (e) { gl = null; }
    if (!gl) return false;

    texMax = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;

    prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog) || "link");
    }
    gl.useProgram(prog);

    /* 网格：一圈 128 列、上下 32 行。最后一列与第一列重合 —— φ 相差 2π，
       位置相同，于是接缝是「同一个点」，不会裂。 */
    var COLS = 128, ROWS = 32;
    var vtx = new Float32Array((COLS + 1) * (ROWS + 1) * 2);
    var p = 0;
    for (var j = 0; j <= ROWS; j++) {
      for (var i = 0; i <= COLS; i++) {
        vtx[p++] = i / COLS;
        vtx[p++] = j / ROWS;
      }
    }
    var idx = new Uint16Array(COLS * ROWS * 6);
    p = 0;
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var a = y * (COLS + 1) + x;
        var b = a + 1, c = a + (COLS + 1), d = c + 1;
        idx[p++] = a; idx[p++] = c; idx[p++] = b;
        idx[p++] = b; idx[p++] = c; idx[p++] = d;
      }
    }
    idxN = idx.length;

    var vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, vtx, gl.STATIC_DRAW);
    A.uv = gl.getAttribLocation(prog, "aUV");
    gl.enableVertexAttribArray(A.uv);
    gl.vertexAttribPointer(A.uv, 2, gl.FLOAT, false, 0, 0);

    var ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);

    ["uArc", "uRp", "uH", "uYaw", "uPitch", "uEye", "uP", "uZoom", "uRes",
      "uTex", "uTime", "uNB", "uNG", "uNF", "uRain", "uRainBox", "uRainK",
      "uRainSnow", "uLift", "uShift", "uDepth", "uPara", "uArcP", "uYawP"].forEach(function (n) {
        uni[n] = gl.getUniformLocation(prog, n);
      });
    uni.uBc = gl.getUniformLocation(prog, "uBc[0]");
    uni.uBk = gl.getUniformLocation(prog, "uBk[0]");
    uni.uGlow = gl.getUniformLocation(prog, "uGlow[0]");
    uni.uFc = gl.getUniformLocation(prog, "uFc[0]");

    gl.disable(gl.CULL_FACE);
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0.027, 0.031, 0.039, 1);
    cv.addEventListener("webglcontextlost", function (e) {
      e.preventDefault(); lossy = true;
    });
    cv.addEventListener("webglcontextrestored", function () {
      lossy = false; initGL(); loadTex(); draw();
    });
    return true;
  }

  /* 雨点纹理：256×256 的一小张，四边可循环。
     为什么不用着色器现算：雨要「一阵一阵、有长有短」，纯 GLSL 里写这个
     需要好几层噪声，还不好调。画一张贴图、在着色器里滚它，简单得多。
     种子固定 —— 否则每次刷新雨都不一样，截图没法比对。 */
  function makeRainTex() {
    if (!gl || rainTex) return;
    var N = 256, c = document.createElement("canvas");
    c.width = c.height = N;
    var x = c.getContext("2d");
    x.fillStyle = "#000";
    x.fillRect(0, 0, N, N);
    var seed = 20261023;
    function rnd() {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    }
    x.lineCap = "round";
    for (var i = 0; i < 190; i++) {
      var px = rnd() * N, py = rnd() * N;
      var len = 7 + rnd() * 22;
      var al = 0.16 + rnd() * 0.62;
      var dx = (rnd() - 0.5) * 2.0;
      x.strokeStyle = "rgba(255,255,255," + al.toFixed(3) + ")";
      x.lineWidth = rnd() < 0.78 ? 1 : 1.7;
      for (var ky = -1; ky <= 1; ky++) {
        for (var kx = -1; kx <= 1; kx++) {
          x.beginPath();
          x.moveTo(px + kx * N, py + ky * N);
          x.lineTo(px + kx * N + dx, py + ky * N + len);
          x.stroke();
        }
      }
    }
    rainTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, rainTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  }

  function loadTex() {
    if (!gl) return;
    var url = st.img;
    var im = new Image();
    im.onload = function () {
      if (url !== st.img || !im.naturalWidth) return;
      st.ar = im.naturalHeight / im.naturalWidth;
      st.Hp = wallR() * (st.arc * RAD) * st.ar;
      if (!tex) tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      /* 不要翻转：图的第一行就是 v=0，也正好是我们墙面的「上沿」。
         翻过来整个人就是倒着挂在梁上的。 */
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);

      /* 一整圈图在屏幕上通常是被**缩小**画出来的（4096 铺 360°，屏幕只用
         一两千像素）。只有 LINEAR 的缩小是抽点，细节会碎成一片抖动的噪声 ——
         这就是「糊」的真凶，不是分辨率不够。POT 尺寸 + mipmap 才治得了。
         图不是 POT（或有超限）时就退回 LINEAR，至少能看。 */
      var pot = isPot(im.naturalWidth) && isPot(im.naturalHeight) &&
                im.naturalWidth <= texMax && im.naturalHeight <= texMax;
      if (pot) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      /* S 方向用 REPEAT：整圈图本来就是左右接死的，u 平移超出 [0,1] 该绕回去，
         不能夹边（夹边会在边上拉出一条越来越长的假色带）。图不平移时
         REPEAT 与 CLAMP 看不出差别。 */
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      /* 斜着看墙的时候（转到边上、抬头看梁），各向异性过滤能把被拉长的
         细节救回来一截。有就用，没有就算了。 */
      var an = gl.getExtension("EXT_texture_filter_anisotropic") ||
               gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
      if (an && pot) {
        var maxA = gl.getParameter(an.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1;
        gl.texParameterf(gl.TEXTURE_2D, an.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, maxA));
      }
      draw();
      startLoop();
    };
    im.src = url;
  }

  function isPot(n) { return n > 0 && (n & (n - 1)) === 0; }

  /* 深度图：跟底图同名，放在 img/depth/ 下（yudu360.jpg → depth/yudu360.png）。
     加载失败不是错误 —— 没做过深度的站点本来就没有，uPara 会恒为 0，
     画面与以前一模一样。所以这一步永远不该让 build 失败。
     不生成 mipmap：片元只读一个值，线性插值足够，深度也不需要锐利。 */
  function loadDepth() {
    if (!gl) return;
    var url = st.img.replace("/wide/", "/depth/").replace(/\.jpg$/i, ".png");
    if (url === depWanted) return;
    depWanted = url;
    st.hasDepth = false;
    var im = new Image();
    im.onload = function () {
      if (url !== depWanted || !im.naturalWidth) return;
      if (!depTex) depTex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, depTex);
      /* 和底图一样不翻转：深度图的第一行就是 v=0（天顶）。翻过来天就近了，
         转头时整片天空会跟着甩 —— 那是所有错误的来源里最刺眼的一个。 */
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE,
        gl.UNSIGNED_BYTE, im);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      /* S 方向必须 REPEAT：视差偏移会让 u 越过 0/1，夹边会在接缝处拉出
         一条竖直的硬边。T 方向夹边即可，上下不会越界。 */
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.activeTexture(gl.TEXTURE0);
      st.hasDepth = true;
      draw();
      paintTag();
    };
    im.onerror = function () {
      if (url !== depWanted) return;
      st.hasDepth = false;
      paintTag();
    };
    im.src = url;
  }

  /* 右下角那个小标：告诉人「这一站有没有视差、按哪个键切」。
     只在有深度图的站点出现，其他站整个 div 都不建。 */
  var parTag = null;
  function paintTag() {
    if (!parTag) return;
    parTag.textContent = st.hasDepth
      ? (st.par > 0 ? "视差 开 · 按 P 关" : "视差 关 · 按 P 开")
      : "";
    parTag.style.display = st.hasDepth ? "block" : "none";
    if (st.hasDepth) fadeTag(st.par > 0 ? 4200 : 2600);
  }
  /* 31 站都挂着「视差 开 · 按 P 关」会像个调试面板。进站亮几秒就淡掉，
     鼠标移上去或按 P 再亮 —— 淡掉时关掉 pointer-events，别挡拖动。 */
  var tagHideT = 0;
  function fadeTag(ms) {
    if (!parTag) return;
    clearTimeout(tagHideT);
    parTag.style.opacity = ".72";
    parTag.style.pointerEvents = "auto";
    tagHideT = setTimeout(function () {
      parTag.style.opacity = "0";
      parTag.style.pointerEvents = "none";
    }, ms || 4200);
  }
  function ensureTag(host) {
    if (parTag) { paintTag(); return; }
    parTag = document.createElement("div");
    parTag.id = "parTag";
    parTag.style.cssText = "position:absolute;right:16px;bottom:16px;z-index:8;" +
      "font:11px/1.6 system-ui,-apple-system,sans-serif;letter-spacing:.10em;" +
      "color:#cfd6e2;background:rgba(8,10,14,.62);" +
      "border:1px solid rgba(255,255,255,.16);border-radius:2px;" +
      "padding:4px 9px;cursor:pointer;user-select:none;" +
      "opacity:.72;transition:opacity .2s";
    parTag.addEventListener("mouseenter", function () {
      clearTimeout(tagHideT);
      parTag.style.opacity = "1";
      parTag.style.pointerEvents = "auto";
    });
    parTag.addEventListener("mouseleave", function () { fadeTag(1600); });
    parTag.addEventListener("click", function () { RS_PANO.setParallax(); });
    host.appendChild(parTag);
    paintTag();
  }

  var keyBound = false;
  function bindParKey() {
    if (keyBound) return;
    keyBound = true;
    document.addEventListener("keydown", function (e) {
      if (!st.on || !st.hasDepth) return;
      var t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "p" || e.key === "P") { RS_PANO.setParallax(); }
    });
  }

  function build(cfg) {
    st.img = cfg.img;
    st.arc = cfg.arc || 360;
    st.ar = cfg.ar || 0.5;
    st.neck = cfg.neck || 0;
    /* 每一站的视差标称强度，默认 1。室内四站与夜路的深度多半估得虚，
       space.js 里可以单独给 0.5–0.7，压到「有一点，但不至于撕裂」。 */
    st.parK = (cfg.par == null) ? 1 : Math.max(0, Math.min(2, cfg.par));
    st.par = st.parK;
    st.yaw = 0; st.pitch = 0; st.zoom = 1;
    st.effYaw = 0; st.effPitch = 0;
    st.shift[0] = 0; st.shift[1] = 0; st.lift = 0;
    st.Rp = wallR();
    st.Hp = st.Rp * (st.arc * RAD) * st.ar;
    setBreathe(cfg.breathe);
    setGlow(cfg.glow || (cfg.lamp ? [cfg.lamp] : null));
    setFlow(cfg.flow);
    setRain(cfg.rain);
    st.t0 = now();
    var host = ensureCanvas();
    host.classList.add("on");
    st.on = true;
    if (!gl && !initGL()) {
      /* 没有 WebGL 就退回 CSS 平面，不至于白屏 */
      host.style.background = "#07080a url(" + st.img + ") center/cover no-repeat";
      return;
    }
    makeRainTex();
    ensureTag(host);
    bindParKey();
    loadTex();
    loadDepth();
  }

  /* breathe: [[u, v, ru, rv, amp, phase], ...]
     ru 是占图宽的比例、rv 是占图高的比例 —— 两者不是同一把尺子：
     图是 2:1，同样多的「像素」，rv 是 ru 的两倍。 */
  function setBreathe(list) {
    st.bre = (list || []).slice(0, MAXB);
    breA.fill(0); breK.fill(0);
    for (var i = 0; i < st.bre.length; i++) {
      var b = st.bre[i];
      breA[i * 4] = b[0];
      breA[i * 4 + 1] = b[1];
      breA[i * 4 + 2] = b[2];
      breA[i * 4 + 3] = b[3];
      breK[i * 2] = b[4] == null ? 0.016 : b[4];
      breK[i * 2 + 1] = b[5] == null ? i * 1.7 : b[5];
    }
  }

  /* glow: [[u, v, 半径, 强度], ...]
     半径按**图高**算（不是 u 空间）—— u 一圈是两倍图高，用 u 当尺子的话
     光斑会是个竖着的长条。强度 0.3 上下是「火苗在跳」，0.6 就成闪光灯了。 */
  function setGlow(list) {
    st.glow = (list || []).slice(0, MAXG);
    glowA.fill(0);
    for (var i = 0; i < st.glow.length; i++) {
      var g = st.glow[i];
      glowA[i * 4] = g[0];
      glowA[i * 4 + 1] = g[1];
      glowA[i * 4 + 2] = g[2] == null ? 0.06 : g[2];
      glowA[i * 4 + 3] = g[3] == null ? 0.3 : g[3];
    }
  }

  /* flow: [[u, v, ru, rv], ...] —— 会流的水面（江、河、急滩）。
     只给「水面本身」的椭圆，别把岸和石头圈进来：这一层是拿采样坐标去推，
     圈到石头就是石头在原地晃。z 轴不写死，幅度在着色器里定。 */
  function setFlow(list) {
    st.flow = (list || []).slice(0, MAXF);
    flowA.fill(0);
    for (var i = 0; i < st.flow.length; i++) {
      var f = st.flow[i];
      flowA[i * 4] = f[0];
      flowA[i * 4 + 1] = f[1];
      flowA[i * 4 + 2] = f[2] == null ? 0.08 : f[2];
      flowA[i * 4 + 3] = f[3] == null ? 0.06 : f[3];
    }
  }

  /* rain: [u0, v0, u1, v1, 强度, 种类?]。null = 这一站没有降水。
     u0v0u1v1 给 [0,0,1,1] 就是整幅（野外），给一个小方块就是门洞/窗洞（屋里）。
     第 6 项写 "snow" 就下雪。强度对雨是浓淡，对雪是雪量。 */
  function setRain(r) {
    st.rain = (r && r.length >= 4) ? r : null;
    st.snow = !!(st.rain && String(st.rain[5] || "").indexOf("snow") >= 0);
  }

  function setCam(yaw, pitch, zoom) {
    st.yaw = yaw || 0;
    st.pitch = pitch || 0;
    if (zoom != null) st.zoom = zoom;
  }

  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function secs() { return (now() - st.t0) / 1000; }

  function applyIdle() {
    /* 站不稳：0.1° 级的慢摆。人站着本来就不会绝对静止，有了这一层，
       「这是一张照片」的判断会明显松掉。拖拽时关掉，否则手感像在晃。
       原来给到 0.22°，整幅画一起飘得太明显 —— 那不像「人在呼吸」，
       像「这个地方不太对」。宁可小。 */
    var t = secs();
    var drag = document.body.classList.contains("dragging");
    var k = (st.idle && !drag) ? 1 : 0;
    st.effYaw = st.yaw + k * Math.sin(t * 0.29) * 0.10;
    st.effPitch = st.pitch + k * Math.sin(t * 0.21 + 1.7) * 0.07;
  }

  function draw() {
    if (!gl || lossy) return;
    var stage = $("stage");
    if (stage) stage.style.transform = "none";
    resize();
    applyIdle();
    gl.viewport(0, 0, cv.width, cv.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (!tex) return;
    gl.useProgram(prog);
    gl.uniform1f(uni.uArc, st.arc * RAD);
    gl.uniform1f(uni.uRp, wallR());
    gl.uniform1f(uni.uH, wallR() * (st.arc * RAD) * st.ar);
    gl.uniform1f(uni.uYaw, st.effYaw * RAD);
    gl.uniform1f(uni.uPitch, st.effPitch * RAD);
    gl.uniform1f(uni.uEye, eyeD());
    gl.uniform1f(uni.uP, st.P);
    gl.uniform1f(uni.uZoom, st.zoom);
    gl.uniform1f(uni.uLift, st.lift);
    gl.uniform2f(uni.uShift, st.shift[0], st.shift[1]);
    gl.uniform2f(uni.uRes, st.W, st.H);
    gl.uniform1f(uni.uTime, secs());
    gl.uniform1i(uni.uNB, st.bre.length);
    if (uni.uBc) gl.uniform4fv(uni.uBc, breA);
    if (uni.uBk) gl.uniform2fv(uni.uBk, breK);
    gl.uniform1i(uni.uNG, st.glow.length);
    if (uni.uGlow) gl.uniform4fv(uni.uGlow, glowA);
    gl.uniform1i(uni.uNF, st.flow.length);
    if (uni.uFc) gl.uniform4fv(uni.uFc, flowA);
    if (st.rain) {
      gl.uniform4f(uni.uRainBox, st.rain[0], st.rain[1], st.rain[2], st.rain[3]);
      gl.uniform1f(uni.uRainK, st.rain[4] == null ? 0.8 : st.rain[4]);
      if (uni.uRainSnow) gl.uniform1f(uni.uRainSnow, st.snow ? 1 : 0);
    } else {
      gl.uniform4f(uni.uRainBox, 0, 0, 0, 0);
      gl.uniform1f(uni.uRainK, 0);
      if (uni.uRainSnow) gl.uniform1f(uni.uRainSnow, 0);
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(uni.uTex, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, rainTex);
    gl.uniform1i(uni.uRain, 1);
    gl.activeTexture(gl.TEXTURE2);
    /* 没有深度图的站点绑一张占位：uPara 恒 0，着色器那一支根本不会执行，
       但 sampler 一律要绑着东西，空着有些驱动会报警告。 */
    gl.bindTexture(gl.TEXTURE_2D, depTex || rainTex);
    gl.uniform1i(uni.uDepth, 2);
    gl.uniform1f(uni.uPara, st.hasDepth ? st.par : 0);
    gl.uniform1f(uni.uArcP, st.arc * RAD);
    gl.uniform1f(uni.uYawP, st.effYaw * RAD);
    gl.drawElements(gl.TRIANGLES, idxN, gl.UNSIGNED_SHORT, 0);
  }

  var rafId = 0, lastT = 0, looping = false;
  function startLoop() {
    if (looping) return;
    looping = true;
    var step = function (ts) {
      rafId = requestAnimationFrame(step);
      if (!st.on || !gl || lossy) return;
      if (ts - lastT < 33) return;          /* 30fps 足够，省电 */
      lastT = ts;
      draw();
      /* 呼吸和慢摆都会让画面本身动，热点得跟着一起动才不会从人身上滑开 */
      if (window.RS_EXPLORE && RS_EXPLORE.refresh) RS_EXPLORE.refresh();
    };
    rafId = requestAnimationFrame(step);
  }

  function applyCam() { draw(); }

  /* 世界点 → 屏幕点。与顶点着色器逐项对应，差一项热点就会飘。 */
  function project(u, v) {
    var arcR = st.arc * RAD;
    var Rp = wallR();
    /* 纹理平移了，这个点在图上的位置也就变了 —— 不跟着算，热点会从人身上滑开 */
    var phi = (0.5 - (u + st.shift[0])) * arcR;
    var Hp = Rp * arcR * st.ar;
    var x = -Rp * Math.sin(phi);
    var z = -Rp * Math.cos(phi);
    var y = (v - 0.5) * Hp - st.lift;

    var yw = st.effYaw * RAD;
    var D = eyeD();
    x -= D * Math.sin(yw);
    z += D * Math.cos(yw);

    var cy = Math.cos(yw), sy = Math.sin(yw);
    var qx = x * cy + z * sy;
    var qz = -x * sy + z * cy;

    var pt = st.effPitch * RAD;
    var cx = Math.cos(pt), sx = Math.sin(pt);
    var x1 = qx * st.zoom;
    var y1 = y * st.zoom;
    var y2 = y1 * cx - qz * sx;
    var z2 = y1 * sx + qz * cx;

    var den = st.P - z2;
    if (den < 40) return { x: -9999, y: -9999, k: 0, vis: false };
    var k = st.P / den;
    return { x: st.W / 2 + x1 * k, y: st.H / 2 + y2 * k, k: k, vis: true };
  }

  /* 能转到哪儿。一整圈接死了就没有「到头」这回事 */
  function limYaw() {
    if (st.arc >= 359.5) return 180;
    var base = Math.max(0, st.arc / 2 - (st.half || 45) - 4);
    if (st.neck > 0) {
      for (var k = 0; k < 2; k++) {
        var de = Math.atan(st.neck * Math.sin(base * RAD)) / RAD;
        base = Math.max(0, st.arc / 2 - (st.half || 45) - 4 - de);
      }
    }
    return base;
  }

  function limPitch() {
    var Rp = wallR();
    var halfH = Rp * (st.arc * RAD) * st.ar / 2;
    var edge = Math.atan(halfH / Rp) / RAD;
    var tv = Math.atan((st.H / 2) * (st.P + st.R) / (st.P * st.R)) / RAD;
    var m = st.neck > 0 ? Math.atan(st.neck * Math.sin(Math.min(40, edge) * RAD)) / RAD : 0;
    /* 余量从 1° 收到 0.5°：视野推到 90° 之后，edge−tv 只剩 12.5°，
       再扣 1° 就抬不起头了。0.5° 在 803 px 高的画布上是 7 px 的边，
       够挡住浮点误差。 */
    return Math.max(0, edge - tv - 0.5 - m);
  }
  function degPerPx() { return (180 / Math.PI) / (st.P * st.R / (st.P + st.R)); }

  function hide() {
    var host = $("panoRoot");
    if (host) { host.classList.remove("on"); host.style.background = "none"; }
    st.on = false;
  }

  window.RS_PANO = {
    build: build,
    measure: measure,
    setCam: setCam,
    applyCam: applyCam,
    project: project,
    limYaw: limYaw,
    limPitch: limPitch,
    degPerPx: degPerPx,
    hide: hide,
    relayout: draw,
    /* 行军段用：u 方向平移整幅图（造前进），lift 抬落眼位（造脚步）。
       lift 正值 = 眼往下沉，画面整体往上抬。 */
    setShift: function (du, dv) { st.shift[0] = du || 0; st.shift[1] = dv || 0; },
    setLift: function (h) { st.lift = h || 0; },
    /* 关掉「站不稳」的慢摆 —— 自检呼吸的时候要一个绝对静止的相机，
       否则整幅画面都在动，分不清是呼吸还是镜头。 */
    setIdle: function (v) { st.idle = !!v; },
    /* 视差开关：不传参就切换，传 1 / 0 直接设定。没有深度图的站点返回 0。
       打开时回到这一站的标称强度 parK，不是死写 1。 */
    setParallax: function (k) {
      st.par = (k == null) ? (st.par > 0 ? 0 : st.parK) : (k ? st.parK : 0);
      if (st.on) draw();
      paintTag();
      return st.hasDepth ? st.par : 0;
    },
    /* 直接改强度（调参用，不进 UI）。 */
    setParallaxK: function (k) {
      st.parK = Math.max(0, Math.min(2, k || 0));
      if (st.par > 0) st.par = st.parK;
      if (st.on) draw();
      return st.par;
    },
    get on() { return st.on; },
    get arc() { return st.arc; },
    get closed() { return st.arc >= 359.5; },
    get gl() { return !!gl; },
    get state() {
      return { P: st.P, R: st.R, arc: st.arc, ar: st.ar, yaw: st.yaw,
        pitch: st.pitch, zoom: st.zoom, half: st.half, neck: st.neck,
        eye: eyeD(), Rp: wallR(), Hp: wallR() * (st.arc * RAD) * st.ar,
        limYaw: limYaw(), limPitch: limPitch(), webgl: !!gl,
        breathe: st.bre.length, glow: st.glow.length, flow: st.flow.length,
        rain: !!st.rain, snow: !!st.snow,
        para: st.hasDepth ? st.par : 0, hasDepth: st.hasDepth,
        shift: [st.shift[0], st.shift[1]], lift: st.lift,
        pot: texMax };
    }
  };
})();
