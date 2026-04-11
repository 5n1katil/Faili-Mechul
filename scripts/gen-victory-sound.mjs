import { writeFileSync, mkdirSync } from "fs";

const SAMPLE_RATE = 44100;
const MAX_VAL = 32767;

function generateTone(freq, startSec, durationSec, peakAmplitude, totalSamples, buf) {
  const startSample = Math.floor(startSec * SAMPLE_RATE);
  const endSample = Math.min(startSample + Math.floor(durationSec * SAMPLE_RATE), totalSamples);
  const attackSamples = Math.floor(0.02 * SAMPLE_RATE);
  const releaseSamples = Math.floor(0.05 * SAMPLE_RATE);
  const noteSamples = endSample - startSample;
  for (let i = startSample; i < endSample; i++) {
    const localI = i - startSample;
    let env = 1.0;
    if (localI < attackSamples) env = localI / attackSamples;
    else if (localI > noteSamples - releaseSamples) env = Math.max(0, (noteSamples - localI) / releaseSamples);
    const sample = Math.sin(2 * Math.PI * freq * i / SAMPLE_RATE) * env * peakAmplitude;
    buf[i] = (buf[i] || 0) + sample;
  }
}

// Add a gentle harmonic overtone to enrich the tone
function generateToneRich(freq, startSec, durationSec, peakAmplitude, totalSamples, buf) {
  generateTone(freq,        startSec, durationSec, peakAmplitude * 0.75, totalSamples, buf);
  generateTone(freq * 2,    startSec, durationSec, peakAmplitude * 0.18, totalSamples, buf);
  generateTone(freq * 3,    startSec, durationSec, peakAmplitude * 0.07, totalSamples, buf);
}

const TOTAL_DURATION = 1.5;
const totalSamples = Math.floor(TOTAL_DURATION * SAMPLE_RATE);
const buf = new Float32Array(totalSamples);

// C Major ascending fanfare (rich tones)
generateToneRich(261.63, 0.00, 0.24, 0.50, totalSamples, buf);  // C4
generateToneRich(329.63, 0.20, 0.24, 0.50, totalSamples, buf);  // E4
generateToneRich(392.00, 0.38, 0.26, 0.50, totalSamples, buf);  // G4
generateToneRich(523.25, 0.56, 0.24, 0.50, totalSamples, buf);  // C5

// Final chord: C4+E4+G4+C5 together (each 0.20 amplitude)
generateToneRich(261.63, 0.72, 0.78, 0.18, totalSamples, buf);
generateToneRich(329.63, 0.72, 0.78, 0.18, totalSamples, buf);
generateToneRich(392.00, 0.72, 0.78, 0.18, totalSamples, buf);
generateToneRich(523.25, 0.72, 0.78, 0.18, totalSamples, buf);

// Fade-out (last 220ms)
const fadeStart = Math.floor((TOTAL_DURATION - 0.22) * SAMPLE_RATE);
for (let i = fadeStart; i < totalSamples; i++) {
  buf[i] *= 1 - (i - fadeStart) / (totalSamples - fadeStart);
}

// Normalize to 90% headroom
let peak = 0;
for (const v of buf) if (Math.abs(v) > peak) peak = Math.abs(v);
const gain = peak > 0 ? 0.9 / peak : 1;

// Write WAV
const dataSize = totalSamples * 2;
const header = Buffer.alloc(44);
header.write("RIFF", 0);         header.writeUInt32LE(36 + dataSize, 4);
header.write("WAVE", 8);         header.write("fmt ", 12);
header.writeUInt32LE(16, 16);    header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);     header.writeUInt32LE(SAMPLE_RATE, 24);
header.writeUInt32LE(SAMPLE_RATE * 2, 28); header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);    header.write("data", 36);
header.writeUInt32LE(dataSize, 40);

const pcm = Buffer.alloc(dataSize);
for (let i = 0; i < totalSamples; i++) {
  const s = Math.max(-MAX_VAL, Math.min(MAX_VAL, Math.round(buf[i] * gain * MAX_VAL)));
  pcm.writeInt16LE(s, i * 2);
}

mkdirSync("artifacts/dedektif/assets/sounds", { recursive: true });
writeFileSync("artifacts/dedektif/assets/sounds/victory.wav", Buffer.concat([header, pcm]));
console.log("victory.wav yazıldı:", TOTAL_DURATION + "s,", totalSamples, "örnek,", (dataSize/1024).toFixed(1) + " KB PCM");
