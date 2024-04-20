import type { DrawShape } from 'chessground/draw'
import { ref, shallowRef, type Ref, readonly } from 'vue'
import type { Color, Key } from 'chessground/types'
import { Chess, SQUARES, type Move, type Square, type Color as ShortColor } from 'chess.js'
import { opposite } from 'chessground/util'

export const startpos = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

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

export type ViewHistoryState = { isEnabled: boolean }

export interface ChessState {
  autoShapes: DrawShape[]
  orientation: Color
  history: Move[]
  fen: string
  pgn: string
  legalMoves: Map<Key, Key[]>
  check: Key | undefined
  viewHistory: ViewHistoryState
  promotionDialog: PromotionDialogState
  turnColor: Color
  startPly: number
  viewingPly: number
  currentPly: number
}

export class API {
  private state: Ref<ChessState>
  private position: Chess

  constructor(state: Ref<ChessState>, position: Chess) {
    this.state = state
    this.position = position

    // no need to update the state since it was already initialized
    // correctly on the calling side
  }

  loadPgn(pgn: string) {
    this.position.loadPgn(pgn)
    this.state.value.fen = this.position.fen()
    this.state.value.pgn = this.position.pgn()
    this.state.value.history = this.position.history({ verbose: true })
    this.state.value.turnColor = fromShortColor(this.position.turn())
    this.state.value.legalMoves = legalMoves(this.position)
    this.state.value.viewingPly = this.state.value.currentPly = this.getCurrentPly()
    this.state.value.startPly = this.state.value.currentPly - this.position.history().length
    this.state.value.check = kingCheckSquare(this.position, this.state.value.turnColor)
  }

  setPosition(fen: string) {
    this.position.load(fen)
    this.state.value.fen = this.position.fen()
    this.state.value.pgn = this.position.pgn()
    this.state.value.history = this.position.history({ verbose: true })
    this.state.value.turnColor = fromShortColor(this.position.turn())
    this.state.value.legalMoves = legalMoves(this.position)
    this.state.value.viewingPly = this.state.value.currentPly = this.getCurrentPly()
    this.state.value.startPly = this.state.value.currentPly - this.position.history().length
    this.state.value.check = kingCheckSquare(this.position, this.state.value.turnColor)
  }

  async move(move: Move) {
    if (this.state.value.viewHistory.isEnabled) {
      this.trimMoves()
    }

    const piece = this.position.get(move.from as Square)
    const promotionFile = piece.color === 'w' ? '8' : '1'

    let promotion: Promotion | undefined = undefined
    if (piece?.type === 'p' && move.to[1] === promotionFile) {
      try {
        promotion = await new Promise((resolve, reject) => {
          this.state.value.promotionDialog = {
            isEnabled: true,
            color: fromShortColor(this.position.turn()),
            square: move.to,
            callback: resolve,
            cancel: reject
          }
        })
      } catch {
        return
      }
    }

    this.position.move({ ...move, promotion })
    this.state.value.fen = this.position.fen()
    this.state.value.pgn = this.position.pgn()
    this.state.value.history = this.position.history({ verbose: true })
    this.state.value.turnColor = fromShortColor(this.position.turn())
    this.state.value.legalMoves = legalMoves(this.position)
    this.state.value.viewingPly = this.state.value.currentPly = this.getCurrentPly()
    this.state.value.check = kingCheckSquare(this.position, this.state.value.turnColor)
  }

  toggleOrientation() {
    this.state.value.orientation = opposite(this.state.value.orientation)
  }

  setAutoShapes(shapes: DrawShape[]) {
    this.state.value.autoShapes = shapes
  }

  trimMoves() {
    const viewingPly = this.state.value.viewingPly
    const currentPly = this.state.value.currentPly

    const toTrim = currentPly - viewingPly

    for (let i = 0; i < toTrim; i++) {
      this.position.undo()
    }

    this.state.value.viewHistory = { isEnabled: false }

    this.state.value.pgn = this.position.pgn()
    this.state.value.history = this.position.history({ verbose: true })
  }

