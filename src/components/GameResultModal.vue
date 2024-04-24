<script setup lang="ts">
import BaseModal from '@/components/BaseModal.vue'
import type { GameResult } from '@/useChess'
import { ref, type DeepReadonly } from 'vue'

const modal = ref<InstanceType<typeof BaseModal>>()

defineProps<{
  gameResult: DeepReadonly<GameResult | undefined>
}>()

const showModal = () => {
  if (!modal.value) return

  modal.value.show()
}

defineExpose({
  show: showModal
})

const resultText = (gameResult: GameResult) => {
  if (gameResult.result === 'blackWon') {
    return 'Black won!'
  } else if (gameResult.result === 'whiteWon') {
    return 'White won!'
  } else if (gameResult.result === 'draw') {
    return 'Draw'
  }
}
</script>

<template>
  <BaseModal ref="modal">
    <div class="modal-box w-[20em]">
      <h3 class="text-xl text-center font-bold">Game Ended</h3>
      <div class="divider"></div>
      <template v-if="gameResult">
        <div class="text-2xl font-extrabold text-center">{{ resultText(gameResult) }}</div>
        <div class="text-lg text-center">by {{ gameResult.reason }}</div>
      </template>
      <template v-else> Error: game result is unknown </template>
    </div>
  </BaseModal>
</template>
