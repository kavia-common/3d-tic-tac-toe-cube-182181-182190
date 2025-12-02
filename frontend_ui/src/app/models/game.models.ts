export type Player = 'X' | 'O';
export type CellValue = Player | null;

export interface Move {
  index: number;
  player: Player;
  x: number;
  y: number;
  z: number;
}

export type GameMode = 'PVP' | 'AI';

export interface GameState {
  board: CellValue[]; // length 27
  currentPlayer: Player;
  moves: Move[];
  winner: Player | null;
  winningLine: number[] | null;
  gameOver: boolean;
  mode: GameMode;
}

// Utility mapping helpers
export function indexToXYZ(index: number): { x: number; y: number; z: number } {
  const z = Math.floor(index / 9);
  const y = Math.floor((index % 9) / 3);
  const x = index % 3;
  return { x, y, z };
}

export function xyzToIndex(x: number, y: number, z: number): number {
  return x + y * 3 + z * 9;
}
