import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { GroupService } from './group.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private authService = inject(AuthService);
  private groupService = inject(GroupService);

  private localPermissions: string[] = [];

  constructor() { }

  /**
   * Verifica si el usuario actual tiene un permiso específico.
   * Checa tanto los permisos globales (JWT) como los locales del grupo actual.
   */
  hasPermission(permission: string): boolean {
    const hasGlobal = this.authService.hasPermission(permission);
    const hasLocal = this.localPermissions.includes(permission);
    
    // Super admin global siempre tiene permiso
    if (this.authService.hasPermission('admin:all')) return true;

    return hasGlobal || hasLocal;
  }

  /**
   * Refresca los permisos para un grupo específico desde el microservicio.
   */
  async refreshPermissionsForGroup(groupId: string): Promise<void> {
    console.log(`[PermissionService] Refrescando permisos para el grupo: ${groupId}`);
    const res = await this.groupService.getMyPermissions(groupId);
    if (res.statusCode === 200 && res.data) {
        this.localPermissions = res.data;
        console.log('[PermissionService] Permisos locales cargados:', this.localPermissions);
    } else {
        this.localPermissions = [];
    }
  }

  /**
   * Limpia los permisos locales (al salir de un grupo)
   */
  clearLocalPermissions(): void {
    this.localPermissions = [];
  }
}
