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

  constructor(public game: GameService) {}
}
