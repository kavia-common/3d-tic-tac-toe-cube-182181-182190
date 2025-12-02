import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cube3DComponent } from './components/cube3d/cube3d.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { GameService } from './services/game.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, Cube3DComponent, SidebarComponent],
  templateUrl: './app.component.html',
  // Use styleUrls for broad compatibility across Angular tooling and versions.
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = '3D Tic Tac Toe';
  autoRotate = false;

  constructor(public game: GameService) {}

  // PUBLIC_INTERFACE
  /** Toggle auto-rotation of the 3D cube to verify depth and perspective. */
  toggleAutoRotate(): void {
    this.autoRotate = !this.autoRotate;
  }
}
