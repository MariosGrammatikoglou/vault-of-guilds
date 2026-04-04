import React, { useEffect, useRef, useState } from "react";
import { cuteScroll } from "../ui";
import { getSocket } from "../lib/socket";
import { listDmMessages, type DmChannel, type DmMessage } from "../lib/api";

type Props = {
  dmChannel: DmChannel;
  currentUserId: string;
  onClose: () => void;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("el-GR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DMModal({ dmChannel, currentUserId, onClose }: Props) {
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("dm:subscribe", { channelId: dmChannel.id });

    const onNew = (msg: DmMessage) => {
      if (msg.dm_channel_id !== dmChannel.id) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
    };

    socket.on("dm:new", onNew);

    listDmMessages(dmChannel.id, 50)
      .then((msgs) => {
        setMessages(msgs);
        setLoading(false);
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "auto" }));
      })
      .catch(() => setLoading(false));

    inputRef.current?.focus();

    return () => {
      socket.off("dm:new", onNew);
      socket.emit("dm:unsubscribe", { channelId: dmChannel.id });
    };
  }, [dmChannel.id]);

  function send() {
    const content = input.trim();
    if (!content) return;
    setInput("");

    const socket = getSocket();
    const tempId = `temp-${Date.now()}`;
    const optimistic: DmMessage = {
      id: tempId,
      dm_channel_id: dmChannel.id,
      sender_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      sender_username: "You",
    };
    setMessages((prev) => [...prev, optimistic]);
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));

    socket.emit(
      "dm:send",
      { channelId: dmChannel.id, content },
      (ack: { ok: boolean; error?: string }) => {
        if (!ack?.ok) {
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          setInput(content);
        }
      },
    );
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg h-[70vh] flex flex-col rounded-2xl border border-white/15 bg-[#111626]/97 backdrop-blur-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div className="font-semibold text-white/90 text-sm truncate">
            DM — {dmChannel.other_username}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div className={`flex-1 min-h-0 overflow-y-auto ${cuteScroll} px-4 py-3 space-y-2`}>
          {loading && (
            <div className="text-center text-xs text-white/50 py-4">loading...</div>
          )}
          {!loading && messages.length === 0 && (
            <div className="text-center text-xs text-white/40 py-4">
              no messages yet — say hi!
            </div>
          )}
          {messages.map((m) => {
            const isSelf = m.sender_id === currentUserId;
            return (
              <div
                key={m.id}
                className={`flex items-start gap-2 ${isSelf ? "flex-row-reverse" : ""}`}
              >
                <div className={`max-w-[80%] ${isSelf ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                  <span
                    className={`text-[11px] ${isSelf ? "text-indigo-300/70" : "text-white/50"}`}
                  >
                    {isSelf ? "you" : m.sender_username}
                  </span>
                  <div
                    className={`px-3 py-1.5 rounded-2xl text-sm break-words whitespace-pre-wrap max-w-full ${
                      isSelf
                        ? "bg-indigo-500/30 text-white/90 rounded-tr-sm"
                        : "bg-white/8 text-white/85 rounded-tl-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                  <span className="text-[10px] text-white/30">{formatTime(m.created_at)}</span>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-3 border-t border-white/10 shrink-0 flex gap-2">
          <input
            ref={inputRef}
            className="flex-1 rounded-full px-4 py-2 text-sm bg-[#151a27] border border-white/10 text-white/85 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-400/50"
            placeholder={`Message ${dmChannel.other_username}...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          />
          <button
            type="button"
            onClick={send}
            disabled={!input.trim()}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-400 to-sky-400 text-slate-950 font-semibold text-sm disabled:opacity-50 hover:brightness-110 transition"
          >
            send
          </button>
        </div>
      </div>
    </div>
  );
}
