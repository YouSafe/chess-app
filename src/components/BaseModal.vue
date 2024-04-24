<script setup lang="ts">
import { ref } from 'vue'

const dialog = ref<HTMLDialogElement>()

const showModal = () => {
  if (!dialog.value) return

  dialog.value.showModal()
  dialog.value.style.visibility = 'visible'
}

defineExpose({
  show: showModal
})
</script>

<template>
  <dialog
    ref="dialog"
    class="modal invisible"
    @transitionend="
      () => {
        if (dialog) dialog.style.visibility = dialog.open ? 'visible' : 'hidden'
      }
    "
  >
    <slot> </slot>

    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>
