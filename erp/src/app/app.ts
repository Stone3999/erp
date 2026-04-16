import { Component, signal, inject, OnInit, NgZone } from '@angular/core';
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
export class App implements OnInit {
  protected readonly title = signal('erp');
  public loadingService = inject(LoadingService);
  public connectivityService = inject(ConnectivityService);
  
  
  showOfflineModal = false;

  constructor() {}

  ngOnInit() {
    
    
    import('rxjs').then(({ interval }) => {
        interval(500).subscribe(() => {
            this.showOfflineModal = this.connectivityService.isOffline();
        });
    });
  }

  reconnect() {
    this.connectivityService.retry();
  }
}
