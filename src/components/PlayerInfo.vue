<script setup lang="ts">
import type { ChessState } from '@/useChess'
import { type Color } from 'chessground/types'
import { opposite } from 'chessground/util'
import { type DeepReadonly, toRefs, computed } from 'vue'

const props = defineProps<{ state: DeepReadonly<ChessState> }>()
const { state } = toRefs(props)

const colorPieceSymbols = {
  white: {
    king: '♔',
    queen: '♕',
    rook: '♖',
    bishop: '♗',
    knight: '♘',
    pawn: '♙'
  },
  black: {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟︎'
  }
}
const valueToColor = (value: number): Color | undefined => {
  if (value > 0) {
    return 'white'
  } else if (value < 0) {
    return 'black'
  } else {
    return undefined
  }
}

const orientationSortedColors = computed<Color[]>(() =>
  state.value.viewing.orientation === 'white' ? ['black', 'white'] : ['white', 'black']
)
</script>

<template>
  <div class="grid grid-rows-2">
    <div v-for="color in orientationSortedColors" :key="color">
      <span v-if="color === state.current.playerColor">You</span>
      <span v-if="opposite(color) === state.current.playerColor">Computer</span>
      <span v-for="(diff, piece) in state.viewing.materialInfo.count.diff" :key="piece">
        <span v-if="color === valueToColor(diff)" class="text-2xl">{{
          colorPieceSymbols[color][piece]
        }}</span>
      </span>

      <span v-if="color === valueToColor(state.viewing.materialInfo.value.diff)">
        +{{ Math.abs(state.viewing.materialInfo.value.diff) }}</span
      >
    </div>
  </div>
</template>
