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

export default function App() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("token"),
  );
  const [user, setUser] = useState<User | null>(() => {
    const u = localStorage.getItem("user");
    return u ? (JSON.parse(u) as User) : null;
  });

  const handleUserUpdate = (u: User) => {
    setUser(u);
    localStorage.setItem("user", JSON.stringify(u));
  };

  if (!token || !user) {
    return (
      <AuthView
        onAuth={(t, u) => {
          setToken(t);
          handleUserUpdate(u);
          localStorage.setItem("token", t);
        }}
      />
    );
  }

  return (
    <MainView
      token={token}
      user={user}
      onLogout={() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem(SELECTED_SERVER_STORAGE_KEY);
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
      s.disconnect();
    };
  }, [token, seenIds]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        setAuth(token);

        const list = await myServers();
        if (cancelled) return;

        setServers(list);

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

        const savedServerId = localStorage.getItem(SELECTED_SERVER_STORAGE_KEY);
        const preferredServerId =
          savedServerId && list.some((s) => s.id === savedServerId)
            ? savedServerId
            : list[0].id;

        await selectServer(preferredServerId);
      } catch (e) {
        console.error("servers boot failed", e);
        setServers([]);
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

  const hasServerSelected = !!serverId;

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-[#474e64] via-[#2d3b56] to-[#141626] text-white p-3 sm:p-4">
      <div className="h-full w-full flex flex-col gap-3 sm:gap-4">
        <ServerRail
          servers={servers}
          serverId={serverId}
          onSelectServer={selectServer}
          onOpenCreateServer={() => setOpenCreateServer(true)}
          onOpenJoinServer={() => setOpenJoinServer(true)}
          onOpenUserSettings={() => setOpenUserSettings(true)}
          onOpenInfo={() => setOpenInfo(true)}
          onLogout={onLogout}
          iconBustMap={iconBust}
          tempIconOverride={tempIconOverride}
        />

        {hasServerSelected ? (
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
                currentUserId={user.id}
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
    </div>
  );
}
