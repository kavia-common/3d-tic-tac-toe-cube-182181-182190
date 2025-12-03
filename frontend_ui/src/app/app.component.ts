import { Component, inject } from '@angular/core';
import { environment } from '../environments/environment';

// PUBLIC_INTERFACE
@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  /** This component shows basic environment values to verify build wiring. */
  apiBase = environment.API_BASE;
  backendUrl = environment.BACKEND_URL;
  frontendUrl = environment.FRONTEND_URL;
  wsUrl = environment.WS_URL;
  nodeEnv = environment.NODE_ENV;
  port = environment.PORT?.toString() ?? '';
}
