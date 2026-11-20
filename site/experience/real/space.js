/* 360° AI 历史场景复原。坐标以处理后的全景左上为 (0,0)，右下为 (1,1)。
   notes 和 cast 按节点卡片与人物脚本的索引排列。null 表示该条在档案中查看。
   fork 按路线表里的支线顺序排列。区域特效的 ru、rv 分别以图宽、图高为单位。 */
window.RS_SPACE = Object.fromEntries(Object.entries({
  "leg-road": { img: "nightroad360-sunburst", par: 0.6 },
  "node-00": {
    img: "ruijin360-flare",
    notes: [null, [0.478, 0.528], null],
    cast: [null, [0.534, 0.544]],
    fork: [[0.30, 0.63]]
  },
  "node-00s": {
    img: "yinyuan360-flare", par: 0.8,
    notes: [[0.518, 0.590], null, [0.809, 0.531]],
    cast: [null, null],
    glow: [[0.505, 0.546, 0.03, 0.28]]
  },
  "node-01": {
    img: "yudu360-flare",
    notes: [[0.463, 0.674], [0.365, 0.693], [0.533, 0.496]],
    cast: [null, [0.515, 0.486]],
    glow: [[0.365, 0.693, 0.04, 0.30]]
  },
  "node-01b": {
    img: "fengsuo360-flare",
    notes: [null, null, null],
    cast: [null, null],
    fork: [[0.68, 0.60]],
    rain: [0, 0, 1, 1, 0.52]
  },
  "node-02p": {
    img: "shazhou360c-flare", par: 0.8,
    notes: [[0.491, 0.588], null, [0.245, 0.596]],
    cast: [null, null, null],
    rain: [0.212, 0.415, 0.277, 0.662, 0.65]
  },
  "node-02": {
    img: "xiangjiang360-flare",
    notes: [null, [0.605, 0.665], [0.262, 0.561]],
    cast: [null, [0.285, 0.545]],
    fork: [[0.77, 0.64]]
  },
  "node-02q": {
    img: "xiangjiang360-flare", yaw: -35,
    notes: [[0.285, 0.561], null, [0.427, 0.544]],
    cast: [null, null]
  },
  "node-03": {
    img: "laoshanjie360-sunburst",
    notes: [[0.314, 0.565], [0.656, 0.466], null],
    cast: [null, null],
    rain: [0, 0, 1, 1, 0.30]
  },
  "node-03a": {
    img: "tongdao360-sunburst",
    notes: [[0.513, 0.410], null, [0.507, 0.750]],
    cast: [null, null],
    fork: [[0.70, 0.63]],
    glow: [[0.513, 0.410, 0.035, 0.24]]
  },
  "node-03b": {
    img: "wujiang360-sunburst",
    notes: [[0.473, 0.710], [0.770, 0.344], [0.277, 0.514]],
    cast: [null, null],
    glow: [[0.277, 0.514, 0.03, 0.25]],
    flow: [[0.65, 0.63, 0.13, 0.06]]
  },
  "node-03c": {
    img: "biaoyu360-sunburst",
    notes: [[0.163, 0.483], null, [0.684, 0.663]],
    cast: [null, null, null]
  },
  "node-04": {
    img: "zunyi360-sunburst",
    notes: [[0.442, 0.352], null, null],
    cast: [null, null],
    fork: [[0.80, 0.62]]
  },
  "node-04p": {
    img: "hongjunfen360-sunburst",
    notes: [null, [0.624, 0.523], null],
    cast: [null, null]
  },
  "node-05a": {
    img: "tucheng360-flare",
    notes: [[0.270, 0.720], null, [0.223, 0.552]],
    cast: [[0.205, 0.522], null],
    glow: [[0.223, 0.552, 0.025, 0.27]]
  },
  "node-05b": {
    img: "loushanguan360-flare",
    notes: [null, null, [0.530, 0.800]],
    cast: [null, null]
  },
  "node-05": {
    img: "chishui360-flare",
    notes: [[0.640, 0.640], [0.410, 0.820], [0.280, 0.460], null],
    cast: [null, null],
    flow: [[0.64, 0.642, 0.18, 0.062]]
  },
  "node-06": {
    img: "jinshajiang360-flare",
    notes: [[0.520, 0.720], [0.738, 0.560], [0.390, 0.380]],
    cast: [null, null],
    fork: [[0.80, 0.68]],
    flow: [[0.39, 0.648, 0.17, 0.065]]
  },
  "node-06c": {
    img: "jiaopingdu360-sunburst",
    notes: [null, [0.250, 0.515], [0.460, 0.400]],
    cast: [null, [0.245, 0.510]]
  },
  "node-06a": {
    img: "yihai360-flare",
    notes: [[0.680, 0.710], [0.580, 0.610], [0.500, 0.500]],
    cast: [null, null],
    fork: [[0.73, 0.60]]
  },
  "node-06d": {
    img: "huqi360-sunburst", par: 0.8,
    notes: [[0.104, 0.660], [0.351, 0.680], [0.755, 0.490]],
    cast: [null, null],
    glow: [[0.351, 0.680, 0.055, 0.34]]
  },
  "node-06b": {
    img: "anshunchang360-flare",
    notes: [[0.337, 0.610], null, [0.615, 0.830]],
    cast: [null, null],
    flow: [[0.69, 0.587, 0.18, 0.07]]
  },
  "node-07": {
    img: "luding360-flare",
    notes: [[0.580, 0.715], null, [0.440, 0.820]]
  },
  "node-08": {
    img: "jinshan360-flare",
    notes: [[0.531, 0.545], [0.573, 0.526], [0.396, 0.464]],
    cast: [null, null],
    rain: [0, 0, 1, 1, 0.40, "snow"]
  },
  "node-08a": {
    img: "maogong360-flare",
    notes: [[0.322, 0.548], [0.503, 0.542], [0.526, 0.319]],
    cast: [[0.155, 0.533], [0.485, 0.535]]
  },
  "node-08b": {
    img: "caodi360-flare",
    notes: [[0.513, 0.535], [0.806, 0.594], [0.573, 0.487]],
    cast: [null, [0.552, 0.531]],
    fork: [[0.76, 0.68], [0.25, 0.63]],
    rain: [0, 0, 1, 1, 0.44]
  },
  "node-08p": {
    img: "pidai360-flare",
    notes: [null, null, [0.444, 0.535]],
    cast: [null, [0.590, 0.557]],
    glow: [[0.514, 0.552, 0.035, 0.30]]
  },
  "node-08q": {
    img: "fadianji360-flare",
    notes: [[0.463, 0.535], null, [0.329, 0.417]],
    cast: [[0.443, 0.503], null]
  },
  "node-09a": {
    img: "lazikou360-flare",
    notes: [[0.498, 0.626], null, null],
    cast: [null, null],
    fork: [[0.29, 0.63]]
  },
  "node-09s": {
    img: "yunguichuan360-sunburst",
    notes: [null, null, [0.592, 0.176]],
    cast: [null, null]
  },
  "node-09b": {
    img: "hadapu360-sunburst",
    notes: [[0.601, 0.622], [0.295, 0.621], [0.119, 0.586]],
    cast: [null, null]
  },
  "node-09": {
    img: "wuqi360-sunburst",
    notes: [[0.428, 0.522], [0.835, 0.580], [0.562, 0.550], [0.570, 0.463]],
    cast: [null, null]
  }
}).map(function ([id, scene]) {
  return [id, Object.assign({ arc: 360, ar: 0.5, neck: 0.12 }, scene, {
    img: "real/img/wide/" + scene.img + ".jpg"
  })];
}));
