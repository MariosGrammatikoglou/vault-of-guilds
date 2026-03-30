import React, { useEffect, useMemo, useState } from "react";
import type { Role, Member } from "../lib/api";
import { CONFIG } from "../lib/config";
import { btnPrimary, cuteScroll } from "../ui";
import { deleteServer as deleteServerApi } from "../lib/api";
import defaultServerIcon from "/assets/default-server.png";

const PERMS = {
  MANAGE_ROLES: 1 << 0,
  MANAGE_CHANNELS: 1 << 1,
  SEND_MESSAGES: 1 << 2,
  CONNECT_VOICE: 1 << 3,
  KICK_MEMBERS: 1 << 4,
} as const;

const PERMISSION_OPTIONS = [
  {
    bit: PERMS.MANAGE_ROLES,
    label: "Manage Roles",
    hint: "Create and edit roles",
  },
  {
    bit: PERMS.MANAGE_CHANNELS,
    label: "Manage Channels",
    hint: "Create voice/text channels",
  },
  {
    bit: PERMS.SEND_MESSAGES,
    label: "Send Messages",
    hint: "Write in text channels",
  },
  {
    bit: PERMS.CONNECT_VOICE,
    label: "Connect Voice",
    hint: "Join voice channels",
  },
  {
    bit: PERMS.KICK_MEMBERS,
    label: "Kick Members",
    hint: "Kick from server or disconnect from voice",
  },
] as const;

type Props = {
  open: boolean;
  onClose: () => void;
  serverName: string;
  serverId: string;
  serverIconUrl?: string;
  isOwner: boolean;

  members: Member[];
  roles: Role[];
  memberRoles: Record<string, Role[]>;

  canManageRoles: boolean;

  onCreateRole: (name: string, color: string, perms: number) => Promise<Role>;
  onUpdateRole: (
    roleId: string,
    patch: Partial<Pick<Role, "name" | "color" | "permissions" | "position">>,
  ) => Promise<Role>;
  onDeleteRole: (roleId: string) => Promise<void>;
  onAssignRole: (userId: string, roleId: string) => Promise<void>;
  onUnassignRole: (userId: string, roleId: string) => Promise<void>;
  onUploadIcon: (file: File) => Promise<void>;
};

