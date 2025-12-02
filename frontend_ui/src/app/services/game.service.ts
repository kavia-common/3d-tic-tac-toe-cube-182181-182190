import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CellValue, GameMode, GameState, Move, Player, indexToXYZ, xyzToIndex } from '../models/game.models';

/**
 * PUBLIC_INTERFACE
 * GameService encapsulates all game logic, including board state, move handling,
 * win detection across all 3D lines, simple AI, and history/reset.
 */
@Injectable({ providedIn: 'root' })
export class GameService {
  /** Expose readonly observable-like state for OnPush components via async pipe */
  readonly state$ = new BehaviorSubject<GameState>(this.createInitialState());

  /** 3D line definitions: each line is an array of 3 board indices that form a win line */
  private readonly lines: number[][] = this.computeAllLines();

  /** Internal throttle flag for AI thinking to avoid synchronous re-entrancy */
  private aiThinking = false;

  /** Optional environment-aware log level (NG_APP_LOG_LEVEL), defaults to 'info' */
  private readonly logLevel = ((globalThis as any)['NG_APP_LOG_LEVEL'] as string) || 'info';

  // PUBLIC_INTERFACE
  reset(): void {
    /** Reset the game to initial state. */
    this.state$.next(this.createInitialState());
  }

  // PUBLIC_INTERFACE
  setMode(mode: GameMode): void {
    /** Switch between two-player (PVP) and simple AI mode. */
    const curr = this.state$.value;
    if (curr.mode !== mode) {
      this.state$.next({ ...curr, mode });
      // If switching to AI and it's AI's turn, trigger AI move.
      this.maybeTriggerAi();
    }
  }

  // PUBLIC_INTERFACE
  makeMove(index: number): boolean {
    /**
     * Attempts to make a move at the given index for the current player.
     * Returns true if the move was applied, false if invalid or game over.
     */
    const curr = this.state$.value;
    if (curr.gameOver || index < 0 || index >= 27 || curr.board[index]) {
      return false;
    }

    const board = curr.board.slice();
    const player = curr.currentPlayer;
    board[index] = player;

    const move: Move = { index, player, ...indexToXYZ(index) };
    const moves = curr.moves.concat(move);

    const { winner, winningLine } = this.detectWinner(board);

    const nextPlayer: Player = player === 'X' ? 'O' : 'X';
    const nextState: GameState = {
      ...curr,
      board,
      moves,
      winner,
      winningLine,
      gameOver: !!winner || board.every((c) => !!c),
      currentPlayer: winner ? curr.currentPlayer : nextPlayer,
    };

    this.state$.next(nextState);

    // If it's AI mode and AI's turn, trigger AI thinking after a brief timeout for smooth UI.
    this.maybeTriggerAi();

    return true;
    }

  // PUBLIC_INTERFACE
  undo(): void {
    /** Undo the last move if available and the game is not over (simple single-step undo). */
    const curr = this.state$.value;
    if (curr.moves.length === 0 || curr.gameOver) return;

    const last = curr.moves[curr.moves.length - 1];
    const board = curr.board.slice();
    board[last.index] = null;

    const moves = curr.moves.slice(0, -1);
    const nextPlayer: Player = last.player; // It's the same player who played last
    const { winner, winningLine } = this.detectWinner(board);

    this.state$.next({
      ...curr,
      board,
      moves,
      currentPlayer: nextPlayer,
      winner,
      winningLine,
      gameOver: !!winner || board.every((c) => !!c),
    });
  }

  /** Simple AI: pick center if available, else first empty cell; kept intentionally simple for demo purposes. */
  private aiMove(): void {
    const curr = this.state$.value;
    if (curr.gameOver || curr.currentPlayer !== 'O' || curr.mode !== 'AI') return;

    const emptyIndices = curr.board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    if (emptyIndices.length === 0) return;

    // Prefer center (1,1,1) == index 13, else choose first empty.
    const preferred = 13;
    const pick = emptyIndices.includes(preferred) ? preferred : emptyIndices[0];

    // Apply move
    this.makeMove(pick);
  }

