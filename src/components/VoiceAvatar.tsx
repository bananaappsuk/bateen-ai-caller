import { useEffect, useState } from "react";
import { Mic } from "lucide-react";
import type { RetellVoice } from "@/services/retellService";

interface Props {
  voice?: RetellVoice | null;
}

const VoiceAvatar = ({ voice }: Props) => {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [voice?.voice_id]);

  const src = voice?.avatar_url;
  if (!src || broken) {
    return (
      <div className="shrink-0 h-10 w-10 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
        <Mic className="h-4 w-4 text-slate-400" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      onError={() => setBroken(true)}
      className="shrink-0 h-10 w-10 rounded-xl border border-slate-200 object-cover bg-slate-50"
    />
  );
};

export default VoiceAvatar;
