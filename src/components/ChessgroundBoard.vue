<script setup lang="ts">
import { Chessground } from 'chessground'
import { onMounted, ref, type DeepReadonly, toRefs, watch, nextTick } from 'vue'

import '../assets/chessground.base.css'
import '../assets/chessground.coords.css'
import '../assets/chessground.brown.css'
import '../assets/chessground.cburnett.css'
import type { Config } from 'chessground/config'
import type { Color, Dests, Key } from 'chessground/types'
import { type ChessState, type API, promotions } from '@/useChess'
import type { Move } from 'chess.js'
import type { DrawShape } from 'chessground/draw'

const board = ref<HTMLElement | null>(null)
const promotion = ref<HTMLElement | null>(null)

const props = defineProps<{ state: DeepReadonly<ChessState>; api: API }>()
const { api, state } = toRefs(props)

const promotionButtonPosition = (index: number, key: Key, orientation: Color) => {
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

  const fulfillMove = async (orig: Key, dest: Key) => {
    return api.value.move({ from: orig, to: dest } as Move)
  }

  const config: Config = {
    movable: {
      free: false,
      events: { after: fulfillMove }
    },
    addDimensionsCssVarsTo: promotion.value
  }
  const chessground = Chessground(board.value, config)

  const syncPosition = () => {
    chessground.set({ fen: state.value.viewing.fen })

    chessground.state.turnColor = state.value.viewing.turnColor
    chessground.state.check = state.value.viewing.check

    const historyIndex = state.value.viewing.ply - state.value.start.ply
    const lastMove =
      state.value.current.history.length > 0
        ? state.value.current.history[historyIndex - 1]
        : undefined
    chessground.state.lastMove = lastMove ? [lastMove.from, lastMove.to] : undefined

    if (!config.movable?.free) {
      chessground.state.movable.dests = state.value.viewing.legalMoves as Dests

      if (
        state.value.viewing.ply !== state.value.current.ply &&
        state.value.current.playerColor !== undefined
      ) {
        chessground.state.movable.color = undefined
      } else {
        chessground.state.movable.color =
          state.value.current.playerColor || state.value.viewing.turnColor
      }
    }

    if (state.value.viewing.ply === state.value.current.ply) {
      nextTick(chessground.playPremove)
    } else {
      chessground.cancelPremove()
    }
  }

  watch(() => state.value.viewing.fen, syncPosition, { immediate: true })

  // the state's FEN is not updated until the promotion is selected
  // therefore the watcher for the FEN is not triggered
  // when we cancel the promotion, we must undo the pawn move
  // whenever the promotion dialog closes, we re-sync the board state
  watch(
    () => state.value.viewing.promotionDialog.isEnabled,
    () => {
      if (!state.value.viewing.promotionDialog.isEnabled) {
        syncPosition()
      }
    }
  )

  watch(
    () => state.value.viewing.orientation,
    () => {
      chessground.state.orientation = state.value.viewing.orientation

      chessground.state.animation.current =
        chessground.state.draggable.current =
        chessground.state.selected =
          undefined

      chessground.redrawAll()
    }
  )

  watch(
    () => state.value.viewing.autoShapes,
    () => chessground.setAutoShapes(state.value.viewing.autoShapes as DrawShape[])
  )

  watch(
    () => state.value.current.playerColor,
    () => {
      if (state.value.current.playerColor) {
        chessground.state.movable.color = state.value.current.playerColor
      } else {
        chessground.state.movable.color = state.value.viewing.turnColor
      }
    }
  )
})
</script>

<template>
  <div class="main-board w-fit h-fit">
    <div
      ref="board"
      id="board"
      :style="{
        filter:
          state.viewing.ply !== state.current.ply && state.current.playerColor
            ? 'saturate(60%)'
            : 'none'
      }"
    ></div>
    <div
      ref="promotion"
      id="promotion-choice"
      v-show="state.viewing.promotionDialog.isEnabled"
      @click="api.promotionCanceled"
    >
      <template v-if="state.viewing.promotionDialog.isEnabled">
        <button
          v-for="(piece, index) in promotions"
          :key="piece.name"
          type="button"
          :class="[piece.name.toLowerCase(), state.viewing.promotionDialog.color]"
          :style="
            promotionButtonPosition(
              index,
              state.viewing.promotionDialog.square,
              state.viewing.orientation
            )
          "
          :aria-label="piece.name"
          @click="api.promotionSelected(piece.value)"
          @touchstart.passive="api.promotionSelected(piece.value)"
        />
      </template>
    </div>
  </div>
</template>

<style>
.main-board {
  position: relative;
}

#board {
  width: 100cqmin;
  height: 100cqmin;
}

#promotion-choice {
  top: 0;
  left: 0;
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
