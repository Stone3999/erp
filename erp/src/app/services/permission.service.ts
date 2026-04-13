import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private authService = inject(AuthService);

  constructor() { }

  /**
   * Verifica si el usuario actual tiene un permiso específico.
   * @param permission El permiso a verificar (ej. 'tickets:add').
   * @returns true si tiene el permiso, false en caso contrario.
   */
  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }

  /**
   * Refresca los permisos para un grupo específico.
   * Simulación para futura integración con microservicios de permisos.
   * @param groupId ID del grupo a refrescar.
   */
  refreshPermissionsForGroup(groupId: string): void {
    console.log(`[PermissionService] Refrescando permisos para el grupo: ${groupId}`);
    // Aquí se realizaría la llamada al microservicio correspondiente en el futuro.
  }
}
