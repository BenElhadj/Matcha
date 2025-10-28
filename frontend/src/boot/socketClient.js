import { io } from 'socket.io-client'

let socket = null

export const getSocket = () => socket

export function connectSocket(userId, { on } = {}) {
  if (socket && socket.connected) return socket
  // Use backend API URL as Socket.io endpoint
  const url = import.meta.env.VITE_APP_API_URL
  socket = io(url, {
    transports: ['websocket', 'polling'],
    withCredentials: false,
    path: '/socket.io'
  })
  socket.on('connect', () => {
    try { socket.emit('auth', userId) } catch (_) {}
    on && on.connect && on.connect(socket)
  })
  socket.on('disconnect', (reason) => {
    on && on.disconnect && on.disconnect(reason)
  })
  return socket
}

export function disconnectSocket() {
  try { socket && socket.disconnect() } catch (_) {}
  socket = null
}
