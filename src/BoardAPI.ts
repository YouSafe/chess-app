import { Chess, SQUARES, type Move, type Square } from 'chess.js'
import type { Api } from 'chessground/api'
import type { Config } from 'chessground/config'
import { defaults } from 'chessground/state'
import type { Color, Key, MoveMetadata } from 'chessground/types'
import { merge } from 'ts-deepmerge'

export type Promotion = 'q' | 'n' | 'b' | 'r'

export const promotions: { name: string; value: Promotion }[] = [
  { name: 'Queen', value: 'q' },
  { name: 'Rook', value: 'r' },
  { name: 'Knight', value: 'n' },
  { name: 'Bishop', value: 'b' }
]

export interface PromotionDialogState {
  isEnabled: boolean
  color?: Color
  square?: Key
  callback?: (promotionValue: Promotion) => void
  cancel?: () => void
}

export interface BoardState {
  promotionDialogState: PromotionDialogState
  orientationState?: Color
}

export class BoardAPI {
  private instance: Chess
  private boardApi: Api
  private config: Config
  private state: BoardState

  constructor(boardApi: Api, config: Config, state: BoardState) {
    this.boardApi = boardApi
    this.config = config
    this.state = state
    this.instance = new Chess()
    this.reset()
  }

  private update() {
    this.boardApi.state.turnColor = this.getTurnColor()

    if (!this.boardApi.state.movable.free) {
      this.boardApi.state.movable.color = this.boardApi.state.turnColor
      this.boardApi.state.movable.dests = this.legalMoves()
    } else {
      this.boardApi.state.movable.color = 'both'
      this.boardApi.state.movable.dests = new Map()
    }

    if (this.instance.isCheck()) {
      for (const [key, piece] of this.boardApi.state.pieces) {
        if (piece.role === 'king' && piece.color === this.boardApi.state.turnColor) {
          this.boardApi.state.check = key
          return
        }
      }
    } else {
      this.boardApi.state.check = undefined
    }
  }

  reset() {
    const config: Config = merge(defaults() as Config, this.config)
    this.boardApi.state.selected = undefined
    if (config.orientation) {
      this.state.orientationState = config.orientation
    }

    this.setConfig(config)
    this.update()
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async fulfillMove(orig: Key, dest: Key, _: MoveMetadata) {
    const piece = this.instance.get(orig as Square)
    const promotionFile = piece?.color === 'w' ? '8' : '1'
    let promotion: Promotion | undefined = undefined
    if (piece?.type === 'p' && dest[1] === promotionFile) {
      try {
        promotion = await new Promise((resolve, reject) => {
          this.state.promotionDialogState = {
            isEnabled: true,
            color: this.getTurnColor(),
            square: dest,
            callback: resolve,
            cancel: reject
          }
        })
      } catch {
        this.boardApi.set({ fen: this.instance.fen() })
        this.update()
        return
      }
    }
    return this.move({ from: orig, to: dest, promotion } as Move)
  }

  move(move: Move): boolean {
    let moveResult: Move
    try {
      moveResult = this.instance.move(move)
    } catch {
      if (this.boardApi.state.movable.free) {
        this.boardApi.move(move.from, move.to)
        this.update()
      }
      return false
    }

    this.boardApi.move(move.from, move.to)
    if (moveResult.flags === 'e' || moveResult?.promotion) {
      this.boardApi.set({ fen: moveResult.after })
      // setTimeout(
      //   () => ,
      //   this.boardApi.state.animation.current ? this.boardApi.state.animation.duration : 0
      // )
    }
    this.update()
    return true
  }

  setPosition(fen: string) {
    this.instance.load(fen)
    this.boardApi.set({ fen })
    this.update()
  }

  setConfig(config: Config) {
    config.movable = {
      ...config.movable,
      events: { after: this.fulfillMove.bind(this) }
    }

    const { fen, ...remainingConfig } = config
    this.boardApi.set(remainingConfig)
    if (fen) {
      this.setPosition(fen)
    }
    this.boardApi.redrawAll() // is this really necessary?
  }

  private legalMoves(): Map<Key, Key[]> {
    const dests: Map<Key, Key[]> = new Map()

    for (const square of SQUARES) {
      const moves = this.instance.moves({ square, verbose: true })
      if (moves.length > 0) {
        dests.set(
          moves[0].from,
          moves.map((m) => m.to)
        )
      }
    }

    return dests
  }

  toggleOrientation(): void {
    this.boardApi.toggleOrientation()
    this.state.orientationState = this.boardApi.state.orientation
  }

  getOrientation(): Color {
    return this.boardApi.state.orientation
  }

  getTurnColor(): Color {
    return this.instance.turn() === 'w' ? 'white' : 'black'
  }

  getFen(): string {
    return this.instance.fen()
  }

  getPgn(): string {
    return this.instance.pgn()
  }
}
