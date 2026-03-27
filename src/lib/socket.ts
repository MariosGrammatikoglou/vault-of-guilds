import { io, Socket } from 'socket.io-client';
import { CONFIG } from './config';

let socket: Socket | null = null;

export function connectSocket(token: string) {
  socket = io(CONFIG.WS_URL, {
    auth: { token },
    transports: ['websocket'],
  });
  return socket!;
}

export function getSocket(): Socket {
  if (!socket) throw new Error('Socket not connected');
  return socket;
}

export function subscribeChannel(channelId: string) {
  getSocket().emit('channel:subscribe', { channelId });
}

export function unsubscribeChannel(channelId: string) {
  getSocket().emit('channel:unsubscribe', { channelId });
}
