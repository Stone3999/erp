import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, CardModule, AvatarModule, TagModule],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
    isLoggedIn = false;
    currentUser = '';

    constructor(
        private authService: AuthService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.isLoggedIn = this.authService.isLoggedIn();
        this.currentUser = this.authService.getCurrentUser();
    }

    gotoroom(): void {
        this.router.navigate(['/dashboard/room']);
    }
}
