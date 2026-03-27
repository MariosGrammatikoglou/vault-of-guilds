import React, { useEffect, useMemo } from "react";
import type { UserProfile } from "../lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  user: UserProfile;
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

export default function SettingsModal({ open, onClose, user }: Props) {
  const initials = useMemo(() => {
    const u = user.username?.trim() || "U";
    const parts = u.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "U";
    const b = parts.length > 1 ? parts[1]?.[0] : u[1];
    return (a + (b ?? "")).toUpperCase();
  }, [user.username]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="
          w-[860px] max-w-[96vw]
          rounded-[28px]
          border border-white/10
          bg-[#10182a]
          shadow-[0_25px_90px_rgba(0,0,0,0.65)]
          overflow-hidden
        "
      >
        <div className="grid grid-cols-1 md:grid-cols-[270px_1fr]">
          <aside className="border-b md:border-b-0 md:border-r border-white/10 bg-black/20 p-6">
            <div className="flex items-center gap-4">
              <div
                className="
                  h-14 w-14
                  rounded-[18px]
                  bg-gradient-to-br from-indigo-500 to-blue-500
                  grid place-items-center
                  font-semibold
                  text-white
                  text-lg
                  shadow-lg
                "
              >
                {initials}
              </div>

              <div className="min-w-0">
                <div className="text-white font-semibold truncate">
                  {user.username}
                </div>
                <div className="text-xs text-white/55 mt-0.5">
                  User Settings
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/35 mb-2.5">
                Settings
              </div>

              <button
                className="
                  w-full text-left
                  px-3.5 py-2.5
                  rounded-2xl
                  bg-white/10
                  border border-white/10
                  text-white
                  text-sm
                  shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]
                "
                type="button"
              >
                My Account
              </button>
            </div>
          </aside>

          <section className="p-7">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white tracking-tight">
                  My Account
                </h2>

                <p className="text-sm text-white/60 mt-1.5">
                  Signed in as{" "}
                  <span className="text-white font-medium">
                    {user.username}
                  </span>
                </p>
              </div>

              <button
                onClick={onClose}
                type="button"
                className="
                  h-10 w-10
                  rounded-2xl
                  border border-white/10
                  bg-white/5
                  text-white/75
                  hover:bg-white/10 hover:text-white
                  transition
                  flex items-center justify-center
                "
                title="Close"
              >
                <CloseIcon />
              </button>
            </div>

            <div
              className="
                mt-8
                rounded-3xl
                border border-white/10
                bg-black/20
                p-6
                shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]
              "
            >
              <div className="text-xs uppercase tracking-wide text-white/45 mb-2">
                Username
              </div>

              <div
                className="
                  px-4 py-3.5
                  rounded-2xl
                  bg-white/5
                  border border-white/10
                  text-white
                  font-medium
                "
              >
                {user.username}
              </div>

              <p className="text-xs text-white/40 mt-3">
                More account settings coming soon.
              </p>
            </div>

            <div className="flex justify-end mt-8">
              <button
                onClick={onClose}
                type="button"
                className="
                  px-6 py-2.5
                  rounded-2xl
                  border border-white/10
                  bg-white/5
                  text-white/85
                  hover:bg-white/10
                  transition
                "
              >
                Done
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
