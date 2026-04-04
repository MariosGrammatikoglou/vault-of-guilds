import React, { useState } from "react";
import type { UserProfile } from "../../lib/api";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

type User = UserProfile;

export default function AuthView({
  onAuth,
}: {
  onAuth: (token: string, user: User, rememberMe: boolean) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-[#070b18]" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -right-20 h-[450px] w-[450px] rounded-full bg-violet-600/15 blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 rounded-full bg-blue-500/10 blur-[80px]" />
      </div>

      {/* Grid texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Card */}
      <div className="relative w-full max-w-[420px] z-10">
        {/* Glow ring behind card */}
        <div className="absolute -inset-px rounded-[28px] bg-gradient-to-br from-indigo-500/30 via-violet-500/20 to-transparent blur-sm" />

        <div className="relative rounded-[26px] border border-white/10 bg-[#0e1525]/90 backdrop-blur-2xl shadow-[0_32px_80px_rgba(0,0,0,0.7)] overflow-hidden">

          {/* Top accent line */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />

          {/* Logo + Brand */}
          <div className="px-8 pt-8 pb-4 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 mb-4">
              {/* Shield / vault icon */}
              <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
                <path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V6L12 2zm0 2.18l7 3.12V12c0 4.15-2.91 8.03-7 9.28C7.91 20.03 5 16.15 5 12V7.3l7-3.12z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Vault of Guilds</h1>
            <p className="mt-1 text-sm text-white/40">Your community, your rules</p>
          </div>

          {/* Tab switcher */}
          <div className="mx-8 mb-6 p-1 rounded-xl bg-white/5 border border-white/8 grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "login"
                  ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "register"
                  ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              Register
            </button>
          </div>

          {/* Form */}
          <div className="px-8 pb-8">
            {mode === "login" ? (
              <LoginForm onAuth={onAuth} />
            ) : (
              <RegisterForm onAuth={onAuth} />
            )}
          </div>

          {/* Bottom accent */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>

        <p className="mt-4 text-center text-xs text-white/20">
          Vault of Guilds &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
