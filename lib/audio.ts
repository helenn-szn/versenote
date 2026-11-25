// Audio helpers for sermon recordings, all in the browser.
// The AI transcript is made from short 16 kHz mono WAV pieces, so any length of sermon works
// and each upload stays well under the server's request size limit.

export const CHUNK_SECONDS = 60;
export const TARGET_RATE = 16000;

/** Encode mono float samples (-1..1) at `rate` as a 16-bit PCM WAV file. */
export function encodeWav(samples: Float32Array, rate = TARGET_RATE): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const str = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/** Simple averaging downsampler (input rate -> 16 kHz). Good enough for speech. */
export function downsample(input: Float32Array, fromRate: number, toRate = TARGET_RATE): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    out[i] = sum / Math.max(1, end - start);
  }
  return out;
}

/** Decode an uploaded audio or video file into WAV pieces for transcription. */
export async function fileToWavChunks(file: Blob, seconds = CHUNK_SECONDS): Promise<{ chunks: Blob[]; duration: number }> {
  const data = await file.arrayBuffer();
  // Decoding at 16 kHz keeps memory use down for long sermons.
  const Ctx = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  const ctx = new Ctx(1, TARGET_RATE, TARGET_RATE);
  const audio = await ctx.decodeAudioData(data);
  const rate = audio.sampleRate;
  const len = audio.length;
  const mono = new Float32Array(len);
  for (let c = 0; c < audio.numberOfChannels; c++) {
    const ch = audio.getChannelData(c);
    for (let i = 0; i < len; i++) mono[i] += ch[i] / audio.numberOfChannels;
  }
  const samples = downsample(mono, rate);
  const per = seconds * TARGET_RATE;
  const chunks: Blob[] = [];
  for (let i = 0; i < samples.length; i += per) chunks.push(encodeWav(samples.subarray(i, i + per)));
  return { chunks, duration: Math.round(audio.duration) };
}

/** Is this piece of audio basically silent? Skips sending silence to the AI. */
export function isSilent(samples: Float32Array): boolean {
  let peak = 0;
  for (let i = 0; i < samples.length; i += 8) peak = Math.max(peak, Math.abs(samples[i]));
  return peak < 0.01;
}

/** A recorder that keeps a compressed file for playback and hands out WAV pieces as it goes. */
export class SermonRecording {
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private proc: ScriptProcessorNode | null = null;
  private rec: MediaRecorder | null = null;
  private parts: Blob[] = [];
  private pcm: Float32Array[] = [];
  private pcmLen = 0;
  private started = 0;
  private pausedAt = 0;
  private pausedTotal = 0;
  paused = false;
  mimeType = "";

  constructor(private onChunk: (wav: Blob | null, index: number) => void) {}
  private index = 0;

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const types = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"];
    this.mimeType = types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) ?? "";
    this.rec = new MediaRecorder(this.stream, { ...(this.mimeType ? { mimeType: this.mimeType } : {}), audioBitsPerSecond: 32000 });
    this.rec.ondataavailable = (e) => e.data.size && this.parts.push(e.data);
    this.rec.start(5000);

    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.proc = this.ctx.createScriptProcessor(4096, 1, 1);
    const rate = this.ctx.sampleRate;
    this.proc.onaudioprocess = (e) => {
      if (this.paused) return;
      const piece = downsample(new Float32Array(e.inputBuffer.getChannelData(0)), rate);
      this.pcm.push(piece);
      this.pcmLen += piece.length;
      if (this.pcmLen >= CHUNK_SECONDS * TARGET_RATE) this.flush();
    };
    src.connect(this.proc);
    this.proc.connect(this.ctx.destination);
    this.started = Date.now();
  }

  private flush() {
    if (!this.pcmLen) return;
    const all = new Float32Array(this.pcmLen);
    let o = 0;
    for (const p of this.pcm) {
      all.set(p, o);
      o += p.length;
    }
    this.pcm = [];
    this.pcmLen = 0;
    this.onChunk(isSilent(all) ? null : encodeWav(all), this.index++);
  }

  pause() {
    this.paused = true;
    this.pausedAt = Date.now();
    this.rec?.pause();
  }

  resume() {
    this.paused = false;
    this.pausedTotal += Date.now() - this.pausedAt;
    this.rec?.resume();
  }

  elapsed(): number {
    if (!this.started) return 0;
    const now = this.paused ? this.pausedAt : Date.now();
    return Math.floor((now - this.started - this.pausedTotal) / 1000);
  }

  /** Stops everything and returns the compressed recording. */
  async stop(): Promise<{ file: Blob; duration: number }> {
    const duration = this.elapsed();
    this.flush();
    const done = new Promise<void>((r) => {
      if (!this.rec || this.rec.state === "inactive") return r();
      this.rec.onstop = () => r();
    });
    if (this.rec && this.rec.state !== "inactive") this.rec.stop();
    await done;
    this.proc?.disconnect();
    await this.ctx?.close().catch(() => {});
    this.stream?.getTracks().forEach((t) => t.stop());
    return { file: new Blob(this.parts, { type: this.mimeType || "audio/webm" }), duration };
  }
}
