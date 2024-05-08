import type { Move, Square } from 'chess.js'
import { Protocol, type Search } from './UCIProtocol'
import type { Promotion } from './useChess'

export function parseUCIMove(move: string): Move {
  const from = move.slice(0, 2) as Square
  const to = move.slice(2, 4) as Square
  const promotion = (move.slice(4, 5) || undefined) as Promotion | undefined
  return { from, to, promotion: promotion } as Move
}

export interface Engine {
  name: string
  scriptURL: string | URL
  available: () => boolean
}

export function useEngine(initialEngine: Engine) {
  let currentEngine: Engine = initialEngine
  const protocol = new Protocol()
  let worker: Worker | null = null

  function swap(engine: Engine) {
    terminate()
    currentEngine = engine
  }

  function start(work: Search) {
    protocol.performSearch(work)

    if (!worker) {
      worker = new Worker(currentEngine.scriptURL)

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

  return { start, stop, terminate, swap }
}
