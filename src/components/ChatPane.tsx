import React, { useEffect, useRef, useState, useCallback } from "react";
import type { Message, Reaction, Role } from "../lib/api";
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
  currentUserId: string;
  currentUsername: string;
  serverMembers: { id: string; username: string }[];
  typingUsers: string[];
  onEditMessage: (id: string, content: string) => Promise<void>;
  onDeleteMessage: (id: string) => Promise<void>;
  onReactionToggle: (messageId: string, emoji: string) => void;
  onScrollToLatest: () => void;
  mentionAlert: { from: string; content: string } | null;
  onDismissMentionAlert: () => void;
};

const EMOJI_LIST = [
  "😀","😂","😍","🥰","😎","😭","😅","🤔","😱","🥳",
  "👍","👎","❤️","🔥","✨","🎉","🥺","😤","🤣","😴",
  "👀","💀","🙌","🤝","💪","🫡","🙏","🤯","😇","👏",
  "🐶","🐱","🦊","🐸","🦄","🐙","🐧","🦋","🌸","🌟",
  "🍕","🍔","🍩","🍦","☕","🧋","🎮","🎵","🎬","💡",
  "🚀","⚡","💥","🌈","🎯","💎","🏆","🎸","🎲","🃏",
];

// 5 inline quick-react emojis shown on hover
const QUICK_REACT = ["👍", "❤️", "😂", "🔥", "😮"];

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
  return d.toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTimeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" });
}

// Render message content with @mentions highlighted
function renderContent(content: string, currentUsername: string) {
  const parts = content.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (/^@\w+$/.test(part)) {
      const isSelf = part.toLowerCase() === `@${currentUsername.toLowerCase()}`;
      return (
        <span
          key={i}
          className={`font-semibold rounded px-0.5 ${
            isSelf
              ? "text-yellow-200 bg-yellow-400/20"
              : "text-indigo-300 bg-indigo-500/15"
          }`}
        >
          {part}
        </span>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function TypingBar({ users }: { users: string[] }) {
  if (users.length === 0) return <div className="h-5" />;
  let label = "";
  if (users.length === 1) label = `${users[0]} is typing...`;
  else if (users.length === 2) label = `${users[0]} and ${users[1]} are typing...`;
  else label = `${users.slice(0, 2).join(", ")} and others are typing...`;

  return (
    <div className="h-5 flex items-center gap-1.5 px-1">
      <span className="flex gap-0.5 items-end">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block w-1 h-1 rounded-full bg-white/50"
            style={{ animation: `typingBounce 1.2s ${i * 0.15}s infinite` }}
          />
        ))}
      </span>
      <span className="text-[11px] text-white/52 italic">{label}</span>
    </div>
  );
}

