<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { socket } from './socket'
import Lobby from './components/Lobby.vue'
import GameRoom from './components/GameRoom.vue'

// reactive state
const roomId = ref(null)
const playerId = ref(null)
const state = ref(null)
const rooms = ref([])

// --- socket listeners ---
function handleRooms(list) {
  console.log('rooms received:', list) // add this
  rooms.value = Array.isArray(list) ? list : []
}

function handleRoomJoined({ roomId: rid, playerId: pid }) {
  console.log('roomJoined received:', rid, pid) // add this
  roomId.value = rid
  playerId.value = pid
}

function handleState(s) {
  state.value = s
}

function handleError(msg) {
  if (msg) alert(msg)
}

onMounted(() => {
  socket.on('rooms', handleRooms)
  socket.on('roomJoined', handleRoomJoined)
  socket.on('state', handleState)
  socket.on('errorMessage', handleError)

  // get initial list
  socket.emit('listRooms')
})

onBeforeUnmount(() => {
  socket.off('rooms', handleRooms)
  socket.off('roomJoined', handleRoomJoined)
  socket.off('state', handleState)
  socket.off('errorMessage', handleError)
})

// --- actions ---
function createRoom(playerName) {
  const name = prompt('Room name (optional):') || ''
  socket.emit('createRoom', { name, playerName })
}

function joinRoom(rid, playerName) {
  socket.emit('joinRoom', { roomId: rid, playerName })
}

function leaveRoom() {
  if (roomId.value) {
    socket.emit('leaveRoom', { roomId: roomId.value })
  }
  roomId.value = null
  playerId.value = null
  state.value = null
  socket.emit('listRooms')
}
</script>

<template>
  <div
    style="
      font-family:system-ui, sans-serif;
      width:100vw;
      height:100vh;
      display:flex;
      flex-direction:column;
      box-sizing:border-box;
      overflow:hidden;
    "
  >
    <header style="display:flex; align-items:center; gap:12px; padding:8px; flex-shrink:0;">
      <h1 style="margin:0; line-height:1;">Skitgubbe</h1>
    </header>

    <main style="flex:1; display:flex; flex-direction:column; overflow:hidden;">
      <GameRoom
        v-if="roomId"
        :roomId="roomId"
        :playerId="playerId"
        :state="state"
        style="flex:1; display:flex; flex-direction:column; overflow:hidden;"
      />
      <Lobby
        v-else
        :rooms="rooms"
        @join="joinRoom"
        @create="createRoom"
        style="flex:1; display:flex; flex-direction:column; overflow:hidden; margin:0; padding:0;"
      />
    </main>
  </div>
</template>

<style>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
}
</style>



