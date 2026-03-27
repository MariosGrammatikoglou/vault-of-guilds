import React, { useState } from "react";
import { register as apiRegister, type UserProfile } from "../../lib/api";

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

export default function RegisterForm({
  onAuth,
}: {
  onAuth: (token: string, user: User) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
      const { token, user } = await apiRegister(username.trim(), password);
      onAuth(token, user as User);
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Username */}
      <label className="block">
        <span className="text-sm text-white/80">Username</span>
        <div className="mt-2 relative">
          <input
            className="w-full rounded-xl bg-white/10 border border-white/15 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-white/30 focus:bg-white/12"
            placeholder="Choose a username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2-8 4.5V21h16v-2.5C20 16 16.42 14 12 14Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>
      </label>

      {/* Password */}
      <label className="block">
        <span className="text-sm text-white/80">Password</span>
        <div className="mt-2 relative">
          <input
            className="w-full rounded-xl bg-white/10 border border-white/15 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-white/30 focus:bg-white/12 pr-11"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Zm-7-2a2 2 0 0 1 4 0v2h-4V7Zm7 13H7v-9h10v9Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>
      </label>

      {err && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className="w-full rounded-xl bg-white text-black font-semibold py-3 shadow hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "Creating..." : "Create account"}
      </button>
    </div>
  );
}
