import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  setAuth,
  myServers,
  createServer,
  listChannels,
  listMessages,
  sendMessage,
  createChannel,
  getInviteCode,
  joinServerByCode,
  listMembers,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  assignRole,
  unassignRole,
  rolesOfUser,
  myPerms,
  uploadServerIcon,
  type Channel,
  type Message,
  type Member,
  type Role,
  type ServerItem,
  type UserProfile,
  type RawMessage,
  normalizeMessage,
} from "./lib/api";

import {
  connectSocket,
  subscribeChannel,
  unsubscribeChannel,
} from "./lib/socket";

import { VoiceManager } from "./lib/voice";

import SettingsModal from "./components/SettingsModal";
import ServerSettingsModal from "./components/ServerSettingsModal";
import ServerRail from "./components/ServerRail";
import ChannelsPane from "./components/ChannelsPane";
import ChatPane from "./components/ChatPane";
import MembersPane from "./components/MembersPane";
import DMView from "./components/DMView";
import ScreenShareModal from "./components/ScreenShareModal";
import CreateServerModal from "./components/modals/CreateServerModal";
import JoinServerModal from "./components/modals/JoinServerModal";
import CreateChannelModal from "./components/modals/CreateChannelModal";
import InfoModal from "./components/modals/InfoModal";

import AuthView from "./components/auth/AuthView";

type User = UserProfile;

const ENABLE_POLL_FALLBACK = true;
const POLL_MS = 2000;
const PAGE_SIZE = 20;
const TOP_LOAD_THRESHOLD_PX = 80;
const BOTTOM_STICK_THRESHOLD_PX = 120;
const SELECTED_SERVER_STORAGE_KEY = "selectedServerId";

const PERMS = {
  MANAGE_ROLES: 1 << 0,
  MANAGE_CHANNELS: 1 << 1,
  SEND_MESSAGES: 1 << 2,
  CONNECT_VOICE: 1 << 3,
  KICK_MEMBERS: 1 << 4,
  BAN_MEMBERS: 1 << 5,
} as const;

const makeKey = (m: Pick<Message, "channel_id" | "user_id" | "content">) =>
  `${m.channel_id}|${m.user_id}|${m.content}`;

function sortFetchedMessagesAscending(items: Message[]) {
  return [...items].sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });
}

function prependOlderUnique(existing: Message[], older: Message[]) {
  const existingIds = new Set(existing.map((m) => m.id));
  const filteredOlder = older.filter((m) => !existingIds.has(m.id));
  return [...filteredOlder, ...existing];
}

function appendOptimistic(existing: Message[], optimistic: Message[]) {
  return [...existing, ...optimistic];
}

function appendOrReplaceLiveMessage(existing: Message[], incoming: Message) {
  if (existing.some((m) => m.id === incoming.id)) {
    return existing;
  }

  const incomingKey = makeKey(incoming);
  const tempIndex = existing.findIndex(
    (m) => m.id.startsWith("temp-") && makeKey(m) === incomingKey,
  );

  if (tempIndex !== -1) {
    const next = [...existing];
    next[tempIndex] = incoming;
    return next;
  }

  return [...existing, incoming];
}

function appendFetchedLatest(existing: Message[], fetched: Message[]) {
  let next = [...existing];

  for (const msg of fetched) {
    next = appendOrReplaceLiveMessage(next, msg);
  }

  return next;
}

function readStoredAuth(): { token: string; user: User } | null {
  try {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    const userRaw =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    if (token && userRaw) return { token, user: JSON.parse(userRaw) as User };
  } catch {}
  return null;
}

function clearStoredAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem(SELECTED_SERVER_STORAGE_KEY);
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
}

export default function App() {
  const stored = readStoredAuth();
  const [token, setToken] = useState<string | null>(stored?.token ?? null);
  const [user, setUser] = useState<User | null>(stored?.user ?? null);

  if (!token || !user) {
    return (
      <AuthView
        onAuth={(t, u, rememberMe) => {
          const store = rememberMe ? localStorage : sessionStorage;
          store.setItem("token", t);
          store.setItem("user", JSON.stringify(u));
          setToken(t);
          setUser(u);
        }}
      />
    );
  }

  return (
    <MainView
      token={token}
      user={user}
      onLogout={() => {
        clearStoredAuth();
        location.reload();
      }}
    />
  );
}

