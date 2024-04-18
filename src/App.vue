<script setup lang="ts">
import ChessgroundBoard from '@/components/ChessgroundBoard.vue'
import type { BoardAPI } from './BoardAPI'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon
} from '@heroicons/vue/24/outline'

let boardAPI: BoardAPI | undefined
</script>

<template>
  <div class="flex flex-wrap w-full h-full container-size">
    <ChessgroundBoard
      class="flex-shrink-0 flex-grow-0"
      @created="(api) => (boardAPI = api)"
    ></ChessgroundBoard>
    <aside class="min-w-[20em] max-w-[40em] min-h-40 p-1 flex-grow flex-shrink bg-base-200">
      <button class="btn btn-primary" @click="boardAPI?.toggleOrientation()">
        Toggle Orientation
      </button>
      <div class="flex gap-2 justify-between min-w-0">
        <button @click="boardAPI?.viewStart()" class="btn btn-neutral flex-1">
          <ChevronDoubleLeftIcon class="size-8"></ChevronDoubleLeftIcon>
        </button>
        <button @click="boardAPI?.viewPrevious()" class="btn btn-neutral flex-1">
          <ChevronLeftIcon class="size-8"></ChevronLeftIcon>
        </button>
        <button @click="boardAPI?.viewNext()" class="btn btn-neutral flex-1">
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
