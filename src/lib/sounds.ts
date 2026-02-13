const AudioContext =
  typeof window !== "undefined"
    ? window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext
    : null;

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (!AudioContext) return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function playSuccess() {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  gain.gain.value = 0.08;
  osc.frequency.value = 880;
  osc.type = "sine";
  osc.start(c.currentTime);
  osc.frequency.setValueAtTime(880, c.currentTime);
  osc.frequency.setValueAtTime(1108, c.currentTime + 0.08);
  gain.gain.setValueAtTime(0.08, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
  osc.stop(c.currentTime + 0.25);
}

export function playError() {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  gain.gain.value = 0.06;
  osc.frequency.value = 330;
  osc.type = "sine";
  osc.start(c.currentTime);
  osc.frequency.setValueAtTime(330, c.currentTime);
  osc.frequency.setValueAtTime(220, c.currentTime + 0.1);
  gain.gain.setValueAtTime(0.06, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
  osc.stop(c.currentTime + 0.3);
}