function ReactionBar({
  reactions,
  onToggle,
  onOpenPicker,
}: {
  reactions: Reaction[];
  onToggle: (emoji: string) => void;
  onOpenPicker: () => void;
}) {
  if (!reactions || reactions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => onToggle(r.emoji)}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-xs transition-all ${
            r.reacted
              ? "border-indigo-400/50 bg-indigo-500/20 text-indigo-100"
              : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
          }`}
        >
          <span>{r.emoji}</span>
          <span className="font-medium">{r.count}</span>
        </button>
      ))}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpenPicker(); }}
        className="flex items-center px-1.5 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70 text-xs transition-colors"
        title="Add reaction"
      >
        +😊
      </button>
    </div>
  );
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
  currentUserId,
  currentUsername,
  serverMembers,
  typingUsers,
  onEditMessage,
  onDeleteMessage,
  onReactionToggle,
  onScrollToLatest,
  mentionAlert,
  onDismissMentionAlert,
}: Props) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Per-message hover/action state
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  // Message-level reaction picker (full emoji grid)
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);

  // Scroll-to-bottom button
  const [showScrollButton, setShowScrollButton] = useState(false);

  // @mention autocomplete
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const mentionSuggestions = mentionQuery !== null
    ? serverMembers
        .filter((m) => m.username.toLowerCase().startsWith(mentionQuery.toLowerCase()) && m.username.toLowerCase() !== currentUsername.toLowerCase())
        .slice(0, 6)
    : [];

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    function handleDown(e: MouseEvent) {
      if (
        emojiPickerRef.current?.contains(e.target as Node) ||
        emojiBtnRef.current?.contains(e.target as Node)
      ) return;
      setShowEmojiPicker(false);
    }
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, [showEmojiPicker]);

  // Close reaction picker on outside click (use "click" so stopPropagation on the toggle button works)
  useEffect(() => {
    if (!reactionPickerMsgId) return;
    function handleClick(e: MouseEvent) {
      if (reactionPickerRef.current?.contains(e.target as Node)) return;
      setReactionPickerMsgId(null);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [reactionPickerMsgId]);

  // Reset scroll button when channel changes
  useEffect(() => {
    setShowScrollButton(false);
  }, [channelId]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    onMessagesScroll(e);
    const el = e.currentTarget;
    setShowScrollButton(el.scrollHeight - el.scrollTop - el.clientHeight > 300);
  }, [onMessagesScroll]);

  function appendEmoji(emoji: string) {
    setInput(input + emoji);
    setShowEmojiPicker(false);
  }

  function startEdit(msg: Message) {
    setEditingId(msg.id);
    setEditContent(msg.content);
    setHoveredId(null);
  }

  async function commitEdit(id: string) {
    if (!editContent.trim()) return;
    try { await onEditMessage(id, editContent); } catch {}
    setEditingId(null);
  }

  async function confirmDelete(id: string) {
    try { await onDeleteMessage(id); } catch {}
    setDeleteConfirmId(null);
  }

  // Handle @mention autocomplete in input
  function handleInputWithMention(val: string) {
    setInput(val);
    // Detect @word at end of input
    const match = val.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]);
    } else {
      setMentionQuery(null);
    }
  }

  function completeMention(username: string) {
    const newVal = input.replace(/@\w*$/, `@${username} `);
    setInput(newVal);
    setMentionQuery(null);
    inputRef.current?.focus();
  }

  return (
    <section
      className={`${glass} ${panelRound} h-full min-h-0 overflow-hidden grid grid-rows-[auto_1fr_auto_auto]`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="font-semibold truncate text-white/88">
          {channelTitle ? `# ${channelTitle}` : "select a channel"}
        </div>
      </div>

      {/* Mention toast (fixed) */}
      {mentionAlert && (
        <div className="fixed top-4 right-4 z-50 max-w-xs rounded-2xl border border-yellow-400/30 bg-[#1a160a]/95 backdrop-blur-xl shadow-2xl px-4 py-3 flex gap-3 items-start">
          <span className="text-yellow-300 text-base shrink-0">🔔</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-yellow-200">{mentionAlert.from} mentioned you</div>
            <div className="text-xs text-white/55 mt-0.5 line-clamp-2">{mentionAlert.content}</div>
          </div>
          <button type="button" onClick={onDismissMentionAlert} className="text-white/40 hover:text-white/70 text-lg leading-none shrink-0">×</button>
        </div>
      )}

      {/* Messages */}
      <div className="relative min-h-0 overflow-hidden">
        {showScrollButton && (
          <button
            type="button"
            onClick={() => { onScrollToLatest(); setShowScrollButton(false); }}
            className="absolute bottom-4 right-4 z-30 flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg transition-all"
          >
            ↓ Live
          </button>
        )}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className={`absolute inset-0 overflow-y-auto ${cuteScroll} px-4 py-3 space-y-1`}
        >
        {loadingOlder && (
          <div className="text-center text-xs text-white/56 py-1">loading older messages...</div>
        )}
        {!loadingOlder && hasMoreMessages && messages.length > 0 && (
          <div className="text-center text-xs text-white/34 py-1">scroll up to load older messages</div>
        )}
        {!hasMoreMessages && messages.length > 0 && (
          <div className="text-center text-xs text-white/26 py-1">start of conversation</div>
        )}

        {messages.map((m, index) => {
          const roles = memberRoles[m.user_id] ?? [];
          const topRoleColor = roles[0]?.color;
          const nameColor = topRoleColor ?? "#d9deea";
          const isOwn = m.user_id === currentUserId;
          const isEditing = editingId === m.id;
          const mentionsMe = m.content.toLowerCase().includes(`@${currentUsername.toLowerCase()}`);
          const canEdit = isOwn && !m.id.startsWith("temp-") && (Date.now() - new Date(m.created_at).getTime()) < 60_000;

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

              <div
                className={`group relative flex items-start gap-2 rounded-xl px-2 py-1 -mx-2 transition-colors ${
                  mentionsMe
                    ? "bg-yellow-400/[0.06] border-l-2 border-yellow-400/50 hover:bg-yellow-400/[0.09]"
                    : "hover:bg-white/[0.03]"
                }`}
                onMouseEnter={() => setHoveredId(m.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Hover action bar */}
                {hoveredId === m.id && !isEditing && (
                  <div className="absolute right-2 -top-3 flex items-center gap-0.5 z-20 bg-[#111626] border border-white/12 rounded-full px-1 py-0.5 shadow-lg">
                    {/* 5 quick-react emojis */}
                    {QUICK_REACT.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => onReactionToggle(m.id, emoji)}
                        className="h-6 w-7 rounded-full hover:bg-white/10 flex items-center justify-center text-sm transition-colors"
                        title={`React ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                    {/* More reactions button */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setReactionPickerMsgId(m.id === reactionPickerMsgId ? null : m.id); }}
                        className="h-6 w-7 rounded-full hover:bg-white/10 flex items-center justify-center text-xs text-white/50 hover:text-white/80 transition-colors"
                        title="More reactions"
                      >
                        +
                      </button>
                    </div>
                    {/* Separator */}
                    <div className="w-px h-4 bg-white/15 mx-0.5" />
                    {/* Edit (own messages within 1 minute only) */}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => startEdit(m)}
                        className="h-6 w-7 rounded-full hover:bg-white/10 flex items-center justify-center text-xs text-white/50 hover:text-white/80 transition-colors"
                        title="Edit (within 1 min)"
                      >
                        ✏️
                      </button>
                    )}
                    {/* Delete (own only) */}
                    {isOwn && (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(m.id)}
                        className="h-6 w-7 rounded-full hover:bg-red-500/20 flex items-center justify-center text-xs text-white/50 hover:text-red-300 transition-colors"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                )}

                {/* Message-level reaction picker popup */}
                {reactionPickerMsgId === m.id && (
                  <div
                    ref={reactionPickerRef}
                    className={`absolute right-2 z-30 w-[340px] rounded-2xl border border-white/15 bg-[#111626]/97 backdrop-blur-xl shadow-2xl p-3 ${
                      index > messages.length - 4 ? "bottom-8" : "top-8"
                    }`}
                  >
                    <div className={`grid grid-cols-10 gap-0.5 max-h-[180px] overflow-y-auto ${cuteScroll}`}>
                      {EMOJI_LIST.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="text-xl w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                          onClick={() => { onReactionToggle(m.id, emoji); setReactionPickerMsgId(null); }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold shrink-0 text-sm" style={{ color: nameColor }}>
                      {m.username ?? m.user_id.slice(0, 6)}
                    </span>
                    <span className="text-[11px] text-white/42 whitespace-nowrap">
                      {formatTimeLabel(m.created_at)}
                    </span>
                    {m.edited_at && (
                      <span className="text-[10px] text-white/28 italic">(edited)</span>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="mt-1 flex gap-2">
                      <input
                        autoFocus
                        className={`${inputClass} flex-1 text-sm rounded-lg border border-indigo-400/40 bg-[#151a27] text-white/88`}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void commitEdit(m.id); }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <button type="button" onClick={() => void commitEdit(m.id)} className="px-3 py-1 text-xs rounded-lg bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 hover:bg-indigo-500/30">Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="px-3 py-1 text-xs rounded-lg bg-white/5 text-white/60 border border-white/10 hover:bg-white/10">Cancel</button>
                    </div>
                  ) : (
                    <p className="text-white/86 break-words whitespace-pre-wrap text-sm leading-relaxed">
                      {renderContent(m.content, currentUsername)}
                    </p>
                  )}

                  <ReactionBar
                    reactions={m.reactions ?? []}
                    onToggle={(emoji) => onReactionToggle(m.id, emoji)}
                    onOpenPicker={() => setReactionPickerMsgId(m.id)}
                  />
                </div>
              </div>

              {/* Delete confirm */}
              {deleteConfirmId === m.id && (
                <div className="mx-2 mt-1 mb-2 rounded-xl border border-red-400/20 bg-red-500/8 px-3 py-2 flex items-center gap-3">
                  <span className="text-xs text-red-200 flex-1">Delete this message?</span>
                  <button type="button" onClick={() => void confirmDelete(m.id)} className="px-2 py-1 text-xs rounded-lg bg-red-500/20 text-red-200 border border-red-400/30 hover:bg-red-500/30">Delete</button>
                  <button type="button" onClick={() => setDeleteConfirmId(null)} className="px-2 py-1 text-xs rounded-lg bg-white/5 text-white/60 border border-white/10 hover:bg-white/10">Cancel</button>
                </div>
              )}
            </React.Fragment>
          );
        })}

        <div ref={bottomRef} />

        {messages.length === 0 && (
          <div className="text-white/62 text-sm">no messages yet — say hi 👋</div>
        )}
        </div>
      </div>

      {/* Typing indicator */}
      <div className="px-4">
        <TypingBar users={typingUsers} />
      </div>

      {/* Input bar */}
      <div className="px-3 sm:px-4 py-3 border-t border-white/10">
        <div className="flex gap-2 relative">
          {/* Input emoji picker */}
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute bottom-full mb-2 left-0 z-30 w-[380px] rounded-2xl border border-white/15 bg-[#111626]/97 backdrop-blur-xl shadow-2xl p-3"
            >
              <div className={`grid grid-cols-10 gap-0.5 max-h-[190px] overflow-y-auto overflow-x-hidden ${cuteScroll}`}>
                {EMOJI_LIST.map((emoji) => (
                  <button key={emoji} type="button" className="text-xl w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors" onClick={() => appendEmoji(emoji)}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* @mention autocomplete dropdown */}
          {mentionSuggestions.length > 0 && (
            <div className="absolute bottom-full mb-2 left-12 z-30 min-w-[200px] rounded-2xl border border-white/15 bg-[#111626]/97 backdrop-blur-xl shadow-2xl overflow-hidden">
              {mentionSuggestions.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); completeMention(m.username); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-indigo-500/15 transition-colors text-left"
                >
                  <span className="w-6 h-6 rounded-full bg-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-200">
                    {m.username[0].toUpperCase()}
                  </span>
                  <span className="text-sm text-white/88 font-medium">@{m.username}</span>
                </button>
              ))}
            </div>
          )}

          <button
            ref={emojiBtnRef}
            type="button"
            onClick={() => setShowEmojiPicker((v) => !v)}
            disabled={!channelId}
            className="h-10 w-10 rounded-full border border-white/10 bg-[#151a27] hover:bg-[#1a2030] transition-colors text-lg flex items-center justify-center shrink-0 disabled:opacity-40"
            title="Emoji"
          >
            😊
          </button>

          <input
            ref={inputRef}
            className={`${inputClass} flex-1 rounded-full border border-white/10 bg-[#151a27] hover:bg-[#1a2030] focus:bg-[#1a2030] text-white/78 placeholder:text-white/34`}
            placeholder={channelId ? "type a message ..." : "select a channel to start chatting"}
            value={input}
            onChange={(e) => handleInputWithMention(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && mentionSuggestions.length === 0) send();
              if (e.key === "Escape") setMentionQuery(null);
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

      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </section>
  );
}
