import { Directive, Input, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { PermissionService } from '../services/permission.service';

@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective {
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private permissionService = inject(PermissionService);

  @Input() set appHasPermission(permission: string) {
    this.viewContainer.clear();
    
    // Soporte para negar el permiso con "!"
    if (permission.startsWith('!')) {
        const realPermission = permission.substring(1);
        if (!this.permissionService.hasPermission(realPermission)) {
            this.viewContainer.createEmbeddedView(this.templateRef);
        }
    } else {
        if (this.permissionService.hasPermission(permission)) {
            this.viewContainer.createEmbeddedView(this.templateRef);
        }
    }
  }
}
