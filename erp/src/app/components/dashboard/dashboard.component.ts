import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../services/auth.service';
import { GroupService, Group } from '../../services/group.service';
import { HasPermissionDirective } from '../../directives/has-permission.directive';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, CardModule, AvatarModule, TagModule, HasPermissionDirective],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
    isLoggedIn = false;
    currentUser = '';
    groups: Group[] = [];

    constructor(
        private authService: AuthService,
        private groupService: GroupService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.isLoggedIn = this.authService.isLoggedIn();
        this.currentUser = this.authService.getCurrentUser();
        if (this.isLoggedIn) {
            this.cargarGrupos();
        }
    }

    async cargarGrupos() {
        const response = await this.groupService.getGroups();
        if (response.statusCode === 200 && response.data) {
            this.groups = response.data;
        }
    }

    gotoroom(groupId: number): void {
        // Aquí puedes guardar el groupId seleccionado en un store o pasarlo en la URL si lo prefieres
        this.router.navigate(['/dashboard/room']);
    }
}