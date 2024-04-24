<script setup lang="ts">
import type { API, ChessState } from '@/useChess'
import type { Move } from 'chess.js'
import { computed, ref, toRefs, watch, type DeepReadonly } from 'vue'

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

const moves = ref<HTMLDivElement>()

watch(
  () => state.value.viewing.ply,
  () => {
    if (!moves.value) {
      return
    }

    const moveIndex = Math.floor((state.value.viewing.ply - 1 + state.value.start.ply) / 2)

    if (moveIndex === -1) {
      moves.value.scroll({ behavior: 'smooth', top: 0 })
    }

    const moveElement = moves.value?.children[moveIndex]
    if (!moveElement) {
      return
    }
    const elementBounding = moveElement.getBoundingClientRect()
    const parentBounding = moves.value.getBoundingClientRect()

    if (
      (elementBounding.top <= parentBounding.top &&
        (elementBounding.bottom <= parentBounding.top ||
          elementBounding.bottom >= parentBounding.top)) ||
      (elementBounding.left <= parentBounding.left &&
        (elementBounding.right <= parentBounding.left ||
          elementBounding.right >= parentBounding.left))
    ) {
      moveElement.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' })
    } else if (
      (elementBounding.bottom >= parentBounding.bottom &&
        (elementBounding.top >= parentBounding.bottom ||
          elementBounding.top <= parentBounding.bottom)) ||
      (elementBounding.right >= parentBounding.right &&
        (elementBounding.left >= parentBounding.right ||
          elementBounding.left <= parentBounding.right))
    ) {
      moveElement.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' })
    }
  }
)
</script>

<template>
  <div ref="moves" class="flex content-start gap-2">
    <div
      v-for="(move, index) of movePairs"
      :key="move.moveNumber"
      class="select-none flex gap-1 items-baseline"
    >
      <span>{{ move.moveNumber }}.</span>
      <span v-if="index === 0 && move.white === undefined">...</span>
      <span
        v-if="move.white"
        class="badge badge-neutral rounded-[0.2rem] py-[0.1rem] px-[0.2rem] cursor-pointer"
        :class="{ 'badge-primary': move.white.plyAfter === state.viewing.ply }"
        @click="api.viewGamePly(move.white.plyAfter)"
        >{{ move.white.move.san }}</span
      >
      <span
        v-if="move.black"
        class="badge badge-neutral rounded-[0.2rem] py-[0.1rem] px-[0.2rem] cursor-pointer"
        :class="{ 'badge-primary': move.black.plyAfter === state.viewing.ply }"
        @click="api.viewGamePly(move.black.plyAfter)"
        >{{ move.black.move.san }}</span
      >
    </div>
  </div>
</template>
