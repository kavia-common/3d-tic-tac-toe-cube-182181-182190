import { TestBed } from '@angular/core/testing';
import { GameService } from './game.service';
import { xyzToIndex } from '../models/game.models';

describe('GameService', () => {
  let service: GameService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GameService]
    });
    service = TestBed.inject(GameService);
  });

  it('should create service', () => {
    expect(service).toBeTruthy();
  });

  it('should allow a valid move and toggle turn', () => {
    const initial = service.state$.value;
    expect(initial.currentPlayer).toBe('X');
    const applied = service.makeMove(0);
    expect(applied).toBeTrue();
    const after = service.state$.value;
    expect(after.board[0]).toBe('X');
    expect(after.currentPlayer).toBe('O');
  });

  it('should prevent overwriting a cell', () => {
    service.reset();
    expect(service.makeMove(0)).toBeTrue();  // X
    const overwrite = service.makeMove(0);   // O tries same cell
    expect(overwrite).toBeFalse();
  });

  it('should detect a horizontal win on z=0, y=0 for X', () => {
    service.reset();
    // X: (0,0,0)
    expect(service.makeMove(xyzToIndex(0,0,0))).toBeTrue();
    // O: some other
    service.makeMove(xyzToIndex(0,1,0));
    // X: (1,0,0)
    service.makeMove(xyzToIndex(1,0,0));
    // O: some other
    service.makeMove(xyzToIndex(1,1,0));
    // X: (2,0,0) -> win
    service.makeMove(xyzToIndex(2,0,0));
    const state = service.state$.value;
    expect(state.winner).toBe('X');
    expect(state.gameOver).toBeTrue();
    expect(state.winningLine).toEqual([
      xyzToIndex(0,0,0),
      xyzToIndex(1,0,0),
      xyzToIndex(2,0,0),
    ]);
  });

  it('should detect a space diagonal win', () => {
    service.reset();
    // X plays space diagonal (0,0,0), (1,1,1), (2,2,2)
    expect(service.makeMove(xyzToIndex(0,0,0))).toBeTrue(); // X
    service.makeMove(xyzToIndex(0,1,0)); // O elsewhere
    service.makeMove(xyzToIndex(1,1,1)); // X
    service.makeMove(xyzToIndex(0,2,0)); // O elsewhere
    service.makeMove(xyzToIndex(2,2,2)); // X -> win
    const state = service.state$.value;
    expect(state.winner).toBe('X');
    expect(state.gameOver).toBeTrue();
  });
});
