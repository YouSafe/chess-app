<script setup lang="ts">
import ChessgroundBoard from '@/components/ChessgroundBoard.vue'
import type { BoardAPI } from './BoardAPI'

let boardAPI: BoardAPI | undefined
</script>

<template>
  <header></header>

  <div class="flex flex-wrap w-full h-full container-size">
    <ChessgroundBoard @created="(api) => (boardAPI = api)"></ChessgroundBoard>
    <aside>
      <button class="btn btn-primary" @click="boardAPI?.toggleOrientation()">
        Toggle Orientation
      </button>
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

<style scoped>
.container-size {
  container-type: size;
}
</style>
