import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AuthService } from '../../services/auth.service';

// --- IMPORTS PARA LA RÚBRICA ---
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

@Component({
    selector: 'app-perfil',
    standalone: true,
    providers: [MessageService, ConfirmationService],
    imports: [
        CommonModule, FormsModule, ButtonModule, CardModule, AvatarModule, 
        InputTextModule, ToastModule, ConfirmDialogModule, 
        TableModule, TagModule
    ],
    templateUrl: './perfil.component.html',
    styleUrl: './perfil.component.css',
})
export class PerfilComponent implements OnInit {
    isLoggedIn = false;
    currentUser = '';
    editMode = false;

    profileName = '';
    profileRole = '';

    // Copias de edición
    editName = '';
    editRole = '';

    // --- DATOS SIMULADOS PARA CUMPLIR LA RÚBRICA ---
    userData = {
        telefono: '+52 555 123 4567',
        direccion: 'Av. Siempre Viva 742, Springfield',
        fechaNacimiento: '15/08/1995'
    };

    ticketsAsignados: any[] = [];
    stats = { abiertos: 0, progreso: 0, finalizados: 0 };

    constructor(
        private authService: AuthService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.isLoggedIn = this.authService.isLoggedIn();
        
        this.profileName = this.authService.getCurrentUser() || 'Usuario Desconocido';
        this.currentUser = this.profileName.toLowerCase().replace(' ', '.') + '@miapp.com';
        this.profileRole = this.authService.hasPermission('ticket:edit_all') ? 'Administrador' : 'Agente de Soporte';

        // MOCK DATA: Tickets asignados
        this.ticketsAsignados = [
            { id: 101, titulo: 'Actualizar dependencias', estado: 'Pendiente', prioridad: 'Alta' },
            { id: 102, titulo: 'Revisar logs de servidor', estado: 'En Progreso', prioridad: 'Media' },
            { id: 103, titulo: 'Atender queja de cliente', estado: 'En Progreso', prioridad: 'Alta' },
            { id: 104, titulo: 'Documentar API', estado: 'Finalizado', prioridad: 'Baja' }
        ];

        this.calcularStats();
    }

    calcularStats() {
        this.stats.abiertos = this.ticketsAsignados.filter(t => t.estado === 'Pendiente').length;
        this.stats.progreso = this.ticketsAsignados.filter(t => t.estado === 'En Progreso').length;
        this.stats.finalizados = this.ticketsAsignados.filter(t => t.estado === 'Finalizado').length;
    }

    // 🔥 AQUÍ ESTÁ LA CORRECCIÓN A 'warn' 🔥
    getPrioritySeverity(prioridad: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
        switch (prioridad) {
            case 'Alta': return 'danger';
            case 'Media': return 'warn'; // <--- Puro 'warn' mi buen
            case 'Baja': return 'success';
            default: return 'info';
        }
    }

    startEdit(): void {
        this.editName = this.profileName;
        this.editRole = this.profileRole;
        this.editMode = true;
    }

    saveProfile(): void {
        if (!this.editName.trim() || !this.editRole.trim()) {
            this.messageService.add({
                severity: 'warn', // <--- Este ya estaba chido
                summary: 'Campos vacíos',
                detail: 'El nombre y el rol no pueden estar vacíos.',
            });
            return;
        }

        try {
            this.profileName = this.editName.trim();
            this.profileRole = this.editRole.trim();
            this.editMode = false;
            this.messageService.add({
                severity: 'success',
                summary: 'Perfil actualizado',
                detail: 'Tus datos se guardaron correctamente.',
            });
        } catch {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo guardar el perfil. Intenta de nuevo.',
            });
        }
    }

    cancelEdit(): void {
        this.editMode = false;
    }

    confirmDeleteProfile(): void {
        this.confirmationService.confirm({
            message: '¿Estás seguro de que deseas eliminar tu perfil? Esta acción no se puede deshacer.',
            header: 'Eliminar Perfil',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, eliminar',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.authService.logout();
                this.router.navigate(['/']);
            },
        });
    }
}   