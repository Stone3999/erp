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

  
  hasPermission(permission: string): boolean {
    const hasGlobal = this.authService.hasPermission(permission);
    const hasLocal = this.localPermissions.includes(permission);
    
    
    if (this.authService.hasPermission('admin:all')) return true;

    return hasGlobal || hasLocal;
  }

  
  async refreshPermissionsForGroup(groupId: string): Promise<void> {
    this.currentGroupId = groupId;
    this.stopPolling(); 

    console.log(`[PermissionService] Iniciando monitoreo constante para el grupo: ${groupId}`);
    
    
    this.pollingSub = interval(5000)
      .pipe(
        startWith(0), 
        switchMap(() => this.groupService.getMyPermissions(groupId))
      )
      .subscribe({
        next: (res) => {
          this.updateLocalPermissions(res.data);
        },
        error: (err) => console.error('[PermissionService] Error en monitoreo en vivo:', err)
      });
  }

  private updateLocalPermissions(data: string[] | null): void {
    if (data && JSON.stringify(this.localPermissions) !== JSON.stringify(data)) {
        this.localPermissions = data;
        console.log('[PermissionService] Permisos actualizados en vivo:', this.localPermissions);
    }
  }

  
  async forceRefresh(): Promise<void> {
    if (this.currentGroupId) {
      const res = await this.groupService.getMyPermissions(this.currentGroupId);
      if (res.statusCode === 200) {
        this.updateLocalPermissions(res.data);
      }
    }
  }

  
  stopPolling(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = undefined;
    }
  }

  
  clearLocalPermissions(): void {
    this.stopPolling();
    this.localPermissions = [];
    this.currentGroupId = null;
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }
}
