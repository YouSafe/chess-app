import type { Move, Square } from 'chess.js'
import { Protocol, type Search } from './UCIProtocol'
import type { Promotion } from './useChess'
import init, { Engine as SaiphWasmEngine } from '../pkg'

export function parseUCIMove(move: string): Move {
  const from = move.slice(0, 2) as Square
  const to = move.slice(2, 4) as Square
  const promotion = (move.slice(4, 5) || undefined) as Promotion | undefined
  return { from, to, promotion: promotion } as Move
}

export interface EngineFactory {
  name: string
  make: () => Engine
  available: () => boolean
}

export interface Engine {
  start(work: Search): void
  stop(): void
  terminate(): void
}

export class SimpleEngine implements Engine {
  private scriptURL: string | URL
  private workerOptions: WorkerOptions | undefined

  private worker: Worker | null = null
  private protocol: Protocol

  constructor(scriptURL: string | URL, workerOptions?: WorkerOptions) {
    this.scriptURL = scriptURL
    this.workerOptions = workerOptions

    this.protocol = new Protocol()
  }

  start(work: Search) {
    this.protocol.performSearch(work)

    if (!this.worker) {
      this.worker = new Worker(this.scriptURL, this.workerOptions)

      this.worker.addEventListener('error', (err) => console.error(err))
      this.worker.addEventListener('messageerror', (err) => console.error(err))
      this.worker.addEventListener(
        'message',
        (data) => {
          this.protocol.receive(data.data)
          // console.log('<-- ' + data.data)
        },
        true
      )
      this.protocol.connect((cmd) => {
        this.worker?.postMessage(cmd)
        // console.log('--> ' + cmd)
      })
    }
  }

  stop(): void {
    this.protocol.performSearch(undefined)
  }

  terminate() {
    this.protocol.disconnect()
    this.worker?.terminate()
    this.worker = null
  }
}

export class SaiphEngine implements Engine {

  protocol = new Protocol()
  engine: SaiphWasmEngine | null = null

  start(work: Search): void {
    this.protocol.performSearch(work)

    if (this.engine == null) {
      this.engine = SaiphWasmEngine.new();
    }

    this.engine.set_callback((message: string) => this.protocol.receive(message));
    this.protocol.connect((message) => this.engine?.send_command(message));
  }
  stop(): void {
    this.protocol.performSearch(undefined)
  }
  terminate(): void {
    this.protocol.disconnect();
  }

}

export function useEngine() {
  let currentEngine: Engine | null = null

  function swap(engine: Engine) {
    terminate()
    currentEngine = engine
  }

  function start(work: Search) {
    currentEngine?.start(work)
  }

  function stop() {
    currentEngine?.stop()
  }

  function terminate() {
    currentEngine?.terminate();
  }

  return { start, stop, terminate, swap }
}
