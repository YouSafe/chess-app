<script setup lang="ts">
import type { API, ChessState } from '@/useChess'
import type { Move } from 'chess.js'
import { computed, toRefs, type DeepReadonly } from 'vue'

const props = defineProps<{ state: DeepReadonly<ChessState>; api: API }>()
const { api, state } = toRefs(props)

const movePairs = computed(() => {
  const moves = state.value.current.history
  const startPly = state.value.start.ply
  const pairs: {
    moveNumber: number
    white?: { move: Move; plyAfter: number }
    black?: { move: Move; plyAfter: number }
  }[] = []

  if (startPly % 2 === 1 && moves.length > 0) {
    pairs.push({
      moveNumber: Math.floor(startPly / 2) + 1,
      white: undefined,
      black: { move: moves[0], plyAfter: startPly + 1 }
    })
  }

  for (let i = startPly % 2; i < moves.length; i += 2) {
    const moveIndex = Math.floor((i + startPly) / 2) + 1
    pairs.push({
      moveNumber: moveIndex,
      white: moves[i] ? { move: moves[i], plyAfter: i + startPly + 1 } : undefined,
      black: moves[i + 1] ? { move: moves[i + 1], plyAfter: i + startPly + 2 } : undefined
    })
  }
  return pairs
})
</script>

<template>
  <div class="py-5 flex flex-wrap gap-2 items-baseline min-h-10 h-fit">
    <template v-for="(move, index) of movePairs" :key="index">
      <div class="flex gap-1 items-baseline">
        <span>{{ move.moveNumber }}.</span>
        <span v-if="index === 0 && move.white === undefined">...</span>
        <span
          v-if="move.white"
          class="badge badge-neutral"
          :class="{ 'badge-primary': move.white.plyAfter === state.viewing.ply }"
          @click="api.viewGamePly(move.white.plyAfter)"
          >{{ move.white.move.san }}</span
        >
        <span
          v-if="move.black"
          class="badge badge-neutral"
          :class="{ 'badge-primary': move.black.plyAfter === state.viewing.ply }"
          @click="api.viewGamePly(move.black.plyAfter)"
          >{{ move.black.move.san }}</span
        >
      </div>
    </template>
  </div>
</template>
