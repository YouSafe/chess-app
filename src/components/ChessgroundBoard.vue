<script setup lang="ts">
import { Chessground } from 'chessground'
import type { Api } from 'chessground/api'
import { onMounted, ref } from 'vue'

import '../assets/chessground.base.css'
import '../assets/chessground.coords.css'
import '../assets/chessground.brown.css'
import '../assets/chessground.cburnett.css'

const board = ref<HTMLElement | null>(null)
const chessground = ref<Api | null>(null)

onMounted(() => {
  if (board.value === null) {
    throw new Error('Failed to mount board')
  }

  const config = {}
  chessground.value = Chessground(board.value, config)
})
</script>

<template>
  <div ref="board" id="board"></div>
</template>

<style>
#board {
  width: 100cqmin;
  height: 100cqmin;
}
</style>
