import { Directive, Input, TemplateRef, ViewContainerRef, inject, OnInit, OnDestroy } from '@angular/core';
import { PermissionService } from '../services/permission.service';
import { Subscription } from 'rxjs';

@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  private permissionService = inject(PermissionService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);

  private permissionValue: string = '';
  private sub?: Subscription;

  @Input() set appHasPermission(permission: string) {
    this.permissionValue = permission;
    this.updateView();
  }

  ngOnInit(): void {

    this.sub = this.permissionService.permissions$.subscribe(() => {
      this.updateView();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private updateView(): void {
    this.viewContainer.clear();
    const permission = this.permissionValue;

    if (!permission) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        return;
    }


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
