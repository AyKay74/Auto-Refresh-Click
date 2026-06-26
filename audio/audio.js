// audio.js
let audioCtx = null;

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'PLAY_CHIME') {
    playHighGainChime(msg.volume !== undefined ? msg.volume : 0.5);
  }
});

function playHighGainChime(volFactor) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;

    const tones = [
      { freq: 880.0,  start: 0.0,  dur: 0.35, peak: 0.52 }, 
      { freq: 1318.5, start: 0.0,  dur: 0.35, peak: 0.28 }, 
      { freq: 1046.5, start: 0.18, dur: 3.2,  peak: 0.62 },  
      { freq: 1568.0, start: 0.18, dur: 3.2,  peak: 0.33 }   
    ];

    tones.forEach((t) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(t.freq, now + t.start);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      const t0 = now + t.start;
      const t1 = t0 + t.dur;
      const targetGain = t.peak * volFactor;
      
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(targetGain, t0 + 0.015); 
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, targetGain * 0.4), t0 + (t.dur * 0.3)); 
      gain.gain.exponentialRampToValueAtTime(0.0001, t1); 
      
      osc.start(t0);
      osc.stop(t1 + 0.05);
    });
  } catch (e) {
    console.error(e);
  }
}
