import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConnectivityService {
  private _isOffline = signal<boolean>(false);
  private _showReconnectButton = signal<boolean>(false);
  private _message = signal<string>('Sin conexión a internet. Reintentando...');

  isOffline = this._isOffline.asReadonly();
  showReconnectButton = this._showReconnectButton.asReadonly();
  message = this._message.asReadonly();

  // Subject para notificar que se quiere intentar reconectar manualmente
  onRetryManual = new Subject<void>();

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
    this.onRetryManual.next();
  }
}
