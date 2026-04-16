import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private _loading = signal<boolean>(false);

  isLoading = this._loading.asReadonly();

  setLoading(value: boolean) {
    this._loading.set(value);
  }
}
