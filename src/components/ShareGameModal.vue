<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { ref, toRefs } from 'vue'

import { ClipboardIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  pgn: string
  fen: string
}>()

const { pgn, fen } = toRefs(props)

const dialog = ref<HTMLDialogElement>()

const showModal = () => {
  if (!dialog.value) return

  dialog.value.showModal()
  dialog.value.style.visibility = 'visible'
}

defineExpose({
  show: showModal
})

const {
  copy: pgnCopy,
  copied: pgnCopied,
  isSupported: pgnIsSupported
} = useClipboard({ source: pgn })
const {
  copy: fenCopy,
  copied: fenCopied,
  isSupported: fenIsSupported
} = useClipboard({ source: fen })
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
      <div class="flex flex-col">
        <div class="flex justify-between">
          <label for="fen" class="label">
            <span class="label-text">FEN</span>
          </label>
          <button type="button" @click="fenCopy(fen)" v-if="fenIsSupported">
            <span v-if="!fenCopied" class="text-xs">Copy</span
            ><span class="text-xs" v-else>Copied!</span>
            <ClipboardIcon class="inline size-4" />
          </button>
        </div>
        <input
          id="fen"
          type="text"
          class="input px-3 text-sm leading-snug input-bordered"
          :value="fen"
          readonly
        />
        <div class="flex justify-between">
          <label for="pgn" class="label">
            <span class="label-text">PGN</span>
          </label>
          <button type="button" @click="pgnCopy(pgn)" v-if="pgnIsSupported">
            <span v-if="!pgnCopied" class="text-xs">Copy</span
            ><span class="text-xs" v-else>Copied!</span>
            <ClipboardIcon class="inline size-4" />
          </button>
        </div>
        <textarea
          id="pgn"
          type="text"
          class="textarea px-3 text-sm leading-snug textarea-bordered"
          rows="10"
          :value="pgn"
          readonly
        ></textarea>
      </div>

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
