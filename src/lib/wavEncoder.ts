// Browser recordings -> WAV.
//
// Retell's clone-voice endpoint accepts only wav, mp3 or m4a (verified: a webm
// upload returns "Voice cloning only supports audio formats: wav, mp3, or m4a").
// Chrome's MediaRecorder produces webm/opus, so a recording has to be decoded
// and re-encoded as WAV before upload.
//
// encodeWav() is kept pure (no browser APIs) so it can be unit tested; the
// decode step lives in blobToWav().

/**
 * 16-bit PCM mono WAV bytes from float samples in [-1, 1]. Returns raw bytes
 * rather than a Blob so it stays pure and testable outside a browser.
 */
export function encodeWavBytes(samples: Float32Array, sampleRate: number): Uint8Array {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  const dataBytes = samples.length * 2;
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true); // chunk size
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // PCM header size
  view.setUint16(20, 1, true); // format = PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate (mono, 2 bytes/sample)
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, dataBytes, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    // Clamp before scaling so a hot mic can't wrap around into noise.
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Uint8Array(buffer);
}

/** 16-bit PCM mono WAV as a Blob, ready to upload. */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  return new Blob([encodeWavBytes(samples, sampleRate)], { type: "audio/wav" });
}

/** Average all channels down to mono. */
export function toMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0];
  const length = channels[0].length;
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let c = 0; c < channels.length; c++) sum += channels[c][i];
    out[i] = sum / channels.length;
  }
  return out;
}

/** Keep at most `maxSeconds` of audio (cloning needs a sample, not a whole file). */
export function trim(samples: Float32Array, sampleRate: number, maxSeconds: number): Float32Array {
  const max = Math.floor(sampleRate * maxSeconds);
  return samples.length <= max ? samples : samples.subarray(0, max);
}

/**
 * Decode any audio the browser can read (webm, ogg, aac, mp4, flac, mp3, wav…)
 * and re-encode it as mono WAV, which is one of the three formats Retell's
 * clone endpoint accepts. Trimmed so a long upload can't exceed the size cap:
 * 180s mono 48kHz 16-bit is ~17MB, comfortably under the 25MB limit.
 */
export async function blobToWav(blob: Blob, maxSeconds = 180): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const Ctx: typeof AudioContext =
    window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    const channels: Float32Array[] = [];
    for (let c = 0; c < decoded.numberOfChannels; c++) channels.push(decoded.getChannelData(c));
    return encodeWav(trim(toMono(channels), decoded.sampleRate, maxSeconds), decoded.sampleRate);
  } finally {
    void ctx.close();
  }
}
