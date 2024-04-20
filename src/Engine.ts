import type { Move, Square } from 'chess.js'
import { ref } from 'vue'
import type { Promotion } from './useChess'

export function useEngine() {
  const bestMove = ref<Move | undefined>(undefined)
  const currMove = ref<Move | undefined>(undefined)
  const evaluation = ref<{ type: 'cp' | 'mate'; value: number } | undefined>(undefined)
  const depth = ref<number | undefined>(undefined)

  const wasmSupport =
    typeof WebAssembly === 'object' &&
    WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00))

  const worker = new Worker(wasmSupport ? 'stockfish/stockfish.wasm.js' : 'stockfish/stockfish.js')

  worker.addEventListener('message', (data) => handleEngineStdout(data))
  worker.addEventListener('error', (err) => console.error(err))
  worker.addEventListener('messageerror', (err) => console.error(err))

  worker.postMessage('uci')

  function parseUCIMove(move: string): Move {
    const from = move.slice(0, 2) as Square
    const to = move.slice(2, 4) as Square
    const promotion = (move.slice(4, 5) || undefined) as Promotion | undefined
    return { from, to, promotion: promotion } as Move
  }

  function handleEngineStdout(data: MessageEvent<unknown>) {
    const uciStringSplitted = (data.data as string).split(' ')

    if (uciStringSplitted[0] === 'uciok') {
      setOption('UCI_AnalyseMode', 'true')
      setOption('Analysis Contempt', 'Off')

      worker.postMessage('ucinewgame')
      worker.postMessage('isready')
      return
    }

    // if (uciStringSplitted[0] === 'readyok') {
    //   worker.postMessage('go movetime 1500')
    //   return
    // }

    if (uciStringSplitted[0] === 'bestmove' && uciStringSplitted[1]) {
      const move = uciStringSplitted[1]
      bestMove.value = parseUCIMove(move)
    }

    if (uciStringSplitted[0] === 'info') {
      const parts = uciStringSplitted.slice(1)
      const parsed: {
        depth?: number
        score?: { type: 'cp' | 'mate'; value: number }
        pv?: string[]
      } = {
        pv: []
      }

      for (let i = 0; i < parts.length; i++) {
        const key = parts[i]

        switch (key) {
          case 'depth':
            parsed.depth = parseInt(parts[i + 1])
            break
          case 'score':
            parsed.score = {
              type: parts[i + 1] as 'cp' | 'mate',
              value: parseInt(parts[i + 2])
            }
            i++ // Skip next part since it's already parsed
            break
          case 'pv':
            parsed.pv = parts.slice(i + 1)
            break
        }
      }

      const currmove = parsed?.pv?.at(0)
      if (currmove !== undefined) {
        currMove.value = parseUCIMove(currmove)
      }
      evaluation.value = parsed.score
      depth.value = parsed.depth
    }
  }

  function setOption(name: string, value: string) {
    worker.postMessage(`setoption name ${name} value ${value}`)
  }

  function sendPosition(position: string) {
    bestMove.value = undefined
    currMove.value = undefined

    worker.postMessage(`position fen ${position} moves `)
    worker.postMessage('go movetime 2000')
  }

  return { bestMove, currMove, sendPosition, evaluation, depth }
}
