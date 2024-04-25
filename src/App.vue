<script setup lang="ts">
import ChessgroundBoard from '@/components/ChessgroundBoard.vue'
import HistoryViewer from '@/components/HistoryViewer.vue'
import LoadPgnModal from '@/components/LoadPgnModal.vue'
import ShareGameModal from '@/components/ShareGameModal.vue'
import HistoryNavigator from '@/components/HistoryNavigator.vue'
import PlayerInfo from '@/components/PlayerInfo.vue'
import { useEngine } from '@/Engine'

import { computed, ref, watch, watchEffect } from 'vue'
import type { DrawShape } from 'chessground/draw'
import { onKeyStroke } from '@vueuse/core'
import { useChess } from '@/useChess'
import GameResultModal from '@/components/GameResultModal.vue'
import type { Color } from 'chessground/types'

const playAgainstComputer = ref(false)
const toggleEngine = ref(true)
const engineShouldRun = computed(() => toggleEngine.value || playAgainstComputer.value)

const gameResultModal = ref<InstanceType<typeof GameResultModal>>()
const loadPgnModal = ref<InstanceType<typeof LoadPgnModal>>()
const shareGameModal = ref<InstanceType<typeof ShareGameModal>>()

const { state, api } = useChess()

const {
  turnColor: engineTurnColor,
  bestMove,
  currMove,
  sendPosition,
  start,
  terminate
} = useEngine()

watch(
  engineShouldRun,
  async () => {
    if (engineShouldRun.value) {
      await start()

      let fen: string, historyIndex: number, turnColor: Color
      if (playAgainstComputer.value) {
        fen = state.value.current.fen
        historyIndex = state.value.current.ply - state.value.start.ply
        turnColor = state.value.current.turnColor
      } else {
        fen = state.value.viewing.fen
        historyIndex = state.value.viewing.ply - state.value.start.ply
        turnColor = state.value.viewing.turnColor
      }

      const moves = state.value.current.history
        .slice(0, historyIndex)
        .map((move) => move.lan)
        .join(' ')

      sendPosition(fen, moves, turnColor)
    } else {
      terminate()
    }
  },
  { immediate: true }
)

const engineInput = computed(() => {
  if (playAgainstComputer.value) {
    return {
      fen: state.value.current.fen,
      historyIndex: state.value.current.ply - state.value.start.ply,
      turnColor: state.value.current.turnColor
    }
  } else {
    return {
      fen: state.value.viewing.fen,
      historyIndex: state.value.viewing.ply - state.value.start.ply,
      turnColor: state.value.viewing.turnColor
    }
  }
})

watch(
  () => engineInput.value.fen,
  () => {
    const moves = state.value.current.history
      .slice(0, engineInput.value.historyIndex)
      .map((move) => move.lan)
      .join(' ')

    sendPosition(state.value.start.fen, moves, engineInput.value.turnColor)
  }
)

watchEffect(() => {
  if (
    playAgainstComputer.value &&
    state.value.current.playerColor &&
    state.value.current.turnColor !== state.value.viewing.orientation &&
    bestMove.value
  ) {
    api.value.move(bestMove.value)
  }
})

watchEffect(() => {
  if (currMove.value && !playAgainstComputer.value) {
    const move = currMove.value.move
    api.value.setAutoShapes([{ orig: move.from, dest: move.to, brush: 'paleBlue' } as DrawShape])
  } else {
    api.value.setAutoShapes([])
  }
})

watchEffect(() => {
  if (bestMove.value && !playAgainstComputer.value) {
    const move = bestMove.value
    api.value.setAutoShapes([{ orig: move.from, dest: move.to, brush: 'paleBlue' } as DrawShape])
  }
})

const evaluationDisplay = computed(() => {
  if (!currMove.value) return null
  const evaluation = currMove.value.eval
  if (!evaluation) return false
  const modifier = engineTurnColor.value === 'black' ? -1 : 1
  const { type, value } = {
    type: evaluation.type,
    value: evaluation.value * modifier
  }

  const sign = value > 0 ? '+' : '-'
  const absValue = Math.abs(value)

  if (type === 'mate') {
    if (absValue === 0) {
      return '-'
    }
    return `${sign}M${Math.abs(absValue)}`
  } else {
    return `${sign}${(absValue / 100).toFixed(1)}`
  }
})

const shortcuts = [
  { key: 'ArrowUp', func: () => api.value.viewStart() },
  { key: 'ArrowDown', func: () => api.value.viewCurrent() },
  { key: 'ArrowRight', func: () => api.value.viewNext() },
  { key: 'ArrowLeft', func: () => api.value.viewPrevious() }
]

for (const shortcut of shortcuts) {
  onKeyStroke(shortcut.key, shortcut.func)
}

watch(playAgainstComputer, () => {
  if (playAgainstComputer.value) {
    api.value.viewCurrent()
    api.value.setPlayerColor(state.value.viewing.orientation)
  } else {
    api.value.setPlayerColor(undefined)
  }
})

watch(
  () => state.value.current.gameResult,
  () => {
    if (state.value.current.gameResult && state.value.current.playerColor) {
      gameResultModal.value?.show()
    }
  },
  { immediate: true }
)
</script>

<template>
  <LoadPgnModal ref="loadPgnModal" @load="(pgn) => api.loadPgn(pgn)" />
  <ShareGameModal ref="shareGameModal" :pgn="state.current.pgn" :fen="state.viewing.fen" />
  <GameResultModal ref="gameResultModal" :game-result="state.current.gameResult"></GameResultModal>

  <div class="flex min-h-svh max-w-svh justify-center portrait:flex-col flex-wrap">
    <ChessgroundBoard
      class="flex-shrink-0 flex-grow-0"
      :api="api"
      :state="state"
    ></ChessgroundBoard>
    <aside class="min-w-[20em] max-w-[30em] p-2 flex flex-1 bg-base-200 flex-col gap-2">
      <div class="h-10">
        <div class="form-control w-fit inline-flex">
          <label class="label cursor-pointer gap-2">
            <input type="checkbox" class="toggle" v-model="toggleEngine" checked />
            <span class="font-bold text-2xl">{{ evaluationDisplay }}</span>
            <span>depth={{ currMove?.depth }}</span>
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
        <button class="btn btn-sm btn-primary" @click="shareGameModal?.show()">Share</button>
        <!-- <button class="btn btn-sm btn-primary" @click="boardAPI?.reset()">Reset</button> -->
      </div>
      <PlayerInfo :state="state"></PlayerInfo>

      <HistoryViewer
        class="flex-grow flex-wrap min-h-28 h-full basis-0 overflow-auto"
        :api="api"
        :state="state"
      />
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
