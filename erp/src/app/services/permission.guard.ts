import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const permissionGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    
    const requiredPermission = route.data?.['permission'];

    
    if (!requiredPermission) return true;

    
    if (authService.hasPermission(requiredPermission)) {
        return true;
    }

    
    
    router.navigate(['/dashboard']); 
    return false;
};