import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();
  const isPublicRoute = req.url.includes('/auth/login') || req.url.includes('/auth/register');

  // Clonamos la petición para añadir el encabezado de Authorization si el token existe y no es una ruta pública
  let authReq = req;
  if (token && !isPublicRoute) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Manejo global de errores (401: No autorizado, 403: Prohibido)
      if (error.status === 401 || error.status === 403) {
        console.warn('Sesión expirada o sin permisos. Redirigiendo al login...');
        authService.logout();
        router.navigate(['/login']);
      }
      
      // Retornamos el error para que el componente que hizo la petición también pueda manejarlo si es necesario
      return throwError(() => error);
    })
  );
};
