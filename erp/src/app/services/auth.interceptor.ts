import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, retry, timer, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { ConnectivityService } from './connectivity.service';
import { PermissionService } from './permission.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const connectivityService = inject(ConnectivityService);
  const permissionService = inject(PermissionService);
  
  const token = authService.getToken();
  const isPublicRoute = req.url.includes('/auth/login') || req.url.includes('/auth/register');

  let authReq = req;
  if (token && !isPublicRoute) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    retry({
        count: 2,
        delay: (error, retryCount) => {
            
            if (error.status === 0) {
                connectivityService.setOffline(true, `Sin conexión. Reintento ${retryCount}/2 en 5 segundos...`);
                return timer(5000);
            }
            throw error;
        }
    }),
    tap(() => {
        
        if (connectivityService.isOffline()) {
            connectivityService.setOffline(false);
        }
    }),
    catchError((error: HttpErrorResponse) => {
      if (error.status === 0) {
        console.error('[Network Error] No se pudo conectar al servidor.');
        connectivityService.setOffline(true);
        connectivityService.setShowReconnect(true);
      } else if (error.status === 401) {
        
        console.warn('[Interceptor] Sesión expirada o inválida (401). Redirigiendo...');
        authService.logout();
        router.navigate(['/login']);
      } else if (error.status === 403) {
        
        console.warn('[Interceptor] Permiso denegado (403). Forzando refresco...');
        permissionService.forceRefresh();
      } else if (error.status === 500) {
        console.error('[Interceptor] Error interno del Gateway (500).');
      }
      
      return throwError(() => error);
    })
  );
};
