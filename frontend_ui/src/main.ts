import { bootstrapApplication } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { enableProdMode } from '@angular/core';
import { environment } from './environments/environment';

// Simple standalone root component
@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app/app.component.html',
  styleUrls: ['./app/app.component.css']
})
export class AppComponent {}

// Enable prod optimizations if not development
if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent).catch(err => console.error(err));
