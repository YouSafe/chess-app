<script setup lang="ts">
import ChessgroundBoard from '@/components/ChessgroundBoard.vue'
import type { BoardAPI } from './BoardAPI'
import { useEngine } from '@/Engine'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon
} from '@heroicons/vue/24/outline'
import { ref, watch } from 'vue'
import type { DrawShape } from 'chessground/draw'

let boardAPI: BoardAPI | undefined

const pgn = ref<string | undefined>(undefined)
const fen = ref<string | undefined>(undefined)

const { bestMove, currMove, sendPosition, evaluation } = useEngine()

function handleBoardCreated(api: BoardAPI) {
  boardAPI = api

  fen.value = api.getFen()
  pgn.value = api.getPgn()

  sendPosition(fen.value)
}

function handleMove() {
  pgn.value = boardAPI?.getPgn()
}

function handlePositionChange(positionFen: string) {
  fen.value = positionFen

  sendPosition(positionFen)
}

watch(currMove, (move) => {
  if (!move) return
  boardAPI?.setAutoShapes([{ orig: move.from, dest: move.to, brush: 'paleBlue' } as DrawShape])
})
</script>

<template>
  <div class="flex flex-wrap w-full h-full container-size">
    <ChessgroundBoard
      @created="handleBoardCreated"
      @move="handleMove"
      @position-change="handlePositionChange"
    ></ChessgroundBoard>
    <aside class="min-w-[20em] max-w-[40em] min-h-40 p-1 flex-grow flex-shrink bg-base-200">
      <button class="btn btn-primary" @click="boardAPI?.toggleOrientation()">
        Toggle Orientation
      </button>
      <div>
        {{ fen }}
        {{ pgn }}
        {{ evaluation }}
      </div>
      <div class="flex gap-2 justify-between min-w-0">
        <button @click="boardAPI?.viewStart()" class="btn btn-neutral flex-1">
          <ChevronDoubleLeftIcon class="size-8"></ChevronDoubleLeftIcon>
        </button>
        <button
          @keyup.left="boardAPI?.viewPrevious()"
          @click="boardAPI?.viewPrevious()"
          class="btn btn-neutral flex-1"
        >
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
