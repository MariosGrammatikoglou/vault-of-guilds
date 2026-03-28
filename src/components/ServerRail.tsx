import React from "react";
import type { ServerItem } from "../lib/api";
import { CONFIG } from "../lib/config";
import defaultServerIcon from "/assets/default-server.png";

import { glass, panelRound, railBtn, cuteScroll } from "../ui";

type Props = {
  servers: ServerItem[];
  serverId: string | null;
  onSelectServer: (id: string) => Promise<void>;
  onOpenCreateServer: () => void;
  onOpenJoinServer: () => void;
  onOpenUserSettings: () => void;
  onOpenInfo: () => void;
  onLogout: () => void;
  iconBustMap?: Record<string, number>;
  tempIconOverride?: Record<string, string>;
};

type SvgIconProps = {
  className?: string;
};

function IconWrap({
  title,
  children,
  onClick,
}: {
  title: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`${railBtn} w-10 h-10 p-0 overflow-hidden flex items-center justify-center`}
      type="button"
    >
      {children}
    </button>
  );
}

function SettingsSvg({ className = "w-[26px] h-[26px]" }: SvgIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`${className} pointer-events-none select-none`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14.2788 2.15224C13.9085 2 13.439 2 12.5 2C11.561 2 11.0915 2 10.7212 2.15224C10.2274 2.35523 9.83509 2.74458 9.63056 3.23463C9.53719 3.45834 9.50065 3.7185 9.48635 4.09799C9.46534 4.65568 9.17716 5.17189 8.69017 5.45093C8.20318 5.72996 7.60864 5.71954 7.11149 5.45876C6.77318 5.2813 6.52789 5.18262 6.28599 5.15102C5.75609 5.08178 5.22018 5.22429 4.79616 5.5472C4.47814 5.78938 4.24339 6.1929 3.7739 6.99993C3.30441 7.80697 3.06967 8.21048 3.01735 8.60491C2.94758 9.1308 3.09118 9.66266 3.41655 10.0835C3.56506 10.2756 3.77377 10.437 4.0977 10.639C4.57391 10.936 4.88032 11.4419 4.88029 12C4.88026 12.5581 4.57386 13.0639 4.0977 13.3608C3.77372 13.5629 3.56497 13.7244 3.41645 13.9165C3.09108 14.3373 2.94749 14.8691 3.01725 15.395C3.06957 15.7894 3.30432 16.193 3.7738 17C4.24329 17.807 4.47804 18.2106 4.79606 18.4527C5.22008 18.7756 5.75599 18.9181 6.28589 18.8489C6.52778 18.8173 6.77305 18.7186 7.11133 18.5412C7.60852 18.2804 8.2031 18.27 8.69012 18.549C9.17714 18.8281 9.46533 19.3443 9.48635 19.9021C9.50065 20.2815 9.53719 20.5417 9.63056 20.7654C9.83509 21.2554 10.2274 21.6448 10.7212 21.8478C11.0915 22 11.561 22 12.5 22C13.439 22 13.9085 22 14.2788 21.8478C14.7726 21.6448 15.1649 21.2554 15.3694 20.7654C15.4628 20.5417 15.4994 20.2815 15.5137 19.902C15.5347 19.3443 15.8228 18.8281 16.3098 18.549C16.7968 18.2699 17.3914 18.2804 17.8886 18.5412C18.2269 18.7186 18.4721 18.8172 18.714 18.8488C19.2439 18.9181 19.7798 18.7756 20.2038 18.4527C20.5219 18.2105 20.7566 17.807 21.2261 16.9999C21.6956 16.1929 21.9303 15.7894 21.9827 15.395C22.0524 14.8691 21.9088 14.3372 21.5835 13.9164C21.4349 13.7243 21.2262 13.5628 20.9022 13.3608C20.4261 13.0639 20.1197 12.558 20.1197 11.9999C20.1197 11.4418 20.4261 10.9361 20.9022 10.6392C21.2263 10.4371 21.435 10.2757 21.5836 10.0835C21.9089 9.66273 22.0525 9.13087 21.9828 8.60497C21.9304 8.21055 21.6957 7.80703 21.2262 7C20.7567 6.19297 20.522 5.78945 20.2039 5.54727C19.7799 5.22436 19.244 5.08185 18.7141 5.15109C18.4722 5.18269 18.2269 5.28136 17.8887 5.4588C17.3915 5.71959 16.7969 5.73002 16.3099 5.45096C15.8229 5.17191 15.5347 4.65566 15.5136 4.09794C15.4993 3.71848 15.4628 3.45833 15.3694 3.23463C15.1649 2.74458 14.7726 2.35523 14.2788 2.15224ZM12.5 15C14.1695 15 15.5228 13.6569 15.5228 12C15.5228 10.3431 14.1695 9 12.5 9C10.8305 9 9.47716 10.3431 9.47716 12C9.47716 13.6569 10.8305 15 12.5 15Z"
        fill="#596a91"
      />
    </svg>
  );
}

