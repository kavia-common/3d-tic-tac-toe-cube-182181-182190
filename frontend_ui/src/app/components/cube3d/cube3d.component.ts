import { AsyncPipe, NgClass, NgFor } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, Input, OnDestroy, OnInit, Renderer2, ViewChild } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { GameService } from '../../services/game.service';
import { CellValue } from '../../models/game.models';
import { CubeCellComponent } from './cube-cell.component';

/**
 * PUBLIC_INTERFACE
 * Cube3DComponent renders the 3x3x3 cube board using CSS 3D transforms with smooth
 * rotation and drag-driven collapse/expand interactions.
 */
@Component({
  selector: 'app-cube3d',
  standalone: true,
  imports: [NgFor, NgClass, AsyncPipe, CubeCellComponent],
  template: `
    <section class="cube-area" data-testid="cube-root">
      <div class="cube-wrapper"
           #wrapper
           [style.--gap]="collapsed ? '22px' : '70px'"
           [style.--cell-size]="collapsed ? '48px' : '64px'">
        <div class="scene"
             [ngClass]="{ 'collapsed': collapsed }"
             [style.transform]="sceneTransform">
          <div class="grid">
            <ng-container *ngFor="let cell of cells$ | async; index as i">
              <div class="cell-holder"
                   [style.transform]="cell.transform"
                   [style.zIndex]="cell.zIndex">
                <app-cube-cell
                  [value]="cell.value"
                  [winning]="cell.isWinning"
                  (select)="handleSelect(i)">
                </app-cube-cell>
              </div>
            </ng-container>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .cube-area {
      display: grid;
      place-items: center;
      perspective: 900px;
      min-height: 420px;
      width: 100%;
    }
    .cube-wrapper {
      position: relative;
      width: calc(var(--gap, 70px) * 3 + 60px);
      height: calc(var(--gap, 70px) * 3 + 60px);
      max-width: min(90vw, 560px);
      max-height: min(70vh, 560px);
      transition: width 220ms ease, height 220ms ease;
    }
    .scene {
      position: absolute;
      inset: 0;
      transform-style: preserve-3d;
      transition: transform 260ms cubic-bezier(.2,.8,.2,1);
      will-change: transform;
    }
    .scene.collapsed {
      transition: transform 160ms ease-out;
    }
    .grid {
      position: absolute;
      inset: 0;
      transform-style: preserve-3d;
    }
    .cell-holder {
      position: absolute;
      width: var(--cell-size, 64px);
      height: var(--cell-size, 64px);
      transform-style: preserve-3d;
      transition: transform 220ms ease;
      will-change: transform;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Cube3DComponent implements OnInit, OnDestroy {
  @Input() collapsed = false;
  @ViewChild('wrapper', { static: true }) wrapper!: ElementRef<HTMLElement>;

  private readonly rotationX$ = new BehaviorSubject<number>(-18);
  private readonly rotationY$ = new BehaviorSubject<number>(-25);

  private pointerActive = false;
  private lastX = 0;
  private lastY = 0;
  private rafScheduled = false;

  sceneTransform = '';

  cells$!: Observable<Array<{ value: CellValue; transform: string; isWinning: boolean; zIndex: number }>>;

  constructor(private game: GameService, private renderer: Renderer2) {}

  ngOnInit(): void {
    this.updateSceneTransform();
    this.cells$ = combineLatest([
      this.game.state$,
      this.rotationX$,
      this.rotationY$
    ]).pipe(
      map(([state]) => {
        const gap = this.collapsed ? 22 : 70;
        const items: Array<{ value: CellValue; transform: string; isWinning: boolean; zIndex: number }> = [];
        const winning = new Set(state.winningLine || []);
        for (let z = 0; z < 3; z++) {
          for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
              const index = x + y * 3 + z * 9;
              const tx = (x - 1) * gap;
              const ty = (y - 1) * gap;
              const tz = (z - 1) * (this.collapsed ? 8 : gap); // compressed depth when collapsed
              const transform = `translate3d(${tx}px, ${ty}px, ${tz}px)`;
              const value = state.board[index];
              const isWinning = winning.has(index);
              // Paint order: larger tz should be behind
              const zIndex = Math.round(tz);
              items.push({ value, transform, isWinning, zIndex });
            }
          }
        }
        return items;
      })
    );
  }

  ngOnDestroy(): void {
    // no-op
  }

  handleSelect(index: number) {
    this.game.makeMove(index);
  }

  @HostListener('pointerdown', ['$event'])
  onPointerDown(ev: any) {
    const el = this.wrapper.nativeElement;
    el.setPointerCapture(ev.pointerId);
    this.pointerActive = true;
    this.lastX = ev.clientX;
    this.lastY = ev.clientY;
    this.collapsed = true;
  }

  @HostListener('pointermove', ['$event'])
  onPointerMove(ev: any) {
    if (!this.pointerActive) return;
    const dx = ev.clientX - this.lastX;
    const dy = ev.clientY - this.lastY;
    this.lastX = ev.clientX;
    this.lastY = ev.clientY;

    const nextY = this.rotationY$.value + dx * 0.35;
    const nextX = this.rotationX$.value - dy * 0.35;
    this.rotationY$.next(nextY);
    this.rotationX$.next(Math.max(-85, Math.min(85, nextX)));

    if (!this.rafScheduled) {
      this.rafScheduled = true;
      globalThis.requestAnimationFrame(() => {
        this.updateSceneTransform();
        this.rafScheduled = false;
      });
    }
  }

  @HostListener('pointerup', ['$event'])
  onPointerUp(ev: any) {
    if (!this.pointerActive) return;
    const el = this.wrapper.nativeElement;
    try { el.releasePointerCapture(ev.pointerId); } catch { /* ignore */ }
    this.pointerActive = false;
    // gracefully expand after drag
    globalThis.setTimeout(() => { this.collapsed = false; this.updateSceneTransform(); }, 80);
  }

  private updateSceneTransform() {
    const rx = this.rotationX$.value;
    const ry = this.rotationY$.value;
    const scale = this.collapsed ? 0.98 : 1.0;
    this.sceneTransform = `rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`;
  }
}
