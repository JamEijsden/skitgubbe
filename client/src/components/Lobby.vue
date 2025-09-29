<script setup>
import { ref } from 'vue'

// Props: list of rooms from App.vue
const props = defineProps({
  rooms: {
    type: Array,
    default: () => []
  }
})

// Emits: join (roomId, playerName), create (playerName)
const emit = defineEmits(['join', 'create'])
const hoveredRoom = ref(null)
// Local player name
const name = ref('Player')
</script>

<template>
  <div style="max-width:500px; margin:auto; font-family:sans-serif;">
    <h2 style="text-align:center; margin-bottom:16px;">Open Rooms</h2>

    <div style="margin-bottom:16px; display:flex; align-items:center;">
      <label style="flex:1;">
        Your name:
        <input
          v-model="name"
          placeholder="Enter your name"
          style="margin-left:8px; padding:6px 8px; border:1px solid #ccc; border-radius:4px; width:60%;"
        />
      </label>
      <button
        @click="emit('create', name)"
        style="margin-left:12px; padding:6px 12px; border:1px solid #4CAF50; background:#4CAF50; color:white; border-radius:4px; cursor:pointer;"
      >
        Create Room
      </button>
    </div>

    <div v-if="rooms.length === 0" style="text-align:center; color:#666;">
      No open rooms yet
    </div>

    <ul style="list-style:none; padding:0; margin:0;">
      <li
        v-for="room in rooms"
        :key="room.id"
        style="border:1px solid #ddd; border-radius:8px; padding:12px; margin-bottom:12px; transition:all 0.2s; background:#f9f9f9;"
        @mouseover="hoveredRoom = room.id"
        @mouseleave="hoveredRoom = null"
        :style="{ transform: hoveredRoom === room.id ? 'scale(1.02)' : 'scale(1)' }"
      >
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <strong>{{ room.name }}</strong>
          <span style="background:#eee; padding:2px 6px; border-radius:4px; font-size:12px;">
            {{ room.players.length }} {{ room.players.length === 1 ? 'player' : 'players' }}
          </span>
        </div>

        <div style="margin-bottom:8px; font-size:14px; color:#333;">
          <span
            v-for="player in room.players"
            :key="player.id"
            style="margin-right:8px;"
          >
            {{ player }}
          </span>
        </div>

        <button
          @click="emit('join', room.id, name)"
          style="padding:6px 12px; border:1px solid #2196F3; background:#2196F3; color:white; border-radius:4px; cursor:pointer;"
        >
          Join
        </button>
      </li>
    </ul>
  </div>
</template>
