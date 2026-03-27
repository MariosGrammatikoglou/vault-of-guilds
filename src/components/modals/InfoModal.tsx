import React, { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function InfoModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#10182a] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-base sm:text-lg font-semibold text-slate-100">
            Info
          </h2>

          <button
            onClick={onClose}
            type="button"
            className="w-9 h-9 rounded-xl bg-[#1a2438] hover:bg-[#222f48] text-slate-300 text-lg leading-none transition"
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="space-y-2 text-sm text-slate-300">
            <p>
              This app lets you browse servers, create spaces and join spaces.
            </p>
          </div>

          <div className="pt-4 border-t border-white/10">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
              Credits
            </p>

            <p className="text-xs sm:text-sm text-slate-400 leading-6">
              Icons are from{" "}
              <a
                href="https://www.svgrepo.com/collection/solar-bold-icons/"
                target="_blank"
                rel="noreferrer"
                className="text-slate-300 underline underline-offset-2 hover:text-white"
              >
                SVG Repo — Solar Bold Icons
              </a>
              . Used under the applicable license. Modified for color, sizing,
              and app UI integration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
