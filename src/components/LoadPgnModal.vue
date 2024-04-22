<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'load', pgn: string): void
}>()

const importedPGN = ref('')
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
      <h3 class="font-bold text-lg">Load PGN</h3>
      <label class="form-control">
        <div class="label">
          <span class="label-text">Portable Game Notation</span>
        </div>
        <textarea
          type="text"
          class="textarea leading-snug textarea-bordered"
          rows="10"
          v-model="importedPGN"
        ></textarea>
      </label>

      <div class="modal-action">
        <form method="dialog" class="flex gap-2">
          <button
            class="btn btn-primary"
            @click="
              () => {
                emit('load', importedPGN)
                importedPGN = ''
              }
            "
          >
            Load
          </button>
          <button class="btn btn-ghost" @click="importedPGN = ''">Close</button>
        </form>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>
