<script setup lang="ts">
import ChessgroundBoard from '@/components/ChessgroundBoard.vue'
import HistoryViewer from '@/components/HistoryViewer.vue'
import { useEngine } from '@/Engine'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon
} from '@heroicons/vue/24/outline'
import { computed, watch } from 'vue'
import type { DrawShape } from 'chessground/draw'
import { onKeyStroke } from '@vueuse/core'
import { useChess } from '@/useChess'

const { state, api } = useChess()

const { currMove, sendPosition, evaluation, depth } = useEngine()

watch(
  () => state.value.fen,
  () => sendPosition(state.value.fen),
  { immediate: true }
)

watch(currMove, (move) => {
  if (!move) {
    api.value.setAutoShapes([])
  } else {
    api.value.setAutoShapes([{ orig: move.from, dest: move.to, brush: 'paleBlue' } as DrawShape])
  }
})

const evaluationDisplay = computed(() => {
  if (!evaluation.value) return null
  const modifier = state.value.turnColor === 'black' ? -1 : 1
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
</script>

<template>
  <div class="flex flex-wrap w-full h-full container-size justify-center">
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
      </div>
      <div>
        <button class="btn btn-sm btn-primary" @click="api.toggleOrientation()">
          Toggle Orientation
        </button>
        <!-- <button class="btn btn-sm btn-primary" @click="boardAPI?.reset()">Reset</button> -->
      </div>

      <div class="break-words flex-shrink">
        <span class="min-w-0">{{ state.fen }}</span>
      </div>
      <HistoryViewer :api="api" :state="state"></HistoryViewer>

      <div class="flex gap-2 justify-between min-w-0">
        <button @click="api.viewStart()" class="btn btn-neutral flex-1">
          <ChevronDoubleLeftIcon class="size-8"></ChevronDoubleLeftIcon>
        </button>
        <button @click="api.viewPrevious()" class="btn btn-neutral flex-1">
          <ChevronLeftIcon class="size-8"></ChevronLeftIcon>
        </button>
        <button @click="api.viewNext()" class="btn btn-neutral flex-1">
          <ChevronRightIcon class="size-8"></ChevronRightIcon>
        </button>
        <button @click="api.viewCurrent()" class="btn btn-neutral flex-1">
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
