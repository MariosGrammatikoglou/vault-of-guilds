import React, { useRef, useState, useEffect } from "react";
import type { Channel } from "../lib/api";
import type { VoiceParticipant } from "../lib/voice";
import { glass, cuteScroll, panelRound } from "../ui";
import { getSocket } from "../lib/socket";

type Props = {
  serverId: string | null;
  channels: Channel[];
  channelId: string | null;
  onOpenServerSettings: () => void;
  invite: string;
  inviteCopied: boolean;
  setInviteCopied: (v: boolean) => void;
  onOpenCreateTextChannel: () => void;
  onOpenCreateVoiceChannel: () => void;
  onSelectChannel: (id: string) => void;

  isInVoice: boolean;
  voiceChannelId: string | null;
  joinVoice: (id: string) => void;
  leaveVoice: () => void;

  getVoiceMembers: (channelId: string) => VoiceParticipant[];
  getVoiceVolume: (socketId: string) => number;
  setVoiceVolume: (socketId: string, value: number) => void;

  getSelfMicLevel: () => number;
  setSelfMicLevel: (value: number) => void;

  isMuted: boolean;
  toggleMute: () => void;

  isPushToTalk: boolean;
  togglePushToTalk: () => void;
  pushToTalkLabel: string;

  currentUserId: string;
};

function internalToUi(value: number) {
  return Math.round(Math.max(0, Math.min(2, value)) * 50);
}

function uiToInternal(value: number) {
  return Math.max(0, Math.min(100, value)) / 50;
}

function paneButton(selected = false) {
  return [
    "w-full h-10 px-3 rounded-full border transition-colors",
    "bg-[#151a27] hover:bg-[#1a2030]",
    "border-white/10 text-white/76",
    selected ? "bg-[#1a2030] border-white/14 text-white/86" : "",
  ].join(" ");
}

