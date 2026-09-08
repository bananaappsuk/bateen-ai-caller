import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, Upload, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { blobToWav } from "@/lib/wavEncoder";
import { cloneVoice, type ClonedVoice } from "@/services/voicesService";

// Retell accepts only wav / mp3 / m4a for cloning, so a browser recording
// (Chrome gives webm/opus) is re-encoded to WAV before upload.
// Retell only accepts wav/mp3/m4a, but the browser can decode far more, so we
// take any audio file and convert whatever isn't already in an accepted format.
const UPLOAD_ACCEPT = "audio/*,.wav,.mp3,.m4a,.aac,.ogg,.oga,.opus,.webm,.flac,.mp4,.amr";
const RETELL_READY = /\.(wav|mp3|m4a)$/i;
const MIN_SECONDS = 30;
const MAX_SECONDS = 180;

function mmss(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface VoiceRecorderProps {
  onCloned: (voice: ClonedVoice) => void;
}

const VoiceRecorder = ({ onCloned }: VoiceRecorderProps) => {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audio, setAudio] = useState<{ blob: Blob; url: string; name: string } | null>(null);
  const [voiceName, setVoiceName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Release the object URL and the mic if this unmounts mid-recording.
  useEffect(() => {
    return () => {
      clearTimer();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Hard stop at the maximum length. Done in an effect rather than inside the
  // interval's state updater, which must stay side-effect free.
  useEffect(() => {
    if (!recording || seconds < MAX_SECONDS) return;
    clearTimer();
    setRecording(false);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, [recording, seconds]);

  const setClip = (blob: Blob, name: string) => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    const url = URL.createObjectURL(blob);
    audioUrlRef.current = url;
    setAudio({ blob, url, name });
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setClip(new Blob(chunksRef.current, { type: recorder.mimeType }), "recording");
      };
      recorderRef.current = recorder;
      recorder.start();
      setAudio(null);
      setSeconds(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("Microphone access was blocked. Allow it in your browser, or upload an audio file instead.");
    }
  };

  const stopRecording = () => {
    clearTimer();
    setRecording(false);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const handleUpload = (file: File) => {
    setError(null);
    setSeconds(0);
    setClip(file, file.name);
  };

  const handleSubmit = async () => {
    if (!audio || !voiceName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      // Retell accepts only wav/mp3/m4a. An upload already in one of those is
      // sent untouched; anything else (a recording, or an ogg/aac/webm/flac
      // upload) is decoded and re-encoded to WAV first.
      const passThrough = audio.name !== "recording" && RETELL_READY.test(audio.name);
      const file = passThrough
        ? new File([audio.blob], audio.name, { type: audio.blob.type || "audio/wav" })
        : new File([await blobToWav(audio.blob)], "voice.wav", { type: "audio/wav" });
      onCloned(await cloneVoice(file, voiceName.trim()));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Voice cloning failed.";
      setError(
        /decode|EncodingError|Unable to decode/i.test(msg)
          ? "That audio file couldn't be read. Try a wav, mp3 or m4a recording."
          : msg,
      );
    } finally {
      setBusy(false);
    }
  };

  const tooShort = audio?.name === "recording" && seconds > 0 && seconds < MIN_SECONDS;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-600">
        Speak naturally for <strong>1 to 3 minutes</strong>, in the tone you want the agent to use. Use a quiet room
        and a decent microphone, and keep talking rather than reading single words.
      </div>

      <div className="flex items-center gap-3">
        {recording ? (
          <Button type="button" onClick={stopRecording} className="rounded-xl bg-red-500 hover:bg-red-600 text-white">
            <Square className="h-4 w-4 mr-2" /> Stop ({mmss(seconds)})
          </Button>
        ) : (
          <Button
            type="button"
            onClick={startRecording}
            disabled={busy}
            className="rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white hover:opacity-90"
          >
            <Mic className="h-4 w-4 mr-2" /> {audio ? "Record again" : "Start recording"}
          </Button>
        )}

        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer">
          <Upload className="h-4 w-4" />
          Upload audio
          <input
            type="file"
            accept={UPLOAD_ACCEPT}
            className="hidden"
            disabled={busy || recording}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {audio && (
        <div className="space-y-3">
          <audio src={audio.url} controls className="w-full" />
          {tooShort && (
            <p className="text-sm text-amber-600">
              That clip is only {mmss(seconds)}. Aim for at least {MIN_SECONDS} seconds for a usable voice.
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="voiceName">Voice name</Label>
            <Input
              id="voiceName"
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              placeholder="e.g. Ravi (my voice)"
              maxLength={200}
              className="rounded-xl"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={busy || !voiceName.trim()}
              className="rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white hover:opacity-90"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating voice…
                </>
              ) : (
                "Create voice"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setAudio(null);
                setSeconds(0);
              }}
              className="rounded-xl"
            >
              <RotateCcw className="h-4 w-4 mr-1.5" /> Discard
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default VoiceRecorder;
