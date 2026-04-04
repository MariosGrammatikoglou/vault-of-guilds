import React, { useEffect, useState } from "react";
import { cuteScroll } from "../ui";

type ScreenSource = {
  id: string;
  name: string;
  thumbnail: string;
  appIcon: string | null;
};

// Known system/invisible windows to skip
const SKIP_PATTERNS = [
  /rzmonitor/i,
  /nvidia geforce/i,
  /geforce overlay/i,
  /gdi\+? window/i,
  /default ime/i,
  /msctfime/i,
  /program manager/i,
  /windows shell/i,
  /dwm\.exe/i,
  /task switching/i,
  /action center/i,
  /search highlight/i,
  /cortana/i,
  /^settings$/i,
  /^desktop window/i,
  /^applicationframehost/i,
  /nvidia share/i,
  /radeon overlay/i,
  /msi afterburner/i,
  /rivatuner/i,
  /fraps/i,
  /evga precision/i,
  /^$/, // empty name
];

function isRealWindow(s: ScreenSource): boolean {
  const name = s.name?.trim() ?? "";
  if (name.length < 2) return false;
  // Screens (entire monitor) always pass
  if (s.id.startsWith("screen:")) return true;
  // Filter out known system/overlay windows
  return !SKIP_PATTERNS.some((p) => p.test(name));
}

type Props = {
  onSelect: (sourceId: string) => void;
  onClose: () => void;
};

export default function ScreenShareModal({ onSelect, onClose }: Props) {
  const [sources, setSources] = useState<ScreenSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const srcs = await (window.ipcRenderer as any).invoke("get-screen-sources") as ScreenSource[];
        const valid = srcs.filter(isRealWindow);
        setSources(valid);
      } catch (e: any) {
        setError(e?.message || "Could not load screen sources");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const screens = sources.filter((s) => s.id.startsWith("screen:"));
  const windows = sources.filter((s) => s.id.startsWith("window:"));

  return (
    <div
      className="fixed inset-0 z-[92] flex items-center justify-center bg-black/55 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border border-white/15 bg-[#111626]/97 backdrop-blur-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
          <h3 className="font-semibold text-white/90 text-sm">Share Your Screen</h3>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className={`flex-1 overflow-y-auto ${cuteScroll} p-5 space-y-5`}>
          {loading && (
            <div className="text-center text-white/50 text-sm py-8">loading sources...</div>
          )}
          {error && (
            <div className="text-center text-red-300 text-sm py-8">{error}</div>
          )}

          {!loading && !error && screens.length > 0 && (
            <SourceGroup
              title="Entire Screen"
              sources={screens}
              onSelect={onSelect}
            />
          )}

          {!loading && !error && windows.length > 0 && (
            <SourceGroup
              title="Application Windows"
              sources={windows}
              onSelect={onSelect}
            />
          )}

          {!loading && !error && sources.length === 0 && (
            <div className="text-center text-white/40 text-sm py-8">
              No shareable sources found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SourceGroup({
  title,
  sources,
  onSelect,
}: {
  title: string;
  sources: ScreenSource[];
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-white/50 mb-3">{title}</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {sources.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/4 hover:bg-white/8 hover:border-indigo-300/40 p-2 transition-colors text-left group"
          >
            <div className="w-full aspect-video rounded-lg overflow-hidden bg-black/30 shrink-0">
              {s.thumbnail ? (
                <img
                  src={s.thumbnail}
                  alt={s.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20 text-2xl">
                  🖥
                </div>
              )}
            </div>
            <span className="text-[12px] text-white/75 truncate w-full text-center group-hover:text-white/95 transition-colors">
              {s.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
