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

// --- NUEVOS IMPORTS ---
import { MultiSelectModule } from 'primeng/multiselect';
import { TagModule } from 'primeng/tag';

export interface Usuario {
    id: number;
    nombre: string;
    apellido: string;
    correo: string;
    rol: string;
    grupo: string;
    activo: boolean;
    permisos: string[]; // <-- NUEVA PROPIEDAD
}

@Component({
    selector: 'app-usuarios',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule, ButtonModule, TableModule,
        DialogModule, ToastModule, ToolbarModule, InputTextModule,
        SelectModule, ToggleSwitchModule, ConfirmDialogModule,
        MultiSelectModule, TagModule // <-- AGREGADOS AQUÍ
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './usuarios.component.html',
    styleUrl: './usuarios.component.css',
})
export class UsuariosComponent implements OnInit {
    usuarios: Usuario[] = [];
    usuarioForm!: FormGroup;
    dialogVisible = false;
    isEditMode = false;
    editingId: number | null = null;
    private nextId = 5;

    // Se cambió Administrador por superAdmin
    roles = [
        { label: 'superAdmin', value: 'superAdmin' },
        { label: 'Editor', value: 'Editor' },
        { label: 'Visualizador', value: 'Visualizador' },
        { label: 'Soporte', value: 'Soporte' },
    ];

    grupos = [
        { label: 'Grupo Alpha', value: 'Grupo Alpha' },
        { label: 'Grupo Beta', value: 'Grupo Beta' },
        { label: 'Grupo Gamma', value: 'Grupo Gamma' },
        { label: 'Sin grupo', value: 'Sin grupo' },
    ];

    // --- LISTA MAESTRA DE PERMISOS ---
    listaPermisos = [
        { label: 'Crear Tickets', value: 'ticket:create' },
        { label: 'Editar Todos', value: 'ticket:edit_all' },
        { label: 'Editar Asignados', value: 'ticket:edit_assigned' },
        { label: 'Borrar Tickets', value: 'ticket:delete' },
        { label: 'Comentar', value: 'ticket:comment' },
        { label: 'Ver Dashboard', value: 'view:dashboard' },
        { label: 'Ver Usuarios', value: 'view:users' },
        { label: 'Gestionar Grupos', value: 'group:edit' }
    ];

    constructor(
        private fb: FormBuilder,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        // Inicializamos con el superAdmin para cumplir la rúbrica
        this.usuarios = [
            {
                id: 1, nombre: 'Jefe', apellido: 'Maestro', correo: 'admin@miapp.com', rol: 'superAdmin', grupo: 'Grupo Alpha', activo: true,
                permisos: ['ticket:create', 'ticket:edit_all', 'ticket:edit_assigned', 'ticket:delete', 'ticket:comment', 'view:dashboard', 'view:users', 'group:edit']
            },
            {
                id: 2, nombre: 'Juan', apellido: 'Pérez', correo: 'juan@miapp.com', rol: 'Soporte', grupo: 'Grupo Beta', activo: true,
                permisos: ['ticket:edit_assigned', 'ticket:comment']
            }
        ];
        this.buildForm();
    }

    buildForm(): void {
        this.usuarioForm = this.fb.group({
            nombre: ['', [Validators.required, Validators.minLength(2)]],
            apellido: ['', [Validators.required, Validators.minLength(2)]],
            correo: ['', [Validators.required, Validators.email]],
            rol: ['', Validators.required],
            grupo: ['', Validators.required],
            activo: [true],
            permisos: [[], Validators.required] // <-- CONTROL DE PERMISOS
        });
    }

    openNew(): void {
        this.isEditMode = false;
        this.editingId = null;
        this.usuarioForm.reset({ activo: true, permisos: [] });
        this.dialogVisible = true;
    }

    editUsuario(usuario: Usuario): void {
        this.isEditMode = true;
        this.editingId = usuario.id;
        this.usuarioForm.patchValue({
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            correo: usuario.correo,
            rol: usuario.rol,
            grupo: usuario.grupo,
            activo: usuario.activo,
            permisos: usuario.permisos || [] // <-- CARGAR PERMISOS
        });
        this.dialogVisible = true;
    }

    saveUsuario(): void {
        if (this.usuarioForm.invalid) {
            this.usuarioForm.markAllAsTouched();
            this.messageService.add({ severity: 'warn', summary: 'Formulario inválido', detail: 'Completa todos los campos.' });
            return;
        }

        try {
            const formValue = this.usuarioForm.value;
            const nombreCompleto = `${formValue.nombre} ${formValue.apellido}`;

            if (this.isEditMode && this.editingId !== null) {
                const idx = this.usuarios.findIndex((u) => u.id === this.editingId);
                if (idx !== -1) {
                    this.usuarios[idx] = { id: this.editingId, ...formValue };
                    this.usuarios = [...this.usuarios];
                }
                this.messageService.add({ severity: 'success', summary: 'Usuario actualizado', detail: `"${nombreCompleto}" actualizado.` });
            } else {
                const newUsuario: Usuario = { id: this.nextId++, ...formValue };
                this.usuarios = [...this.usuarios, newUsuario];
                this.messageService.add({ severity: 'success', summary: 'Usuario creado', detail: `"${nombreCompleto}" creado.` });
            }

            this.dialogVisible = false;
        } catch {
            // Aquí sí se vale 'error' porque es un catch de una falla real
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar.' });
        }
    }

    deleteUsuario(usuario: Usuario): void {
        // Bloqueo de seguridad
        if (usuario.rol === 'superAdmin') {
            this.messageService.add({ severity: 'warn', summary: 'Bloqueado', detail: 'No puedes eliminar al superAdmin.' });
            return;
        }

        this.confirmationService.confirm({
            message: `¿Eliminar al usuario "<b>${usuario.nombre} ${usuario.apellido}</b>"?`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.usuarios = this.usuarios.filter((u) => u.id !== usuario.id);
                this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Usuario eliminado.' });
            },
        });
    }

    closeDialog(): void {
        this.dialogVisible = false;
    }

    isInvalid(field: string): boolean {
        const ctrl = this.usuarioForm.get(field);
        return !!(ctrl && ctrl.invalid && ctrl.touched);
    }
}