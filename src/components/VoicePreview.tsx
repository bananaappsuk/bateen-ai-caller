import { useEffect, useRef, useState } from "react";
import { Play, Square, Volume2 } from "lucide-react";

interface Props {
  url?: string | null;
  label?: string;
}

const VoicePreview = ({ url, label }: Props) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => audioRef.current?.pause(), []);
  useEffect(() => {
    audioRef.current?.pause();
    setPlaying(false);
  }, [url]);

  const toggle = () => {
    if (!url) return;
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }
    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    audio.src = url;
    audio.onended = () => setPlaying(false);
    audio.onerror = () => setPlaying(false);
    void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!url}
      aria-label={playing ? `Stop ${label ?? "voice"} preview` : `Play ${label ?? "voice"} preview`}
      title={url ? "Hear this voice" : "No preview for this voice"}
      className="shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 transition-colors"
    >
      {!url ? <Volume2 className="h-4 w-4" /> : playing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
    </button>
  );
};

export default VoicePreview;
