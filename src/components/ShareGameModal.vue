<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  pgn: string
  fen: string
}>()

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
    <div class="modal-box">
      <h3 class="font-bold text-lg">Share game</h3>
      <label class="form-control">
        <div class="label">
          <span class="label-text">FEN</span>
        </div>
        <input
          readonly
          type="text"
          class="input px-3 text-sm leading-snug input-bordered"
          :value="props.fen"
        />

        <div class="label">
          <span class="label-text">PGN</span>
        </div>
        <textarea
          readonly
          type="text"
          class="textarea px-3 text-sm leading-snug textarea-bordered"
          rows="10"
          :value="props.pgn"
        ></textarea>
      </label>

      <div class="modal-action">
        <form method="dialog" class="flex gap-2">
          <button class="btn btn-ghost">Close</button>
        </form>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>
