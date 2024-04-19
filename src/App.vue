<script setup lang="ts">
import ChessgroundBoard from '@/components/ChessgroundBoard.vue'
import HistoryViewer from '@/components/HistoryViewer.vue'
import type { BoardAPI } from './BoardAPI'
import { useEngine } from '@/Engine'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon
} from '@heroicons/vue/24/outline'
import { computed, ref, watch } from 'vue'
import type { DrawShape } from 'chessground/draw'
import { onKeyStroke } from '@vueuse/core'

let boardAPI: BoardAPI | undefined

const pgn = ref<string | undefined>(undefined)
const fen = ref<string | undefined>(undefined)
const history = ref<string[] | undefined>(undefined)
const startPly = ref<number | undefined>(undefined)
const viewingPly = ref<number | undefined>(undefined)

const { currMove, sendPosition, evaluation, depth } = useEngine()

function handleBoardCreated(api: BoardAPI) {
  boardAPI = api as BoardAPI | undefined

  fen.value = api.getFen()
  pgn.value = api.getPgn()
}

function handleMove() {
  pgn.value = boardAPI?.getPgn()

  history.value = boardAPI?.getHistory()
}

function handlePositionChange(positionFen: string) {
  fen.value = positionFen
  startPly.value = boardAPI?.getStartPly()
  viewingPly.value = boardAPI?.getViewingPly()

  sendPosition(positionFen)
}

watch(currMove, (move) => {
  if (!move) return
  boardAPI?.setAutoShapes([{ orig: move.from, dest: move.to, brush: 'paleBlue' } as DrawShape])
})

const evaluationDisplay = computed(() => {
  if (!evaluation.value) return null
  const modifier = boardAPI?.getTurnColor() === 'black' ? -1 : 1
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
  { key: 'ArrowUp', func: () => boardAPI?.stopViewing() },
  { key: 'ArrowDown', func: () => boardAPI?.viewStart() },
  { key: 'ArrowRight', func: () => boardAPI?.viewNext() },
  { key: 'ArrowLeft', func: () => boardAPI?.viewPrevious() }
]

for (const shortcut of shortcuts) {
  onKeyStroke(shortcut.key, shortcut.func)
}
</script>

<template>
  <div class="flex flex-wrap w-full h-full container-size justify-center">
    <ChessgroundBoard
      @created="handleBoardCreated"
      @move="handleMove"
      @position-change="handlePositionChange"
    ></ChessgroundBoard>
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
      </div>
      <div>
        <button class="btn btn-sm btn-primary" @click="boardAPI?.toggleOrientation()">
          Toggle Orientation
        </button>
        <button class="btn btn-sm btn-primary" @click="boardAPI?.reset()">Reset</button>
        <button class="btn btn-sm btn-primary" @click="boardAPI?.trimMoves()">Trim</button>
      </div>

      <div class="break-words flex-shrink">
        <span class="min-w-0">{{ fen }}</span>
      </div>
      <HistoryViewer
        :moves="history"
        :start-ply="startPly"
        :viewing-ply="viewingPly ?? 0"
        :board-api="boardAPI"
      ></HistoryViewer>
      <div class="flex gap-2 justify-between min-w-0">
        <button @click="boardAPI?.viewStart()" class="btn btn-neutral flex-1">
          <ChevronDoubleLeftIcon class="size-8"></ChevronDoubleLeftIcon>
        </button>
        <button @click="boardAPI?.viewPrevious()" class="btn btn-neutral flex-1">
          <ChevronLeftIcon class="size-8"></ChevronLeftIcon>
        </button>
        <button
          @keyup.right="boardAPI?.viewNext()"
          @click="boardAPI?.viewNext()"
          class="btn btn-neutral flex-1"
        >
          <ChevronRightIcon class="size-8"></ChevronRightIcon>
        </button>
        <button @click="boardAPI?.stopViewing()" class="btn btn-neutral flex-1">
          <ChevronDoubleRightIcon class="size-8"></ChevronDoubleRightIcon>
        </button>
      </div>
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
