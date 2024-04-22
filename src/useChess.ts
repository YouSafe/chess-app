import type { DrawShape } from 'chessground/draw'
import { ref, shallowRef, type Ref, readonly } from 'vue'
import type { Color, Dests, Key } from 'chessground/types'
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

export interface ChessState {
  start: {
    fen: string
    ply: number
  }
  current: {
    fen: string
    pgn: string
    ply: number
    history: Move[]
    turnColor: Color
    playerColor: Color | undefined
  }
  viewing: {
    promotionDialog: PromotionDialogState
    ply: number
    fen: string
    legalMoves: Dests
    autoShapes: DrawShape[]
    orientation: Color
    check: Key | undefined
    turnColor: Color
  }
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
    this.promotionCanceled()

    // TODO: remove the selection and premove

    this.position.loadPgn(pgn)

    const history = this.position.history({ verbose: true })
    const startPly =
      fullMovesToGamePly(fromShortColor(this.position.turn()), this.position.moveNumber()) -
      history.length
    const fen = this.position.fen()
    const startFen = history.at(0)?.before || fen

    this.state.value = {
      start: {
        fen: startFen,
        ply: startPly
      },
      current: {
        fen: fen,
        pgn: this.position.pgn(),
        history: history,
        playerColor: this.state.value.current.playerColor,
        ply: startPly + history.length,
        turnColor: fromShortColor(this.position.turn())
      },
      viewing: {
        fen: startFen,
        autoShapes: [],
        orientation: this.state.value.viewing.orientation,
        check: kingCheckSquare(this.position, fromShortColor(this.position.turn())),
        legalMoves: legalMoves(this.position),
        ply: startPly,
        promotionDialog: { isEnabled: false },
        turnColor: fromShortColor(this.position.turn())
      }
    }
  }

  setPlayerColor(color: Color | undefined) {
    this.state.value.current.playerColor = color
  }

  async move(move: Move) {
    if (
      this.state.value.current.playerColor === undefined &&
      this.state.value.current.ply !== this.state.value.viewing.ply
    ) {
      this.trimMoves()
    } else {
      this.viewCurrent()
    }

    const piece = this.position.get(move.from as Square)
    const promotionFile = piece.color === 'w' ? '8' : '1'

    let promotion: Promotion | undefined = undefined
    if (piece?.type === 'p' && move.to[1] === promotionFile) {
      try {
        promotion = await new Promise((resolve, reject) => {
          this.state.value.viewing.promotionDialog = {
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
    this.state.value.current.fen = this.state.value.viewing.fen = this.position.fen()
    this.state.value.current.pgn = this.position.pgn()
    this.state.value.current.history = this.position.history({ verbose: true })
    this.state.value.viewing.turnColor = this.state.value.current.turnColor = fromShortColor(
      this.position.turn()
    )
    this.state.value.viewing.legalMoves = legalMoves(this.position)
    this.state.value.viewing.check = kingCheckSquare(
      this.position,
      this.state.value.viewing.turnColor
    )

    this.state.value.viewing.ply = this.state.value.current.ply = this.getCurrentPly()
  }

  toggleOrientation() {
    this.state.value.viewing.orientation = opposite(this.state.value.viewing.orientation)
  }

  setAutoShapes(shapes: DrawShape[]) {
    this.state.value.viewing.autoShapes = shapes
  }

  trimMoves() {
    const viewingPly = this.state.value.viewing.ply
    const currentPly = this.state.value.current.ply

    const toTrim = currentPly - viewingPly

    for (let i = 0; i < toTrim; i++) {
      this.position.undo()
    }

    this.state.value.current.ply = viewingPly
    this.state.value.current.pgn = this.position.pgn()
    this.state.value.current.history = this.position.history({ verbose: true })
  }

  viewStart() {
    this.viewGamePly(this.state.value.start.ply)
  }

  viewNext() {
    this.viewGamePly(this.state.value.viewing.ply + 1)
  }

  viewPrevious() {
    this.viewGamePly(this.state.value.viewing.ply - 1)
  }

  viewCurrent() {
    this.viewGamePly(this.state.value.current.ply)
  }

  viewGamePly(ply: number) {
    const history = this.position.history({ verbose: true })

    const historyIndex = ply - this.state.value.start.ply

    if (historyIndex < 0 || historyIndex > history.length) return

    const isViewingHistory = this.state.value.viewing.ply !== this.state.value.current.ply

    if (historyIndex === history.length) {
      // we returned to our current position
      if (isViewingHistory) {
        const lastMove = history.at(-1) as Move

        this.state.value.viewing.fen = lastMove.after
        this.state.value.viewing.legalMoves = legalMoves(this.position)
        this.state.value.viewing.turnColor = fromShortColor(this.position.turn())
        this.state.value.viewing.check = kingCheckSquare(
          this.position,
          this.state.value.viewing.turnColor
        )

        this.state.value.viewing.ply = ply
      }
    } else {
      if (!isViewingHistory) {
        this.state.value.viewing.ply = ply

        this.promotionCanceled()
      } else {
        this.state.value.viewing.ply = ply
      }

      const position = new Chess(history[historyIndex].before)

      this.state.value.viewing.turnColor = history[historyIndex].color === 'w' ? 'white' : 'black'
      this.state.value.viewing.legalMoves = legalMoves(position)
      this.state.value.viewing.fen = history[historyIndex].before

      this.state.value.viewing.check = kingCheckSquare(position, this.state.value.viewing.turnColor)
    }
  }

  promotionSelected = (promotion: Promotion) => {
    if (!this.state.value.viewing.promotionDialog.isEnabled) {
      return
    }

    this.state.value.viewing.promotionDialog.callback(promotion)
    this.state.value.viewing.promotionDialog = { isEnabled: false }
  }

  promotionCanceled = () => {
    if (!this.state.value.viewing.promotionDialog.isEnabled) {
      return
    }
    this.state.value.viewing.promotionDialog.cancel()
    this.state.value.viewing.promotionDialog = { isEnabled: false }
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

  const fen = position.fen()
  const startPly = fullMovesToGamePly(fromShortColor(position.turn()), position.moveNumber())

  const state: Ref<ChessState> = ref<ChessState>({
    start: {
      fen: fen,
      ply: startPly
    },
    current: {
      fen: fen,
      pgn: position.pgn(),
      history: position.history({ verbose: true }),
      playerColor: undefined,
      ply: startPly,
      turnColor: fromShortColor(position.turn())
    },
    viewing: {
      fen: fen,
      autoShapes: [],
      orientation: 'white',
      check: kingCheckSquare(position, fromShortColor(position.turn())),
      legalMoves: legalMoves(position),
      ply: startPly,
      promotionDialog: { isEnabled: false },
      turnColor: fromShortColor(position.turn())
    }
  })
  const api = shallowRef<API>(new API(state, position))

  return {
    state: readonly(state),
    api
  }
}
