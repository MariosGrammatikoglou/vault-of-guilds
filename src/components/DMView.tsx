import React, { useEffect, useRef, useState } from "react";
import {
  listDmChannels,
  openDmChannel,
  listDmMessages,
  type DmChannel,
  type DmMessage,
} from "../lib/api";
import { glass, panelRound, cuteScroll } from "../ui";
import { getSocket } from "../lib/socket";

type ServerMember = { id: string; username: string; online?: boolean };

type Props = {
  currentUserId: string;
  serverMembers: ServerMember[];
  initialUserId?: string | null;
  onBack: () => void;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("el-GR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function DMView({
  currentUserId,
  serverMembers,
  initialUserId,
  onBack,
}: Props) {
  const [dmChannels, setDmChannels] = useState<DmChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<DmChannel | null>(null);
  const [search, setSearch] = useState("");
  const [loadingChannels, setLoadingChannels] = useState(true);

  // Load existing DM channels on mount
  useEffect(() => {
    listDmChannels()
      .then((list) => {
        setDmChannels(list);
        setLoadingChannels(false);
      })
      .catch(() => setLoadingChannels(false));
  }, []);

  // Open initial user's DM if provided
  useEffect(() => {
    if (!initialUserId || loadingChannels) return;

    const existing = dmChannels.find(
      (ch) => ch.other_user_id === initialUserId,
    );
    if (existing) {
      setActiveChannel(existing);
    } else {
      openDmChannel(initialUserId)
        .then((ch) => {
          setDmChannels((prev) =>
            prev.some((c) => c.id === ch.id) ? prev : [ch, ...prev],
          );
          setActiveChannel(ch);
        })
        .catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUserId, loadingChannels]);

  async function handleSelectMember(member: ServerMember) {
    const existing = dmChannels.find((ch) => ch.other_user_id === member.id);
    if (existing) {
      setActiveChannel(existing);
      return;
    }
    try {
      const ch = await openDmChannel(member.id);
      setDmChannels((prev) =>
        prev.some((c) => c.id === ch.id) ? prev : [ch, ...prev],
      );
      setActiveChannel(ch);
    } catch (e) {
      console.error("open dm failed", e);
    }
  }

  const q = search.trim().toLowerCase();

  const filteredChannels = dmChannels.filter((ch) =>
    !q || ch.other_username.toLowerCase().includes(q),
  );

  // Server members not already in a DM channel (recommendations)
  const dmUserIds = new Set(dmChannels.map((ch) => ch.other_user_id));
  const recommendations = serverMembers.filter(
    (m) =>
      m.id !== currentUserId &&
      (!q || m.username.toLowerCase().includes(q)) &&
      !dmUserIds.has(m.id),
  );

  return (
    <div className="h-full flex gap-3 sm:gap-4">
      {/* ── Left panel ── */}
      <aside
        className={`${glass} ${panelRound} w-72 shrink-0 flex flex-col min-h-0 overflow-hidden`}
      >
        {/* Back button */}
        <div className="px-3 pt-3 pb-2 shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="w-full h-9 px-3 rounded-full border border-white/10 bg-[#151a27] hover:bg-[#1a2030] transition-colors text-sm text-white/70 text-left flex items-center gap-2"
          >
            <span className="text-white/50">←</span>
            <span>Back to server</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2 shrink-0">
          <input
            className="w-full rounded-full px-3 py-2 text-sm bg-[#151a27] border border-white/10 text-white/80 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-400/50 transition"
            placeholder="Search people..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={`flex-1 min-h-0 overflow-y-auto ${cuteScroll} px-2 pb-3 space-y-4`}>
          {/* Existing DM conversations */}
          {filteredChannels.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-white/40">
                Direct Messages
              </div>
              <ul className="space-y-0.5">
                {filteredChannels.map((ch) => (
                  <li key={ch.id}>
                    <button
                      type="button"
                      onClick={() => setActiveChannel(ch)}
                      className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-xl transition-colors text-left ${
                        activeChannel?.id === ch.id
                          ? "bg-indigo-500/20 text-white"
                          : "hover:bg-white/6 text-white/75"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-500/25 border border-indigo-300/20 flex items-center justify-center text-indigo-200 font-semibold text-sm shrink-0">
                        {ch.other_username.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate text-sm font-medium">
                        {ch.other_username}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations from server */}
          {recommendations.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-white/40">
                {q ? "People" : "From Your Server"}
              </div>
              <ul className="space-y-0.5">
                {recommendations.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => void handleSelectMember(m)}
                      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/6 transition-colors text-left"
                    >
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-full bg-slate-600/40 border border-white/10 flex items-center justify-center text-white/60 font-semibold text-sm">
                          {m.username.charAt(0).toUpperCase()}
                        </div>
                        {m.online !== undefined && (
                          <span
                            className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#1c1f33]"
                            style={{
                              background: m.online ? "#22c55e" : "#6b7280",
                            }}
                          />
                        )}
                      </div>
                      <span className="truncate text-sm text-white/72">
                        {m.username}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!loadingChannels &&
            filteredChannels.length === 0 &&
            recommendations.length === 0 && (
              <div className="text-center text-xs text-white/30 py-6 px-3">
                {q ? "No users found." : "No conversations yet."}
              </div>
            )}
        </div>
      </aside>

      {/* ── Right panel: chat ── */}
      <div className="flex-1 min-h-0">
        {activeChannel ? (
          <DMChat
            channel={activeChannel}
            currentUserId={currentUserId}
          />
        ) : (
          <div
            className={`${glass} ${panelRound} h-full flex items-center justify-center`}
          >
            <div className="text-center space-y-2">
              <div className="text-4xl">💬</div>
              <div className="text-white/50 text-sm">
                Select someone to start chatting
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Inline chat panel ──────────────────────────────────────────────────────────

function DMChat({
  channel,
  currentUserId,
}: {
  channel: DmChannel;
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMessages([]);
    setLoading(true);
    setInput("");

    const socket = getSocket();
    socket.emit("dm:subscribe", { channelId: channel.id });

    const onNew = (msg: DmMessage) => {
      if (msg.dm_channel_id !== channel.id) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        const next = [...prev, msg];
        requestAnimationFrame(() =>
          bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        );
        return next;
      });
    };

    socket.on("dm:new", onNew);

    listDmMessages(channel.id, 50)
      .then((msgs) => {
        setMessages(msgs);
        setLoading(false);
        requestAnimationFrame(() =>
          bottomRef.current?.scrollIntoView({ behavior: "auto" }),
        );
      })
      .catch(() => setLoading(false));

    setTimeout(() => inputRef.current?.focus(), 50);

    return () => {
      socket.off("dm:new", onNew);
      socket.emit("dm:unsubscribe", { channelId: channel.id });
    };
  }, [channel.id]);

  function send() {
    const content = input.trim();
    if (!content) return;
    setInput("");

    const socket = getSocket();
    const tempId = `temp-${Date.now()}`;
    const optimistic: DmMessage = {
      id: tempId,
      dm_channel_id: channel.id,
      sender_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      sender_username: "You",
    };
    setMessages((prev) => [...prev, optimistic]);
    requestAnimationFrame(() =>
      bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
    );

    socket.emit(
      "dm:send",
      { channelId: channel.id, content },
      (ack: { ok: boolean; msg?: DmMessage; error?: string }) => {
        if (!ack?.ok) {
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          setInput(content);
        } else if (ack.msg) {
          // Replace optimistic temp message with real one from server
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? ack.msg! : m)),
          );
        }
      },
    );
  }

  return (
    <section
      className={`${glass} ${panelRound} h-full min-h-0 overflow-hidden grid grid-rows-[auto_1fr_auto]`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500/25 border border-indigo-300/20 flex items-center justify-center text-indigo-200 font-semibold text-sm shrink-0">
            {channel.other_username.charAt(0).toUpperCase()}
          </div>
          <span className="font-semibold text-white/90 truncate">
            {channel.other_username}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className={`min-h-0 overflow-y-auto ${cuteScroll} px-4 py-3 space-y-0.5`}>
        {loading && (
          <div className="text-center text-xs text-white/40 py-4">loading...</div>
        )}

        {!loading && messages.length === 0 && (
          <div className="text-center text-xs text-white/35 py-8">
            No messages yet — say something!
          </div>
        )}

        {messages.map((m, idx) => {
          const isSelf = m.sender_id === currentUserId;
          const prev = idx > 0 ? messages[idx - 1] : null;
          const showDay =
            !prev ||
            !isSameDay(new Date(m.created_at), new Date(prev.created_at));

          return (
            <React.Fragment key={m.id}>
              {showDay && (
                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-white/8" />
                  <span className="text-[11px] text-white/35 uppercase tracking-wide">
                    {new Date(m.created_at).toLocaleDateString("el-GR")}
                  </span>
                  <div className="h-px flex-1 bg-white/8" />
                </div>
              )}

              <div className={`group flex items-end gap-2 ${isSelf ? "flex-row-reverse" : ""}`}>
                <div
                  className={`max-w-[70%] flex flex-col gap-0.5 ${isSelf ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`px-3 py-1.5 rounded-2xl text-sm break-words whitespace-pre-wrap ${
                      isSelf
                        ? "bg-indigo-500/30 text-white/90 rounded-tr-sm"
                        : "bg-white/8 text-white/85 rounded-tl-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                  <span className="text-[10px] text-white/40 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatTime(m.created_at)}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-white/10 shrink-0 flex gap-2">
        <input
          ref={inputRef}
          className="flex-1 rounded-full px-4 py-2.5 text-sm bg-[#151a27] border border-white/10 hover:bg-[#1a2030] focus:bg-[#1a2030] text-white/80 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-400/50 transition"
          placeholder={`Message ${channel.other_username}...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <button
          type="button"
          onClick={send}
          disabled={!input.trim()}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-400 to-sky-400 text-slate-950 font-semibold text-sm disabled:opacity-40 hover:brightness-110 transition"
        >
          send
        </button>
      </div>
    </section>
  );
}
