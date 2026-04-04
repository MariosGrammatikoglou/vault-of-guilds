import React, { useEffect, useRef, useState } from "react";
import type { Message, Role } from "../lib/api";
import {
  glass,
  panelRound,
  cuteScroll,
  input as inputClass,
  btnPrimary,
} from "../ui";

type Props = {
  channelTitle: string;
  messages: Message[];
  memberRoles: Record<string, Role[]>;
  input: string;
  setInput: (v: string) => void;
  send: () => void;
  bottomRef: React.RefObject<HTMLDivElement>;
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  onMessagesScroll: React.UIEventHandler<HTMLDivElement>;
  channelId: string | null;
  loadingOlder: boolean;
  hasMoreMessages: boolean;
};

const EMOJI_LIST = [
  "😀","😂","😍","🥰","😎","😭","😅","🤔","😱","🥳",
  "👍","👎","❤️","🔥","✨","🎉","🥺","😤","🤣","😴",
  "👀","💀","🙌","🤝","💪","🫡","🙏","🤯","😇","👏",
  "🐶","🐱","🦊","🐸","🦄","🐙","🐧","🦋","🌸","🌟",
  "🍕","🍔","🍩","🍦","☕","🧋","🎮","🎵","🎬","💡",
  "🚀","⚡","💥","🌈","🎯","💎","🏆","🎸","🎲","🃏",
];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDaySeparator(iso: string): string {
  const d = new Date(iso);
  const now = new Date();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(d, now)) return "Today";
  if (isSameDay(d, yesterday)) return "Yesterday";

  return d.toLocaleDateString("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTimeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("el-GR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatPane({
  channelTitle,
  messages,
  memberRoles,
  input,
  setInput,
  send,
  bottomRef,
  messagesContainerRef,
  onMessagesScroll,
  channelId,
  loadingOlder,
  hasMoreMessages,
}: Props) {
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showEmoji) return;
    function handleDown(e: MouseEvent) {
      if (
        emojiPickerRef.current?.contains(e.target as Node) ||
        emojiBtnRef.current?.contains(e.target as Node)
      )
        return;
      setShowEmoji(false);
    }
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, [showEmoji]);

  function appendEmoji(emoji: string) {
    setInput(input + emoji);
    setShowEmoji(false);
  }

  return (
    <section
      className={`${glass} ${panelRound} h-full min-h-0 overflow-hidden grid grid-rows-[auto_1fr_auto]`}
    >
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between gap-3">
          <div className="font-semibold truncate text-white/88">
            {channelTitle ? `# ${channelTitle}` : "select a channel"}
          </div>
        </div>
      </div>

      <div
        ref={messagesContainerRef}
        onScroll={onMessagesScroll}
        className={`min-h-0 overflow-y-auto ${cuteScroll} px-4 py-3 space-y-2`}
      >
        {loadingOlder && (
          <div className="text-center text-xs text-white/56 py-1">
            loading older messages...
          </div>
        )}

        {!loadingOlder && hasMoreMessages && messages.length > 0 && (
          <div className="text-center text-xs text-white/34 py-1">
            scroll up to load older messages
          </div>
        )}

        {!hasMoreMessages && messages.length > 0 && (
          <div className="text-center text-xs text-white/26 py-1">
            start of conversation
          </div>
        )}

        {messages.map((m, index) => {
          const roles = memberRoles[m.user_id] ?? [];
          const topRoleColor = roles[0]?.color;
          const nameColor = topRoleColor ?? "#d9deea";

          const currentDate = new Date(m.created_at);
          const previous = index > 0 ? messages[index - 1] : null;
          const showDaySeparator =
            !previous || !isSameDay(currentDate, new Date(previous.created_at));

          return (
            <React.Fragment key={m.id}>
              {showDaySeparator && (
                <div className="flex items-center gap-3 py-2">
                  <div className="h-px flex-1 bg-white/8" />
                  <div className="text-[11px] uppercase tracking-wide text-white/40">
                    {formatDaySeparator(m.created_at)}
                  </div>
                  <div className="h-px flex-1 bg-white/8" />
                </div>
              )}

              <div className="flex items-start gap-2">
                <span
                  className="font-semibold mr-1 shrink-0"
                  style={{ color: nameColor }}
                >
                  {m.username ?? m.user_id.slice(0, 6)}
                </span>

                <span className="text-white/86 break-words whitespace-pre-wrap flex-1 min-w-0">
                  {m.content}
                </span>

                <span className="text-[11px] text-white/52 ml-2 shrink-0 whitespace-nowrap">
                  {formatTimeLabel(m.created_at)}
                </span>
              </div>
            </React.Fragment>
          );
        })}

        <div ref={bottomRef} />

        {messages.length === 0 && (
          <div className="text-white/62 text-sm">
            no messages yet — say hi 👋
          </div>
        )}
      </div>

      <div className="px-3 sm:px-4 py-3 border-t border-white/10">
        <div className="flex gap-2 relative">
          {/* Emoji picker popup */}
          {showEmoji && (
            <div
              ref={emojiPickerRef}
              className="absolute bottom-full mb-2 left-0 z-30 w-[380px] rounded-2xl border border-white/15 bg-[#111626]/97 backdrop-blur-xl shadow-2xl p-3"
            >
              <div className={`grid grid-cols-10 gap-0.5 max-h-[190px] overflow-y-auto overflow-x-hidden ${cuteScroll}`}>
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="text-xl w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                    onClick={() => appendEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            ref={emojiBtnRef}
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            disabled={!channelId}
            className="h-10 w-10 rounded-full border border-white/10 bg-[#151a27] hover:bg-[#1a2030] transition-colors text-lg flex items-center justify-center shrink-0 disabled:opacity-40"
            title="Emoji"
          >
            😊
          </button>

          <input
            className={`${inputClass} flex-1 rounded-full border border-white/10 bg-[#151a27] hover:bg-[#1a2030] focus:bg-[#1a2030] text-white/78 placeholder:text-white/34`}
            placeholder={
              channelId
                ? "type a message ..."
                : "select a channel to start chatting"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            disabled={!channelId}
          />
          <button
            className={btnPrimary}
            onClick={send}
            disabled={!channelId || !input.trim()}
          >
            send
          </button>
        </div>
      </div>
    </section>
  );
}
