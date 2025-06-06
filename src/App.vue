<script setup lang="ts">
import ChessgroundBoard from '@/components/ChessgroundBoard.vue'
import HistoryViewer from '@/components/HistoryViewer.vue'
import LoadPgnModal from '@/components/LoadPgnModal.vue'
import ShareGameModal from '@/components/ShareGameModal.vue'
import HistoryNavigator from '@/components/HistoryNavigator.vue'
import PlayerInfo from '@/components/PlayerInfo.vue'
import BaseModal from '@/components/BaseModal.vue'
import GameResultModal from '@/components/GameResultModal.vue'
import IconParkOutlineTarget from '@/components/icons/IconParkOutlineTarget.vue'

import { SaiphEngine, SimpleEngine, useEngine, type Engine, type EngineFactory } from '@/useEngine'

import {
  AdjustmentsHorizontalIcon,
  ShareIcon,
  ArrowPathRoundedSquareIcon,
  PencilIcon
} from '@heroicons/vue/24/outline'

import { computed, ref, watch } from 'vue'
import type { DrawShape } from 'chessground/draw'
import { onKeyStroke } from '@vueuse/core'
import { useChess } from '@/useChess'
import type { Eval, Search } from './UCIProtocol'

const playAgainstComputer = ref(false)
const showEvaluation = ref<boolean>(true)
const showBestMove = ref<boolean>(true)
const searchTime = ref<number>(2)

const engineShouldRun = computed(
  () => showBestMove.value || showEvaluation.value || playAgainstComputer.value
)

const gameResultModal = ref<InstanceType<typeof GameResultModal>>()
const loadPgnModal = ref<InstanceType<typeof LoadPgnModal>>()
const shareGameModal = ref<InstanceType<typeof ShareGameModal>>()
const settingsModal = ref<InstanceType<typeof BaseModal>>()

const isCrossOriginIsolated = () => window.crossOriginIsolated
const hasWasmSupport = () =>
  typeof WebAssembly === 'object' &&
  WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00))

const supportedEngines: EngineFactory[] = [
  {
    name: 'Saiph',
    make: () => new SaiphEngine(),
    available: () => isCrossOriginIsolated() && hasWasmSupport()
  },  
  {
    name: 'Stockfish 16 SIMD',
    make: () => new SimpleEngine('stockfish-16/stockfish-nnue-16.js'),
    available: () => isCrossOriginIsolated() && hasWasmSupport()
  },
  {
    name: 'Stockfish 2019-08-15',
    make: () => new SimpleEngine('stockfish/stockfish.wasm.js'),
    available: hasWasmSupport
  }
]

const availableEngines = supportedEngines.filter((engine) => engine.available())

const currentEngineFactory = ref<EngineFactory>(availableEngines[0])

const { state, api } = useChess()

const { start, stop, terminate, swap } = useEngine()

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
        searchMs:
          state.value.current.playerColor !== undefined ? searchTime.value * 1000 : undefined,
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

watch(currentEngineFactory, () => {
  swap(currentEngineFactory.value.make())

  const historyIndex = state.value.viewing.ply - state.value.start.ply

  const moves = state.value.current.history.slice(0, historyIndex).map((move) => move.lan)

  start({
    currentFen: state.value.viewing.fen,
    searchMs: state.value.current.playerColor !== undefined ? searchTime.value * 1000 : undefined,
    moves,
    ply: state.value.viewing.ply,
    startPos: state.value.start.fen,
    shouldStop: false,
    emitCurrentMove: (ev: Eval) => (currMove.value = ev),
    emitBestMove: (ev: Eval) => (bestMove.value = ev)
  } as Search)
}, {immediate: true})

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
      searchMs: state.value.current.playerColor !== undefined ? 1000 : undefined,
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

watch([currMove, showBestMove], () => {
  if (currMove.value && showBestMove.value) {
    const move = currMove.value.pv[0]
    api.value.setAutoShapes([{ orig: move.from, dest: move.to, brush: 'paleBlue' } as DrawShape])
  } else {
    api.value.setAutoShapes([])
  }
})

