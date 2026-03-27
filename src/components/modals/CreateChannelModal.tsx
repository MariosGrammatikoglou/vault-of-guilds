import React, { useEffect, useState } from "react";
import { modalInput, btnGhost, btnPrimary } from "../../ui";

type Props = {
  open: boolean;
  type: "text" | "voice";
  onClose: () => void;
  onCreate: (name: string) => void;
};

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[18px] h-[18px]"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6 6L18 18M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function CreateChannelModal({
  open,
  type,
  onClose,
  onCreate,
}: Props) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) setName("");
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && name.trim()) onCreate(name);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, onCreate, name]);

  if (!open) return null;

  const label = type === "text" ? "Text Channel" : "Voice Channel";
  const placeholder = type === "text" ? "general" : "Chill Voice";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="
          w-full max-w-md
          overflow-hidden
          rounded-[26px]
          border border-white/10
          bg-[#10182a]
          shadow-[0_25px_90px_rgba(0,0,0,0.65)]
        "
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">New {label}</h2>
            <p className="text-xs text-white/45 mt-1">
              Create a new {type} channel for this server
            </p>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white transition flex items-center justify-center"
            title="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-white/45">
              Channel name
            </label>
            <input
              className={`${modalInput} h-12 rounded-2xl`}
              placeholder={placeholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              className={`${btnGhost} px-4 py-2.5 text-sm rounded-2xl`}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className={`${btnPrimary} px-5 py-2.5 text-sm rounded-2xl`}
              onClick={() => onCreate(name)}
              disabled={!name.trim()}
              type="button"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
