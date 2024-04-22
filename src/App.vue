<script setup lang="ts">
import ChessgroundBoard from '@/components/ChessgroundBoard.vue'
import HistoryViewer from '@/components/HistoryViewer.vue'
import LoadPgnModal from '@/components/LoadPgnModal.vue'
import HistoryNavigator from '@/components/HistoryNavigator.vue'
import { useEngine } from '@/Engine'

import { computed, ref, watch, watchEffect } from 'vue'
import type { DrawShape } from 'chessground/draw'
import { onKeyStroke } from '@vueuse/core'
import { useChess } from '@/useChess'

const playAgainstComputer = ref(false)

const { state, api } = useChess()

const {
  turnColor: engineTurnColor,
  bestMove,
  currMove,
  sendPosition,
  evaluation,
  depth
} = useEngine()

watch(
  () => state.value.current.fen,
  () => {
    if (state.value.current.playerColor !== undefined) {
      const moves = state.value.current.history.map((move) => move.lan).join(' ')

      sendPosition(state.value.start.fen, moves, state.value.current.turnColor)
    }
  },
  { immediate: true }
)

watch(
  () => state.value.viewing.fen,
  () => {
    if (state.value.current.playerColor === undefined) {
      const historyIndex = state.value.viewing.ply - state.value.start.ply
      const moves = state.value.current.history
        .slice(0, historyIndex)
        .map((move) => move.lan)
        .join(' ')

      sendPosition(state.value.start.fen, moves, state.value.current.turnColor)
    }
  },
  { immediate: true }
)

watchEffect(() => {
  if (
    playAgainstComputer.value &&
    state.value.current.turnColor !== state.value.viewing.orientation
  ) {
    if (bestMove.value) {
      api.value.move(bestMove.value)
    }
  }
})

watchEffect(() => {
  if (currMove.value && !playAgainstComputer.value) {
    const move = currMove.value
    api.value.setAutoShapes([{ orig: move.from, dest: move.to, brush: 'paleBlue' } as DrawShape])
  } else {
    api.value.setAutoShapes([])
  }
})

const evaluationDisplay = computed(() => {
  if (!evaluation.value) return null
  const modifier = engineTurnColor.value === 'black' ? -1 : 1
  const { type, value } = {
    type: evaluation.value.type,
    value: evaluation.value.value * modifier
  }

  const sign = value > 0 ? '+' : '-'
  const absValue = Math.abs(value)

  if (type === 'mate') {
    return `${sign}M${Math.abs(absValue)}`
  } else {
    return `${sign}${(absValue / 100).toFixed(1)}`
  }
})

const shortcuts = [
  { key: 'ArrowUp', func: () => api.value.viewCurrent() },
  { key: 'ArrowDown', func: () => api.value.viewStart() },
  { key: 'ArrowRight', func: () => api.value.viewNext() },
  { key: 'ArrowLeft', func: () => api.value.viewPrevious() }
]

for (const shortcut of shortcuts) {
  onKeyStroke(shortcut.key, shortcut.func)
}

watch(playAgainstComputer, () => {
  if (playAgainstComputer.value) {
    api.value.setPlayerColor(state.value.viewing.orientation)
  } else {
    api.value.setPlayerColor(undefined)
  }
})

const loadPgnModal = ref<InstanceType<typeof LoadPgnModal>>()
</script>

<template>
  <LoadPgnModal ref="loadPgnModal" @load="(pgn) => api.loadPgn(pgn)"></LoadPgnModal>

  <div class="flex flex-wrap justify-center">
    <ChessgroundBoard :api="api" :state="state"></ChessgroundBoard>
    <aside
      class="min-w-[10em] max-w-[30em] min-h-40 p-1 flex-grow flex-shrink bg-base-200 flex flex-col"
    >
      <div>
        <div class="form-control w-fit inline-flex">
          <label class="label cursor-pointer gap-2">
            <input type="checkbox" class="toggle" checked />
            <span class="font-bold text-2xl">{{ evaluationDisplay }}</span>
            <span>depth={{ depth }}</span>
          </label>
        </div>
        <div class="form-control w-fit inline-flex">
          <label class="label cursor-pointer gap-2">
            <input type="checkbox" class="toggle" v-model="playAgainstComputer" />
            <span class="">Play against computer</span>
          </label>
        </div>
      </div>
      <div>
        <button class="btn btn-sm btn-primary" @click="api.toggleOrientation()">
          Toggle Orientation
        </button>
        <button class="btn btn-sm btn-primary" @click="loadPgnModal?.show()">Load PGN</button>
        <!-- <button class="btn btn-sm btn-primary" @click="boardAPI?.reset()">Reset</button> -->
      </div>

      <div class="break-words flex-shrink">
        <span class="min-w-0">{{ state.viewing.fen }}</span>
      </div>

      <HistoryViewer :api="api" :state="state" />
      <HistoryNavigator :api="api" :state="state" />
    </aside>
  </div>
</template>

<style>
html,
body {
  width: 100%;
  height: 100%;
}

#app {
  height: 100%;
}
</style>
