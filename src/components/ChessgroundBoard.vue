<script setup lang="ts">
import { Chessground } from 'chessground'
import type { Api } from 'chessground/api'
import { onMounted, ref } from 'vue'

import '../assets/chessground.base.css'
import '../assets/chessground.coords.css'
import '../assets/chessground.brown.css'
import '../assets/chessground.cburnett.css'
import type { Config } from 'chessground/config'

const board = ref<HTMLElement | null>(null)
const chessground = ref<Api | null>(null)
const promotion = ref<HTMLElement | null>(null)

onMounted(() => {
  if (board.value === null) {
    throw new Error('Failed to mount board')
  }
  if (promotion.value === null) {
    throw new Error('Failed to mount promotion choice dialog')
  }

  const config: Config = {
    addDimensionsCssVarsTo: promotion.value
  }
  chessground.value = Chessground(board.value, config)
})
</script>

<template>
  <div ref="board" id="board"></div>
  <div ref="promotion" id="promotion-choice"></div>
</template>

<style>
#board {
  width: 100cqmin;
  height: 100cqmin;
}

#promotion-choice {
  width: var(--cg-width, 100%);
  height: var(--cg-height, 100%);
  z-index: 205;
  position: absolute;
  display: grid;
  grid-template-columns: repeat(8, 12.5%);
  grid-template-rows: repeat(8, 12.5%);
}

#promotion-choice button {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-color: white;
}
</style>
