import React, { useState } from "react";
import ReactDOM from "react-dom";
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

function TermsModal({ onClose }: { onClose: () => void }) {
  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-md sm:mx-4 rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#0e1525] shadow-2xl flex flex-col"
        style={{ maxHeight: "85dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h2 className="text-base font-semibold text-white">Terms of Service</h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/80 transition-colors p-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div
          className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4 text-sm text-white/55 leading-relaxed"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.12) transparent" }}
        >
          <p className="text-white/25 text-xs">Last updated: {new Date().getFullYear()}</p>

          <section>
            <h3 className="text-white/75 font-semibold mb-1">1. Acceptance</h3>
            <p>By creating an account on Vault of Guilds, you confirm you have read, understood, and agree to these Terms of Service. If you do not agree, do not register or use this service.</p>
          </section>

          <section>
            <h3 className="text-white/75 font-semibold mb-1">2. Eligibility</h3>
            <p>You must be at least 13 years old to use this service. By registering, you confirm you meet this requirement.</p>
          </section>

          <section>
            <h3 className="text-white/75 font-semibold mb-1">3. User-Generated Content &amp; No Monitoring</h3>
            <p>Vault of Guilds is a communication platform. <strong className="text-white/70">We do not monitor, review, or moderate messages, files, or any other content</strong> exchanged between users. All content is user-generated and we have no control over it.</p>
            <p className="mt-2">You are <strong className="text-white/70">solely and entirely responsible</strong> for all content you post, share, or transmit through this platform. We accept zero responsibility or liability for content created by users.</p>
          </section>

          <section>
            <h3 className="text-white/75 font-semibold mb-1">4. Account Responsibility</h3>
            <p>You are responsible for all activity that occurs under your account. Keep your credentials secure and do not share them. You are liable for any misuse of your account.</p>
          </section>

          <section>
            <h3 className="text-white/75 font-semibold mb-1">5. Prohibited Conduct</h3>
            <p>By using Vault of Guilds, you agree not to:</p>
            <ul className="list-disc list-inside mt-1.5 space-y-1">
              <li>Post or share illegal, harmful, abusive, or offensive content</li>
              <li>Harass, threaten, stalk, or impersonate any person</li>
              <li>Distribute spam, malware, or unsolicited content</li>
              <li>Violate any applicable local, national, or international law</li>
              <li>Attempt to gain unauthorized access to any system or account</li>
            </ul>
            <p className="mt-2">Violation may result in immediate account termination. You remain legally responsible for your actions regardless of termination.</p>
          </section>

          <section>
            <h3 className="text-white/75 font-semibold mb-1">6. No Liability for User Actions</h3>
            <p>Vault of Guilds, its operators, and developers are <strong className="text-white/70">not responsible or liable</strong> in any way for the actions, content, or behavior of any user. Any disputes between users are solely between those users.</p>
            <p className="mt-2">If you are harmed by another user's conduct, your remedy is against that user, not against Vault of Guilds.</p>
          </section>

          <section>
            <h3 className="text-white/75 font-semibold mb-1">7. Disclaimer of Warranties</h3>
            <p>This service is provided <strong className="text-white/70">"as is"</strong> and <strong className="text-white/70">"as available"</strong> without any warranties, express or implied. We do not guarantee uptime, data preservation, or fitness for any particular purpose.</p>
          </section>

          <section>
            <h3 className="text-white/75 font-semibold mb-1">8. Limitation of Liability</h3>
            <p>To the fullest extent permitted by law, Vault of Guilds and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use this service, including any content posted by other users.</p>
          </section>

          <section>
            <h3 className="text-white/75 font-semibold mb-1">9. Privacy</h3>
            <p>We store only the information necessary to operate the service (username and hashed password). We do not sell your data to third parties.</p>
          </section>

          <section>
            <h3 className="text-white/75 font-semibold mb-1">10. Termination</h3>
            <p>We reserve the right to suspend or permanently terminate any account at any time, for any reason, including but not limited to violations of these terms.</p>
          </section>

          <section>
            <h3 className="text-white/75 font-semibold mb-1">11. Changes to Terms</h3>
            <p>We may update these terms at any time without prior notice. Continued use of the service after changes constitutes your acceptance of the updated terms.</p>
          </section>
        </div>

        {/* Footer — always visible */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-white/8">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-medium py-2.5 text-sm transition-colors"
          >
            I understand
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function RegisterForm({
  onAuth,
}: {
  onAuth: (token: string, user: User, rememberMe: boolean) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showTerms, setShowTerms] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!username.trim() || !password) {
      setErr("Please enter username and password.");
      return;
    }
    if (password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }

    try {
      setErr(null);
      setLoading(true);
      const { token, user } = await apiRegister(username.trim(), password);
      onAuth(token, user as User, true);
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
            placeholder="Choose a username"
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
            placeholder="Create a password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void submit()}
            autoComplete="new-password"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Zm-7-2a2 2 0 0 1 4 0v2h-4V7Zm7 13H7v-9h10v9Z" />
            </svg>
          </div>
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {err}
        </div>
      )}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold py-3 text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Creating account..." : "Create Account"}
      </button>

      <p className="text-center text-xs text-white/30">
        By registering, you agree to our{" "}
        <button
          type="button"
          onClick={() => setShowTerms(true)}
          className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
        >
          Terms of Service
        </button>
        .
      </p>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </div>
  );
}
