import type { Move } from 'chess.js'
import { parseUCIMove } from './useEngine'

export type Send = (cmd: string) => void

export interface Eval {
  fen: string
  depth: number
  type: 'cp' | 'mate'
  value: number
  pv: Move[]
}

export interface Search {
  ply: number
  startPos: string
  currentFen: string
  moves: string[]
  searchMs?: number

  shouldStop: boolean
  emitBestMove: (ev: Eval) => void
  emitCurrentMove: (ev: Eval) => void
}

export class Protocol {
  private search: Search | undefined
  private currentEvaluation: Eval | undefined
  private nextSearch: Search | undefined

  private send: Send | undefined

  connect(send: Send) {
    this.send = send

    this.send('uci')
  }

  disconnect() {
    if (this.search && this.currentEvaluation) {
      this.search.emitCurrentMove(this.currentEvaluation)
    }

    this.search = undefined
    this.send = undefined
  }

  receive(command: string) {
    const parts = command.trim().split(/\s+/g)
    const [cmd, ...rest] = parts

    if (cmd === 'uciok') {
      this.setOption('UCI_AnalyseMode', 'true')
      this.setOption('Analysis Contempt', 'Off')

      this.send?.('ucinewgame')
      this.send?.('isready')
    } else if (cmd === 'readyok') {
      this.swapSearch()
    } else if (cmd === 'bestmove') {
      if (this.search && this.currentEvaluation) {
        this.search.emitBestMove(this.currentEvaluation)
      }
      this.search = undefined
      this.swapSearch()
      return
    } else if (cmd === 'info') {
      if (this.search && !this.search.shouldStop) {
        let depth = 0,
          isMate = false,
          povEv,
          timeMillis,
          pvMoves: string[] = []

        for (let i = 0; i < rest.length; i++) {
          switch (rest[i]) {
            case 'depth':
              depth = parseInt(rest[++i])
              break
            case 'time':
              timeMillis = parseInt(rest[++i])
              break
            case 'score':
              isMate = rest[++i] === 'mate'
              povEv = parseInt(rest[++i])
              break
            case 'pv':
              pvMoves = rest.slice(++i)
              i = rest.length
              break
          }
        }

        if (isMate && !povEv) {
          if (this.currentEvaluation) {
            this.search.emitBestMove(this.currentEvaluation)
          }
          this.search = undefined
          return
        }

        if (povEv === undefined) return

        const ev = this.search.ply % 2 === 1 ? -povEv : povEv

        this.currentEvaluation = {
          depth,
          fen: this.search.currentFen,
          type: isMate ? 'mate' : 'cp',
          value: ev,
          pv: pvMoves.map(parseUCIMove)
        }

        this.search.emitCurrentMove(this.currentEvaluation)
        if (timeMillis && this.search.searchMs && timeMillis >= this.search.searchMs) {
          this.stop()
        }
      }
    }
  }

  performSearch(nextSearch: Search | undefined) {
    this.nextSearch = nextSearch
    this.stop()
    this.swapSearch()
  }

  private stop() {
    if (this.search && !this.search.shouldStop) {
      this.search.shouldStop = true
      this.send?.('stop')
    }
  }

  private swapSearch() {
    if (!this.send || this.search) {
      return
    }

    this.search = this.nextSearch
    this.nextSearch = undefined

    if (this.search) {
      this.currentEvaluation = undefined

      this.send(`position fen ${this.search.startPos} moves ${this.search.moves.join(' ')}`)
      if (this.search.searchMs) {
        this.send(`go movetime ${this.search.searchMs}`)
      } else {
        this.send(`go infinite`)
      }
    }
  }

  private setOption(name: string, value: string | number): void {
    this.send?.(`setoption name ${name} value ${value.toString()}`)
  }
}
