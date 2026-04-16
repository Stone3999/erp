import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, MenuModule, BreadcrumbModule],
    templateUrl: './main-layout.component.html',
    styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent implements OnInit, OnDestroy {
    isLoggedIn = false;

    menuItems: MenuItem[] = [];

    breadcrumbItems: MenuItem[] = [];
    homeItem: MenuItem = { icon: 'pi pi-home', routerLink: '/dashboard', label: 'Dashboard' };

    private routerSub!: Subscription;

    constructor(
        private authService: AuthService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.isLoggedIn = this.authService.isLoggedIn();
        this.buildMenu();
        this.updateBreadcrumb(this.router.url);

        this.routerSub = this.router.events
            .pipe(filter((e) => e instanceof NavigationEnd))
            .subscribe((e: any) => {
                this.isLoggedIn = this.authService.isLoggedIn();
                this.buildMenu();
                this.updateBreadcrumb(e.urlAfterRedirects ?? e.url);
            });
    }

    ngOnDestroy(): void {
        this.routerSub?.unsubscribe();
    }

    buildMenu(): void {
        const url = this.router.url;

        this.menuItems = [
            {
                label: 'Dashboard',
                icon: 'pi pi-home',
                routerLink: '/dashboard',
                styleClass: url === '/dashboard' ? 'menu-active-item' : '',
            },
        ];

        
        if (this.authService.hasPermission('groups:manage') || this.authService.hasPermission('admin:all')) {
            this.menuItems.push({
                label: 'Gestión de Rooms',
                icon: 'pi pi-users',
                routerLink: '/dashboard/grupos',
                styleClass: url.includes('/dashboard/grupos') ? 'menu-active-item' : '',
            });
        }

        
        if (this.authService.hasPermission('users:manage') || this.authService.hasPermission('admin:all')) {
            this.menuItems.push({
                label: 'Usuarios',
                icon: 'pi pi-user-edit',
                routerLink: '/dashboard/usuarios',
                styleClass: url.includes('/dashboard/usuarios') ? 'menu-active-item' : '',
            });
        }

        this.menuItems.push(
            {
                label: 'Perfil',
                icon: 'pi pi-user',
                routerLink: '/dashboard/perfil',
                styleClass: url.includes('/dashboard/perfil') ? 'menu-active-item' : '',
            },
            {
                label: 'Cerrar Sesión',
                icon: 'pi pi-power-off',
                command: () => this.logout(),
                styleClass: 'logout-menu-item'
            }
        );
    }

    updateBreadcrumb(url: string): void {
        if (url.includes('/dashboard/grupos')) {
            this.breadcrumbItems = [{ label: 'Rooms' }];
        } else if (url.includes('/dashboard/usuarios')) {
            this.breadcrumbItems = [{ label: 'Usuarios' }];
        } else if (url.includes('/dashboard/perfil')) {
            this.breadcrumbItems = [{ label: 'Perfil' }];
        } else if (url.includes('/dashboard/room')) {
            this.breadcrumbItems = [{ label: 'Room (Tickets)' }];
        } else {
            this.breadcrumbItems = [];
        }
    }

    logout(): void {
        this.authService.logout();
        this.isLoggedIn = false;
        this.router.navigate(['/landing']);
    }

    navigateLogin(): void { this.router.navigate(['/login']); }
    navigateRegister(): void { this.router.navigate(['/register']); }
}
