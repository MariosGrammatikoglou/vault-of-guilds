import React, { useEffect, useMemo, useState } from "react";
import type { UserProfile } from "../lib/api";
import type { VoiceManager } from "../lib/voice";

type Props = {
  open: boolean;
  onClose: () => void;
  user: UserProfile;
  voice?: VoiceManager;
};

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" aria-hidden="true">
      <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

type AudioDevice = { deviceId: string; label: string };

function useAudioDevices() {
  const [inputs, setInputs] = useState<AudioDevice[]>([]);
  const [outputs, setOutputs] = useState<AudioDevice[]>([]);

  useEffect(() => {
    async function load() {
      try {
        // Need to request permission first so labels are populated
        await navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => s.getTracks().forEach((t) => t.stop())).catch(() => {});
        const devices = await navigator.mediaDevices.enumerateDevices();
        const ins = devices.filter((d) => d.kind === "audioinput").map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${i + 1}`,
        }));
        const outs = devices.filter((d) => d.kind === "audiooutput").map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Speaker ${i + 1}`,
        }));
        setInputs(ins);
        setOutputs(outs);
      } catch {
        // enumerateDevices not available or denied
      }
    }
    load();
  }, []);

  return { inputs, outputs };
}

export default function SettingsModal({ open, onClose, user, voice }: Props) {
  const [activeTab, setActiveTab] = useState<"account" | "voice">("account");
  const [inputDeviceId, setInputDeviceId] = useState(() => localStorage.getItem("audioInputDeviceId") ?? "default");
  const [outputDeviceId, setOutputDeviceId] = useState(() => localStorage.getItem("audioOutputDeviceId") ?? "default");
  const { inputs, outputs } = useAudioDevices();

  const initials = useMemo(() => {
    const u = user.username?.trim() || "U";
    const parts = u.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "U";
    const b = parts.length > 1 ? parts[1]?.[0] : u[1];
    return (a + (b ?? "")).toUpperCase();
  }, [user.username]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function saveInputDevice(id: string) {
    setInputDeviceId(id);
    localStorage.setItem("audioInputDeviceId", id);
  }

  function saveOutputDevice(id: string) {
    setOutputDeviceId(id);
    localStorage.setItem("audioOutputDeviceId", id);
    voice?.setOutputDevice(id);
  }

  if (!open) return null;

  const tabBtn = (tab: "account" | "voice", label: string) => (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-sm transition-colors ${
        activeTab === tab
          ? "bg-white/10 border border-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
          : "text-white/50 hover:text-white/75 hover:bg-white/5"
      }`}
    >
      {label}
    </button>
  );

  const selectClass = "w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500/60 transition-colors appearance-none cursor-pointer";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[860px] max-w-[96vw] rounded-[28px] border border-white/10 bg-[#10182a] shadow-[0_25px_90px_rgba(0,0,0,0.65)] overflow-hidden"
      >
        <div className="grid grid-cols-1 md:grid-cols-[270px_1fr]">
          {/* Sidebar */}
          <aside className="border-b md:border-b-0 md:border-r border-white/10 bg-black/20 p-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-[18px] bg-gradient-to-br from-indigo-500 to-blue-500 grid place-items-center font-semibold text-white text-lg shadow-lg">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="text-white font-semibold truncate">{user.username}</div>
                <div className="text-xs text-white/55 mt-0.5">User Settings</div>
              </div>
            </div>

            <div className="mt-8 space-y-1">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/35 mb-2.5">Settings</div>
              {tabBtn("account", "My Account")}
              {tabBtn("voice", "Voice & Audio")}
            </div>
          </aside>

          {/* Content */}
          <section className="p-7 min-h-[360px]">
            <div className="flex justify-between items-start gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-semibold text-white tracking-tight">
                  {activeTab === "account" ? "My Account" : "Voice & Audio"}
                </h2>
                <p className="text-sm text-white/60 mt-1.5">
                  {activeTab === "account"
                    ? <>Signed in as <span className="text-white font-medium">{user.username}</span></>
                    : "Choose your microphone and speaker devices"}
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

            {activeTab === "account" && (
              <div className="rounded-3xl border border-white/10 bg-black/20 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <div className="text-xs uppercase tracking-wide text-white/45 mb-2">Username</div>
                <div className="px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-medium">
                  {user.username}
                </div>
                <p className="text-xs text-white/40 mt-3">More account settings coming soon.</p>
              </div>
            )}

            {activeTab === "voice" && (
              <div className="space-y-6">
                {/* Input device */}
                <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-indigo-400">
                      <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-2 17.93A8.001 8.001 0 0 1 4 12H2a10 10 0 0 0 9 9.95V24h2v-2.05A10 10 0 0 0 22 12h-2a8 8 0 0 1-6 7.93V19z"/>
                    </svg>
                    <div className="text-xs uppercase tracking-wide text-white/45">Input Device (Microphone)</div>
                  </div>
                  {inputs.length === 0 ? (
                    <p className="text-sm text-white/30 italic">No microphone devices found</p>
                  ) : (
                    <div className="relative">
                      <select
                        className={selectClass}
                        value={inputDeviceId}
                        onChange={(e) => saveInputDevice(e.target.value)}
                      >
                        {inputs.map((d) => (
                          <option key={d.deviceId} value={d.deviceId} className="bg-[#10182a]">
                            {d.label}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/30">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-white/30 mt-2">Takes effect when you join a voice channel.</p>
                </div>

                {/* Output device */}
                <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-indigo-400">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                    <div className="text-xs uppercase tracking-wide text-white/45">Output Device (Speaker)</div>
                  </div>
                  {outputs.length === 0 ? (
                    <p className="text-sm text-white/30 italic">Output selection not supported by this browser</p>
                  ) : (
                    <div className="relative">
                      <select
                        className={selectClass}
                        value={outputDeviceId}
                        onChange={(e) => saveOutputDevice(e.target.value)}
                      >
                        {outputs.map((d) => (
                          <option key={d.deviceId} value={d.deviceId} className="bg-[#10182a]">
                            {d.label}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/30">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-white/30 mt-2">Changes apply immediately to active voice calls.</p>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-8">
              <button
                onClick={onClose}
                type="button"
                className="px-6 py-2.5 rounded-2xl border border-white/10 bg-white/5 text-white/85 hover:bg-white/10 transition"
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
