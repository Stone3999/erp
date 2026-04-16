import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ToolbarModule } from 'primeng/toolbar';
import { MultiSelectModule } from 'primeng/multiselect';
import { TagModule } from 'primeng/tag';

import { HasPermissionDirective } from '../../directives/has-permission.directive';
import { AuthService } from '../../services/auth.service';

import { User, UserService } from '../../services/user.service';
import { LoadingService } from '../../services/loading.service';

@Component({
    selector: 'app-usuarios',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule, ButtonModule, TableModule,
        DialogModule, ToastModule, ToolbarModule, InputTextModule,
        SelectModule, ToggleSwitchModule, ConfirmDialogModule,
        MultiSelectModule, TagModule, HasPermissionDirective
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './usuarios.component.html',
    styleUrl: './usuarios.component.css',
})
export class UsuariosComponent implements OnInit {
    usuarios: User[] = [];
    usuarioForm!: FormGroup;
    dialogVisible = false;
    isEditMode = false;
    editingId: number | null = null;
    loading = false;

    // --- REQUERIMIENTO TXT: Lista de permisos por acción ---
    listaPermisos = [
        { label: 'Crear Tickets', value: 'tickets:add' },
        { label: 'Mover Tickets', value: 'tickets:move' },
        { label: 'Editar Todo', value: 'tickets:edit_all' },
        { label: 'Borrar Tickets', value: 'tickets:delete' },
        { label: 'Comentar', value: 'tickets:comment' },
        { label: 'Ver Dashboard', value: 'view:dashboard' },
        { label: 'Gestionar Usuarios', value: 'users:manage' },
        { label: 'Gestionar Grupos', value: 'groups:manage' }
    ];

    constructor(
        private fb: FormBuilder,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private userService: UserService,
        private authService: AuthService,
        private loadingService: LoadingService
    ) {}

    ngOnInit(): void {
        this.loadUsers();
        this.buildForm();
    }

    async loadUsers() {
        const response = await this.userService.getUsers();
        if (response.statusCode === 200 && response.data) {
            this.usuarios = response.data;
        } else {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: response.message || 'No se pudieron cargar los usuarios' });
        }
    }

    buildForm(): void {
        this.usuarioForm = this.fb.group({
            nombre: ['', [Validators.required, Validators.minLength(2)]],
            correo: ['', [Validators.required, Validators.email]],
            activo: [true],
            permisos: [[], Validators.required] 
        });
    }

    openNew(): void {
        this.isEditMode = false;
        this.editingId = null;
        this.usuarioForm.reset({ activo: true, permisos: [] });
        this.dialogVisible = true;
    }

    editUsuario(usuario: User): void {
        this.isEditMode = true;
        this.editingId = usuario.id;
        this.usuarioForm.patchValue({
            nombre: usuario.name,
            correo: usuario.email,
            activo: true, 
            permisos: usuario.permissions || [] 
        });
        this.dialogVisible = true;
    }

    async saveUsuario() {
        if (this.loading) return;
        if (this.usuarioForm.invalid) {
            this.usuarioForm.markAllAsTouched();
            this.messageService.add({ severity: 'warn', summary: 'Formulario inválido', detail: 'Completa todos los campos.' });
            return;
        }

        this.loading = true;
        this.loadingService.setLoading(true);
        const formValue = this.usuarioForm.value;

        if (this.isEditMode && this.editingId !== null) {
            const response = await this.userService.updateUser(this.editingId, { 
                name: formValue.nombre, 
                email: formValue.correo,
                permissions: formValue.permisos 
            });
            
            if (response.statusCode === 200) {
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Información actualizada con éxito.' });
                await this.loadUsers();
                this.dialogVisible = false;
            } else if (response.statusCode === 409) {
                this.messageService.add({ severity: 'error', summary: 'Conflicto', detail: 'El correo electrónico ya está registrado por otro usuario.' });
            } else {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: response.message || 'No se pudo actualizar la información' });
            }
        } else {
            this.messageService.add({ severity: 'info', summary: 'Info', detail: 'La creación de usuarios debe realizarse a través del registro.' });
            this.dialogVisible = false;
        }
        
        setTimeout(() => {
            this.loading = false;
            this.loadingService.setLoading(false);
        }, 300);
    }

    deleteUsuario(usuario: User): void {
        if (usuario.email === 'admin@miapp.com') {
            this.messageService.add({ severity: 'warn', summary: 'Bloqueado', detail: 'No puedes eliminar al administrador principal.' });
            return;
        }

        this.confirmationService.confirm({
            message: `¿Eliminar al usuario "<b>${usuario.name}</b>"?`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.messageService.add({ severity: 'warn', summary: 'No implementado', detail: 'El borrado de usuarios no está disponible en el backend.' });
            },
        });
    }

    closeDialog(): void { this.dialogVisible = false; }

    isInvalid(field: string): boolean {
        const ctrl = this.usuarioForm.get(field);
        return !!(ctrl && ctrl.invalid && ctrl.touched);
    }
}
