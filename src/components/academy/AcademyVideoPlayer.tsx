import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, VideoOff } from "lucide-react";
import { Slider } from "@/components/ui/slider";

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface AcademyVideoPlayerProps {
  /** Changing this remounts the player state for a freshly selected lesson. */
  lessonId: string;
  src?: string;
  initialPosition?: number;
  autoPlay?: boolean;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
}

const AcademyVideoPlayer = ({
  lessonId,
  src,
  initialPosition = 0,
  autoPlay = false,
  onProgress,
  onEnded,
}: AcademyVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resumedRef = useRef(false);
  const lastSavedRef = useRef(0);
  const liveRef = useRef({ time: 0, duration: 0 });

  const [hasError, setHasError] = useState(!src);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fresh state every time a different lesson is selected.
  useEffect(() => {
    setHasError(!src);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPlaybackRate(1);
    resumedRef.current = false;
    lastSavedRef.current = 0;
    liveRef.current = { time: 0, duration: 0 };
  }, [lessonId, src]);

  // Persist whatever position we reached if the player unmounts mid-watch
  // (e.g. the lesson dialog gets closed) rather than only on the 2s tick.
  useEffect(() => {
    return () => {
      if (liveRef.current.duration > 0) {
        onProgress?.(liveRef.current.time, liveRef.current.duration);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    liveRef.current.duration = video.duration;
    if (!resumedRef.current) {
      resumedRef.current = true;
      if (initialPosition > 1 && initialPosition < video.duration - 1) {
        video.currentTime = initialPosition;
      }
    }
    if (autoPlay) {
      video.play().catch(() => {
        // Autoplay blocked by the browser — the visible Play button still works.
      });
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    liveRef.current = { time: video.currentTime, duration: video.duration };
    if (Math.abs(video.currentTime - lastSavedRef.current) >= 2) {
      lastSavedRef.current = video.currentTime;
      onProgress?.(video.currentTime, video.duration);
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    const video = videoRef.current;
    if (video) onProgress?.(video.currentTime, video.duration);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    const video = videoRef.current;
    if (video) onProgress?.(video.duration, video.duration);
    onEnded?.();
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    const next = value[0];
    video.volume = next;
    video.muted = next === 0;
    setVolume(next);
    setMuted(next === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const handleSpeedChange = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else container.requestFullscreen().catch(() => {});
  };

  if (hasError || !src) {
    return (
      <div className="relative aspect-video w-full rounded-xl bg-slate-900 flex flex-col items-center justify-center text-center px-6">
        <VideoOff className="h-10 w-10 text-slate-500 mb-3" />
        <p className="text-sm font-medium text-slate-300">Video coming soon</p>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          This lesson's video hasn't been uploaded yet. Check back soon.
        </p>
      </div>
    );
  }

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div ref={containerRef} className="relative w-full rounded-xl overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={src}
        className="w-full aspect-video bg-black"
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={() => setHasError(true)}
        onClick={togglePlay}
      />

      {/* Watched-so-far indicator */}
      <div className="absolute top-0 inset-x-0 h-0.5 bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] transition-[width]"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Custom control bar */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent pt-8 pb-3 px-3 sm:px-4">
        <Slider
          value={[currentTime]}
          min={0}
          max={duration || 1}
          step={0.1}
          onValueChange={handleSeek}
          aria-label="Seek"
          className="mb-2 cursor-pointer [&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&_[role=slider]]:border-[#00D4FF]"
        />
        <div className="flex items-center gap-3 text-white">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="shrink-0 hover:text-cyan-300 transition-colors"
          >
            {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
          </button>

          <div className="hidden sm:flex items-center gap-2 w-24">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className="shrink-0 hover:text-cyan-300 transition-colors"
            >
              {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <Slider
              value={[muted ? 0 : volume]}
              min={0}
              max={1}
              step={0.05}
              onValueChange={handleVolumeChange}
              aria-label="Volume"
              className="cursor-pointer [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
            />
          </div>

          <span className="text-xs font-medium tabular-nums text-white/80 shrink-0">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          <select
            value={playbackRate}
            onChange={(e) => handleSpeedChange(Number(e.target.value))}
            aria-label="Playback speed"
            className="bg-transparent text-xs font-medium text-white/80 hover:text-white border border-white/20 rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-cyan-300"
          >
            {SPEED_OPTIONS.map((rate) => (
              <option key={rate} value={rate} className="text-slate-900">
                {rate}x
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            className="shrink-0 hover:text-cyan-300 transition-colors"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AcademyVideoPlayer;