export default function ChannelsPane({
  serverId,
  channels,
  channelId,
  onOpenServerSettings,
  invite,
  inviteCopied,
  setInviteCopied,
  onOpenCreateTextChannel,
  onOpenCreateVoiceChannel,
  onSelectChannel,
  isInVoice,
  voiceChannelId,
  joinVoice,
  leaveVoice,
  getVoiceMembers,
  getVoiceVolume,
  setVoiceVolume,
  getSelfMicLevel,
  setSelfMicLevel,
  isMuted,
  toggleMute,
  isPushToTalk,
  togglePushToTalk,
  pushToTalkLabel,
  currentUserId,
}: Props) {
  const text = channels.filter((c) => c.type === "text");
  const voice = channels.filter((c) => c.type === "voice");
  const hasServer = !!serverId;
  const canInvite = hasServer && !!invite;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showShadow, setShowShadow] = useState(false);
  const [selectedVoiceMember, setSelectedVoiceMember] =
    useState<VoiceParticipant | null>(null);
  const [openVoiceModeModal, setOpenVoiceModeModal] = useState(false);
  const [disconnectTarget, setDisconnectTarget] =
    useState<VoiceParticipant | null>(null);
  const [disconnectBusy, setDisconnectBusy] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      setShowShadow(el.scrollTop > 2);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const activeMembers =
    selectedVoiceMember && selectedVoiceMember.channelId
      ? getVoiceMembers(selectedVoiceMember.channelId)
      : [];

  const selectedVoiceMemberLive =
    selectedVoiceMember &&
    activeMembers.find((m) => m.socketId === selectedVoiceMember.socketId);

  const popupMember = selectedVoiceMemberLive ?? selectedVoiceMember;

  const getDotClass = (m: VoiceParticipant) => {
    if (m.muted) {
      return "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.55)]";
    }
    if (m.speaking) {
      return "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.55)]";
    }
    return "bg-white/35";
  };

  const getStatusText = (m: VoiceParticipant, isSelf: boolean) => {
    const base = m.muted ? "Muted" : m.speaking ? "Talking" : "Idle";
    return isSelf ? `${base} • You` : base;
  };

  async function handleDisconnectVoice(target: VoiceParticipant) {
    if (!serverId) return;
    setDisconnectBusy(true);
    try {
      await new Promise<void>((resolve, reject) => {
        getSocket().emit(
          "voice:force-disconnect",
          { serverId, targetUserId: target.userId },
          (ack: { ok?: boolean; error?: string }) => {
            if (ack?.ok) resolve();
            else reject(new Error(ack?.error || "Disconnect failed"));
          },
        );
      });
      setDisconnectTarget(null);
      setSelectedVoiceMember(null);
    } catch (err) {
      console.error("disconnect voice failed", err);
      alert("Could not disconnect user from voice.");
    } finally {
      setDisconnectBusy(false);
    }
  }

  return (
    <>
      <aside
        className={[
          glass,
          panelRound,
          "h-full min-h-0 overflow-hidden grid",
          "grid-rows-[auto_auto_1fr_auto]",
        ].join(" ")}
      >
        <div className="p-3 sm:p-4 sm:pb-2">
          <button
            className="
              w-full text-xs sm:text-[13px] px-3 py-1.5
              rounded-full
              border border-white/10
              bg-[#151a27]
              hover:bg-[#1a2030]
              transition-colors disabled:opacity-50
              text-white/78 text-center
              shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]
            "
            onClick={onOpenServerSettings}
            disabled={!hasServer}
            type="button"
          >
            Server Settings
          </button>
        </div>

        {canInvite ? (
          <div className="relative px-3 sm:px-4 py-2">
            <InviteRow
              invite={invite}
              copied={inviteCopied}
              setCopied={setInviteCopied}
            />
            <div
              className={`
                absolute bottom-0 left-0 right-0 h-px
                bg-white/20
                shadow-[0_2px_8px_rgba(255,255,255,0.35)]
                transition-opacity duration-200
                ${showShadow ? "opacity-100" : "opacity-0"}
              `}
            />
          </div>
        ) : (
          <div className="h-0" />
        )}

        <div
          ref={scrollRef}
          className={[
            "min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-4",
            cuteScroll,
          ].join(" ")}
        >
          <Section
            title="Text Channels"
            onAdd={hasServer ? onOpenCreateTextChannel : undefined}
          >
            <ul className="space-y-2">
              {text.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => onSelectChannel(c.id)}
                    className={`${paneButton(channelId === c.id)} text-left flex items-center`}
                    type="button"
                  >
                    <span className="truncate"># {c.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Section>

          <Section
            title="Voice Channels"
            onAdd={hasServer ? onOpenCreateVoiceChannel : undefined}
          >
            <ul className="space-y-2">
              {voice.map((c) => {
                const active = voiceChannelId === c.id;
                const label = active ? "Leave" : isInVoice ? "Switch" : "Join";
                const members = getVoiceMembers(c.id);

                return (
                  <li key={c.id}>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (active) leaveVoice();
                          else joinVoice(c.id);
                        }}
                        className={`${paneButton(active)} flex items-center justify-between`}
                      >
                        <span className="truncate">🎙 {c.name}</span>
                        <span className="text-[11px] text-white/56">
                          {label}
                        </span>
                      </button>

                      {members.length > 0 && (
                        <div className="ml-3 space-y-1">
                          {members.map((m) => (
                            <button
                              key={m.socketId}
                              type="button"
                              onClick={() => setSelectedVoiceMember(m)}
                              className="w-full text-left pl-3 border-l border-white/10 h-7 flex items-center gap-2 hover:text-white transition-colors"
                            >
                              <span
                                className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${getDotClass(
                                  m,
                                )}`}
                              />
                              <span className="text-[12px] leading-5 text-white/75 truncate">
                                {m.username}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>
        </div>

        <div className="p-3 sm:p-4 pt-2 border-t border-white/10">
          {isInVoice ? (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                className={`h-10 px-3 rounded-full border transition-colors text-sm whitespace-nowrap ${
                  isMuted
                    ? "border-red-400/40 bg-red-500/12 text-red-200 hover:bg-red-500/18"
                    : "border-emerald-400/30 bg-emerald-500/8 text-emerald-200 hover:bg-emerald-500/12"
                }`}
              >
                {isMuted ? "🔇" : "🎤"}
              </button>

              <button
                type="button"
                onClick={leaveVoice}
                className="
                  h-10 px-3 rounded-full border border-white/10
                  bg-[#151a27] hover:bg-[#1a2030]
                  transition-colors text-sm whitespace-nowrap text-white/78
                "
              >
                Leave
              </button>

              <button
                type="button"
                onClick={() => setOpenVoiceModeModal(true)}
                className="
                  h-10 w-10 rounded-full border border-white/10
                  bg-[#151a27] hover:bg-[#1a2030]
                  transition-colors text-sm flex items-center justify-center text-white/78
                "
                title="Voice mode settings"
              >
                ⚙
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      {popupMember && (
        <VoiceMemberPopup
          member={popupMember}
          isSelf={popupMember.userId === currentUserId}
          volume={getVoiceVolume(popupMember.socketId)}
          selfMicLevel={getSelfMicLevel()}
          onClose={() => setSelectedVoiceMember(null)}
          onChangeVolume={(v) => setVoiceVolume(popupMember.socketId, v)}
          onChangeSelfMicLevel={setSelfMicLevel}
          getDotClass={getDotClass}
          getStatusText={getStatusText}
          onRequestDisconnect={
            popupMember.userId === currentUserId
              ? undefined
              : () => setDisconnectTarget(popupMember)
          }
        />
      )}

      {openVoiceModeModal && (
        <VoiceModeModal
          isPushToTalk={isPushToTalk}
          pushToTalkLabel={pushToTalkLabel}
          onClose={() => setOpenVoiceModeModal(false)}
          onSelectVoiceActivity={() => {
            if (isPushToTalk) togglePushToTalk();
            setOpenVoiceModeModal(false);
          }}
          onSelectPushToTalk={() => {
            if (!isPushToTalk) togglePushToTalk();
            setOpenVoiceModeModal(false);
          }}
        />
      )}

      {disconnectTarget && (
        <ConfirmModal
          title="Disconnect user from voice?"
          description={`This will remove ${disconnectTarget.username} from the current voice channel.`}
          confirmText={disconnectBusy ? "Disconnecting..." : "Disconnect"}
          confirmClassName="bg-orange-500/20 text-orange-200 border border-orange-300/25 hover:bg-orange-500/30"
          onCancel={() => {
            if (!disconnectBusy) setDisconnectTarget(null);
          }}
          onConfirm={() => void handleDisconnectVoice(disconnectTarget)}
        />
      )}
    </>
  );
}

function VoiceModeModal({
  isPushToTalk,
  pushToTalkLabel,
  onClose,
  onSelectVoiceActivity,
  onSelectPushToTalk,
}: {
  isPushToTalk: boolean;
  pushToTalkLabel: string;
  onClose: () => void;
  onSelectVoiceActivity: () => void;
  onSelectPushToTalk: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/35 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#171c2d]/95 backdrop-blur-xl shadow-2xl p-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-white">Voice Mode</h3>
            <div className="text-[11px] text-white/45 mt-1">
              Choose how your mic activates.
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/70"
          >
            ×
          </button>
        </div>

        <div className="grid gap-2">
          <button
            type="button"
            onClick={onSelectVoiceActivity}
            className={`h-11 rounded-xl border px-3 text-left transition-colors ${
              !isPushToTalk
                ? "border-indigo-300/40 bg-indigo-400/10 text-indigo-100"
                : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
            }`}
          >
            <div className="text-sm">🎙 Voice Activity</div>
            <div className="text-[11px] opacity-70">
              Mic sends automatically when you speak.
            </div>
          </button>

          <button
            type="button"
            onClick={onSelectPushToTalk}
            className={`h-11 rounded-xl border px-3 text-left transition-colors ${
              isPushToTalk
                ? "border-indigo-300/40 bg-indigo-400/10 text-indigo-100"
                : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
            }`}
          >
            <div className="text-sm">⌨ Push-to-Talk</div>
            <div className="text-[11px] opacity-70">
              Hold {pushToTalkLabel} to speak.
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function VoiceMemberPopup({
  member,
  isSelf,
  volume,
  selfMicLevel,
  onClose,
  onChangeVolume,
  onChangeSelfMicLevel,
  getDotClass,
  getStatusText,
  onRequestDisconnect,
}: {
  member: VoiceParticipant;
  isSelf: boolean;
  volume: number;
  selfMicLevel: number;
  onClose: () => void;
  onChangeVolume: (value: number) => void;
  onChangeSelfMicLevel: (value: number) => void;
  getDotClass: (m: VoiceParticipant) => string;
  getStatusText: (m: VoiceParticipant, isSelf: boolean) => string;
  onRequestDisconnect?: () => void;
}) {
  const internalValue = isSelf ? selfMicLevel : volume;
  const uiValue = internalToUi(internalValue);
  const title = isSelf ? "Your outgoing mic level" : "User volume";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#171c2d]/95 backdrop-blur-xl shadow-2xl p-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${getDotClass(
                  member,
                )}`}
              />
              <h3 className="text-sm font-medium text-white truncate">
                {member.username}
              </h3>
            </div>
            <div className="text-[11px] text-white/45 mt-1">
              {getStatusText(member, isSelf)}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/70"
          >
            ×
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span>{title}</span>
            <span>{uiValue}%</span>
          </div>

          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={uiValue}
            onChange={(e) => {
              const ui = Number(e.target.value);
              const internal = uiToInternal(ui);
              if (isSelf) onChangeSelfMicLevel(internal);
              else onChangeVolume(internal);
            }}
            className="w-full accent-indigo-300"
          />

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                const nextUi = Math.max(0, uiValue - 10);
                const internal = uiToInternal(nextUi);
                if (isSelf) onChangeSelfMicLevel(internal);
                else onChangeVolume(internal);
              }}
              className="flex-1 h-9 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-sm text-white/80"
            >
              -10
            </button>
            <button
              type="button"
              onClick={() => {
                const internal = uiToInternal(50);
                if (isSelf) onChangeSelfMicLevel(internal);
                else onChangeVolume(internal);
              }}
              className="flex-1 h-9 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-sm text-white/80"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => {
                const nextUi = Math.min(100, uiValue + 10);
                const internal = uiToInternal(nextUi);
                if (isSelf) onChangeSelfMicLevel(internal);
                else onChangeVolume(internal);
              }}
              className="flex-1 h-9 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-sm text-white/80"
            >
              +10
            </button>
          </div>
        </div>

        {!isSelf && onRequestDisconnect && (
          <div className="pt-1 border-t border-white/10">
            <button
              type="button"
              onClick={onRequestDisconnect}
              className="w-full h-10 rounded-xl bg-orange-500/15 text-orange-200 border border-orange-300/20 hover:bg-orange-500/25 transition-colors text-sm"
            >
              Disconnect from voice
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfirmModal({
  title,
  description,
  confirmText,
  confirmClassName,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmText: string;
  confirmClassName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/45 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/15 bg-[#151a29]/95 backdrop-blur-xl shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="text-sm text-white/65 leading-6">{description}</p>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`h-10 px-4 rounded-xl transition-colors ${confirmClassName}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  onAdd,
  children,
}: {
  title: string;
  onAdd?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[12px] uppercase tracking-wide text-white/80 mb-2">
        <span>{title}</span>
        {onAdd && (
          <button
            className="text-[11px] text-indigo-100/80 hover:text-indigo-50 transition-colors"
            onClick={onAdd}
            type="button"
          >
            + add
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function InviteRow({
  invite,
  copied,
  setCopied,
}: {
  invite: string;
  copied: boolean;
  setCopied: (v: boolean) => void;
}) {
  return (
    <div className="flex text-xs items-center gap-2">
      <span className="text-white/62">invite:</span>
      <code className="px-2 py-1 rounded-full border border-white/10 bg-[#151a27] text-white/76">
        {invite}
      </code>
      <button
        className="
          px-2 py-1 rounded-full border border-white/10
          bg-[#151a27] hover:bg-[#1a2030]
          transition-colors text-[11px] text-white/76
        "
        onClick={async () => {
          if (!invite) return;
          await navigator.clipboard.writeText(invite);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        type="button"
      >
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
}