function LogoutSvg({ className = "w-[26px] h-[26px]" }: SvgIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`${className} pointer-events-none select-none`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.9771 14.7904C21.6743 12.0932 21.6743 7.72013 18.9771 5.02291C16.2799 2.3257 11.9068 2.3257 9.20961 5.02291C7.41866 6.81385 6.8169 9.34366 7.40432 11.6311C7.49906 12 7.41492 12.399 7.14558 12.6684L3.43349 16.3804C3.11558 16.6984 2.95941 17.1435 3.00906 17.5904L3.24113 19.679C3.26587 19.9017 3.36566 20.1093 3.52408 20.2677L3.73229 20.4759C3.89072 20.6343 4.09834 20.7341 4.32101 20.7589L6.4096 20.9909C6.85645 21.0406 7.30164 20.8844 7.61956 20.5665L8.32958 19.8565L6.58343 18.1294C6.28893 17.8382 6.28632 17.3633 6.5776 17.0688C6.86888 16.7743 7.34375 16.7717 7.63825 17.063L9.39026 18.7958L11.3319 16.8541C11.6013 16.5848 12 16.5009 12.3689 16.5957C14.6563 17.1831 17.1861 16.5813 18.9771 14.7904ZM12.5858 8.58579C13.3668 7.80474 14.6332 7.80474 15.4142 8.58579C16.1953 9.36684 16.1953 10.6332 15.4142 11.4142C14.6332 12.1953 13.3668 12.1953 12.5858 11.4142C11.8047 10.6332 11.8047 9.36684 12.5858 8.58579Z"
        fill="#596a91"
      />
    </svg>
  );
}

function JoinSvg({ className = "w-[26px] h-[26px]" }: SvgIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`${className} pointer-events-none select-none`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M18.6357 15.6701L20.3521 10.5208C21.8516 6.02242 22.6013 3.77322 21.414 2.58595C20.2268 1.39869 17.9776 2.14842 13.4792 3.64788L8.32987 5.36432C4.69923 6.57453 2.88392 7.17964 2.36806 8.06698C1.87731 8.91112 1.87731 9.95369 2.36806 10.7978C2.88392 11.6852 4.69923 12.2903 8.32987 13.5005C8.77981 13.6505 9.28601 13.5434 9.62294 13.2096L15.1286 7.75495C15.4383 7.44808 15.9382 7.45041 16.245 7.76015C16.5519 8.06989 16.5496 8.56975 16.2398 8.87662L10.8231 14.2432C10.4518 14.6111 10.3342 15.1742 10.4995 15.6701C11.7097 19.3007 12.3148 21.1161 13.2022 21.6319C14.0463 22.1227 15.0889 22.1227 15.933 21.6319C16.8204 21.1161 17.4255 19.3008 18.6357 15.6701Z"
        fill="#596a91"
      />
    </svg>
  );
}

function ComingSoonSvg({ className = "w-[26px] h-[26px]" }: SvgIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`${className} pointer-events-none select-none`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5.19825 3.29918C5.80046 2 7.86697 2 12 2C16.133 2 18.1995 2 18.8017 3.29918C18.8535 3.41086 18.8972 3.52686 18.9323 3.6461C19.3414 5.0333 17.8802 6.64111 14.9577 9.85674L13 12L14.9577 14.1433C17.8802 17.3589 19.3414 18.9667 18.9323 20.3539C18.8972 20.4731 18.8535 20.5891 18.8017 20.7008C18.1995 22 16.133 22 12 22C7.86697 22 5.80046 22 5.19825 20.7008C5.14649 20.5891 5.10282 20.4731 5.06765 20.3539C4.65857 18.9667 6.11981 17.3589 9.0423 14.1433L11 12L9.0423 9.85674C6.11981 6.64111 4.65857 5.0333 5.06765 3.6461C5.10282 3.52686 5.14649 3.41086 5.19825 3.29918Z"
        fill="#596a91"
      />
    </svg>
  );
}

