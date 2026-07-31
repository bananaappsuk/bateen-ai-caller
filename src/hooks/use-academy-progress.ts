import { useCallback, useState } from "react";

// Per-lesson watch progress, persisted so a learner can close the tab and
// resume exactly where they left off. Keyed by lesson id, not video src, so
// progress survives a file getting renamed.

const PROGRESS_KEY = "ai_academy_progress_v1";
const COMPLETE_THRESHOLD = 0.9;

export interface LessonProgress {
  position: number;
  duration: number;
  completed: boolean;
  updatedAt: number;
}

type ProgressMap = Record<string, LessonProgress>;

function readProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

function writeProgress(map: ProgressMap) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
  } catch {
    // Storage unavailable (private browsing, quota, etc.) — progress just
    // won't persist across sessions; playback itself keeps working.
  }
}

export function useAcademyProgress() {
  const [progress, setProgress] = useState<ProgressMap>(readProgress);

  const getProgress = useCallback(
    (lessonId: string): LessonProgress | undefined => progress[lessonId],
    [progress],
  );

  const recordProgress = useCallback((lessonId: string, position: number, duration: number) => {
    setProgress((prev) => {
      const already = prev[lessonId];
      const completed = Boolean(already?.completed) || (duration > 0 && position / duration >= COMPLETE_THRESHOLD);
      const next: ProgressMap = {
        ...prev,
        [lessonId]: { position, duration, completed, updatedAt: Date.now() },
      };
      writeProgress(next);
      return next;
    });
  }, []);

  return { progress, getProgress, recordProgress };
}
