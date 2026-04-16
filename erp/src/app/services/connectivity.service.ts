import { Injectable, signal, NgZone } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConnectivityService {
  private _isOffline = signal<boolean>(!navigator.onLine);
  private _showReconnectButton = signal<boolean>(false);
  private _message = signal<string>('Sin conexión a internet. Reintentando...');

  isOffline = this._isOffline.asReadonly();
  showReconnectButton = this._showReconnectButton.asReadonly();
  message = this._message.asReadonly();

  onRetryManual = new Subject<void>();

  constructor(private ngZone: NgZone) {
    
    window.addEventListener('online', () => {
      this.ngZone.run(() => {
        this.setOffline(false);
      });
    });

    window.addEventListener('offline', () => {
      this.ngZone.run(() => {
        this.setOffline(true, 'Se ha perdido la conexión a internet.');
        this.setShowReconnect(true); 
      });
    });
  }

  setOffline(offline: boolean, msg: string = 'Sin conexión a internet. Reintentando...') {
    this._isOffline.set(offline);
    this._message.set(msg);
    if (!offline) {
        this._showReconnectButton.set(false);
    }
  }

  setShowReconnect(show: boolean) {
    this._showReconnectButton.set(show);
    if (show) {
        this._message.set('No se pudo restablecer la conexión.');
    }
  }

  retry() {
    if (navigator.onLine) {
        this.setOffline(false);
        window.location.reload();
    } else {
        this._message.set('Sigues sin conexión. Por favor verifica tu internet.');
    }
  }
}