function InfoSvg({ className = "w-[26px] h-[26px]" }: SvgIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`${className} pointer-events-none select-none`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.75 2C12.75 1.58579 12.4142 1.25 12 1.25C11.5858 1.25 11.25 1.58579 11.25 2V3.5H6.70399C6.04642 3.5 5.71764 3.5 5.41593 3.5982C5.28282 3.64152 5.15463 3.6987 5.03346 3.76879C4.75882 3.92767 4.53915 4.1723 4.09981 4.66156C3.24911 5.60893 2.82376 6.08262 2.72136 6.63619C2.67687 6.87669 2.67687 7.12331 2.72136 7.36381C2.82376 7.91738 3.24911 8.39107 4.09981 9.33844C4.53915 9.8277 4.75882 10.0723 5.03346 10.2312C5.15463 10.3013 5.28282 10.3585 5.41593 10.4018C5.71764 10.5 6.04642 10.5 6.70399 10.5H11.25V12.5H6.5C5.09554 12.5 4.39331 12.5 3.88886 12.8371C3.67048 12.983 3.48298 13.1705 3.33706 13.3889C3 13.8933 3 14.5955 3 16C3 17.4045 3 18.1067 3.33706 18.6111C3.48298 18.8295 3.67048 19.017 3.88886 19.1629C4.39331 19.5 5.09554 19.5 6.5 19.5H11.25V21.25H10C9.58579 21.25 9.25 21.5858 9.25 22C9.25 22.4142 9.58579 22.75 10 22.75H14C14.4142 22.75 14.75 22.4142 14.75 22C14.75 21.5858 14.4142 21.25 14 21.25H12.75V19.5H17.296C17.9536 19.5 18.2824 19.5 18.5841 19.4018C18.7172 19.3585 18.8454 19.3013 18.9665 19.2312C19.2412 19.0723 19.4608 18.8277 19.9002 18.3384C20.7509 17.3911 21.1762 16.9174 21.2786 16.3638C21.3231 16.1233 21.3231 15.8767 21.2786 15.6362C21.1762 15.0826 20.7509 14.6089 19.9002 13.6616C19.4608 13.1723 19.2412 12.9277 18.9665 12.7688C18.8454 12.6987 18.7172 12.6415 18.5841 12.5982C18.2824 12.5 17.9536 12.5 17.296 12.5H12.75V10.5H17.5C18.9045 10.5 19.6067 10.5 20.1111 10.1629C20.3295 10.017 20.517 9.82952 20.6629 9.61114C21 9.10669 21 8.40446 21 7C21 5.59554 21 4.89331 20.6629 4.38886C20.517 4.17048 20.3295 3.98298 20.1111 3.83706C19.6067 3.5 18.9045 3.5 17.5 3.5H12.75V2Z"
        fill="#596a91"
      />
    </svg>
  );
}

function CreateSvg({ className = "w-[26px] h-[26px]" }: SvgIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`${className} pointer-events-none select-none`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.58579 3.58579C2 4.17157 2 5.11438 2 7C2 8.88562 2 9.82843 2.58579 10.4142C3.17157 11 4.11438 11 6 11H18C19.8856 11 20.8284 11 21.4142 10.4142C22 9.82843 22 8.88562 22 7C22 5.11438 22 4.17157 21.4142 3.58579C20.8284 3 19.8856 3 18 3H6C4.11438 3 3.17157 3 2.58579 3.58579ZM9 8.75C8.58579 8.75 8.25 8.41421 8.25 8V6C8.25 5.58579 8.58579 5.25 9 5.25C9.41421 5.25 9.75 5.58579 9.75 6V8C9.75 8.41421 9.41421 8.75 9 8.75ZM13.5 6.25C13.0858 6.25 12.75 6.58579 12.75 7C12.75 7.41421 13.0858 7.75 13.5 7.75H18C18.4142 7.75 18.75 7.41421 18.75 7C18.75 6.58579 18.4142 6.25 18 6.25H13.5ZM6 8.75C5.58579 8.75 5.25 8.41421 5.25 8L5.25 6C5.25 5.58579 5.58579 5.25 6 5.25C6.41421 5.25 6.75 5.58579 6.75 6V8C6.75 8.41421 6.41421 8.75 6 8.75Z"
        fill="#596a91"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.58579 13.5858C2 14.1716 2 15.1144 2 17C2 18.8856 2 19.8284 2.58579 20.4142C3.17157 21 4.11438 21 6 21H18C19.8856 21 20.8284 21 21.4142 20.4142C22 19.8284 22 18.8856 22 17C22 15.1144 22 14.1716 21.4142 13.5858C20.8284 13 19.8856 13 18 13H6C4.11438 13 3.17157 13 2.58579 13.5858ZM12.75 17C12.75 16.5858 13.0858 16.25 13.5 16.25H18C18.4142 16.25 18.75 16.5858 18.75 17C18.75 17.4142 18.4142 17.75 18 17.75H13.5C13.0858 17.75 12.75 17.4142 12.75 17ZM5.25 18C5.25 18.4142 5.58579 18.75 6 18.75C6.41421 18.75 6.75 18.4142 6.75 18V16C6.75 15.5858 6.41421 15.25 6 15.25C5.58579 15.25 5.25 15.5858 5.25 16L5.25 18ZM9 18.75C8.58579 18.75 8.25 18.4142 8.25 18V16C8.25 15.5858 8.58579 15.25 9 15.25C9.41421 15.25 9.75 15.5858 9.75 16V18C9.75 18.4142 9.41421 18.75 9 18.75Z"
        fill="#596a91"
      />
    </svg>
  );
}

