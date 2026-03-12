import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

export interface Usuario {
    id: number;
    nombre: string;
    apellido: string;
    correo: string;
    rol: string;
    grupo: string;
    activo: boolean;
}

@Component({
    selector: 'app-usuarios',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        TableModule,
        DialogModule,
        ToastModule,
        ToolbarModule,
        InputTextModule,
        SelectModule,
        ToggleSwitchModule,
        ConfirmDialogModule,
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

    roles = [
        { label: 'Administrador', value: 'Administrador' },
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

    constructor(
        private fb: FormBuilder,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.usuarios = [
            {
                id: 1,
                nombre: 'Carlos',
                apellido: 'Ramírez',
                correo: 'admin@miapp.com',
                rol: 'Administrador',
                grupo: 'Grupo Alpha',
                activo: true,
            },
            {
                id: 2,
                nombre: 'Laura',
                apellido: 'Mendoza',
                correo: 'usuario@miapp.com',
                rol: 'Editor',
                grupo: 'Grupo Beta',
                activo: true,
            },
            {
                id: 3,
                nombre: 'Pedro',
                apellido: 'Soto',
                correo: 'test@miapp.com',
                rol: 'Visualizador',
                grupo: 'Grupo Gamma',
                activo: false,
            },
            {
                id: 4,
                nombre: 'Ana',
                apellido: 'Torres',
                correo: 'ana.torres@miapp.com',
                rol: 'Soporte',
                grupo: 'Sin grupo',
                activo: true,
            },
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
        });
    }

    openNew(): void {
        this.isEditMode = false;
        this.editingId = null;
        this.usuarioForm.reset({ activo: true });
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
        });
        this.dialogVisible = true;
    }

    saveUsuario(): void {
        if (this.usuarioForm.invalid) {
            this.usuarioForm.markAllAsTouched();
            this.messageService.add({
                severity: 'warn',
                summary: 'Formulario inválido',
                detail: 'Completa todos los campos requeridos correctamente.',
            });
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
                this.messageService.add({
                    severity: 'success',
                    summary: 'Usuario actualizado',
                    detail: `"${nombreCompleto}" se actualizó correctamente.`,
                });
            } else {
                const newUsuario: Usuario = { id: this.nextId++, ...formValue };
                this.usuarios = [...this.usuarios, newUsuario];
                this.messageService.add({
                    severity: 'success',
                    summary: 'Usuario creado',
                    detail: `"${nombreCompleto}" se creó correctamente.`,
                });
            }

            this.dialogVisible = false;
        } catch {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo guardar el usuario. Intenta de nuevo.',
            });
        }
    }

    deleteUsuario(usuario: Usuario): void {
        this.confirmationService.confirm({
            message: `¿Estás seguro de eliminar al usuario "<b>${usuario.nombre} ${usuario.apellido}</b>"?`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, eliminar',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                try {
                    this.usuarios = this.usuarios.filter((u) => u.id !== usuario.id);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Usuario eliminado',
                        detail: `"${usuario.nombre} ${usuario.apellido}" fue eliminado correctamente.`,
                    });
                } catch {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudo eliminar el usuario.',
                    });
                }
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
