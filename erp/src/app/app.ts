import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LoadingService } from './services/loading.service';
import { ConnectivityService } from './services/connectivity.service';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, DialogModule, ButtonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('erp');
  public loadingService = inject(LoadingService);
  public connectivityService = inject(ConnectivityService);

  reconnect() {
    window.location.reload();
  }
}
