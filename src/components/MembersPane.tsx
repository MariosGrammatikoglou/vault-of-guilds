import React, { useState, useRef, useEffect } from "react";
import { glass, panelRound, cuteScroll, chip } from "../ui";
import { kickMember as kickMemberApi, banMember as banMemberApi, transferOwnership as transferOwnershipApi } from "../lib/api";

type Member = {
  id: string;
  username: string;
  online: boolean;
  color?: string | null;
};

type Role = {
  id: string;
  name: string;
  color: string;
  position: number;
};

type Props = {
  serverId: string | null;
  members: Member[];
  memberRoles: Record<string, Role[]>;
  canKickMembers?: boolean;
  canBanMembers?: boolean;
  isOwner?: boolean;
  currentUserId: string;
  onOpenDm?: (userId: string, username: string) => void;
};

export default function MembersPane({
  serverId,
  members,
  memberRoles,
  canKickMembers = false,
  canBanMembers = false,
  isOwner = false,
  currentUserId,
  onOpenDm,
}: Props) {
  const online = members.filter((m) => m.online);
  const offline = members.filter((m) => !m.online);

  const [kickTarget, setKickTarget] = useState<Member | null>(null);
  const [kickBusy, setKickBusy] = useState(false);
  const [banTarget, setBanTarget] = useState<Member | null>(null);
  const [banBusy, setBanBusy] = useState(false);
  const [transferTarget, setTransferTarget] = useState<Member | null>(null);
  const [transferBusy, setTransferBusy] = useState(false);

  async function handleKick(target: Member) {
    if (!serverId) return;
    setKickBusy(true);
    try {
      await kickMemberApi(serverId, target.id);
      setKickTarget(null);
      window.location.reload();
    } catch (err) {
      console.error("kick member failed", err);
      alert("Could not kick user from server.");
    } finally {
      setKickBusy(false);
    }
  }

  async function handleBan(target: Member) {
    if (!serverId) return;
    setBanBusy(true);
    try {
      await banMemberApi(serverId, target.id);
      setBanTarget(null);
      window.location.reload();
    } catch (err) {
      console.error("ban member failed", err);
      alert("Could not ban user from server.");
    } finally {
      setBanBusy(false);
    }
  }

  async function handleTransfer(target: Member) {
    if (!serverId) return;
    setTransferBusy(true);
    try {
      await transferOwnershipApi(serverId, target.id);
      setTransferTarget(null);
      window.location.reload();
    } catch (err) {
      console.error("transfer ownership failed", err);
      alert("Could not transfer ownership.");
    } finally {
      setTransferBusy(false);
    }
  }

  return (
    <>
      <aside
        className={`${glass} ${panelRound} h-full min-h-0 overflow-hidden grid grid-rows-[auto_1fr]`}
      >
        <div className="p-3 sm:p-4 border-b border-slate-700/60 flex items-center justify-between">
          <h3 className="text-sm uppercase tracking-wide text-slate-200">
            members
          </h3>
        </div>

        <div className={`min-h-0 overflow-y-auto ${cuteScroll} p-3 sm:p-4`}>
          <Section label={`ONLINE — ${online.length}`}>
            <ul className="space-y-1">
              {online.map((m) => (
                <li key={m.id} className="px-2 py-1 rounded-lg hover:bg-[#151827]">
                  <MemberRow
                    m={m}
                    roles={memberRoles[m.id] ?? []}
                    canKick={canKickMembers}
                    canBan={canBanMembers}
                    canTransfer={isOwner}
                    isSelf={m.id === currentUserId}
                    onKickRequest={() => setKickTarget(m)}
                    onBanRequest={() => setBanTarget(m)}
                    onTransferRequest={() => setTransferTarget(m)}
                    onDmRequest={onOpenDm ? () => onOpenDm(m.id, m.username) : undefined}
                  />
                </li>
              ))}
            </ul>
          </Section>

          <Section label={`OFFLINE — ${offline.length}`}>
            <ul className="space-y-1 opacity-80">
              {offline.map((m) => (
                <li key={m.id} className="px-2 py-1 rounded-lg hover:bg-[#151827]">
                  <MemberRow
                    m={m}
                    roles={memberRoles[m.id] ?? []}
                    canKick={canKickMembers}
                    canBan={canBanMembers}
                    canTransfer={isOwner}
                    isSelf={m.id === currentUserId}
                    onKickRequest={() => setKickTarget(m)}
                    onBanRequest={() => setBanTarget(m)}
                    onTransferRequest={() => setTransferTarget(m)}
                    onDmRequest={onOpenDm ? () => onOpenDm(m.id, m.username) : undefined}
                  />
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </aside>

      {kickTarget && (
        <ConfirmModal
          title="Kick user from server?"
          description={`Remove ${kickTarget.username} from this server. They will need a new invite to come back.`}
          confirmText={kickBusy ? "Kicking..." : "Kick User"}
          confirmClassName="bg-red-500/20 text-red-200 border border-red-300/20 hover:bg-red-500/30"
          onCancel={() => { if (!kickBusy) setKickTarget(null); }}
          onConfirm={() => void handleKick(kickTarget)}
        />
      )}

      {banTarget && (
        <ConfirmModal
          title="Ban user from server?"
          description={`Permanently ban ${banTarget.username}. They won't be able to rejoin with an invite.`}
          confirmText={banBusy ? "Banning..." : "Ban User"}
          confirmClassName="bg-red-600/25 text-red-200 border border-red-400/25 hover:bg-red-600/35"
          onCancel={() => { if (!banBusy) setBanTarget(null); }}
          onConfirm={() => void handleBan(banTarget)}
        />
      )}

      {transferTarget && (
        <ConfirmModal
          title="Transfer server ownership?"
          description={`Pass full ownership to ${transferTarget.username}. You will remain a member but lose owner privileges.`}
          confirmText={transferBusy ? "Transferring..." : "Transfer Ownership"}
          confirmClassName="bg-amber-500/20 text-amber-200 border border-amber-300/20 hover:bg-amber-500/30"
          onCancel={() => { if (!transferBusy) setTransferTarget(null); }}
          onConfirm={() => void handleTransfer(transferTarget)}
        />
      )}
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 mb-4">
      <div className="text-xs text-slate-400">{label}</div>
      {children}
    </div>
  );
}

function MemberRow({
  m,
  roles,
  canKick,
  canBan,
  canTransfer,
  isSelf,
  onKickRequest,
  onBanRequest,
  onTransferRequest,
  onDmRequest,
}: {
  m: Member;
  roles: Role[];
  canKick: boolean;
  canBan: boolean;
  canTransfer: boolean;
  isSelf: boolean;
  onKickRequest: () => void;
  onBanRequest: () => void;
  onTransferRequest: () => void;
  onDmRequest?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const color = roles[0]?.color ?? undefined;

  useEffect(() => {
    if (!open) return;
    function handleDown(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: m.online ? "#22c55e" : "#6b7280" }}
        />
        <button
          className="truncate text-left no-underline hover:no-underline focus:outline-none opacity-95 hover:opacity-100 transition-opacity"
          style={{ color }}
          onClick={() => setOpen((prev) => !prev)}
          type="button"
          title={m.username}
        >
          {m.username}
        </button>
      </div>

      {open && (
        <UserPopover
          username={m.username}
          roles={roles}
          canKick={canKick}
          canBan={canBan}
          canTransfer={canTransfer}
          isSelf={isSelf}
          onKickRequest={onKickRequest}
          onBanRequest={onBanRequest}
          onTransferRequest={onTransferRequest}
          onDmRequest={onDmRequest}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function UserPopover({
  username,
  roles,
  canKick,
  canBan,
  canTransfer,
  isSelf,
  onKickRequest,
  onBanRequest,
  onTransferRequest,
  onDmRequest,
  onClose,
}: {
  username: string;
  roles: Role[];
  canKick: boolean;
  canBan: boolean;
  canTransfer: boolean;
  isSelf: boolean;
  onKickRequest: () => void;
  onBanRequest: () => void;
  onTransferRequest: () => void;
  onDmRequest?: () => void;
  onClose: () => void;
}) {
  const hasModActions = !isSelf && (canKick || canBan || canTransfer);

  return (
    <div className="absolute right-0 top-full mt-1 z-20 min-w-[220px] rounded-xl border border-[#262b3f] bg-[#111626] px-3 py-3 text-xs shadow-[0_18px_30px_rgba(0,0,0,0.6)]">
      <div className="mb-2">
        <div className="text-[11px] text-slate-400 uppercase tracking-wide">User</div>
        <div className="text-sm text-slate-50 font-semibold truncate">{username}</div>
      </div>

      <div className="mb-1 text-[11px] text-slate-400 uppercase tracking-wide">Roles</div>
      <div className="flex flex-wrap gap-1 mb-2">
        {roles.length > 0 ? (
          roles.map((r) => (
            <span
              key={r.id}
              className={chip}
              style={{ borderColor: `${r.color}55`, color: r.color, background: "#151827" }}
            >
              {r.name}
            </span>
          ))
        ) : (
          <span className="text-slate-500">No roles</span>
        )}
      </div>

      {!isSelf && onDmRequest && (
        <div className="pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => { onDmRequest(); onClose(); }}
            className="w-full h-8 rounded-lg bg-indigo-500/15 text-indigo-200 border border-indigo-300/15 hover:bg-indigo-500/25 transition-colors text-[12px] mb-1"
          >
            Chat
          </button>
        </div>
      )}

      {hasModActions && (
        <div className={`${!isSelf && onDmRequest ? "mt-1" : "mt-3 pt-3 border-t border-white/10"} space-y-1`}>
          {canKick && (
            <button
              type="button"
              onClick={onKickRequest}
              className="w-full h-8 rounded-lg bg-orange-500/15 text-orange-200 border border-orange-300/15 hover:bg-orange-500/25 transition-colors text-[12px]"
            >
              Kick user
            </button>
          )}
          {canBan && (
            <button
              type="button"
              onClick={onBanRequest}
              className="w-full h-8 rounded-lg bg-red-600/15 text-red-200 border border-red-400/15 hover:bg-red-600/25 transition-colors text-[12px]"
            >
              Ban user
            </button>
          )}
          {canTransfer && (
            <button
              type="button"
              onClick={() => { onTransferRequest(); onClose(); }}
              className="w-full h-8 rounded-lg bg-amber-500/15 text-amber-200 border border-amber-300/15 hover:bg-amber-500/25 transition-colors text-[12px]"
            >
              Transfer Ownership
            </button>
          )}
        </div>
      )}
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
