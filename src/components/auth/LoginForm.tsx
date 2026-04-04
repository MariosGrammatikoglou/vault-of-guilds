import React, { useState } from "react";
import { login as apiLogin, type UserProfile } from "../../lib/api";

type User = UserProfile;

function getErrorMessage(e: unknown): string {
  if (
    typeof e === "object" &&
    e !== null &&
    "response" in e &&
    (e as { response?: { data?: { message?: string } } }).response
  ) {
    const resp = (e as { response?: { data?: { message?: string } } }).response;
    return resp?.data?.message ?? "Request failed";
  }
  return e instanceof Error ? e.message : "Unknown error";
}

export default function LoginForm({
  onAuth,
}: {
  onAuth: (token: string, user: User, rememberMe: boolean) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!username.trim() || !password) {
      setErr("Please enter username and password.");
      return;
    }

    try {
      setErr(null);
      setLoading(true);
      const { token, user } = await apiLogin(username.trim(), password);
      onAuth(token, user as User, rememberMe);
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Username */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5">
          Username
        </label>
        <div className="relative">
          <input
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-colors"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void submit()}
            autoComplete="username"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2-8 4.5V21h16v-2.5C20 16 16.42 14 12 14Z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Password */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5">
          Password
        </label>
        <div className="relative">
          <input
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 pr-11 text-sm text-white placeholder:text-white/25 outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-colors"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void submit()}
            autoComplete="current-password"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Zm-7-2a2 2 0 0 1 4 0v2h-4V7Zm7 13H7v-9h10v9Z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Remember me */}
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <div
          onClick={() => setRememberMe((v) => !v)}
          className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
            rememberMe
              ? "bg-indigo-500 border-indigo-500"
              : "bg-white/5 border-white/20"
          }`}
        >
          {rememberMe && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <span className="text-sm text-white/50">Remember me</span>
      </label>

      {/* Error */}
      {err && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {err}
        </div>
      )}

      {/* Button */}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold py-3 text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </div>
  );
}
