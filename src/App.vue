<script setup lang="ts">
import ChessgroundBoard from '@/components/ChessgroundBoard.vue'
import HistoryViewer from '@/components/HistoryViewer.vue'
import LoadPgnModal from '@/components/LoadPgnModal.vue'
import ShareGameModal from '@/components/ShareGameModal.vue'
import HistoryNavigator from '@/components/HistoryNavigator.vue'
import PlayerInfo from '@/components/PlayerInfo.vue'
import { useEngine } from '@/useEngine'

import { computed, ref, watch, watchEffect } from 'vue'
import type { DrawShape } from 'chessground/draw'
import { onKeyStroke } from '@vueuse/core'
import { useChess } from '@/useChess'
import GameResultModal from '@/components/GameResultModal.vue'
import type { Eval, Search } from './UCIProtocol'

const playAgainstComputer = ref(false)
const toggleEngine = ref(true)
const engineShouldRun = computed(() => toggleEngine.value || playAgainstComputer.value)

const gameResultModal = ref<InstanceType<typeof GameResultModal>>()
const loadPgnModal = ref<InstanceType<typeof LoadPgnModal>>()
const shareGameModal = ref<InstanceType<typeof ShareGameModal>>()

const { state, api } = useChess()

const { start, terminate } = useEngine()

const bestMove = ref<Eval>()
const currMove = ref<Eval>()

watch(
  engineShouldRun,
  () => {
    if (engineShouldRun.value) {
      const historyIndex = state.value.viewing.ply - state.value.start.ply

      const moves = state.value.current.history.slice(0, historyIndex).map((move) => move.lan)

      start({
        currentFen: state.value.viewing.fen,
        searchMs: 100,
        moves,
        ply: state.value.viewing.ply,
        startPos: state.value.start.fen,
        shouldStop: false,
        emitCurrentMove: (ev: Eval) => (currMove.value = ev),
        emitBestMove: (ev: Eval) => (bestMove.value = ev)
      } as Search)
    } else {
      bestMove.value = undefined
      terminate()
    }
  },
  { immediate: true }
)

watch(
  () => state.value.viewing.fen,
  () => {
    const historyIndex = state.value.viewing.ply - state.value.start.ply
    const moves = state.value.current.history.slice(0, historyIndex).map((move) => move.lan)

    bestMove.value = undefined

    start({
      currentFen: state.value.viewing.fen,
      ply: state.value.viewing.ply,
      moves,
      searchMs: 1000,
      startPos: state.value.start.fen,
      shouldStop: false,
      emitCurrentMove: (ev: Eval) => (currMove.value = ev),
      emitBestMove: (ev: Eval) => (bestMove.value = ev)
    })
  }
)

watch(
  [bestMove, () => state.value.current.playerColor, () => state.value.viewing.orientation],
  () => {
    if (
      state.value.current.playerColor &&
      state.value.current.playerColor !== state.value.current.turnColor &&
      bestMove.value &&
      state.value.current.fen === bestMove.value.fen
    ) {
      api.value.move(bestMove.value.pv[0])
    }
  }
)

watchEffect(() => {
  if (bestMove.value && !playAgainstComputer.value) {
    const move = bestMove.value.pv[0]
    api.value.setAutoShapes([{ orig: move.from, dest: move.to, brush: 'paleBlue' } as DrawShape])
  } else {
    api.value.setAutoShapes([])
  }
})

const evaluationDisplay = computed(() => {
  if (!bestMove.value) return null
  const { type, value } = bestMove.value

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

watch(
  [playAgainstComputer, () => state.value.viewing.orientation],
  () => {
    if (playAgainstComputer.value) {
      api.value.setPlayerColor(state.value.viewing.orientation)
    } else {
      api.value.setPlayerColor(undefined)
    }
  },
  { immediate: true }
)

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
