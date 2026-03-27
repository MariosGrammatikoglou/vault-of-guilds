import axios from "axios";
import { CONFIG } from "./config";

export const api = axios.create({ baseURL: CONFIG.API_BASE });

export function setAuth(token: string | null) {
  if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  else delete api.defaults.headers.common["Authorization"];
}

export type UserProfile = {
  id: string;
  username: string;
  display_color?: string | null;
};

export type AuthResp = { token: string; user: UserProfile };

export async function register(
  username: string,
  password: string,
): Promise<AuthResp> {
  const { data } = await api.post<AuthResp>("/auth/register", {
    username,
    password,
  });
  return data;
}

export async function login(
  username: string,
  password: string,
): Promise<AuthResp> {
  const { data } = await api.post<AuthResp>("/auth/login", {
    username,
    password,
  });
  return data;
}

export type ServerItem = {
  id: string;
  name: string;
  owner_id: string;
  icon_url?: string | null;
};

export async function myServers() {
  const { data } = await api.get<ServerItem[]>("/servers/mine");
  return data;
}

export async function createServer(name: string) {
  const { data } = await api.post<ServerItem>("/servers", { name });
  return data;
}

export async function deleteServer(serverId: string) {
  const { data } = await api.post<{ ok: true }>(`/servers/${serverId}/delete`);
  return data;
}

export async function kickMember(serverId: string, userId: string) {
  const { data } = await api.post<{ ok: true }>(
    `/servers/${serverId}/kick/${userId}`,
  );
  return data;
}

export async function transferOwnership(serverId: string, userId: string) {
  const { data } = await api.post<{ ok: true }>(
    `/servers/${serverId}/transfer/${userId}`,
  );
  return data;
}

export type Channel = { id: string; name: string; type: "text" | "voice" };

export async function listChannels(serverId: string) {
  const { data } = await api.get<Channel[]>("/channels/list", {
    params: { serverId },
  });
  return data;
}

export async function createChannel(
  serverId: string,
  name: string,
  type: "text" | "voice",
) {
  const { data } = await api.post<Channel>("/channels", {
    serverId,
    name,
    type,
  });
  return data;
}

export type Message = {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username?: string;
  display_color?: string | null;
};

export type RawMessage = Message & {
  user_color?: string | null;
};

export function normalizeMessage(raw: RawMessage): Message {
  return {
    ...raw,
    display_color: raw.display_color ?? raw.user_color ?? null,
  };
}

export async function sendMessage(
  channelId: string,
  content: string,
): Promise<Message> {
  const { data } = await api.post<RawMessage>("/messages", {
    channelId,
    content,
  });
  return normalizeMessage(data);
}

export async function listMessages(
  channelId: string,
  options?: { before?: string; limit?: number },
): Promise<Message[]> {
  const { data } = await api.get<RawMessage[]>("/messages/list", {
    params: {
      channelId,
      before: options?.before,
      limit: options?.limit,
    },
  });

  return data.map(normalizeMessage);
}

export async function getInviteCode(serverId: string) {
  const { data } = await api.get<{ serverId: string; code: string }>(
    `/servers/${serverId}/invite`,
  );
  return data;
}

export async function joinServerByCode(code: string) {
  const { data } = await api.post<{ ok: true; serverId: string }>(
    "/servers/join",
    { code },
  );
  return data;
}

export type Member = {
  id: string;
  username: string;
  online?: boolean;
  display_color?: string | null;
};

export async function listMembers(serverId: string) {
  const { data } = await api.get<
    Array<{
      id: string;
      username: string;
      online: boolean;
      display_color?: string | null;
      user_color?: string | null;
    }>
  >("/presence/members", { params: { serverId } });

  return data.map((m) => ({
    ...m,
    display_color: m.display_color ?? m.user_color ?? null,
  })) as Member[];
}

export type Role = {
  id: string;
  server_id: string;
  name: string;
  color: string;
  permissions: number;
  position: number;
  created_at: string;
};

export async function listRoles(serverId: string) {
  const { data } = await api.get<Role[]>("/roles/list", {
    params: { serverId },
  });
  return data;
}

export async function createRole(
  serverId: string,
  name: string,
  color: string,
  permissions: number,
) {
  const { data } = await api.post<Role>("/roles", {
    serverId,
    name,
    color,
    permissions,
  });
  return data;
}

export async function updateRole(
  roleId: string,
  patch: Partial<Pick<Role, "name" | "color" | "permissions" | "position">>,
) {
  const { data } = await api.put<Role>("/roles", { roleId, ...patch });
  return data;
}

export async function deleteRole(roleId: string) {
  const { data } = await api.delete<{ ok: true }>("/roles", {
    params: { roleId },
  });
  return data;
}

export async function assignRole(
  serverId: string,
  userId: string,
  roleId: string,
) {
  const { data } = await api.post<{ ok: true }>("/roles/assign", {
    serverId,
    userId,
    roleId,
  });
  return data;
}

export async function unassignRole(
  serverId: string,
  userId: string,
  roleId: string,
) {
  const { data } = await api.post<{ ok: true }>("/roles/unassign", {
    serverId,
    userId,
    roleId,
  });
  return data;
}

export async function rolesOfUser(serverId: string, userId: string) {
  const { data } = await api.get<Role[]>("/roles/of-user", {
    params: { serverId, userId },
  });
  return data;
}

export async function myPerms(serverId: string) {
  const { data } = await api.get<{ serverId: string; permissions: number }>(
    "/roles/my-perms",
    { params: { serverId } },
  );
  return data;
}

export async function uploadServerIcon(serverId: string, file: File) {
  const form = new FormData();
  form.append("file", file);

  const { data } = await api.post<
    ServerItem | { ok: true; server: ServerItem }
  >(`/servers/${serverId}/icon`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  if ("server" in data) return data.server;
  return data;
}

export async function updateMyColor(color: string | null) {
  const { data } = await api.patch<UserProfile>("/users/me/color", { color });
  return data;
}
