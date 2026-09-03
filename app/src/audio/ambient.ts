// 环境声：用 WebAudio 实时合成的风声（布朗噪声 + 低通 + 缓慢起伏），
// 不依赖任何音频素材文件，零版权负担。首次启动必须在用户手势内调用。
type Engine = { ctx: AudioContext; gain: GainNode };

let engine: Engine | null = null;
let stopTimer: number | null = null;

function createEngine(): Engine {
  const ctx = new AudioContext();
  const seconds = 4;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // 布朗噪声：累积白噪声并做泄漏积分，听感接近远处的风。
  let last = 0;
  for (let i = 0; i < data.length; i += 1) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.2;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 420;
  lowpass.Q.value = 0.6;

  // 缓慢的起伏模拟一阵一阵的风。
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 180;
  lfo.connect(lfoGain).connect(lowpass.frequency);
  lfo.start();

  const gain = ctx.createGain();
  gain.gain.value = 0;

  source.connect(lowpass).connect(gain).connect(ctx.destination);
  source.start();

  return { ctx, gain };
}

export function startAmbient() {
  if (stopTimer !== null) {
    window.clearTimeout(stopTimer);
    stopTimer = null;
  }
  if (!engine) engine = createEngine();
  if (engine.ctx.state === "suspended") void engine.ctx.resume();
  engine.gain.gain.setTargetAtTime(0.16, engine.ctx.currentTime, 0.4);
}

export function stopAmbient() {
  if (!engine) return;
  engine.gain.gain.setTargetAtTime(0, engine.ctx.currentTime, 0.3);
  stopTimer = window.setTimeout(() => {
    engine?.ctx.suspend();
  }, 1200);
}
