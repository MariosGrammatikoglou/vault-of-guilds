import React, { useState } from "react";
import type { UserProfile } from "../../lib/api";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

type User = UserProfile;

export default function AuthView({
  onAuth,
}: {
  onAuth: (token: string, user: User) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#0b1020]">
      {/* Background - soft gradient / blur blobs */}
      <div className="absolute inset-0">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-500/25 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[30rem] w-[30rem] rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#070a12] via-[#0b1020] to-[#0a1630]" />
      </div>

      {/* Card wrapper */}
      <div className="relative w-full max-w-md">
        <div className="rounded-[26px] border border-white/15 bg-white/10 backdrop-blur-2xl shadow-[0_20px_80px_rgba(0,0,0,0.55)] overflow-hidden">
          {/* Top Header */}
          <div className="px-8 pt-8 pb-5 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              {mode === "login" ? "Login" : "Register"}
            </h1>
            <p className="mt-2 text-sm text-white/70">
              {mode === "login"
                ? "Sign in to continue"
                : "Create an account to continue"}
            </p>
          </div>

          {/* Form */}
          <div className="px-8 pb-8">
            {mode === "login" ? (
              <LoginForm onAuth={onAuth} />
            ) : (
              <RegisterForm onAuth={onAuth} />
            )}

            {/* Switch */}
            <div className="mt-6 text-center text-sm text-white/70">
              {mode === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    className="text-white underline underline-offset-4 hover:text-white/90"
                    onClick={() => setMode("register")}
                    type="button"
                  >
                    Register
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    className="text-white underline underline-offset-4 hover:text-white/90"
                    onClick={() => setMode("login")}
                    type="button"
                  >
                    Login
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Subtle bottom glow */}
        <div className="pointer-events-none absolute -inset-x-10 -bottom-10 h-20 bg-blue-500/15 blur-2xl" />
      </div>
    </div>
  );
}