function normalizeServerIconUrl(
  iconUrl?: string | null,
  bust?: number,
): string {
  let url: string;

  if (!iconUrl) {
    url = defaultServerIcon;
  } else if (/^https?:\/\//i.test(iconUrl)) {
    url = iconUrl;
  } else {
    const base = CONFIG.API_BASE ?? "";
    if (!base) {
      url = iconUrl.startsWith("/") ? iconUrl : `/${iconUrl}`;
    } else {
      const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
      const normalizedPath = iconUrl.startsWith("/") ? iconUrl : `/${iconUrl}`;
      url = `${normalizedBase}${normalizedPath}`;
    }
  }

  if (bust) {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}v=${bust}`;
  }

  return url;
}

export default function ServerSettingsModal({
  open,
  onClose,
  serverName,
  serverId,
  serverIconUrl,
  isOwner,
  members,
  roles,
  memberRoles,
  canManageRoles,
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
  onAssignRole,
  onUnassignRole,
  onUploadIcon,
}: Props) {
  const [tab, setTab] = useState<"overview" | "roles" | "members">("overview");
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const iconSrc = normalizeServerIconUrl(serverIconUrl);

  async function handleDeleteServer() {
    setDeleteBusy(true);
    try {
      await deleteServerApi(serverId);
      onClose();
      window.location.reload();
    } catch (err) {
      console.error("delete server failed", err);
      alert("Could not delete server.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div
          className="
            absolute left-1/2 top-1/2
            w-[min(1060px,96vw)] max-h-[90vh]
            -translate-x-1/2 -translate-y-1/2
            rounded-2xl bg-[#10131e]/95 border border-[#20253a]
            backdrop-blur-2xl
            overflow-hidden flex flex-col
          "
        >
          <div className="flex flex-1 min-h-0 text-slate-100">
            <aside className="w-64 border-r border-[#20253a] p-5 space-y-2 shrink-0 bg-[#0c101a]/95">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={iconSrc}
                  alt=""
                  draggable={false}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== defaultServerIcon) {
                      target.src = defaultServerIcon;
                    }
                  }}
                  className="block w-10 h-10 rounded-xl object-cover ring-1 ring-black/30 bg-[#161b2b] select-none"
                />
                <div className="min-w-0">
                  <h2 className="text-[13px] uppercase tracking-wide text-slate-400">
                    Server Settings
                  </h2>
                  <div className="font-semibold truncate text-slate-50">
                    {serverName}
                  </div>
                </div>
              </div>

              <ul className="space-y-1 text-sm">
                <li>
                  <button
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      tab === "overview"
                        ? "bg-[#181c2a]"
                        : "hover:bg-[#181c2a]/80"
                    }`}
                    onClick={() => setTab("overview")}
                  >
                    Overview
                  </button>
                </li>
                <li>
                  <button
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      tab === "roles" ? "bg-[#181c2a]" : "hover:bg-[#181c2a]/80"
                    }`}
                    onClick={() => setTab("roles")}
                  >
                    Roles
                  </button>
                </li>
                <li>
                  <button
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      tab === "members"
                        ? "bg-[#181c2a]"
                        : "hover:bg-[#181c2a]/80"
                    }`}
                    onClick={() => setTab("members")}
                  >
                    Members
                  </button>
                </li>
              </ul>
            </aside>

            <section className={`flex-1 p-6 overflow-y-auto ${cuteScroll}`}>
              {tab === "overview" && (
                <Overview
                  serverId={serverId}
                  serverName={serverName}
                  iconSrc={iconSrc}
                  isOwner={isOwner}
                  onUploadIcon={onUploadIcon}
                  onDeleteRequest={() => setOpenDeleteConfirm(true)}
                />
              )}

              {tab === "roles" && (
                <RolesPanel
                  roles={roles}
                  canManageRoles={canManageRoles}
                  onCreateRole={onCreateRole}
                  onUpdateRole={onUpdateRole}
                  onDeleteRole={onDeleteRole}
                />
              )}

              {tab === "members" && (
                <MembersPanel
                  members={members}
                  roles={roles}
                  memberRoles={memberRoles}
                  canManageRoles={canManageRoles}
                  onAssignRole={onAssignRole}
                  onUnassignRole={onUnassignRole}
                />
              )}

              <div className="mt-8 flex justify-end gap-2">
                <button
                  className="px-4 py-2 rounded-lg bg-[#20253a] hover:bg-[#273058] text-sm transition-colors"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {openDeleteConfirm && (
        <ConfirmModal
          title="Delete server?"
          description={`This will permanently delete "${serverName}" and remove all of its channels and settings.`}
          confirmText={deleteBusy ? "Deleting..." : "Delete Server"}
          confirmClassName="bg-red-500/20 text-red-200 border border-red-300/20 hover:bg-red-500/30"
          onCancel={() => {
            if (!deleteBusy) setOpenDeleteConfirm(false);
          }}
          onConfirm={() => void handleDeleteServer()}
        />
      )}
    </>
  );
}

function errorMessageFromUnknown(e: unknown): string {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && "response" in e) {
    const resp = (e as { response?: { data?: { message?: string } } }).response;
    if (resp?.data?.message) return resp.data.message;
  }
  return "Something went wrong";
}

