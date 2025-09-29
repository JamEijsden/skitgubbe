<script setup>
import { computed, ref} from 'vue'

const hover = ref(false);
const props = defineProps({
  card: Object,
  selected: Boolean,
  selectable: Boolean
})

const emit = defineEmits(['select'])

const cardStyle = computed(() => ({
  border: '1px solid #ccc',
  borderRadius: '12px',
  width: '60px',
  height: '90px',
  display: 'grid',
  placeItems: 'center',
  boxShadow: props.selected ? '0 0 0 3px #4ade80' : '0 2px 6px rgba(0,0,0,0.2)',
  cursor: props.selectable ? 'pointer' : 'default',
  transform: props.selected || (props.selectable && hover.value) ? 'perspective(500px) rotateY(0deg)' : 'translateY(10px)',
  transition: 'all 0.15s ease',
  background: '#fff',
}))

const frontStyle = computed(() => ({
  textAlign: 'center',
  fontWeight: 'bold',
  color: props.card && (props.card.suit === '♥' || props.card.suit === '♦') ? '#e53935' : '#111',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: '18px',
}))

const rankStyle = { fontSize: '18px' }
const suitStyle = { fontSize: '16px' }

const backStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '12px',
  background: 'linear-gradient(135deg, #4ade80, #22d3ee)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontSize: '20px',
  fontWeight: 'bold',
}

function selectCard() {
  if (props.selectable) emit('select')
}

</script>

<template>
  <div
    class="card"
    :style="cardStyle"
    @click="selectCard"
    @mouseover="hover = true"
    @mouseleave="hover = false"
    :class="{ active: hover }"

  >
    <!-- Front of the card -->
    <div v-if="card" :style="frontStyle">
      <div :style="rankStyle">{{ card.rank }}</div>
      <div :style="suitStyle">{{ card.suit }}</div>
    </div>

    <!-- Back of the card -->
    <div v-else :style="backStyle">
      <div style="font-size:20px;">🂠</div>
    </div>
  </div>
</template>