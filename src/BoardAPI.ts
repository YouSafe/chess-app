import { Chess, SQUARES, type Move, type Square } from 'chess.js'
import type { Api } from 'chessground/api'
import type { Config } from 'chessground/config'
import type { DrawShape } from 'chessground/draw'
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

export type PromotionDialogState =
  | {
      isEnabled: false
    }
  | {
      isEnabled: true
      color: Color
      square: Key
      callback: (promotion: Promotion) => void
      cancel: () => void
    }

export type ViewHistoryState =
  | {
      isEnabled: false
    }
  | {
      isEnabled: true
      viewingPly: number
    }

export interface BoardState {
  promotionDialogState: PromotionDialogState
  viewHistoryState: ViewHistoryState
  orientationState?: Color
}

export interface BoardEmits {
  (e: 'created', api: BoardAPI): void
  (e: 'move', move?: Move): void
  (e: 'positionChange', fen: string): void
}

const startpos = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export class BoardAPI {
  private instance: Chess
  private boardApi: Api
  private config: Config
  private state: BoardState
  private emit: BoardEmits

  private startPly: number = 0

  constructor(boardApi: Api, config: Config, state: BoardState, emit: BoardEmits) {
    this.boardApi = boardApi
    this.config = config
    this.state = state
    this.emit = emit
    this.instance = new Chess()
    this.reset()
  }

  private update() {
    // do not change the board state while viewing history
    if (this.state.viewHistoryState.isEnabled) {
      return
    }

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
    const config: Config = merge(defaults() as Config, { fen: startpos } as Config, this.config)
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
        this.emit('positionChange', this.instance.fen())
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

    this.emit('move', moveResult)
    this.emit('positionChange', moveResult.after)

    // only update when not viewing history
    if (this.state.viewHistoryState.isEnabled) {
      return true
    }

    if (moveResult.flags === 'e' || moveResult.promotion) {
      this.boardApi.set({ fen: moveResult.after })
    } else {
      this.boardApi.move(move.from, move.to)
    }
    this.update()
    return true
  }

  setPosition(fen: string) {
    this.instance.load(fen)
    this.boardApi.set({ animation: { enabled: false } })
    this.boardApi.set({ fen })
    this.boardApi.set({ animation: { enabled: this.config.animation?.enabled } })

    this.state.viewHistoryState = { isEnabled: false }

    if (this.state.promotionDialogState.isEnabled) {
      this.state.promotionDialogState.cancel()
      this.state.promotionDialogState = { isEnabled: false }
    }

    this.startPly = this.getCurrentPly()
    this.emit('positionChange', fen)
    this.update()
  }

  setAutoShapes(shapes: DrawShape[]) {
    this.boardApi.setAutoShapes(shapes)
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
    this.boardApi.redrawAll()
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

  // not reactive!!

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

  getStartPly(): number {
    return this.startPly
  }

  getHistory(): string[]
  getHistory(verbose: false): string[]
  getHistory(verbose: true): Move[]
  getHistory(verbose = false): Move[] | string[] {
    return this.instance.history({ verbose: verbose })
  }

  getCurrentPly(): number {
    const turnColor = this.getTurnColor()
    const turnNumber = this.instance.moveNumber()
    return Math.max(2 * (turnNumber - 1), 0) + Number(turnColor === 'black')
  }

  getViewingPly(): number {
    if (this.state.viewHistoryState.isEnabled) {
      return this.state.viewHistoryState.viewingPly
    } else {
      return this.getCurrentPly()
    }
  }

  loadPgn(pgn: string) {
    this.instance.loadPgn(pgn)
    this.state.viewHistoryState = { isEnabled: false }
    this.boardApi.set({ fen: this.instance.fen() })
    this.startPly = this.getCurrentPly()
    this.emit('positionChange', this.instance.fen())
    this.update()
  }

  trimMoves() {
    const viewingPly = this.getViewingPly()
    const currentPly = this.getCurrentPly()

    const toTrim = currentPly - viewingPly

    for (let i = 0; i < toTrim; i++) {
      this.instance.undo()
    }

    // TODO: this should rather restore the old state of viewOnly before the user started viewing the history
    this.boardApi.set({ viewOnly: false })
    this.state.viewHistoryState = { isEnabled: false }
    // technically not a move but needed to trigger the history update
    this.emit('move')
    this.update()
  }

  viewHistory(ply: number) {
    const history = this.instance.history({ verbose: true })

    const historyIndex = ply - this.startPly

    if (historyIndex === history.length) {
      // we returned to our current position
      if (this.state.viewHistoryState.isEnabled) {
        const lastMove = history.at(-1) as Move

        this.boardApi.set({
          viewOnly: false,
          fen: lastMove.after,
          lastMove: [lastMove.from, lastMove.to]
        })

        this.state.viewHistoryState = { isEnabled: false }

        this.emit('positionChange', lastMove.after)
        this.update()
      }
    } else {
      if (!this.state.viewHistoryState.isEnabled) {
        this.state.viewHistoryState = {
          isEnabled: true,
          viewingPly: ply
        }
        if (this.state.promotionDialogState.isEnabled) {
          this.state.promotionDialogState.cancel()
          this.state.promotionDialogState = { isEnabled: false }
        }
      } else {
        this.state.viewHistoryState.viewingPly = ply
      }

      this.boardApi.set({
        // TODO: this should rather restore the old state of viewOnly before the user started viewing the history
        viewOnly: true,
        fen: history[historyIndex].before,
        lastMove:
          historyIndex > 0
            ? [history[historyIndex - 1].from, history[historyIndex - 1].to]
            : undefined
      })
      this.emit('positionChange', history[historyIndex].before)

      const isMoveChecking = (move: Move) => {
        const lastSymbol = move.san.at(-1)
        return lastSymbol === '#' || lastSymbol === '+'
      }

      const inCheck =
        historyIndex > 0
          ? isMoveChecking(history[historyIndex - 1])
          : new Chess(history[historyIndex].before).isCheck()

      if (inCheck) {
        for (const [key, piece] of this.boardApi.state.pieces) {
          if (piece.role === 'king' && piece.color[0] === history[historyIndex].color) {
            this.boardApi.state.check = key
            break
          }
        }
      } else {
        this.boardApi.state.check = undefined
      }
    }
  }

  viewStart() {
    this.viewHistory(0)
  }

  stopViewing() {
    if (this.state.viewHistoryState.isEnabled) {
      this.viewHistory(this.getCurrentPly())
    }
  }

  viewNext() {
    if (this.state.viewHistoryState.isEnabled) {
      this.viewHistory(this.state.viewHistoryState.viewingPly + 1)
    }
  }

  viewPrevious() {
    if (this.state.viewHistoryState.isEnabled) {
      this.viewHistory(this.state.viewHistoryState.viewingPly - 1)
    } else {
      this.viewHistory(this.getCurrentPly() - 1)
    }
  }
}
