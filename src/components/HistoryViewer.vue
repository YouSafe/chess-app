<script setup lang="ts">
import type { BoardAPI } from '@/BoardAPI'
import { computed } from 'vue'

const props = defineProps<{
  moves?: string[]
  startPly?: number
  viewingPly: number
  boardApi?: BoardAPI
}>()

const movePairs = computed(() => {
  const moves = props.moves
  const startPly = props.startPly
  if (!moves || startPly === undefined) {
    return []
  }
  const pairs: {
    moveNumber: number
    white?: { move: string; plyAfter: number }
    black?: { move: string; plyAfter: number }
  }[] = []

  if (startPly % 2 === 1) {
    pairs.push({
      moveNumber: Math.floor(startPly / 2) + 1,
      white: undefined,
      black: { move: moves[0], plyAfter: startPly + 1 }
    })
  }

  for (let i = startPly % 2; i < props.moves.length; i += 2) {
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
          :class="{ 'badge-primary': move.white.plyAfter === viewingPly }"
          @click="boardApi?.viewHistory(move.white.plyAfter)"
          >{{ move.white.move }}</span
        >
        <span
          v-if="move.black"
          class="badge badge-neutral"
          :class="{ 'badge-primary': move.black.plyAfter === viewingPly }"
          @click="boardApi?.viewHistory(move.black.plyAfter)"
          >{{ move.black.move }}</span
        >
      </div>
    </template>
  </div>
</template>