function MainView({
  token,
  user,
  onLogout,
}: {
  token: string;
  user: User;
  onLogout: () => void;
}) {
  const [bootError, setBootError] = useState(false);
  const [booting, setBooting] = useState(true);
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [serverId, setServerId] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelId, setChannelId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [shouldSnapToBottom, setShouldSnapToBottom] = useState(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [memberRoles, setMemberRoles] = useState<Record<string, Role[]>>({});

  const [inputVal, setInputVal] = useState("");
  const [invite, setInvite] = useState<string>("");
  const [inviteCopied, setInviteCopied] = useState(false);

  const [myPermMask, setMyPermMask] = useState<number>(0);

  const [, force] = useState(0);
  const voice = useMemo(() => new VoiceManager(() => force((x) => x + 1)), []);
  const [voiceChannelId, setVoiceChannelId] = useState<string | null>(null);
  const [isInVoice, setIsInVoice] = useState(false);

  const [openUserSettings, setOpenUserSettings] = useState(false);
  const [openServerSettings, setOpenServerSettings] = useState(false);
  const [openInfo, setOpenInfo] = useState(false);

  const [openCreateServer, setOpenCreateServer] = useState(false);
  const [openJoinServer, setOpenJoinServer] = useState(false);
  const [openCreateChannelType, setOpenCreateChannelType] = useState<
    "text" | "voice" | null
  >(null);

  const seenIds = useMemo(() => new Set<string>(), []);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenPeersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const sharingUsernamesRef = useRef<Map<string, string>>(new Map());
  const isDmViewRef = useRef(false);

  const serverIdRef = useRef<string | null>(null);
  const channelIdRef = useRef<string | null>(null);

  useEffect(() => {
    serverIdRef.current = serverId;
  }, [serverId]);

  useEffect(() => {
    channelIdRef.current = channelId;
  }, [channelId]);

  useEffect(() => {
    if (serverId) {
      localStorage.setItem(SELECTED_SERVER_STORAGE_KEY, serverId);
    } else {
      localStorage.removeItem(SELECTED_SERVER_STORAGE_KEY);
    }
  }, [serverId]);

  const currentServer = servers.find((s) => s.id === serverId) || null;
  const isOwner = currentServer?.owner_id === user.id;
  const canManageRoles = isOwner || (myPermMask & PERMS.MANAGE_ROLES) !== 0;

  function isNearBottom() {
    const el = messagesContainerRef.current;
    if (!el) return true;
    return (
      el.scrollHeight - el.scrollTop - el.clientHeight <
      BOTTOM_STICK_THRESHOLD_PX
    );
  }

  function scrollToBottom(behavior: ScrollBehavior = "auto") {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior });
      });
    });
  }

  useEffect(() => {
    if (!shouldSnapToBottom) return;
    if (loadingMessages) return;
    if (!channelId) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
        setShouldSnapToBottom(false);
      });
    });
  }, [shouldSnapToBottom, loadingMessages, channelId, messages.length]);

  async function loadInitialMessages(targetChannelId: string) {
    setLoadingMessages(true);
    setLoadingOlder(false);
    setHasMoreMessages(true);

    try {
      const msgs = sortFetchedMessagesAscending(
        await listMessages(targetChannelId, { limit: PAGE_SIZE }),
      );

      if (channelIdRef.current !== targetChannelId) return;

      setMessages(msgs);

      seenIds.clear();
      msgs.forEach((m) => seenIds.add(m.id));

      setHasMoreMessages(msgs.length === PAGE_SIZE);
      setShouldSnapToBottom(true);
    } catch (e) {
      console.error("initial messages fetch failed", e);
      if (channelIdRef.current === targetChannelId) {
        setMessages([]);
        setHasMoreMessages(false);
      }
    } finally {
      if (channelIdRef.current === targetChannelId) {
        setLoadingMessages(false);
      }
    }
  }

  async function loadOlderMessages() {
    const currentChannelId = channelIdRef.current;
    if (
      !currentChannelId ||
      loadingOlder ||
      loadingMessages ||
      !hasMoreMessages
    ) {
      return;
    }

    const oldest = messages[0];
    if (!oldest) return;

    const container = messagesContainerRef.current;
    const previousScrollHeight = container?.scrollHeight ?? 0;
    const previousScrollTop = container?.scrollTop ?? 0;

    setLoadingOlder(true);

    try {
      const older = sortFetchedMessagesAscending(
        await listMessages(currentChannelId, {
          before: oldest.id,
          limit: PAGE_SIZE,
        }),
      );

      if (channelIdRef.current !== currentChannelId) return;

      if (older.length === 0) {
        setHasMoreMessages(false);
        return;
      }

      older.forEach((m) => seenIds.add(m.id));
      setHasMoreMessages(older.length === PAGE_SIZE);

      setMessages((prev) => prependOlderUnique(prev, older));

      requestAnimationFrame(() => {
        const el = messagesContainerRef.current;
        if (!el) return;
        const newScrollHeight = el.scrollHeight;
        el.scrollTop =
          newScrollHeight - previousScrollHeight + previousScrollTop;
      });
    } catch (e) {
      console.error("older messages fetch failed", e);
    } finally {
      if (channelIdRef.current === currentChannelId) {
        setLoadingOlder(false);
      }
    }
  }

  useEffect(() => {
    setAuth(token);

    const s = connectSocket(token);

    s.on("connected", () => console.log("ws connected"));

    s.on("connect_error", (e: unknown) => {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "string"
            ? e
            : JSON.stringify(e);
      console.warn("ws error", msg);
    });

    s.on("reconnect", () => console.log("ws reconnected"));

    s.on("presence:update", (p: { serverId: string; online: string[] }) => {
      if (!serverIdRef.current || p.serverId !== serverIdRef.current) return;

      const onlineSet = new Set(p.online);
      setMembers((prev) =>
        prev
          .map((m) => ({ ...m, online: onlineSet.has(m.id) }))
          .sort(
            (a, b) =>
              Number(b.online) - Number(a.online) ||
              a.username.localeCompare(b.username),
          ),
      );
    });

    s.on("dm:notify", () => {
      if (!isDmViewRef.current) setDmUnread((n) => n + 1);
    });

    s.on("screen:start", (p: { socketId: string; username?: string }) => {
      setSharingSocketIds((prev) => new Set([...prev, p.socketId]));
      if (p.username) sharingUsernamesRef.current.set(p.socketId, p.username);
    });

    // Screen share signaling — receive offers from other sharers
    s.on("screen:offer", async (p: { from: string; sdp: RTCSessionDescriptionInit }) => {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      screenPeersRef.current.set(p.from, pc);

      pc.ontrack = (e) => {
        const stream = e.streams[0] ?? new MediaStream([e.track]);
        setIncomingScreenStream(stream);
        setIncomingScreenUser(sharingUsernamesRef.current.get(p.from) ?? p.from);
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) s.emit("screen:candidate", { to: p.from, candidate: e.candidate });
      };

      await pc.setRemoteDescription(new RTCSessionDescription(p.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      s.emit("screen:answer", { to: p.from, sdp: answer });
    });

    s.on("screen:answer", async (p: { from: string; sdp: RTCSessionDescriptionInit }) => {
      const pc = screenPeersRef.current.get(p.from);
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(p.sdp));
    });

    s.on("screen:candidate", async (p: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = screenPeersRef.current.get(p.from);
      if (!pc || !p.candidate) return;
      try { await pc.addIceCandidate(new RTCIceCandidate(p.candidate)); } catch { /* ignore */ }
    });

    s.on("screen:stop", (p?: { socketId?: string }) => {
      if (p?.socketId) {
        setSharingSocketIds((prev) => { const n = new Set(prev); n.delete(p.socketId!); return n; });
        sharingUsernamesRef.current.delete(p.socketId);
      } else {
        setSharingSocketIds(new Set());
        sharingUsernamesRef.current.clear();
      }
      setIncomingScreenStream(null);
      setIncomingScreenUser("");
      setShowScreenPanel(false);
    });

    s.on("message:new", (raw: RawMessage) => {
      const msg = normalizeMessage(raw);
      if (msg.channel_id !== channelIdRef.current) return;

      const shouldStickToBottom = isNearBottom();

      if (seenIds.has(msg.id)) {
        return;
      }

      seenIds.add(msg.id);

      setMessages((prev) => appendOrReplaceLiveMessage(prev, msg));

      if (shouldStickToBottom) {
        scrollToBottom("smooth");
      }
    });

    return () => {
      s.off("presence:update");
      s.off("message:new");
      s.off("dm:notify");
      s.off("screen:start");
      s.off("screen:offer");
      s.off("screen:answer");
      s.off("screen:candidate");
      s.off("screen:stop");
      s.disconnect();
    };
  }, [token, seenIds]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setBooting(true);
      setBootError(false);
      try {
        setAuth(token);

        const list = await myServers();
        if (cancelled) return;

        setServers(list);
        setBooting(false);

        if (list.length === 0) {
          setServerId(null);
          setChannels([]);
          setChannelId(null);
          setMessages([]);
          setMembers([]);
          setRoles([]);
          setMemberRoles({});
          return;
        }

        const savedServerId =
          localStorage.getItem(SELECTED_SERVER_STORAGE_KEY) ||
          sessionStorage.getItem(SELECTED_SERVER_STORAGE_KEY);
        const preferredServerId =
          savedServerId && list.some((s) => s.id === savedServerId)
            ? savedServerId
            : list[0].id;

        await selectServer(preferredServerId);
      } catch (e) {
        if (cancelled) return;
        console.error("servers boot failed", e);
        setServers([]);
        setBooting(false);
        setBootError(true);
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, [token, user]);

  async function refreshInvite(id: string | null) {
    if (!id) {
      setInvite("");
      return;
    }

    try {
      const { code } = await getInviteCode(id);
      setInvite(code);
    } catch {
      setInvite("");
    }
  }

  async function refreshMyPerms(id: string | null) {
    if (!id) {
      setMyPermMask(0);
      return;
    }

    try {
      const { permissions } = await myPerms(id);
      setMyPermMask(Number(permissions) || 0);
    } catch {
      setMyPermMask(0);
    }
  }

  async function loadMembersAndRoles(id: string | null) {
    if (!id) {
      setMembers([]);
      setRoles([]);
      setMemberRoles({});
      return;
    }

    try {
      const [mList, rList] = await Promise.all([
        listMembers(id),
        listRoles(id),
      ]);

      setRoles(rList);

      const pairs = await Promise.all(
        mList.map(async (m) => {
          try {
            const r = await rolesOfUser(id, m.id);
            return [m.id, r] as const;
          } catch {
            return [m.id, [] as Role[]] as const;
          }
        }),
      );

      const map: Record<string, Role[]> = {};
      for (const [uid, rr] of pairs) {
        map[uid] = rr.slice().sort((a, b) => b.position - a.position);
      }

      setMemberRoles(map);

      setMembers(
        mList
          .map((m) => m)
          .sort(
            (a, b) =>
              Number(b.online) - Number(a.online) ||
              a.username.localeCompare(b.username),
          ),
      );
    } catch (e) {
      console.warn("members/roles fetch failed", e);
      setMembers([]);
      setRoles([]);
      setMemberRoles({});
    }
  }

  async function selectServer(id: string) {
    setServerId(id);
    localStorage.setItem(SELECTED_SERVER_STORAGE_KEY, id);

    await Promise.all([
      refreshInvite(id),
      refreshMyPerms(id),
      loadMembersAndRoles(id),
    ]);

    const ch = await listChannels(id);
    setChannels(ch);

    const firstText = ch.find((c) => c.type === "text");
    if (firstText) {
      await selectChannel(firstText.id);
    } else {
      if (channelIdRef.current) {
        unsubscribeChannel(channelIdRef.current);
      }
      setChannelId(null);
      channelIdRef.current = null;
      setMessages([]);
      setHasMoreMessages(false);
    }
  }

  async function selectChannel(id: string) {
    if (channelIdRef.current) {
      unsubscribeChannel(channelIdRef.current);
    }

    setChannelId(id);
    channelIdRef.current = id;
    setMessages([]);
    setHasMoreMessages(true);
    setShouldSnapToBottom(false);
    subscribeChannel(id);

    await loadInitialMessages(id);
  }

  async function send() {
    if (!channelId || !inputVal.trim()) return;

    const content = inputVal.trim();
    setInputVal("");

    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      channel_id: channelId,
      user_id: user.id,
      username: user.username,
      content,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => appendOptimistic(prev, [optimistic]));
    scrollToBottom("smooth");

    try {
      const real = await sendMessage(channelId, content);
      seenIds.add(real.id);

      setMessages((prev) => appendOrReplaceLiveMessage(prev, real));
      scrollToBottom("smooth");
    } catch (e) {
      console.error("send failed", e);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputVal(content);
    }
  }

  function handleMessagesScroll() {
    const el = messagesContainerRef.current;
    if (!el || loadingOlder || loadingMessages || !hasMoreMessages) return;

    if (el.scrollTop <= TOP_LOAD_THRESHOLD_PX) {
      void loadOlderMessages();
    }
  }

  async function handleCreateServer(name: string) {
    if (!name.trim()) return;

    try {
      const s = await createServer(name.trim());
      setServers((prev) => [s, ...prev]);

      const ch = await createChannel(s.id, "general", "text");

      await refreshInvite(s.id);
      await refreshMyPerms(s.id);
      await loadMembersAndRoles(s.id);

      const all = await listChannels(s.id);
      setChannels(all);
      setServerId(s.id);
      localStorage.setItem(SELECTED_SERVER_STORAGE_KEY, s.id);

      await selectChannel(ch.id);
    } catch (e) {
      console.error("create server failed", e);
    }
  }

  async function handleCreateChannel(type: "text" | "voice", name: string) {
    if (!serverId || !name.trim()) return;

    try {
      const ch = await createChannel(serverId, name.trim(), type);
      const all = await listChannels(serverId);
      setChannels(all);
      await selectChannel(ch.id);
    } catch (e) {
      alert(
        "Only the server owner or members with Manage Channels can create channels.",
      );
      console.warn("create channel failed", e);
    }
  }

  async function handleJoinByCode(code: string) {
    const cleaned = code.trim().toUpperCase();
    if (!cleaned) return;

    try {
      const { serverId: joinedId } = await joinServerByCode(cleaned);
      const list = await myServers();
      setServers(list);
      await selectServer(joinedId);
    } catch (e) {
      console.warn("join by code failed", e);
      alert("Invalid or expired invite code.");
    }
  }

  async function joinVoice(id: string) {
    try {
      await voice.join(id);
      setVoiceChannelId(id);
      setIsInVoice(true);
      force((x) => x + 1);
    } catch (e) {
      console.error("join voice failed", e);
    }
  }

  async function leaveVoice() {
    try {
      await voice.leave();
      setVoiceChannelId(null);
      setIsInVoice(false);
      force((x) => x + 1);
    } catch (e) {
      console.error("leave voice failed", e);
    }
  }

  function toggleMute() {
    voice.toggleMute();
    force((x) => x + 1);
  }

  function togglePushToTalk() {
    voice.togglePushToTalk();
    force((x) => x + 1);
  }

  function setVoiceVolume(socketId: string, value: number) {
    voice.setVolume(socketId, value);
    force((x) => x + 1);
  }

  function setSelfMicLevel(value: number) {
    voice.setSelfMicLevel(value);
    force((x) => x + 1);
  }

  useEffect(() => {
    if (!ENABLE_POLL_FALLBACK) return;

    const tick = async () => {
      const id = channelIdRef.current;
      if (!id) return;

      try {
        const fresh = sortFetchedMessagesAscending(
          await listMessages(id, { limit: PAGE_SIZE }),
        );

        fresh.forEach((m) => seenIds.add(m.id));

        setMessages((prev) => appendFetchedLatest(prev, fresh));
      } catch {
        console.debug("poll fallback failed");
      }
    };

    const timerId = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(timerId);
  }, [seenIds]);

  const onCreateRoleCb = async (name: string, color: string, perms: number) => {
    if (!serverId) throw new Error("No server selected");
    const r = await createRole(serverId, name, color, perms);
    setRoles((prev) => [...prev, r].sort((a, b) => b.position - a.position));
    return r;
  };

  const onUpdateRoleCb = async (
    roleId: string,
    patch: Partial<Pick<Role, "name" | "color" | "permissions" | "position">>,
  ) => {
    const updated = await updateRole(roleId, patch);

    setRoles((prev) =>
      prev
        .map((x) => (x.id === roleId ? updated : x))
        .sort((a, b) => b.position - a.position),
    );

    setMemberRoles((prev) => {
      const next: Record<string, Role[]> = {};
      for (const [uid, rr] of Object.entries(prev)) {
        const replaced = (rr as Role[]).map((x) =>
          x.id === roleId ? updated : x,
        );
        next[uid] = replaced.slice().sort((a, b) => b.position - a.position);
      }
      return next;
    });

    return updated;
  };

  const onDeleteRoleCb = async (roleId: string) => {
    await deleteRole(roleId);

    setRoles((prev) => prev.filter((x) => x.id !== roleId));

    setMemberRoles((prev) => {
      const next: Record<string, Role[]> = {};
      for (const [uid, rr] of Object.entries(prev)) {
        next[uid] = (rr as Role[]).filter((x) => x.id !== roleId);
      }
      return next;
    });
  };

  const onAssignRoleCb = async (userId: string, roleId: string) => {
    if (!serverId) throw new Error("No server selected");
    await assignRole(serverId, userId, roleId);

    const rs = await rolesOfUser(serverId, userId);
    setMemberRoles((prev) => ({
      ...prev,
      [userId]: rs.slice().sort((a, b) => b.position - a.position),
    }));
  };

  const onUnassignRoleCb = async (userId: string, roleId: string) => {
    if (!serverId) throw new Error("No server selected");
    await unassignRole(serverId, userId, roleId);

    const rs = await rolesOfUser(serverId, userId);
    setMemberRoles((prev) => ({
      ...prev,
      [userId]: rs.slice().sort((a, b) => b.position - a.position),
    }));
  };

  const [iconBust, setIconBust] = useState<Record<string, number>>({});
  const [tempIconOverride, setTempIconOverride] = useState<
    Record<string, string>
  >({});

  // DM state
  const [isDmView, setIsDmView] = useState(false);
  const [pendingDmUserId, setPendingDmUserId] = useState<string | null>(null);
  const [dmUnread, setDmUnread] = useState(0);

  // Keep ref in sync for socket listeners
  useEffect(() => { isDmViewRef.current = isDmView; }, [isDmView]);

  // Screen share state
  const [showScreenShareModal, setShowScreenShareModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [incomingScreenStream, setIncomingScreenStream] = useState<MediaStream | null>(null);
  const [incomingScreenUser, setIncomingScreenUser] = useState<string>("");
  const [showScreenPanel, setShowScreenPanel] = useState(false);
  const [sharingSocketIds, setSharingSocketIds] = useState<Set<string>>(new Set());

  const scheduleBustRetries = (sid: string) => {
    setIconBust((p) => ({ ...p, [sid]: Date.now() }));
    setTimeout(() => setIconBust((p) => ({ ...p, [sid]: Date.now() })), 800);
    setTimeout(() => setIconBust((p) => ({ ...p, [sid]: Date.now() })), 1600);
  };

  const onUploadIconCb = async (file: File) => {
    if (!serverId) return;

    const blobUrl = URL.createObjectURL(file);
    setTempIconOverride((p) => ({ ...p, [serverId]: blobUrl }));

    try {
      const updated = await uploadServerIcon(serverId, file);
      setServers((prev) => prev.map((s) => (s.id === serverId ? updated : s)));
    } finally {
      setTimeout(() => {
        setTempIconOverride((p) => {
          const clone = { ...p };
          delete clone[serverId];
          return clone;
        });
        URL.revokeObjectURL(blobUrl);
        scheduleBustRetries(serverId);
      }, 600);
    }
  };

  // ── DM ────────────────────────────────────────────────────────────────────
  function handleOpenDm(userId: string, _username: string) {
    setPendingDmUserId(userId);
    setIsDmView(true);
    setDmUnread(0);
  }

  // ── Screen sharing ─────────────────────────────────────────────────────────
  async function handleStartShare(sourceId: string) {
    if (!voiceChannelId) return;
    setShowScreenShareModal(false);

    const socket = (await import("./lib/socket")).getSocket();

    try {
      const stream = await (navigator.mediaDevices as any).getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: sourceId,
            maxWidth: 1920,
            maxHeight: 1080,
            maxFrameRate: 15,
          },
        },
      });

      screenStreamRef.current = stream;
      setIsSharing(true);

      // Notify everyone first so icon appears immediately
      socket.emit("screen:start", { channelId: voiceChannelId });

      // Send WebRTC stream to users already in voice
      const voicePeers = voice.peerIds;
      for (const peerId of voicePeers) {
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        });
        screenPeersRef.current.set(peerId, pc);

        stream.getVideoTracks().forEach((t: MediaStreamTrack) => pc.addTrack(t, stream));

        pc.onicecandidate = (e) => {
          if (e.candidate) socket.emit("screen:candidate", { to: peerId, candidate: e.candidate });
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("screen:offer", { to: peerId, sdp: offer });
      }

      stream.getVideoTracks()[0].addEventListener("ended", () => void handleStopShare());
    } catch (e: any) {
      console.error("screen share failed", e);
      setIsSharing(false);
      alert(`Screen share failed: ${e?.message ?? "unknown error"}.\nMake sure you are in a voice channel and accepted the screen capture prompt.`);
    }
  }

  async function handleStopShare() {
    if (!voiceChannelId) return;
    setIsSharing(false);

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    screenPeersRef.current.forEach((pc) => pc.close());
    screenPeersRef.current.clear();

    try {
      const socket = (await import("./lib/socket")).getSocket();
      socket.emit("screen:stop", { channelId: voiceChannelId });
    } catch {
      // ignore
    }
  }

  const hasServerSelected = !!serverId;

  if (bootError) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-4 bg-[#070b18] text-white">
        <p className="text-white/60 text-sm">Could not connect to server.</p>
        <button
          onClick={() => {
            setBootError(false);
            setBooting(true);
            setAuth(token);
            myServers()
              .then(async (list) => {
                setServers(list);
                setBooting(false);
                if (list.length === 0) return;
                const savedServerId =
                  localStorage.getItem(SELECTED_SERVER_STORAGE_KEY) ||
                  sessionStorage.getItem(SELECTED_SERVER_STORAGE_KEY);
                const preferredServerId =
                  savedServerId && list.some((s) => s.id === savedServerId)
                    ? savedServerId
                    : list[0].id;
                await selectServer(preferredServerId);
              })
              .catch(() => { setBooting(false); setBootError(true); });
          }}
          className="px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-sm font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (booting) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#070b18]">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-[#474e64] via-[#2d3b56] to-[#141626] text-white p-3 sm:p-4">
      <div className="h-full w-full flex flex-col gap-3 sm:gap-4">
        <ServerRail
          servers={servers}
          serverId={serverId}
          onSelectServer={(id) => { setIsDmView(false); setPendingDmUserId(null); return selectServer(id); }}
          onOpenCreateServer={() => setOpenCreateServer(true)}
          onOpenJoinServer={() => setOpenJoinServer(true)}
          onOpenUserSettings={() => setOpenUserSettings(true)}
          onOpenInfo={() => setOpenInfo(true)}
          onOpenDmInbox={() => { setPendingDmUserId(null); setIsDmView(true); setDmUnread(0); }}
          dmUnread={dmUnread}
          onLogout={onLogout}
          iconBustMap={iconBust}
          tempIconOverride={tempIconOverride}
        />

        {isDmView ? (
          <div className="flex-1 min-h-0">
            <DMView
              currentUserId={user.id}
              serverMembers={members.map((m) => ({ id: m.id, username: m.username, online: !!m.online }))}
              initialUserId={pendingDmUserId}
              onBack={() => { setIsDmView(false); setPendingDmUserId(null); }}
            />
          </div>
        ) : hasServerSelected ? (
          <main className="flex-1 min-h-0 grid grid-cols-[280px_minmax(0,2fr)_260px] gap-3 sm:gap-4">
            <div className="min-h-0">
              <ChannelsPane
                serverId={serverId}
                channels={channels}
                channelId={channelId}
                onOpenServerSettings={() => setOpenServerSettings(true)}
                invite={invite}
                inviteCopied={inviteCopied}
                setInviteCopied={setInviteCopied}
                onOpenCreateTextChannel={() => setOpenCreateChannelType("text")}
                onOpenCreateVoiceChannel={() =>
                  setOpenCreateChannelType("voice")
                }
                onSelectChannel={selectChannel}
                isInVoice={isInVoice}
                voiceChannelId={voiceChannelId}
                joinVoice={joinVoice}
                leaveVoice={leaveVoice}
                getVoiceMembers={(id) => voice.getParticipants(id)}
                getVoiceVolume={(socketId) => voice.getVolume(socketId)}
                setVoiceVolume={setVoiceVolume}
                getSelfMicLevel={() => voice.getSelfMicLevel()}
                setSelfMicLevel={setSelfMicLevel}
                isMuted={voice.isMuted}
                toggleMute={toggleMute}
                isPushToTalk={voice.isPushToTalk}
                togglePushToTalk={togglePushToTalk}
                pushToTalkLabel={voice.pushToTalkLabel}
                currentUserId={user.id}
                canDisconnectVoiceMembers={
                  isOwner || (myPermMask & PERMS.KICK_MEMBERS) !== 0
                }
                isSharing={isSharing}
                onStartShare={isInVoice ? () => setShowScreenShareModal(true) : undefined}
                onStopShare={isInVoice ? () => void handleStopShare() : undefined}
                sharingSocketIds={sharingSocketIds}
                onWatchStream={() => setShowScreenPanel(true)}
              />
            </div>

            <div className="min-h-0">
              <ChatPane
                channelTitle={
                  channels.find((c) => c.id === channelId)?.name ||
                  "select a channel"
                }
                messages={messages}
                memberRoles={memberRoles}
                input={inputVal}
                setInput={setInputVal}
                send={send}
                bottomRef={bottomRef}
                messagesContainerRef={messagesContainerRef}
                onMessagesScroll={handleMessagesScroll}
                channelId={channelId}
                loadingOlder={loadingOlder || loadingMessages}
                hasMoreMessages={hasMoreMessages}
              />
            </div>

            <div className="min-h-0">
              <MembersPane
                serverId={serverId}
                members={members.map((m) => ({
                  ...m,
                  online: !!m.online,
                }))}
                memberRoles={memberRoles}
                canKickMembers={
                  isOwner || (myPermMask & PERMS.KICK_MEMBERS) !== 0
                }
                canBanMembers={
                  isOwner || (myPermMask & PERMS.BAN_MEMBERS) !== 0
                }
                currentUserId={user.id}
                onOpenDm={handleOpenDm}
              />
            </div>
          </main>
        ) : (
          <div className="flex-1 min-h-0 flex items-center justify-center text-white/60 text-sm">
            Select or create a server to get started.
          </div>
        )}
      </div>

      <InfoModal open={openInfo} onClose={() => setOpenInfo(false)} />

      <SettingsModal
        open={openUserSettings}
        onClose={() => setOpenUserSettings(false)}
        user={user}
      />

      {serverId && (
        <ServerSettingsModal
          open={openServerSettings}
          onClose={() => setOpenServerSettings(false)}
          serverId={serverId}
          serverName={servers.find((s) => s.id === serverId)?.name ?? "Server"}
          serverIconUrl={
            servers.find((s) => s.id === serverId)?.icon_url ?? undefined
          }
          isOwner={isOwner || false}
          members={members}
          roles={roles}
          memberRoles={memberRoles}
          canManageRoles={canManageRoles}
          onCreateRole={onCreateRoleCb}
          onUpdateRole={onUpdateRoleCb}
          onDeleteRole={onDeleteRoleCb}
          onAssignRole={onAssignRoleCb}
          onUnassignRole={onUnassignRoleCb}
          onUploadIcon={onUploadIconCb}
        />
      )}

      <CreateServerModal
        open={openCreateServer}
        onClose={() => setOpenCreateServer(false)}
        onCreate={(name) => {
          setOpenCreateServer(false);
          void handleCreateServer(name);
        }}
      />

      <JoinServerModal
        open={openJoinServer}
        onClose={() => setOpenJoinServer(false)}
        onJoin={(code) => {
          setOpenJoinServer(false);
          void handleJoinByCode(code);
        }}
      />

      <CreateChannelModal
        open={openCreateChannelType !== null}
        type={openCreateChannelType ?? "text"}
        onClose={() => setOpenCreateChannelType(null)}
        onCreate={(name) => {
          const t = openCreateChannelType ?? "text";
          setOpenCreateChannelType(null);
          void handleCreateChannel(t, name);
        }}
      />

      {showScreenShareModal && (
        <ScreenShareModal
          onSelect={(sourceId) => void handleStartShare(sourceId)}
          onClose={() => setShowScreenShareModal(false)}
        />
      )}

      {/* Incoming screen share — shown only when user clicks the stream icon */}
      {incomingScreenStream && showScreenPanel && (
        <IncomingScreenPanel
          stream={incomingScreenStream}
          sharerLabel={incomingScreenUser}
          onMinimize={() => setShowScreenPanel(false)}
          onClose={() => { setIncomingScreenStream(null); setIncomingScreenUser(""); setShowScreenPanel(false); }}
        />
      )}
    </div>
  );
}