function resolveIconUrl(icon_url?: string | null, bust?: number) {
  let url: string;

  if (!icon_url) {
    url = defaultServerIcon;
  } else if (/^https?:\/\//i.test(icon_url)) {
    url = icon_url;
  } else {
    const base = (CONFIG as { API_BASE?: string })?.API_BASE ?? "";
    if (!base) {
      url = icon_url.startsWith("/") ? icon_url : `/${icon_url}`;
    } else {
      const needsSlash = !base.endsWith("/") && !icon_url.startsWith("/");
      url = needsSlash ? `${base}/${icon_url}` : `${base}${icon_url}`;
    }
  }

  if (bust) {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}v=${bust}`;
  }

  return url;
}

export default function ServerRail({
  servers,
  serverId,
  onSelectServer,
  onOpenCreateServer,
  onOpenJoinServer,
  onOpenUserSettings,
  onOpenInfo,
  onLogout,
  iconBustMap = {},
  tempIconOverride = {},
}: Props) {
  return (
    <header className="w-full grid grid-cols-[280px_minmax(0,2fr)_260px] gap-3 sm:gap-4">
      <div
        className={`${glass} ${panelRound} flex items-center justify-center gap-2 sm:gap-3 px-5 py-2 sm:py-2.5`}
      >
        <IconWrap title="Settings" onClick={onOpenUserSettings}>
          <SettingsSvg />
        </IconWrap>

        <IconWrap title="Create" onClick={onOpenCreateServer}>
          <CreateSvg />
        </IconWrap>

        <IconWrap title="Join" onClick={onOpenJoinServer}>
          <JoinSvg />
        </IconWrap>

        <IconWrap title="Info" onClick={onOpenInfo}>
          <InfoSvg />
        </IconWrap>
      </div>

      <div
        className={`${glass} ${panelRound} px-5 py-2 sm:py-2.5 overflow-x-auto overflow-y-hidden ${cuteScroll}`}
      >
        <div className="text-[10px] text-white/50 mb-2">
          servers count: {servers.length}
        </div>

        <ul className="flex items-center gap-3 py-0.5">
          {servers.map((s) => {
            const bust = iconBustMap[s.id];
            const override = tempIconOverride[s.id];
            const imgSrc = override ?? resolveIconUrl(s.icon_url, bust);
            const selected = serverId === s.id;

            return (
              <li key={s.id}>
                <button
                  onClick={() => onSelectServer(s.id)}
                  className={[
                    "relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl overflow-hidden transition-all focus:outline-none",
                    selected
                      ? "border border-slate-100/50 bg-[#262b3f] scale-105"
                      : "border border-transparent bg-[#202336] hover:bg-[#262b3f]",
                  ].join(" ")}
                  title={s.name}
                  type="button"
                >
                  <img
                    src={imgSrc}
                    alt={s.name}
                    onError={(e) => {
                      console.warn("SERVER ICON FAILED:", s.name, imgSrc);
                      (e.currentTarget as HTMLImageElement).src =
                        defaultServerIcon;
                    }}
                    className="w-full h-full object-cover"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="min-w-0 flex gap-2">
        <div
          className={`${glass} ${panelRound} flex-[1.4] flex items-center justify-center gap-2 px-3 py-2 sm:py-2.5 min-w-0`}
        >
          <IconWrap title="Coming Soon">
            <ComingSoonSvg />
          </IconWrap>

          <IconWrap title="Coming Soon">
            <ComingSoonSvg />
          </IconWrap>
        </div>

        <div
          className={`${glass} ${panelRound} flex-[0.6] flex items-center justify-center px-3 py-2 sm:py-2.5 min-w-0`}
        >
          <IconWrap title="Logout" onClick={onLogout}>
            <LogoutSvg />
          </IconWrap>
        </div>
      </div>
    </header>
  );
}
