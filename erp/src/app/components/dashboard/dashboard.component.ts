import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../services/auth.service';
import { GroupService } from '../../services/group.service';
import { HasPermissionDirective } from '../../directives/has-permission.directive';
import { ChartModule } from 'primeng/chart';

import { LoadingService } from '../../services/loading.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, CardModule, AvatarModule, TagModule, HasPermissionDirective, ChartModule],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
    isLoggedIn = false;
    currentUser = '';
    groups: any[] = [];
    
    globalStats = { activos: 0, pendientes: 0, terminados: 0, asignadosMi: 0 };
    chartData: any;
    chartOptions: any;

    constructor(
        private authService: AuthService,
        private groupService: GroupService,
        private router: Router,
        private loadingService: LoadingService
    ) {}

    ngOnInit(): void {
        this.loadingService.setLoading(false); 
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
            this.calcularStatsGlobales();
        }
    }

    calcularStatsGlobales() {
        this.globalStats = this.groups.reduce((acc, g) => {
            acc.activos += g.stats?.activos || 0;
            acc.pendientes += g.stats?.pendientes || 0;
            acc.terminados += g.stats?.terminados || 0;
            acc.asignadosMi += g.stats?.asignadosMi || 0;
            return acc;
        }, { activos: 0, pendientes: 0, terminados: 0, asignadosMi: 0 });

        this.chartData = {
            labels: ['Activos', 'Pendientes', 'Terminados'],
            datasets: [
                {
                    data: [this.globalStats.activos, this.globalStats.pendientes, this.globalStats.terminados],
                    backgroundColor: ['#3b82f6', '#fbbf24', '#22c55e'],
                    hoverBackgroundColor: ['#2563eb', '#f59e0b', '#16a34a'],
                    borderWidth: 0
                }
            ]
        };

        this.chartOptions = {
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom', labels: { color: '#D7DADC', font: { size: 11 } } }
            }
        };
    }

    getChartDataForGroup(g: any) {
        return {
            labels: ['Activos', 'Pendientes', 'Terminados'],
            datasets: [{
                data: [g.stats?.activos || 0, g.stats?.pendientes || 0, g.stats?.terminados || 0],
                backgroundColor: ['#3b82f6', '#fbbf24', '#22c55e'],
                borderWidth: 0
            }]
        };
    }
}