function Overview({
  serverId,
  serverName,
  iconSrc,
  isOwner,
  onUploadIcon,
  onDeleteRequest,
}: {
  serverId: string;
  serverName: string;
  iconSrc: string;
  isOwner: boolean;
  onUploadIcon: (file: File) => Promise<void>;
  onDeleteRequest: () => void;
}) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingFile) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold mb-1">Overview</h3>

      <div className="rounded-xl border border-[#20253a] bg-[#111727] p-5 flex items-center gap-5">
        <img
          src={preview || iconSrc}
          alt=""
          draggable={false}
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src !== defaultServerIcon) {
              target.src = defaultServerIcon;
            }
          }}
          className="block w-20 h-20 rounded-2xl object-cover ring-1 ring-black/30 bg-[#161b2b] select-none"
        />
        <div className="flex-1 min-w-0">
          <div className="text-[12px] text-slate-400">Server</div>
          <div className="text-lg font-semibold truncate text-slate-50">
            {serverName}
          </div>
          <div className="text-[12px] text-slate-500 mt-1">
            ID: <code className="text-[11px]">{serverId}</code>
          </div>
        </div>

        {isOwner ? (
          <div className="flex flex-col items-end gap-2">
            <label className="px-3 py-2 rounded-lg bg-[#202744] hover:bg-[#273058] cursor-pointer text-sm">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setPendingFile(f);
                    setStatus("idle");
                    setErrorMsg(null);
                  }
                }}
              />
              Choose Image…
            </label>
            <button
              className="px-3 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white text-sm"
              disabled={!pendingFile || busy}
              onClick={async () => {
                if (!pendingFile) return;
                setBusy(true);
                setStatus("idle");
                setErrorMsg(null);
                try {
                  await onUploadIcon(pendingFile);
                  setPendingFile(null);
                  setStatus("saved");
                } catch (e) {
                  setStatus("error");
                  setErrorMsg(errorMessageFromUnknown(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Uploading…" : "Save Icon"}
            </button>

            <button
              className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm"
              onClick={onDeleteRequest}
            >
              Delete Server
            </button>

            <div className="text-[11px] text-slate-400">
              PNG/JPG · up to ~2–4MB
            </div>

            {status === "saved" && (
              <div className="text-[11px] text-emerald-400 mt-1">Saved!</div>
            )}
            {status === "error" && errorMsg && (
              <div className="text-[11px] text-red-400 mt-1">{errorMsg}</div>
            )}
          </div>
        ) : (
          <div className="text-xs text-slate-400">
            Only the server owner can change the icon or delete the server.
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#20253a] bg-[#111727] p-5 text-sm text-slate-200">
        Use the Roles and Members tabs to configure access and membership.
      </div>
    </div>
  );
}

function RolesPanel({
  roles,
  canManageRoles,
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
}: {
  roles: Role[];
  canManageRoles: boolean;
  onCreateRole: (name: string, color: string, perms: number) => Promise<Role>;
  onUpdateRole: (
    roleId: string,
    patch: Partial<Pick<Role, "name" | "color" | "permissions" | "position">>,
  ) => Promise<Role>;
  onDeleteRole: (roleId: string) => Promise<void>;
}) {
  const sorted = useMemo(
    () => roles.slice().sort((a, b) => b.position - a.position),
    [roles],
  );

  const [name, setName] = useState("");
  const [color, setColor] = useState("#5865F2");
  const [perms, setPerms] = useState<number>(
    PERMS.SEND_MESSAGES | PERMS.CONNECT_VOICE,
  );
  const [creating, setCreating] = useState(false);

  function toggle(bit: number) {
    setPerms((p) => (p & bit ? p & ~bit : p | bit));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">Roles</h3>
          <div className="text-sm text-slate-400 mt-1">
            Create, edit and order server roles.
          </div>
        </div>
        {!canManageRoles && (
          <div className="text-sm text-amber-300">
            You need “Manage Roles” to edit roles.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="rounded-xl border border-[#20253a] bg-[#111727] p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-100">Existing Roles</h4>
            <span className="text-xs text-slate-500">
              {sorted.length} total
            </span>
          </div>

          <ul
            className={`space-y-3 max-h-[58vh] overflow-y-auto pr-1 ${cuteScroll}`}
          >
            {sorted.length === 0 ? (
              <li className="text-sm text-slate-400">No roles yet.</li>
            ) : (
              sorted.map((r) => (
                <EditableRole
                  key={r.id}
                  role={r}
                  disabled={!canManageRoles}
                  onSave={onUpdateRole}
                  onDelete={onDeleteRole}
                />
              ))
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-[#20253a] bg-[#111727] p-5">
          <h4 className="font-semibold mb-1">Create Role</h4>
          <div className="text-sm text-slate-400 mb-4">
            Pick a name, color and the permissions this role should have.
          </div>

          <div className="space-y-4 text-sm">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-slate-400">
                Role Name
              </label>
              <input
                className="w-full bg-[#0b1120] rounded-lg px-3 py-2.5 outline-none ring-1 ring-transparent focus:ring-indigo-500/30 text-slate-100"
                placeholder="e.g. Moderator"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canManageRoles}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-slate-400">
                Color
              </label>
              <div className="flex items-center gap-3 rounded-lg bg-[#0b1120] px-3 py-2.5">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  disabled={!canManageRoles}
                  className="h-8 w-10 rounded border-0 bg-transparent"
                />
                <div
                  className="w-4 h-4 rounded-full ring-1 ring-white/10"
                  style={{ background: color }}
                />
                <code className="text-xs text-slate-300">{color}</code>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-slate-400">
                Permissions
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PERMISSION_OPTIONS.map((p) => (
                  <PermCard
                    key={p.bit}
                    label={p.label}
                    hint={p.hint}
                    bit={p.bit}
                    value={perms}
                    onToggle={toggle}
                    disabled={!canManageRoles}
                  />
                ))}
              </div>
            </div>

            <button
              className={`${btnPrimary} w-full px-4 py-2.5 text-sm disabled:opacity-50`}
              onClick={async () => {
                if (!name.trim() || creating) return;
                setCreating(true);
                try {
                  await onCreateRole(name.trim(), color, perms);
                  setName("");
                  setColor("#5865F2");
                  setPerms(PERMS.SEND_MESSAGES | PERMS.CONNECT_VOICE);
                } finally {
                  setCreating(false);
                }
              }}
              disabled={!canManageRoles || !name.trim() || creating}
            >
              {creating ? "Creating…" : "Create Role"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditableRole({
  role,
  disabled,
  onSave,
  onDelete,
}: {
  role: Role;
  disabled: boolean;
  onSave: (
    roleId: string,
    patch: Partial<Pick<Role, "name" | "color" | "permissions" | "position">>,
  ) => Promise<Role>;
  onDelete: (roleId: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(role.name);
  const [color, setColor] = useState(role.color);
  const [perms, setPerms] = useState<number>(Number(role.permissions));
  const [position, setPosition] = useState<number>(role.position);
  const [saving, setSaving] = useState(false);

  function toggle(bit: number) {
    setPerms((p) => (p & bit ? p & ~bit : p | bit));
  }

  async function save() {
    setSaving(true);
    try {
      await onSave(role.id, { name, color, permissions: perms, position });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <li className="rounded-xl bg-[#0f1422] border border-[#20283a] px-4 py-3 text-slate-100">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span
                className="w-3 h-3 rounded-full ring-1 ring-white/10 shrink-0"
                style={{ background: role.color }}
              />
              <span className="font-medium truncate">{role.name}</span>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3">
              {PERMISSION_OPTIONS.filter(
                (p) => (Number(role.permissions) & p.bit) !== 0,
              ).map((p) => (
                <span
                  key={p.bit}
                  className="text-[11px] px-2 py-1 rounded-full border border-white/10 bg-white/5 text-slate-300"
                >
                  {p.label}
                </span>
              ))}
              {Number(role.permissions) === 0 && (
                <span className="text-[11px] text-slate-500">
                  No permissions
                </span>
              )}
            </div>

            <div className="text-[11px] text-slate-500 mt-3">
              Position: {role.position}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                disabled
                  ? "bg-[#1a2030] text-slate-500"
                  : "bg-[#202744] hover:bg-[#273058] text-slate-100"
              }`}
              onClick={() => !disabled && setEditing(true)}
              disabled={disabled}
            >
              Edit
            </button>
            <button
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                disabled
                  ? "bg-[#24161a] text-slate-500"
                  : "bg-red-500/15 hover:bg-red-500/25 text-red-300"
              }`}
              onClick={async () => {
                if (!disabled && confirm(`Delete role "${role.name}"?`)) {
                  await onDelete(role.id);
                }
              }}
              disabled={disabled}
            >
              Delete
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-xl bg-[#0f1422] border border-[#20283a] px-4 py-4 text-slate-100">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Name
            </label>
            <input
              className="w-full bg-[#101522] rounded-lg px-3 py-2.5 outline-none ring-1 ring-transparent focus:ring-indigo-500/30 text-slate-100"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Color
            </label>
            <div className="flex items-center gap-3 rounded-lg bg-[#101522] px-3 py-2.5">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={disabled}
                className="h-8 w-10 rounded border-0 bg-transparent"
              />
              <div
                className="w-4 h-4 rounded-full ring-1 ring-white/10"
                style={{ background: color }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-slate-400">
            Position
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              className="w-32 bg-[#101522] rounded-lg px-3 py-2.5 outline-none ring-1 ring-transparent focus:ring-indigo-500/30 text-slate-100"
              value={position}
              onChange={(e) => setPosition(Number(e.target.value) || 0)}
              disabled={disabled}
            />
            <span className="text-[11px] text-slate-500">
              Higher roles appear above lower roles
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-slate-400">
            Permissions
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PERMISSION_OPTIONS.map((p) => (
              <PermCard
                key={p.bit}
                label={p.label}
                hint={p.hint}
                bit={p.bit}
                value={perms}
                onToggle={toggle}
                disabled={disabled}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <button
            className="text-xs px-3 py-2 rounded-lg bg-[#202744] hover:bg-[#273058] text-slate-100"
            onClick={() => setEditing(false)}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className={`${btnPrimary} text-xs px-4 py-2`}
            onClick={save}
            disabled={saving || !name.trim()}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </li>
  );
}

function MembersPanel({
  members,
  roles,
  memberRoles,
  canManageRoles,
  onAssignRole,
  onUnassignRole,
}: {
  members: Member[];
  roles: Role[];
  memberRoles: Record<string, Role[]>;
  canManageRoles: boolean;
  onAssignRole: (userId: string, roleId: string) => Promise<void>;
  onUnassignRole: (userId: string, roleId: string) => Promise<void>;
}) {
  const online = members.filter((m) => m.online);
  const offline = members.filter((m) => !m.online);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">Members</h3>
          <div className="text-sm text-slate-400 mt-1">
            Assign roles and review server membership.
          </div>
        </div>
      </div>

      <MemberSection
        title="Online"
        count={online.length}
        members={online}
        roles={roles}
        memberRoles={memberRoles}
        canManageRoles={canManageRoles}
        onAssignRole={onAssignRole}
        onUnassignRole={onUnassignRole}
      />

      <MemberSection
        title="Offline"
        count={offline.length}
        members={offline}
        roles={roles}
        memberRoles={memberRoles}
        canManageRoles={canManageRoles}
        onAssignRole={onAssignRole}
        onUnassignRole={onUnassignRole}
      />
    </div>
  );
}

function MemberSection({
  title,
  count,
  members,
  roles,
  memberRoles,
  canManageRoles,
  onAssignRole,
  onUnassignRole,
}: {
  title: string;
  count: number;
  members: Member[];
  roles: Role[];
  memberRoles: Record<string, Role[]>;
  canManageRoles: boolean;
  onAssignRole: (userId: string, roleId: string) => Promise<void>;
  onUnassignRole: (userId: string, roleId: string) => Promise<void>;
}) {
  return (
    <div className="rounded-xl border border-[#20253a] bg-[#111727] p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-slate-100">{title}</h4>
        <span className="text-xs text-slate-500">{count} members</span>
      </div>

      <ul
        className={`space-y-3 max-h-[32vh] overflow-y-auto pr-1 ${cuteScroll}`}
      >
        {members.length === 0 ? (
          <li className="text-sm text-slate-400">
            No members in this section.
          </li>
        ) : (
          members.map((m) => (
            <MemberRow
              key={m.id}
              m={m}
              roles={memberRoles[m.id] ?? []}
              allRoles={roles}
              canManage={canManageRoles}
              onAssign={onAssignRole}
              onUnassign={onUnassignRole}
            />
          ))
        )}
      </ul>
    </div>
  );
}

function MemberRow({
  m,
  roles,
  allRoles,
  canManage,
  onAssign,
  onUnassign,
}: {
  m: Member;
  roles: Role[];
  allRoles: Role[];
  canManage: boolean;
  onAssign: (userId: string, roleId: string) => Promise<void>;
  onUnassign: (userId: string, roleId: string) => Promise<void>;
}) {
  const [selectVal, setSelectVal] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const sortedRoles = roles.slice().sort((a, b) => b.position - a.position);
  const topRole = sortedRoles[0];
  const usernameColor = topRole?.color;

  return (
    <li className="rounded-xl bg-[#0f1422] border border-[#20283a] px-4 py-4 text-slate-100">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: m.online ? "#22c55e" : "#6b7280" }}
            />
            <div className="min-w-0">
              <div
                className="font-medium truncate"
                style={{ color: usernameColor || undefined }}
              >
                {m.username}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {m.online ? "Online" : "Offline"}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {sortedRoles.length === 0 ? (
              <span className="text-[11px] text-slate-500">No roles</span>
            ) : (
              sortedRoles.map((r) => (
                <span
                  key={r.id}
                  className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full"
                  style={{
                    background: `${r.color}22`,
                    border: `1px solid ${r.color}55`,
                    color: r.color,
                  }}
                >
                  <span>{r.name}</span>
                  {canManage && (
                    <button
                      className="ml-0.5 opacity-70 hover:opacity-100"
                      title="Remove role"
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await onUnassign(m.id, r.id);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))
            )}
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 shrink-0 lg:min-w-[230px]">
            <select
              className="flex-1 text-xs bg-[#0b1120] rounded-lg px-2.5 py-2 ring-1 ring-transparent focus:ring-indigo-500/30 text-slate-100"
              value={selectVal}
              onChange={(e) => setSelectVal(e.target.value)}
              disabled={busy}
            >
              <option value="">+ add role</option>
              {allRoles
                .filter((r) => !sortedRoles.some((x) => x.id === r.id))
                .sort((a, b) => b.position - a.position)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>

            <button
              className="text-xs bg-emerald-600 hover:bg-emerald-500 rounded-lg px-3 py-2 disabled:opacity-50 text-white transition-colors"
              disabled={!selectVal || busy}
              onClick={async () => {
                if (!selectVal) return;
                setBusy(true);
                try {
                  await onAssign(m.id, selectVal);
                  setSelectVal("");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "..." : "Add"}
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function PermCard({
  label,
  hint,
  bit,
  value,
  onToggle,
  disabled,
}: {
  label: string;
  hint: string;
  bit: number;
  value: number;
  onToggle: (bit: number) => void;
  disabled?: boolean;
}) {
  const checked = (value & bit) !== 0;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(bit)}
      className={`text-left rounded-xl border px-3 py-3 transition-colors ${
        checked
          ? "border-indigo-400/40 bg-indigo-400/10"
          : "border-[#20283a] bg-[#0f1422] hover:bg-[#13192a]"
      } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-100">{label}</div>
          <div className="text-[11px] text-slate-400 mt-1">{hint}</div>
        </div>
        <div
          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center text-[11px] ${
            checked
              ? "border-indigo-300 bg-indigo-400/20 text-indigo-100"
              : "border-white/10 text-transparent"
          }`}
        >
          ✓
        </div>
      </div>
    </button>
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
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#151a29]/95 backdrop-blur-xl shadow-2xl p-5">
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
