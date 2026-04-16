import { Injectable, inject, OnDestroy } from '@angular/core';
import { AuthService } from './auth.service';
import { GroupService } from './group.service';
import { interval, Subscription, startWith, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PermissionService implements OnDestroy {
  private authService = inject(AuthService);
  private groupService = inject(GroupService);

  private localPermissions: string[] = [];
  private currentGroupId: string | null = null;
  private pollingSub?: Subscription;

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
   * Activa el refresco constante de permisos para un grupo.
   * "Tipo WS": Se ejecuta cada 15 segundos para asegurar que la seguridad esté al día.
   */
  async refreshPermissionsForGroup(groupId: string): Promise<void> {
    this.currentGroupId = groupId;
    this.stopPolling(); // Limpiar si había uno previo

    console.log(`[PermissionService] Iniciando monitoreo constante para el grupo: ${groupId}`);
    
    // Iniciamos el muestreo constante (Polling) cada 15 segundos
    this.pollingSub = interval(15000)
      .pipe(
        startWith(0), // Ejecutar inmediatamente al inicio
        switchMap(() => this.groupService.getMyPermissions(groupId))
      )
      .subscribe({
        next: (res) => {
          if (res.statusCode === 200 && res.data) {
            // Solo actualizamos si hay cambios para no disparar re-renderizados innecesarios
            if (JSON.stringify(this.localPermissions) !== JSON.stringify(res.data)) {
              this.localPermissions = res.data;
              console.log('[PermissionService] Permisos actualizados en vivo:', this.localPermissions);
            }
          }
        },
        error: (err) => console.error('[PermissionService] Error en monitoreo en vivo:', err)
      });
  }

  /**
   * Detiene el monitoreo (útil al salir de un room)
   */
  stopPolling(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = undefined;
    }
  }

  /**
   * Limpia los permisos locales y detiene el monitoreo
   */
  clearLocalPermissions(): void {
    this.stopPolling();
    this.localPermissions = [];
    this.currentGroupId = null;
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }
}
