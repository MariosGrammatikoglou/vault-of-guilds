// src/ui.ts
// Cozy glass UI — matching the soft blue mockup

//
// PANELS / CONTAINERS
//
export const glass = [
  "bg-gradient-to-br",
  // slightly lighter top, darker center, very subtle
  "from-[#262b3f]/80",
  "via-[#1c1f33]/95",
  "to-[#181b2b]/95",

  "backdrop-blur-2xl",

  "border",
  // very soft border, not bright
  "border-white/10",

  // no visible hard shadow
  "shadow-none",
].join(" ");

export const panelRound = "rounded-[26px]";
export const frame = `${glass} ${panelRound}`;

//
// TOP RAIL BUTTONS (user / + / join)
//
export const railBtn = [
  "w-10",
  "h-10",
  "sm:w-11",
  "sm:h-11",
  "rounded-2xl",

  "border",
  "border-[#262b3f]",

  "bg-[#151827]",
  "hover:bg-[#181c2a]",

  "shadow-none",
  "transition",
  "duration-150",
  "hover:scale-[1.02]",
  "active:scale-95",

  "flex",
  "items-center",
  "justify-center",
].join(" ");

//
// PRIMARY BUTTON (send, Save, Create, etc.)
//
export const btnPrimary = [
  "px-5",
  "py-2.5",
  "rounded-full",

  "bg-gradient-to-r",
  "from-indigo-400",
  "to-sky-400",

  "text-slate-950",
  "font-semibold",

  "shadow-none",

  "hover:brightness-110",
  "active:brightness-95",
  "active:scale-95",
  "transition",
  "duration-150",

  "disabled:opacity-50",
  "disabled:cursor-not-allowed",
].join(" ");

//
// GHOST BUTTON (Cancel, Logout, Done secondary)
//
export const btnGhost = [
  "px-4",
  "py-2",
  "rounded-full",

  "border",
  "border-[#262b3f]",

  "bg-[#141827]/90",
  "text-slate-100",

  "hover:bg-[#181c2a]",
  "hover:border-slate-300/40",

  "shadow-none",
  "transition",
  "duration-150",

  "disabled:opacity-50",
  "disabled:cursor-not-allowed",
].join(" ");


export const btnWarn = [
  "px-4",
  "py-2",
  "rounded-full",

  "border",
  "border-red-300/70",
  "bg-gradient-to-r",
  "from-red-500/90",
  "to-orange-500/90",

  "text-white",

  "shadow-none",
  "hover:brightness-110",
  "active:brightness-95",
  "active:scale-95",
  "transition",
  "duration-150",

  "disabled:opacity-50",
  "disabled:shadow-none",
].join(" ");

//
// INPUTS
//
export const input = [
  "w-full",
  "rounded-full",

  "border",
  "border-white/16",
  "bg-[#171a2a]/85",
  "backdrop-blur-2xl",

  "px-4",
  "py-2.5",

  "text-slate-50",
  "placeholder:text-slate-400",

  "shadow-none",

  "focus:outline-none",
  "focus:ring-2",
  "focus:ring-indigo-300/90",
  "focus:border-indigo-200",
  "transition",
  "duration-150",
].join(" ");

//
// CHIPS / BADGES (role pills etc.)
//
export const chip = [
  "text-[11px]",
  "px-2.5",
  "py-0.5",
  "rounded-full",
  "border",
  "border-slate-500/70",
  "bg-[#151827]",
  "text-slate-100",
  "shadow-none",
  "uppercase",
  "tracking-wide",
].join(" ");

//
// LIST ITEM (channels, members rows, etc.)
//
export const listItem = [
  "px-3.5",
  "py-2",
  "rounded-full",

  "border",
  "border-indigo-200/25",

  "bg-[#181b2b]/85",
  "backdrop-blur-2xl",

  "hover:bg-[#151827]/95",
  "hover:border-indigo-100/40",

  "shadow-none",
  "transition",
  "duration-150",

  // not pure white
  "text-slate-100/90",
  "flex",
  "items-center",
  "gap-2",
].join(" ");


export const tabBtn = [
  "px-3.5",
  "py-1.5",
  "rounded-full",

  "border",
  "border-white/12",
  "bg-[#1e2233]/80",
  "backdrop-blur-xl",

  "hover:bg-[#191d2c]/95",

  "text-[13px]",
  "text-slate-200/85",

  "shadow-none",
  "transition",
  "duration-150",
].join(" ");

export const tabBtnActive = [
  "px-3.5",
  "py-1.5",
  "rounded-full",

  "border",
  "border-indigo-200/80",
  "bg-gradient-to-r",
  "from-[#4f5dff]/45",
  "to-[#88e0c0]/45",

  "text-[13px]",
  "text-slate-50",

  "shadow-none",
].join(" ");

//
// SCROLLBARS
//
export const cuteScroll =
  // WebKit / Chromium scrollbars (Electron, Chrome, Edge, most mobile webviews)
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 " +
  "[&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-track]:border-none " +
  "[&::-webkit-scrollbar-thumb]:bg-[#3b4256] [&::-webkit-scrollbar-thumb]:rounded-full " +
  "[&::-webkit-scrollbar-thumb:hover]:bg-[#5b647b]";
  
export const hideScroll =
  "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";


  //
// MODAL PANEL (all popups: user settings, create/join server, etc.)
//
export const modalPanel = [
  "rounded-2xl",
  "bg-[#10131e]/95",
  "border",
  "border-[#20253a]",
  "backdrop-blur-2xl",
  "shadow-[0_24px_50px_rgba(0,0,0,0.7)]",
].join(" ");

//
// MODAL INPUT (create/join server, etc.)
//
export const modalInput = [
  "w-full",
  "rounded-full",
  "border",
  "border-[#3a415b]",
  "bg-[#111626]",
  "px-4",
  "py-2.5",
  "text-sm",
  "text-slate-100",
  "placeholder:text-slate-400",
  "focus:outline-none",
  "focus:ring-2",
  "focus:ring-indigo-400/70",
  "focus:border-indigo-300/70",
  "transition",
  "duration-150",
].join(" ");