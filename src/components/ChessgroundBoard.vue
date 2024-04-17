<script setup lang="ts">
import { Chessground } from 'chessground'
import { onMounted, reactive, ref } from 'vue'

import '../assets/chessground.base.css'
import '../assets/chessground.coords.css'
import '../assets/chessground.brown.css'
import '../assets/chessground.cburnett.css'
import type { Config } from 'chessground/config'
import { BoardAPI, type BoardState, type Promotion, promotions } from '@/BoardAPI'
import type { Color, Key } from 'chessground/types'

const board = ref<HTMLElement | null>(null)
const promotion = ref<HTMLElement | null>(null)

const boardState = reactive({ promotionDialogState: { isEnabled: false } } as BoardState)
const boardAPI = ref<BoardAPI | null>(null)

const emit = defineEmits<{
  (e: 'created', api: BoardAPI): void
}>()

const promotionButtonPosition = (index: number, key?: Key, orientation?: Color) => {
  if (!key || !orientation) return undefined
  const rank = key[0]
  const file = key[1]

  const rankIndex = rank.charCodeAt(0) - 'a'.charCodeAt(0) // x col
  const fileIndex = file.charCodeAt(0) - '1'.charCodeAt(0) // y row

  const gridColIndex = orientation === 'white' ? rankIndex : 7 - rankIndex

  const direction =
    (orientation === 'white' && file === '8') || (orientation !== 'white' && file === '1') ? 1 : -1
  const gridRowIndex = (orientation === 'white' ? 7 - fileIndex : fileIndex) + direction * index

  // row-start/col-start/row-end/col-end
  return `grid-area: ${gridRowIndex + 1} / ${gridColIndex + 1} /  span 1  / span 1`
}

onMounted(() => {
  if (board.value === null) {
    throw new Error('Failed to mount board')
  }
  if (promotion.value === null) {
    throw new Error('Failed to mount promotion choice dialog')
  }

  const config: Config = {
    movable: {
      free: false
    },
    addDimensionsCssVarsTo: promotion.value
  }
  const chessground = Chessground(board.value, config)
  const api = new BoardAPI(chessground, config, boardState)
  api.setPosition('8/k1PPPPP1/8/8/8/8/2ppppp1/K7 w - - 0 1')
  boardAPI.value = api
  emit('created', api)
})

const promotionSelected = (promotion: Promotion) => {
  boardState.promotionDialogState.callback?.(promotion)
  boardState.promotionDialogState = { isEnabled: false }
}
</script>

<template>
  <div ref="board" id="board"></div>
  <div ref="promotion" id="promotion-choice" v-show="boardState.promotionDialogState.isEnabled">
    <button
      v-for="(piece, index) in promotions"
      :key="piece.name"
      type="button"
      :class="[piece.name.toLowerCase(), boardState.promotionDialogState.color]"
      :style="
        promotionButtonPosition(
          index,
          boardState.promotionDialogState.square,
          boardAPI?.getOrientation()
        )
      "
      :aria-label="piece.name"
      @click="promotionSelected(piece.value)"
      @touchstart.passive="promotionSelected(piece.value)"
    />
  </div>
</template>

<style>
#board {
  width: 100cqmin;
  height: 100cqmin;
}

#promotion-choice {
  width: var(--cg-width, 100%);
  height: var(--cg-height, 100%);
  z-index: 205;
  position: absolute;
  display: grid;
  grid-template-columns: repeat(8, 12.5%);
  grid-template-rows: repeat(8, 12.5%);
}

#promotion-choice button {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-color: white;
}
</style>
