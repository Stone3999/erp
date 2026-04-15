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
import { TagModule } from 'primeng/tag';

@Component({
    selector: 'app-perfil',
    standalone: true,
    providers: [MessageService, ConfirmationService],
    imports: [
        CommonModule, FormsModule, ButtonModule, CardModule, AvatarModule, 
        InputTextModule, ToastModule, ConfirmDialogModule, TagModule
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

    userData = {
        telefono: '+52 555 123 4567',
        direccion: 'Av. Siempre Viva 742, Springfield'
    };

    constructor(
        private authService: AuthService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.isLoggedIn = this.authService.isLoggedIn();
        if (this.isLoggedIn) {
            this.profileName = this.authService.getCurrentUser() || 'Usuario';
            this.currentUser = this.authService.getCurrentUserEmail() || '';
            this.profileRole = this.authService.hasPermission('tickets:edit_all') ? 'Administrador' : 'Agente';
        }
    }

    saveProfile(): void {
        if (!this.profileName.trim()) {
            this.messageService.add({ severity: 'warn', summary: 'Campo vacío', detail: 'El nombre no puede estar vacío.' });
            return;
        }
        this.editMode = false;
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Perfil actualizado correctamente.' });
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }

    confirmDeleteProfile(): void {
        this.confirmationService.confirm({
            message: '¿Estás seguro de que deseas eliminar tu perfil?',
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.logout();
            }
        });
    }
}
