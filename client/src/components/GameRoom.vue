<script setup>
import { ref, computed, watch } from 'vue'
import { socket } from '../socket'
import PlayingCard from './PlayingCard.vue'

const props = defineProps({ roomId: String, playerId: String, state: Object })

const my = ref({ hand: [], up: [], down: [], id: null, swapped: false })
const pileTop = ref(null)
const pileCount = ref(0)
const stockCount = ref(0)
const loser = ref(null)
const isMyTurn = ref(false)
const selectedHand = ref(new Set())
const selectedUp = ref(new Set())
const selectedDown = ref(new Set())

watch(() => props.state, (s) => {
  if (!s) return
  pileTop.value = s.pileTop
  pileCount.value = s.pileCount
  stockCount.value = s.stockCount
  loser.value = s.loser
  isMyTurn.value = s.turnPlayerId === props.playerId
}, { immediate: true })

socket.on('privateState', (ps) => {
  console.log(ps)
  if (ps.playerId === props.playerId) {
    my.value = ps.me
    my.value.swapped = ps.swapped
  }
  console.log(!my.swapped, my.hand?.length === 0)
})

function start() {
  socket.emit('startGame', { roomId: props.roomId })
}

function pickup() {
  socket.emit('pickup', { roomId: props.roomId })
  selectedHand.value.clear()
}

function toggleHand(id) {
  if (selectedHand.value.has(id)) selectedHand.value.delete(id)
  else selectedHand.value.add(id)
}
function toggleUp(id) {
  if(my.value.swapped && my.value.hand?.length > 0) return; // cannot select up cards if hand cards exist
  if (selectedUp.value.has(id)) selectedUp.value.delete(id)
  else selectedUp.value.add(id)
}

function toggleDown(id) {
  console.log('toggleDown', id, my.value)
  if(my.up?.length > 0) return; // cannot select up cards if hand cards exist
  if (selectedDown.value.has(id)) selectedDown.value.delete(id)
  else selectedDown.value.add(id)
}
function playSelected() {
  const cards = [...Array.from(selectedHand.value), ...Array.from(selectedUp.value), ...Array.from(selectedDown.value)]
  socket.emit('playCards', { roomId: props.roomId, cards })
  selectedHand.value.clear()
  selectedUp.value.clear()
  selectedDown.value.clear()
}

function swapSelected() {
  if (selectedHand.value.size !== 1 || selectedUp.value.size !== 1) {
    alert('Select one hand card and one face-up card to swap')
    return
  }
  const swaps = [{
    handId: Array.from(selectedHand.value)[0],
    upId: Array.from(selectedUp.value)[0]
  }]
  socket.emit('swap', { roomId: props.roomId, swaps })
  selectedHand.value.clear()
  selectedUp.value.clear()
}
</script>

<template>
  <div style="display:flex; flex-direction:column; flex:1; padding:12px; box-sizing:border-box; overflow:hidden;">

    <!-- Header / game info -->
    <div style="display:flex; gap:12px; align-items:center; flex-shrink:0;">
      <h2>{{ state?.name }}</h2>
      <div style="margin-left:auto; font-size:14px;">
        Stock: {{ stockCount }} | Pile: {{ pileCount }}
      </div>
    </div>

    <!-- Waiting / Start Game -->
    <div v-if="!state?.started"
      style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; overflow:hidden;">
      <div><strong>Players:</strong> {{state.players.map(p => p.name).join(', ')}}</div>
      <button v-if="props.state.hostId === props.playerId" @click="start" style="margin-top:12px;">Start game</button>
    </div>

    <!-- Main game -->
    <div v-else style="flex:1; display:flex; flex-direction:column; justify-content:space-between; overflow:hidden;">

      <!-- Turn info -->
      <div style="font-size:14px; flex-shrink:0;">
        <strong>Turn:</strong>
        <span v-for="p in state.players" :key="p.id" style="margin-right:8px;">
          <span :style="{ fontWeight: p.isTurn ? '700' : '400' }">{{ p.name }}</span>
          <small> (H:{{ p.counts.hand }} U:{{ p.counts.up }} D:{{ p.counts.down }})</small>
        </span>
      </div>

      <!-- Table / pile -->
      <div style="flex:1; display:flex; align-items:center; justify-content:center; overflow:hidden;">
        <div style="text-align:center;">
          <div style="opacity:.7;">Pile top</div>
          <PlayingCard :card="pileTop" />
          <div style="opacity:.7; font-size:12px; margin-top:4px;">Pile: {{ pileCount }}</div>
        </div>
      </div>

      <!-- Player bottom area -->
      <div style="flex-shrink:0; display:flex; flex-direction:column; align-items:center; margin-bottom:20px; gap:8px;">

        <!-- Player hand (on top) -->
        <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
          <div style="opacity:.7;">Your hand (select same-rank to play)</div>
          <div style="display:flex; gap:-20px;">
            <PlayingCard v-for="c in my.hand" :key="c.id" :card="c" selectable :selected="selectedHand.has(c.id)"
              @click="toggleHand(c.id)" />
          </div>
        </div>

        <!-- Stacked face-down / face-up cards -->
        <div style="position:relative; height:120px; width:100%; display:flex; justify-content:center;  margin-bottom: 15px;">
          <!-- Face-down -->
          <div style="display:flex; gap:-20px; position:absolute; bottom:0;">
            <PlayingCard v-for="c in my.down" :selectable="my.up?.length === 0" :key="c.id" :card="null" @click="toggleDown(c.id)" :selected="selectedDown.has(c.id)"/>
          </div>

          <!-- Face-up overlapping -->
          <div style="display:flex; gap:-20px; position:absolute; bottom:12px;">
            <PlayingCard v-for="c in my.up" :key="c.id" :card="c" :selectable="!my.swapped || my.hand?.length === 0" :selected="selectedUp.has(c.id)"
              @click="toggleUp(c.id)" />
          </div>
        </div>

        <!-- Swap button -->
        <div v-if="!my.swapped">
          <button @click="swapSelected">Swap selected (pre-first play)</button>
        </div>

        <!-- Action buttons -->
        <div v-if="isMyTurn && props.state.swapPhaseOver" style="display:flex; gap:8px; justify-content:center;">
          <button @click="playSelected">Play</button>
          <button @click="pickup">Pick up</button>
        </div>

      </div>
x
    </div>

    <!-- Loser info -->
    <div v-if="loser" style="margin-top:16px; font-size:20px; font-weight:700; color:#b91c1c; text-align:center;">
      Skitgubben blev {{ loser }} 🎉
    </div>

  </div>
</template>
