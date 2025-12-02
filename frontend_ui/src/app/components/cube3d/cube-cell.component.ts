import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CellValue } from '../../models/game.models';

@Component({
  selector: 'app-cube-cell',
  standalone: true,
  template: `
    <div
      class="cell"
      [class.occupied-x]="value === 'X'"
      [class.occupied-o]="value === 'O'"
      [class.winning]="winning"
      [attr.aria-label]="ariaLabel"
      tabindex="0"
      (click)="onSelect()"
      (keydown.enter)="onSelect()"
      (keydown.space)="onSelect()"
    >
      <span class="mark" [class.mark-x]="value === 'X'" [class.mark-o]="value === 'O'">
        {{ value || '' }}
      </span>
    </div>
  `,
  styles: [`
    .cell {
      width: var(--cell-size, 64px);
      height: var(--cell-size, 64px);
      border-radius: 12px;
      background: var(--surface, #ffffff);
      box-shadow: 0 6px 18px rgba(0,0,0,0.08);
      display: grid;
      place-items: center;
      cursor: pointer;
      user-select: none;
      transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease, opacity 220ms ease;
      outline: 2px solid transparent;
      outline-offset: 2px;
      will-change: transform, opacity;
    }
    .cell:focus {
      outline-color: var(--primary, #2563EB);
    }
    .cell:hover {
      transform: translateZ(6px) scale(1.03);
      box-shadow: 0 12px 24px rgba(0,0,0,0.12);
    }
    .mark {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text, #111827);
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
    }
    .mark-x { color: var(--primary, #2563EB); }
    .mark-o { color: var(--secondary, #F59E0B); }
    .winning {
      box-shadow: 0 0 0 3px var(--secondary, #F59E0B), 0 10px 30px rgba(0,0,0,0.18);
    }
    .occupied-x { background: #eff6ff; }
    .occupied-o { background: #fff7ed; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CubeCellComponent {
  @Input() value: CellValue = null;
  @Input() winning: boolean = false;
  @Output() select = new EventEmitter<void>();

  get ariaLabel(): string {
    return this.value ? `Cell with ${this.value}` : 'Empty cell';
  }

  onSelect() {
    this.select.emit();
  }
}
