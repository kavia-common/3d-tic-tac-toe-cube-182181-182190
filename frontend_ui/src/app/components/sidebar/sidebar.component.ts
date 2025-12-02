import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GameService } from '../../services/game.service';
import { GameMode, GameState } from '../../models/game.models';

/**
 * PUBLIC_INTERFACE
 * SidebarComponent renders move history and game controls (mode switch, reset, undo).
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [NgIf, NgFor, AsyncPipe],
  template: `
    <aside class="sidebar">
      <div class="panel">
        <h2>Game</h2>
        <div class="row">
          <button class="btn primary" (click)="reset()">New game</button>
          <button class="btn subtle" (click)="undo()">Undo</button>
        </div>

        <div class="row mode">
          <span>Mode:</span>
          <button class="btn toggle"
                  [class.active]="isPvp$ | async"
                  (click)="setMode('PVP')">Two Players</button>
          <button class="btn toggle"
                  [class.active]="isAi$ | async"
                  (click)="setMode('AI')">Vs AI</button>
        </div>

        <div class="status" *ngIf="(state$ | async) as s">
          <div *ngIf="!s.gameOver" class="badge">Turn: <strong [class.x]="s.currentPlayer==='X'" [class.o]="s.currentPlayer==='O'">{{ s.currentPlayer }}</strong></div>
          <div *ngIf="s.gameOver && s.winner" class="badge win">Winner: <strong>{{ s.winner }}</strong></div>
          <div *ngIf="s.gameOver && !s.winner" class="badge draw">Draw</div>
        </div>
      </div>

      <div class="panel">
        <h3>Move history</h3>
        <ol class="history" *ngIf="(state$ | async) as s; else noMoves">
          <li *ngFor="let m of s.moves; index as i">
            <span class="index">#{{ i + 1 }}</span>
            <span class="player" [class.x]="m.player==='X'" [class.o]="m.player==='O'">{{ m.player }}</span>
            <span class="pos">(x: {{ m.x+1 }}, y: {{ m.y+1 }}, z: {{ m.z+1 }})</span>
          </li>
        </ol>
        <ng-template #noMoves>
          <p class="muted">No moves yet.</p>
        </ng-template>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      display: grid;
      gap: 16px;
      width: 100%;
    }
    .panel {
      background: var(--surface, #ffffff);
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
    }
    h2, h3 {
      margin-bottom: 12px;
      color: var(--text, #111827);
    }
    .row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }
    .mode {
      align-items: center;
    }
    .btn {
      border: none;
      border-radius: 10px;
      padding: 8px 12px;
      cursor: pointer;
      background: #e5e7eb;
      color: #111827;
      transition: transform 120ms ease, background 120ms ease, box-shadow 120ms ease;
    }
    .btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 12px rgba(0,0,0,0.08);
    }
    .btn.primary {
      background: var(--primary, #2563EB);
      color: white;
    }
    .btn.subtle {
      background: #f3f4f6;
      color: #111827;
    }
    .btn.toggle {
      background: #eef2ff;
      color: #1e40af;
    }
    .btn.toggle.active {
      background: #dbeafe;
      box-shadow: 0 0 0 2px #93c5fd inset;
    }

    .badge {
      margin-top: 8px;
      display: inline-block;
      background: #eef2ff;
      color: #1e3a8a;
      padding: 6px 10px;
      border-radius: 9999px;
      font-weight: 600;
    }
    .badge.win {
      background: #fff7ed;
      color: #9a3412;
    }
    .badge.draw {
      background: #e5e7eb;
      color: #374151;
    }
    .player.x { color: var(--primary, #2563EB); font-weight: 700; }
    .player.o { color: var(--secondary, #F59E0B); font-weight: 700; }

    .history {
      list-style: none;
      display: grid;
      gap: 6px;
      padding-left: 0;
    }
    .history li {
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 6px 8px;
      border-radius: 10px;
      background: #f9fafb;
    }
    .index {
      min-width: 2rem;
      text-align: right;
      color: #6b7280;
    }
    .pos {
      color: #4b5563;
      font-size: .95rem;
    }
    .muted { color: #6b7280; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  readonly state$: Observable<GameState>;
  readonly mode$: Observable<GameMode>;
  readonly isPvp$: Observable<boolean>;
  readonly isAi$: Observable<boolean>;

  constructor(private game: GameService) {
    // Initialize observable properties after DI parameter is assigned to avoid TS2729.
    this.state$ = this.game.state$.asObservable();
    this.mode$ = this.state$.pipe(map((s) => s.mode));
    this.isPvp$ = this.mode$.pipe(map((m) => m === 'PVP'));
    this.isAi$ = this.mode$.pipe(map((m) => m === 'AI'));
  }

  // PUBLIC_INTERFACE
  /** Trigger a full game reset. */
  reset() { this.game.reset(); }
  // PUBLIC_INTERFACE
  /** Undo the last move, if any. */
  undo() { this.game.undo(); }
  // PUBLIC_INTERFACE
  /** Switch game mode between PVP and AI. */
  setMode(mode: GameMode) { this.game.setMode(mode); }
}
