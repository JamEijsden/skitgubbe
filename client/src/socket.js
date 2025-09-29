import { io } from 'socket.io-client'

// Change if your server runs elsewhere:
const URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'
console.log('Connecting to server at', URL)
export const socket = io(URL, { autoConnect: true, transports: ["websocket"] })
