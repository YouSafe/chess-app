<script setup lang="ts">
import type { API, ChessState } from '@/useChess'
import { type DeepReadonly, toRefs } from 'vue'

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon
} from '@heroicons/vue/24/outline'

const props = defineProps<{ state: DeepReadonly<ChessState>; api: API }>()
const { api, state } = toRefs(props)
</script>

<template>
  <div class="flex gap-2 justify-between min-w-0">
    <button
      @click="api.viewStart()"
      class="btn btn-neutral flex-1"
      :disabled="state.viewing.ply == state.start.ply"
    >
      <ChevronDoubleLeftIcon class="size-8"></ChevronDoubleLeftIcon>
    </button>
    <button
      @click="api.viewPrevious()"
      class="btn btn-neutral flex-1"
      :disabled="state.viewing.ply == state.start.ply"
    >
      <ChevronLeftIcon class="size-8"></ChevronLeftIcon>
    </button>
    <button
      @click="api.viewNext()"
      class="btn btn-neutral flex-1"
      :disabled="state.viewing.ply == state.current.ply"
    >
      <ChevronRightIcon class="size-8"></ChevronRightIcon>
    </button>
    <button
      @click="api.viewCurrent()"
      class="btn btn-neutral flex-1"
      :disabled="state.viewing.ply == state.current.ply"
    >
      <ChevronDoubleRightIcon class="size-8"></ChevronDoubleRightIcon>
    </button>
  </div>
</template>
