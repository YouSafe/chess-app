<script setup lang="ts">
import ChessgroundBoard from '@/components/ChessgroundBoard.vue'
</script>

<template>
  <header></header>

  <div class="flex flex-wrap w-full h-full container-size">
    <ChessgroundBoard></ChessgroundBoard>
    <aside></aside>
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
