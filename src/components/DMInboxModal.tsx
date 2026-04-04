import React, { useEffect, useState } from "react";
import { cuteScroll } from "../ui";
import { listDmChannels, type DmChannel } from "../lib/api";

type Props = {
  onOpenChannel: (channel: DmChannel) => void;
  onClose: () => void;
};

export default function DMInboxModal({ onOpenChannel, onClose }: Props) {
  const [channels, setChannels] = useState<DmChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listDmChannels()
      .then((list) => { setChannels(list); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div
      className="fixed inset-0 z-[88] flex items-start justify-center pt-[10vh] bg-black/45 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#111626]/97 backdrop-blur-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="font-semibold text-white/90 text-sm">Direct Messages</h3>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className={`max-h-[60vh] overflow-y-auto ${cuteScroll} p-2`}>
          {loading && (
            <div className="text-center text-xs text-white/40 py-6">loading...</div>
          )}

          {!loading && channels.length === 0 && (
            <div className="text-center text-xs text-white/35 py-6 px-4">
              No conversations yet. Open a DM from a member's profile.
            </div>
          )}

          {channels.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => { onOpenChannel(ch); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/7 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-full bg-indigo-500/25 border border-indigo-300/20 flex items-center justify-center text-indigo-200 font-semibold text-sm shrink-0">
                {ch.other_username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm text-white/88 font-medium truncate">
                  {ch.other_username}
                </div>
                <div className="text-[11px] text-white/35 truncate">
                  Direct message
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
