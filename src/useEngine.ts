import type { Move, Square } from 'chess.js'
import { Protocol, type Search } from './UCIProtocol'
import type { Promotion } from './useChess'

export function parseUCIMove(move: string): Move {
  const from = move.slice(0, 2) as Square
  const to = move.slice(2, 4) as Square
  const promotion = (move.slice(4, 5) || undefined) as Promotion | undefined
  return { from, to, promotion: promotion } as Move
}

export function useEngine() {
  const protocol = new Protocol()
  let worker: Worker | null = null

  const wasmSupport =
    typeof WebAssembly === 'object' &&
    WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00))

  function start(work: Search) {
    protocol.performSearch(work)

    if (!worker) {
      worker = new Worker(wasmSupport ? 'stockfish/stockfish.wasm.js' : 'stockfish/stockfish.js')

      worker.addEventListener('error', (err) => console.error(err))
      worker.addEventListener('messageerror', (err) => console.error(err))
      worker.addEventListener(
        'message',
        (data) => {
          protocol.receive(data.data)
          // console.log('<-- ' + data.data)
        },
        true
      )
      protocol.connect((cmd) => {
        worker?.postMessage(cmd)
        // console.log('--> ' + cmd)
      })
    }
  }

  function stop() {
    protocol.performSearch(undefined)
  }

  function terminate() {
    protocol.disconnect()
    worker?.terminate()
    worker = null
  }

  return { start, stop, terminate }
}