const evaluationDisplay = computed(() => {
  if (state.value.viewing.ply === state.value.current.ply && state.value.current.gameResult) {
    return '-'
  }

  if (!currMove.value) {
    return null
  }
  const { type, value } = currMove.value

  const sign = value > 0 ? '+' : '-'
  const absValue = Math.abs(value)

  if (type === 'mate') {
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
      stop()
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
  <GameResultModal ref="gameResultModal" :game-result="state.current.gameResult" />
  <BaseModal ref="settingsModal">
    <div class="modal-box w-[25em] grid grid-cols-[max-content_auto] gap-4">
      <label>Engine</label>
      <select class="select select-sm select-bordered w-full max-w" v-model="currentEngineFactory">
        <option v-once v-for="engine in availableEngines" :key="engine.name" :value="engine">
          {{ engine.name }}
        </option>
      </select>
      <label>Show Evaluation</label>
      <input type="checkbox" class="toggle toggle-success" checked v-model="showEvaluation" />
      <label>Draw Best Move</label>
      <input type="checkbox" class="toggle toggle-success" checked v-model="showBestMove" />
      <label>Search time</label>
      <div class="flex gap-2">
        <input type="range" min="1" max="8" v-model="searchTime" step="1" class="range" />
        <span>{{ searchTime }}s</span>
      </div>
    </div>
  </BaseModal>

  <div class="flex min-h-svh max-w-full justify-center portrait:flex-col flex-wrap">
    <ChessgroundBoard
      class="flex-shrink-0 flex-grow-0"
      :api="api"
      :state="state"
    ></ChessgroundBoard>
    <aside class="min-w-[20em] max-w-[30em] p-2 flex flex-1 bg-base-200 flex-col gap-2">
      <div class="h-10 flex items-center">
        <div v-show="showEvaluation">
          <span class="font-bold text-2xl inline-block w-20 text-center" v-if="evaluationDisplay">{{
            evaluationDisplay
          }}</span>
          <span class="loading loading-bars loading-sm text-center" v-else></span>
          <span> depth {{ currMove?.depth }}</span>
        </div>
        <div class="ml-auto flex gap-2">
          <div class="tooltip tooltip-bottom" data-tip="Play against computer">
            <label class="swap btn items-unset btn-square btn-neutral btn-sm">
              <input type="checkbox" v-model="playAgainstComputer" />

              <IconParkOutlineTarget class="swap-on size-5 text-success" />
              <IconParkOutlineTarget class="swap-off size-5" />
            </label>
          </div>

          <button
            class="btn btn-square btn-sm btn-neutral tooltip tooltip-bottom flex items-center justify-center"
            data-tip="Toggle Orientation"
            @click="api.toggleOrientation()"
          >
            <ArrowPathRoundedSquareIcon class="size-5"></ArrowPathRoundedSquareIcon>
          </button>
          <button
            class="btn btn-square btn-sm btn-neutral tooltip tooltip-bottom flex items-center justify-center"
            data-tip="Load Game"
            @click="loadPgnModal?.show()"
          >
            <PencilIcon class="size-5"></PencilIcon>
          </button>
          <button
            class="btn btn-square btn-sm btn-neutral tooltip tooltip-bottom flex items-center justify-center"
            data-tip="Share"
            @click="shareGameModal?.show()"
          >
            <ShareIcon class="size-5"></ShareIcon>
          </button>
          <button
            class="btn btn-square btn-sm btn-neutral tooltip tooltip-bottom tooltip-fix flex items-center justify-center"
            data-tip="Settings"
            @click="settingsModal?.show()"
          >
            <AdjustmentsHorizontalIcon class="size-6"></AdjustmentsHorizontalIcon>
          </button>
        </div>
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

<style scoped>
.tooltip-fix.tooltip-bottom:before {
  left: 0%;
}

.items-unset {
  align-items: unset;
}
</style>

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
