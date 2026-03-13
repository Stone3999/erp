import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';

export interface Group {
    id: number;
    nombre: string;
    categoria: string;
    nivel: string;
    autor: string;
    miembros: number;
    tickets: number;
}

@Component({
    selector: 'app-grupos',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule, FormsModule, ButtonModule, TableModule,
        DialogModule, ToastModule, ToolbarModule, InputTextModule,
        InputNumberModule, SelectModule, ConfirmDialogModule,
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './grupos.component.html',
    styleUrl: './grupos.component.css',
})
export class GruposComponent implements OnInit {
    groups: Group[] = [];
    groupForm!: FormGroup;
    dialogVisible = false;
    isEditMode = false;
    editingId: number | null = null;
    private nextId = 4;

    // --- NUEVAS VARIABLES PARA EL MODAL CHONCHO ---
    currentMembers: { email: string, role: string }[] = [];
    newMemberEmail: string = '';

    categorias = [
        { label: 'Tecnología', value: 'Tecnología' },
        { label: 'Marketing', value: 'Marketing' },
        { label: 'Ventas', value: 'Ventas' },
        { label: 'Operaciones', value: 'Operaciones' },
    ];

    niveles = [
        { label: 'Básico', value: 'Básico' },
        { label: 'Intermedio', value: 'Intermedio' },
        { label: 'Avanzado', value: 'Avanzado' },
    ];

    constructor(
        private fb: FormBuilder,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.groups = [
            { id: 1, nombre: 'Room Alpha', categoria: 'Tecnología', nivel: 'Avanzado', autor: 'admin@miapp.com', miembros: 3, tickets: 5 },
            { id: 2, nombre: 'Room Beta', categoria: 'Marketing', nivel: 'Intermedio', autor: 'usuario@miapp.com', miembros: 2, tickets: 2 },
            { id: 3, nombre: 'Room Gamma', categoria: 'Ventas', nivel: 'Básico', autor: 'test@miapp.com', miembros: 4, tickets: 7 },
        ];
        this.buildForm();
    }

    buildForm(): void {
        this.groupForm = this.fb.group({
            nombre: ['', [Validators.required, Validators.minLength(3)]],
            categoria: ['', Validators.required],
            nivel: ['', Validators.required],
            autor: ['', [Validators.required, Validators.email]],
            tickets: [null, [Validators.required, Validators.min(0)]],
            // Quitamos 'miembros' del form porque se calcula con el arreglo
        });
    }

    openNew(): void {
        this.isEditMode = false;
        this.editingId = null;
        this.groupForm.reset();
        this.newMemberEmail = '';
        // Un room nuevo empieza con el admin por defecto
        this.currentMembers = [{ email: 'admin@miapp.com', role: 'Administrador' }];
        this.dialogVisible = true;
    }

    editGroup(group: Group): void {
        this.isEditMode = true;
        this.editingId = group.id;
        this.groupForm.patchValue({
            nombre: group.nombre,
            categoria: group.categoria,
            nivel: group.nivel,
            autor: group.autor,
            tickets: group.tickets,
        });

        this.newMemberEmail = '';
        
        // Simulamos la lista de miembros basada en el número del grupo
        this.currentMembers = [{ email: group.autor, role: 'Administrador' }];
        for(let i = 1; i < group.miembros; i++) {
            this.currentMembers.push({ email: `agente${i}@miapp.com`, role: 'Miembro' });
        }

        this.dialogVisible = true;
    }

    // --- NUEVAS FUNCIONES PARA GESTIONAR MIEMBROS ---
    addMember(): void {
        if (!this.newMemberEmail.trim()) {
            this.messageService.add({ severity: 'warn', summary: 'Vacío', detail: 'Ingresa un correo válido.' });
            return;
        }

        if (this.currentMembers.some(m => m.email === this.newMemberEmail)) {
            this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'Este usuario ya está en el Room.' });
            return;
        }

        this.currentMembers.push({ email: this.newMemberEmail, role: 'Miembro' });
        this.newMemberEmail = '';
    }

    removeMember(email: string): void {
        this.currentMembers = this.currentMembers.filter(m => m.email !== email);
    }
    // ------------------------------------------------

    saveGroup(): void {
        if (this.groupForm.invalid) {
            this.groupForm.markAllAsTouched();
            this.messageService.add({
                severity: 'warn', // <-- Cumpliendo la ley del 'warn'
                summary: 'Formulario inválido',
                detail: 'Completa todos los campos requeridos correctamente.',
            });
            return;
        }

        try {
            const formValue = this.groupForm.value;
            // Calculamos los miembros reales
            const groupData = { ...formValue, miembros: this.currentMembers.length };

            if (this.isEditMode && this.editingId !== null) {
                const idx = this.groups.findIndex((g) => g.id === this.editingId);
                if (idx !== -1) {
                    this.groups[idx] = { id: this.editingId, ...groupData };
                    this.groups = [...this.groups];
                }
                this.messageService.add({ severity: 'success', summary: 'Room actualizado', detail: `"${groupData.nombre}" se actualizó correctamente.` });
            } else {
                const newGroup: Group = { id: this.nextId++, ...groupData };
                this.groups = [...this.groups, newGroup];
                this.messageService.add({ severity: 'success', summary: 'Room creado', detail: `"${groupData.nombre}" se creó correctamente.` });
            }

            this.dialogVisible = false;
        } catch {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el Room. Intenta de nuevo.' });
        }
    }

    deleteGroup(group: Group): void {
        this.confirmationService.confirm({
            message: `¿Estás seguro de eliminar el Room "<b>${group.nombre}</b>"?`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, eliminar',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.groups = this.groups.filter((g) => g.id !== group.id);
                this.messageService.add({ severity: 'success', summary: 'Room eliminado', detail: `"${group.nombre}" fue eliminado correctamente.` });
            },
        });
    }

    closeDialog(): void {
        this.dialogVisible = false;
    }

    isInvalid(field: string): boolean {
        const ctrl = this.groupForm.get(field);
        return !!(ctrl && ctrl.invalid && ctrl.touched);
    }
}   