  private maybeTriggerAi(): void {
    const curr = this.state$.value;
    if (curr.mode === 'AI' && curr.currentPlayer === 'O' && !curr.gameOver && !this.aiThinking) {
      this.aiThinking = true;
      globalThis.setTimeout(() => {
        try {
          this.aiMove();
        } finally {
          this.aiThinking = false;
        }
      }, 220); // small delay to feel natural
    }
  }

  private createInitialState(): GameState {
    return {
      board: Array<CellValue>(27).fill(null),
      currentPlayer: 'X',
      moves: [],
      winner: null,
      winningLine: null,
      gameOver: false,
      mode: 'PVP',
    };
  }

  /** Checks for a winner in the given board. */
  private detectWinner(board: CellValue[]): { winner: Player | null; winningLine: number[] | null } {
    for (const line of this.lines) {
      const [a, b, c] = line;
      const va = board[a];
      if (va && va === board[b] && va === board[c]) {
        this.debug(`Winner ${va} on line ${line.join(',')}`);
        return { winner: va, winningLine: line };
      }
    }
    return { winner: null, winningLine: null };
  }

  /** Precompute all 49 winning lines in a 3x3x3 cube. */
  private computeAllLines(): number[][] {
    const lines: number[][] = [];

    // Rows along X (for fixed y,z)
    for (let y = 0; y < 3; y++) {
      for (let z = 0; z < 3; z++) {
        const line: number[] = [];
        for (let x = 0; x < 3; x++) line.push(xyzToIndex(x, y, z));
        lines.push(line);
      }
    }

    // Columns along Y (for fixed x,z)
    for (let x = 0; x < 3; x++) {
      for (let z = 0; z < 3; z++) {
        const line: number[] = [];
        for (let y = 0; y < 3; y++) line.push(xyzToIndex(x, y, z));
        lines.push(line);
      }
    }

    // Pillars along Z (for fixed x,y)
    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 3; y++) {
        const line: number[] = [];
        for (let z = 0; z < 3; z++) line.push(xyzToIndex(x, y, z));
        lines.push(line);
      }
    }

    // Face diagonals on XY planes (for z fixed)
    for (let z = 0; z < 3; z++) {
      lines.push([xyzToIndex(0, 0, z), xyzToIndex(1, 1, z), xyzToIndex(2, 2, z)]);
      lines.push([xyzToIndex(0, 2, z), xyzToIndex(1, 1, z), xyzToIndex(2, 0, z)]);
    }

    // Face diagonals on XZ planes (for y fixed)
    for (let y = 0; y < 3; y++) {
      lines.push([xyzToIndex(0, y, 0), xyzToIndex(1, y, 1), xyzToIndex(2, y, 2)]);
      lines.push([xyzToIndex(0, y, 2), xyzToIndex(1, y, 1), xyzToIndex(2, y, 0)]);
    }

    // Face diagonals on YZ planes (for x fixed)
    for (let x = 0; x < 3; x++) {
      lines.push([xyzToIndex(x, 0, 0), xyzToIndex(x, 1, 1), xyzToIndex(x, 2, 2)]);
      lines.push([xyzToIndex(x, 0, 2), xyzToIndex(x, 1, 1), xyzToIndex(x, 2, 0)]);
    }

    // Space diagonals
    lines.push([xyzToIndex(0, 0, 0), xyzToIndex(1, 1, 1), xyzToIndex(2, 2, 2)]);
    lines.push([xyzToIndex(0, 0, 2), xyzToIndex(1, 1, 1), xyzToIndex(2, 2, 0)]);
    lines.push([xyzToIndex(0, 2, 0), xyzToIndex(1, 1, 1), xyzToIndex(2, 0, 2)]);
    lines.push([xyzToIndex(2, 0, 0), xyzToIndex(1, 1, 1), xyzToIndex(0, 2, 2)]);

    return lines;
  }

  private debug(message: string) {
    if (this.logLevel === 'debug') {
      console.debug(`[GameService] ${message}`);
    }
  }
}