  viewStart() {
    this.viewGamePly(this.state.value.startPly)
  }

  viewNext() {
    this.viewGamePly(this.state.value.viewingPly + 1)
  }

  viewPrevious() {
    this.viewGamePly(this.state.value.viewingPly - 1)
  }

  viewCurrent() {
    this.viewGamePly(this.state.value.currentPly)
  }

  viewGamePly(ply: number) {
    const history = this.position.history({ verbose: true })

    const historyIndex = ply - this.state.value.startPly

    if (historyIndex < 0 || historyIndex > history.length) return

    if (historyIndex === history.length) {
      // we returned to our current position
      if (this.state.value.viewHistory.isEnabled) {
        const lastMove = history.at(-1) as Move

        this.state.value.fen = lastMove.after
        this.state.value.legalMoves = legalMoves(this.position)
        this.state.value.turnColor = fromShortColor(this.position.turn())
        this.state.value.check = kingCheckSquare(this.position, this.state.value.turnColor)

        this.state.value.viewHistory = { isEnabled: false }
        this.state.value.viewingPly = ply
      }
    } else {
      if (!this.state.value.viewHistory.isEnabled) {
        this.state.value.viewHistory = {
          isEnabled: true
        }
        this.state.value.viewingPly = ply

        this.promotionCanceled()
      } else {
        this.state.value.viewingPly = ply
      }

      const position = new Chess(history[historyIndex].before)

      this.state.value.turnColor = history[historyIndex].color === 'w' ? 'white' : 'black'
      this.state.value.legalMoves = legalMoves(position)
      this.state.value.fen = history[historyIndex].before

      this.state.value.check = kingCheckSquare(position, this.state.value.turnColor)
    }
  }

  promotionSelected = (promotion: Promotion) => {
    if (!this.state.value.promotionDialog.isEnabled) {
      return
    }

    this.state.value.promotionDialog.callback(promotion)
    this.state.value.promotionDialog = { isEnabled: false }
  }

  promotionCanceled = () => {
    if (!this.state.value.promotionDialog.isEnabled) {
      return
    }
    this.state.value.promotionDialog.cancel()
    this.state.value.promotionDialog = { isEnabled: false }
  }

  private getCurrentPly(): number {
    return fullMovesToGamePly(fromShortColor(this.position.turn()), this.position.moveNumber())
  }
}

function legalMoves(position: Chess): Map<Key, Key[]> {
  const dests: Map<Key, Key[]> = new Map()

  for (const square of SQUARES) {
    const moves = position.moves({ square, verbose: true })
    if (moves.length > 0) {
      dests.set(
        moves[0].from,
        moves.map((m) => m.to)
      )
    }
  }

  return dests
}

function kingCheckSquare(position: Chess, color: Color): Key | undefined {
  if (position.isCheck()) {
    for (const piece of position.board().flat()) {
      if (piece?.type === 'k' && piece?.color === color[0]) {
        return piece.square
      }
    }
  } else {
    return undefined
  }
}

function fromShortColor(color: ShortColor): Color {
  return color === 'w' ? 'white' : 'black'
}

function fullMovesToGamePly(turnColor: Color, moveNumber: number): number {
  return Math.max(2 * (moveNumber - 1), 0) + Number(turnColor === 'black')
}

export function useChess() {
  const position = new Chess()

  const startPly = fullMovesToGamePly(fromShortColor(position.turn()), position.moveNumber())

  const state: Ref<ChessState> = ref<ChessState>({
    autoShapes: [],
    orientation: 'white',
    fen: position.fen(),
    pgn: position.pgn(),
    history: position.history({ verbose: true }),
    turnColor: position.turn() === 'w' ? 'white' : 'black',
    legalMoves: legalMoves(position),
    check: kingCheckSquare(position, fromShortColor(position.turn())),
    promotionDialog: { isEnabled: false },
    viewHistory: { isEnabled: false },
    startPly: startPly,
    viewingPly: startPly,
    currentPly: startPly
  })
  const api = shallowRef<API>(new API(state, position))

  return {
    state: readonly(state),
    api
  }
}
