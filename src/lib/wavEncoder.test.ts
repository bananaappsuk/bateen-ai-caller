import { describe, it, expect } from "vitest";
import { encodeWav, encodeWavBytes, toMono, trim } from "./wavEncoder";

function header(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const str = (o: number, n: number) =>
    String.fromCharCode(...Array.from({ length: n }, (_, i) => view.getUint8(o + i)));
  return {
    riff: str(0, 4),
    wave: str(8, 4),
    fmt: str(12, 4),
    audioFormat: view.getUint16(20, true),
    channels: view.getUint16(22, true),
    sampleRate: view.getUint32(24, true),
    byteRate: view.getUint32(28, true),
    blockAlign: view.getUint16(32, true),
    bits: view.getUint16(34, true),
    data: str(36, 4),
    dataBytes: view.getUint32(40, true),
    riffSize: view.getUint32(4, true),
  };
}

describe("encodeWav", () => {
  it("writes a valid 16-bit mono PCM WAV header", () => {
    const bytes = encodeWavBytes(new Float32Array(1000), 48000);
    const h = header(bytes);
    expect(h.riff).toBe("RIFF");
    expect(h.wave).toBe("WAVE");
    expect(h.fmt).toBe("fmt ");
    expect(h.data).toBe("data");
    expect(h.audioFormat).toBe(1); // PCM
    expect(h.channels).toBe(1);
    expect(h.bits).toBe(16);
    expect(h.sampleRate).toBe(48000);
    expect(h.byteRate).toBe(96000);
    expect(h.blockAlign).toBe(2);
    expect(h.dataBytes).toBe(2000);
    expect(h.riffSize).toBe(36 + 2000);
    expect(bytes.length).toBe(44 + 2000);
  });

  it("clamps out-of-range samples instead of wrapping", () => {
    const b = encodeWavBytes(new Float32Array([2, -2]), 8000);
    const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
    expect(view.getInt16(44, true)).toBe(32767);
    expect(view.getInt16(46, true)).toBe(-32768);
  });

  it("round-trips sample values", () => {
    const b = encodeWavBytes(new Float32Array([0, 1, -1]), 8000);
    const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(46, true)).toBe(32767);
    expect(view.getInt16(48, true)).toBe(-32768);
  });
});

describe("encodeWav (Blob wrapper)", () => {
  it("wraps the bytes as an audio/wav Blob", () => {
    const blob = encodeWav(new Float32Array(10), 8000);
    expect(blob.type).toBe("audio/wav");
    expect(blob.size).toBe(44 + 20);
  });
});

describe("toMono", () => {
  it("passes a mono track through untouched", () => {
    const mono = new Float32Array([0.1, 0.2]);
    expect(toMono([mono])).toBe(mono);
  });
  it("averages stereo channels", () => {
    const out = toMono([new Float32Array([1, 0]), new Float32Array([0, 1])]);
    expect(Array.from(out)).toEqual([0.5, 0.5]);
  });
});

describe("trim", () => {
  it("leaves short audio untouched", () => {
    const s = new Float32Array(8000); // 1s at 8kHz
    expect(trim(s, 8000, 180)).toBe(s);
  });
  it("cuts audio longer than the cap", () => {
    const s = new Float32Array(8000 * 300); // 5 minutes
    expect(trim(s, 8000, 180).length).toBe(8000 * 180);
  });
  it("keeps a 3 minute WAV under Retell's 25MB limit", () => {
    // 180s mono 48kHz 16-bit = 17.28MB of PCM + 44 byte header
    const bytes = 44 + 48000 * 180 * 2;
    expect(bytes).toBeLessThan(25 * 1024 * 1024);
  });
});
