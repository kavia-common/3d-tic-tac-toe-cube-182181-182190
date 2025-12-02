import { AsyncPipe, NgClass, NgFor } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
  ChangeDetectorRef,
} from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { GameService } from '../../services/game.service';
import { CellValue } from '../../models/game.models';
import { CubeCellComponent } from './cube-cell.component';

/**
 * PUBLIC_INTERFACE
 * Cube3DComponent renders the 3x3x3 cube board using CSS 3D transforms with smooth
 * rotation and drag-driven collapse/expand interactions.
 *
 * Responsiveness:
 * - Uses clamp() for --gap and --cell-size to scale across breakpoints.
 * - Wrapper uses aspect-ratio to maintain a square container and centers within available width.
 *
 * Performance:
 * - requestAnimationFrame batching for pointermove updates.
 * - will-change hints and GPU-friendly transforms.
 * - touch-action: none to ensure smooth pointer interactions on mobile.
 *
 * 3D rendering notes:
 * - Perspective is applied on .cube-area
 * - preserve-3d is ensured on all transform containers (.scene, .grid, .cube-wrapper)
 * - Removed paint containment that could flatten 3D context or clip depth
 * - Depth ordering is handled via 3D transform, not manual z-index
 */
@Component({
  selector: 'app-cube3d',
  standalone: true,
  imports: [NgFor, NgClass, AsyncPipe, CubeCellComponent],
  template: `
    <section class="cube-area" data-testid="cube-root" aria-label="3D cube game board">
      <div
        class="cube-wrapper"
        #wrapper
        [style.--gap]="collapsed ? 'clamp(16px, 6vw, 32px)' : 'clamp(24px, 7.5vw, 70px)'"
        [style.--cell-size]="collapsed ? 'clamp(38px, 14vw, 56px)' : 'clamp(42px, 16vw, 64px)'"
      >
        <div class="scene" [ngClass]="{ 'collapsed': collapsed }" [style.transform]="sceneTransform">
          <div class="grid">
            <ng-container *ngFor="let cell of cells$ | async; index as i">
              <div
                class="cell-holder"
                [style.transform]="cell.transform"
              >
                <app-cube-cell
                  [value]="cell.value"
                  [winning]="cell.isWinning"
                  (select)="handleSelect(i)"
                >
                </app-cube-cell>
              </div>
            </ng-container>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
    :host { display: block; }

    .cube-area {
      display: grid;
      place-items: center;
      perspective: 1100px;
      perspective-origin: 50% 50%;
      width: 100%;
      padding: 10px;
      /* Prevent scroll conflicts during drag on touch devices */
      touch-action: none;
      user-select: none;

      /* Light gradient background for contrast with white cells */
      background: radial-gradient(600px 400px at 50% -10%, rgba(37, 99, 235, 0.06), rgba(249, 250, 251, 0));
      border-radius: 16px;
      overflow: visible;
    }

    .cube-wrapper {
      position: relative;
      width: min(100%, 560px);
      /* Maintain square area regardless of container flow */
      aspect-ratio: 1 / 1;
      height: auto;
      min-width: 260px;
      min-height: 260px;
      overflow: visible;

      /* IMPORTANT: Ensure 3D is preserved through wrapper */
      transform-style: preserve-3d;

      /* Avoid paint/layout containment that can flatten perspective or clip */
      /* contain: layout paint size;  -- REMOVED to avoid 3D flattening/clipping */

      will-change: transform, width, height;
      transition: width 220ms ease, height 220ms ease;
    }

    .scene {
      position: absolute;
      inset: 0;
      transform-style: preserve-3d;
      transform-origin: 50% 50%;
      transition: transform 260ms cubic-bezier(.2,.8,.2,1);
      will-change: transform;
      /* Slight drop shadow for depth perception */
      filter: drop-shadow(0 20px 30px rgba(0,0,0,0.08));
    }
    .scene.collapsed {
      transition: transform 160ms ease-out;
    }

    .grid {
      position: absolute;
      inset: 0;
      transform-style: preserve-3d;
      /* Center the 3D grid so +/- translations are evenly distributed around center */
      left: 50%;
      top: 50%;
      transform: translate3d(-50%, -50%, 0);
      will-change: transform;
      pointer-events: none; /* let individual cells handle interactions */
    }

    .cell-holder {
      position: absolute;
      width: var(--cell-size, 64px);
      height: var(--cell-size, 64px);
      transform-style: preserve-3d;
      transition: transform 200ms ease;
      will-change: transform;
      pointer-events: auto;
      backface-visibility: hidden;
    }

    @media (max-width: 480px) {
      .cube-area {
        padding: 8px;
      }
      .cube-wrapper {
        min-width: 220px;
        min-height: 220px;
      }
    }
  `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cube3DComponent implements OnInit, OnDestroy {
  private _collapsed = false;

  // PUBLIC_INTERFACE
  @Input()
  set collapsed(val: boolean) {
    this._collapsed = !!val;
    this.collapsed$.next(this._collapsed);
    this.updateSceneTransform();
    this.cdr.markForCheck();
  }
  get collapsed() {
    return this._collapsed;
  }

  // PUBLIC_INTERFACE
  /** Enable/disable auto-rotation to verify 3D depth visually. */
  @Input()
  set autoRotate(val: boolean) {
    const next = !!val;
    if (next === this.autoRotate$.value) return;
    this.autoRotate$.next(next);
    if (next) {
      this.startAutoRotate();
    } else {
      this.stopAutoRotate();
    }
  }
  get autoRotate(): boolean {
    return this.autoRotate$.value;
  }

  @ViewChild('wrapper', { static: true }) wrapper!: ElementRef<HTMLElement>;

  private readonly rotationX$ = new BehaviorSubject<number>(-18);
  private readonly rotationY$ = new BehaviorSubject<number>(-25);
  private readonly collapsed$ = new BehaviorSubject<boolean>(this._collapsed);
  private readonly autoRotate$ = new BehaviorSubject<boolean>(false);

  private pointerActive = false;
  private lastX = 0;
  private lastY = 0;
  private rafScheduled = false;
  private autoRotateRaf: number | null = null;

  sceneTransform = '';

  cells$!: Observable<
    Array<{ value: CellValue; transform: string; isWinning: boolean }>
  >;

  constructor(private game: GameService, private renderer: Renderer2, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.updateSceneTransform();
    // Recompute the absolute positions when state or collapsed toggles (gap/depth changes).
    this.cells$ = combineLatest([this.game.state$, this.collapsed$]).pipe(
      map(([state, collapsed]) => {
        // Gap controls spacing; when collapsed we reduce spacing and depth, but still keep depth visible.
        const gap = collapsed ? 32 /* compact spacing */ : 70; // matches theme token defaults
        const depth = collapsed ? Math.max(24, Math.round(gap * 0.6)) : gap; // keep depth visible even when collapsed

        const items: Array<{
          value: CellValue;
          transform: string;
          isWinning: boolean;
        }> = [];
        const winning = new Set(state.winningLine || []);
        for (let z = 0; z < 3; z++) {
          for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
              const index = x + y * 3 + z * 9;
              const tx = (x - 1) * gap;
              const ty = (y - 1) * gap;
              const tz = (z - 1) * depth;
              const transform = `translate3d(${tx}px, ${ty}px, ${tz}px)`;
              const value = state.board[index];
              const isWinning = winning.has(index);
              items.push({ value, transform, isWinning });
            }
          }
        }
        return items;
      })
    );
  }

  ngOnDestroy(): void {
    this.rotationX$.complete();
    this.rotationY$.complete();
    this.collapsed$.complete();
    this.autoRotate$.complete();
    this.stopAutoRotate();
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
    // Pause auto-rotation during manual interaction
    if (this.autoRotate) this.stopAutoRotate();
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
      // Batch DOM write for transform update
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
    try {
      el.releasePointerCapture(ev.pointerId);
    } catch {
      /* ignore */
    }
    this.pointerActive = false;
    // gracefully expand after drag
    globalThis.setTimeout(() => {
      this.collapsed = false;
      this.updateSceneTransform();
      // Resume auto-rotation if it was enabled
      if (this.autoRotate$.value) this.startAutoRotate();
    }, 80);
  }

  @HostListener('pointercancel', ['$event'])
  onPointerCancel(ev: any) {
    if (!this.pointerActive) return;
    try {
      this.wrapper.nativeElement.releasePointerCapture(ev.pointerId);
    } catch {
      /* ignore */
    }
    this.pointerActive = false;
    this.collapsed = false;
    this.updateSceneTransform();
    if (this.autoRotate$.value) this.startAutoRotate();
  }

  private updateSceneTransform() {
    const rx = this.rotationX$.value;
    const ry = this.rotationY$.value;
    const scale = this.collapsed ? 0.98 : 1.0;
    // Use translateZ to hint GPU acceleration path
    this.sceneTransform = `translateZ(0) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`;
    this.cdr.markForCheck();
  }

  private startAutoRotate() {
    if (this.autoRotateRaf != null) return;
    const tick = () => {
      // Slow, steady rotation to demonstrate depth
      const nextY = this.rotationY$.value + 0.25;
      this.rotationY$.next(nextY);
      this.updateSceneTransform();
      this.autoRotateRaf = globalThis.requestAnimationFrame(tick);
    };
    this.autoRotateRaf = globalThis.requestAnimationFrame(tick);
  }

  private stopAutoRotate() {
    if (this.autoRotateRaf != null) {
      globalThis.cancelAnimationFrame(this.autoRotateRaf);
      this.autoRotateRaf = null;
    }
  }
}
