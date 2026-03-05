let lastNotify = 0;
const NOTIFY_DEBOUNCE_MS = 2500;

function playBeep() {
  try {
    const ctx = new (globalThis.AudioContext || (globalThis as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // ignore if AudioContext not supported
  }
}


export function notifyOrderStatusUpdate(voiceEnabled = true) {
  if (globalThis.document?.visibilityState !== 'visible') return;
  const now = Date.now();
  if (now - lastNotify < NOTIFY_DEBOUNCE_MS) return;
  lastNotify = now;

  playBeep();
  const synth = (globalThis as any).speechSynthesis;
  if (voiceEnabled && synth !== undefined) {
    synth.cancel();
    const u = new SpeechSynthesisUtterance('Có cập nhật đơn hàng. Vui lòng kiểm tra.');
    u.lang = 'vi-VN';
    u.rate = 0.95;
    u.volume = 1;
    synth.speak(u);
  }
}