function IncomingScreenPanel({
  stream,
  sharerLabel,
  onMinimize,
  onClose,
}: {
  stream: MediaStream;
  sharerLabel: string;
  onMinimize: () => void;
  onClose: () => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const pipVideoRef = React.useRef<HTMLVideoElement>(null);
  const [pip, setPip] = useState(false);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream, pip]);

  useEffect(() => {
    if (pipVideoRef.current) pipVideoRef.current.srcObject = stream;
  }, [stream, pip]);

  if (pip) {
    // Small PiP window at bottom-right
    return (
      <div className="fixed bottom-6 right-6 z-[99] w-72 rounded-2xl border border-white/15 bg-[#111626]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
          <span className="text-xs text-white/80 font-medium truncate">
            📺 {sharerLabel || "Someone"}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setPip(false)}
              className="h-6 w-6 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 text-xs leading-none"
              title="Expand"
            >
              ⛶
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-6 w-6 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 text-sm leading-none"
              title="Stop watching"
            >
              ×
            </button>
          </div>
        </div>
        <video
          ref={pipVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full aspect-video bg-black object-contain"
        />
      </div>
    );
  }

  // Full-screen overlay
  return (
    <div className="fixed inset-0 z-[99] bg-black/85 backdrop-blur-sm flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#111626]/90 shrink-0">
        <span className="text-sm text-white/90 font-semibold">
          📺 {sharerLabel || "Someone"} is sharing their screen
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPip(true)}
            className="h-8 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 text-xs transition-colors"
            title="Minimize to small window"
          >
            ⊡ Minimize
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded-xl border border-red-400/20 bg-red-500/10 hover:bg-red-500/20 text-red-200 text-xs transition-colors"
            title="Stop watching"
          >
            ✕ Close
          </button>
        </div>
      </div>
      {/* Video fills remaining space */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-4">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}
