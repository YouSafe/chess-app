<script setup lang="ts">
import IconQueen from '@/components/icons/pieces/IconQueen.vue'
import IconRook from '@/components/icons/pieces/IconRook.vue'
import IconBishop from '@/components/icons/pieces/IconBishop.vue'
import IconPawn from '@/components/icons/pieces/IconPawn.vue'
import IconKnight from '@/components/icons/pieces/IconKnight.vue'
import IconKing from '@/components/icons/pieces/IconKing.vue'
import type { ChessState } from '@/useChess'
import { type Color, type Role } from 'chessground/types'
import { opposite } from 'chessground/util'
import { type DeepReadonly, toRefs, computed } from 'vue'

const props = defineProps<{ state: DeepReadonly<ChessState> }>()
const { state } = toRefs(props)

const valueToColor = (value: number): Color | undefined => {
  if (value > 0) {
    return 'white'
  } else if (value < 0) {
    return 'black'
  } else {
    return undefined
  }
}
const pieceToComponent = (piece: Role) => {
  switch (piece) {
    case 'pawn':
      return IconPawn
    case 'rook':
      return IconRook
    case 'bishop':
      return IconBishop
    case 'knight':
      return IconKnight
    case 'queen':
      return IconQueen
    case 'king':
      return IconKing
  }
}

const orientationSortedColors = computed<Color[]>(() =>
  state.value.viewing.orientation === 'white' ? ['black', 'white'] : ['white', 'black']
)
</script>

<template>
  <div class="grid grid-rows-2">
    <div v-for="color in orientationSortedColors" :key="color" class="flex items-center">
      <span v-if="color === state.current.playerColor">You</span>
      <span v-if="opposite(color) === state.current.playerColor">Computer</span>

      <template v-for="(diff, piece) in state.viewing.materialInfo.count.diff" :key="piece">
        <template v-if="color === valueToColor(diff)">
          <div :class="{ '-space-x-3': piece !== 'queen' }">
            <component
              v-for="n in Math.abs(diff)"
              :key="n"
              class="inline-block size-5"
              :is="pieceToComponent(piece)"
              :class="`text-${opposite(color)}`"
            ></component>
          </div>
        </template>
      </template>

      <span v-if="color === valueToColor(state.viewing.materialInfo.value.diff)">
        +{{ Math.abs(state.viewing.materialInfo.value.diff) }}</span
      >
    </div>
  </div>
</template>
