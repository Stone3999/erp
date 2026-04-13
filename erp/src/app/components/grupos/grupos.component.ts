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

import { Group, GroupService } from '../../services/group.service';
import { HasPermissionDirective } from '../../directives/has-permission.directive';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-grupos',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule, FormsModule, ButtonModule, TableModule,
        DialogModule, ToastModule, ToolbarModule, InputTextModule,
        InputNumberModule, SelectModule, ConfirmDialogModule,
        HasPermissionDirective
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
        private confirmationService: ConfirmationService,
        private groupService: GroupService,
        private authService: AuthService
    ) {}

    ngOnInit(): void {
        this.loadGroups();
        this.buildForm();
    }

    async loadGroups() {
        const response = await this.groupService.getGroups();
        if (response.statusCode === 200 && response.data) {
            this.groups = response.data;
        } else {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: response.message || 'No se pudieron cargar los grupos' });
        }
    }

    buildForm(): void {
        this.groupForm = this.fb.group({
            nombre: ['', [Validators.required, Validators.minLength(3)]],
            categoria: ['', Validators.required],
            nivel: ['', Validators.required],
            autor: [this.authService.getCurrentUser(), [Validators.required]],
            tickets: [0],
        });
    }

    openNew(): void {
        this.isEditMode = false;
        this.editingId = null;
        this.groupForm.reset({
            autor: this.authService.getCurrentUser(),
            tickets: 0
        });
        this.newMemberEmail = '';
        this.currentMembers = [{ email: this.authService.getCurrentUser(), role: 'Administrador' }];
        this.dialogVisible = true;
    }

    editGroup(group: Group): void {
        this.isEditMode = true;
        this.editingId = group.id;
        this.groupForm.patchValue({
            nombre: group.name,
            categoria: group.category,
            nivel: group.level,
            autor: group.created_by,
            tickets: group.tickets || 0,
        });

        this.newMemberEmail = '';
        this.currentMembers = [{ email: group.created_by, role: 'Administrador' }];
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

    async saveGroup() {
        if (this.groupForm.invalid) {
            this.groupForm.markAllAsTouched();
            this.messageService.add({
                severity: 'warn',
                summary: 'Formulario inválido',
                detail: 'Completa todos los campos requeridos correctamente.',
            });
            return;
        }

        const formValue = this.groupForm.value;
        const groupData: Partial<Group> = {
            name: formValue.nombre,
            category: formValue.categoria,
            level: formValue.nivel,
            created_by: this.authService.getUserId() || undefined // USAMOS EL UUID REAL
        };

        let response;
        if (this.isEditMode && this.editingId !== null) {
            response = await this.groupService.updateGroup(this.editingId, groupData);
        } else {
            response = await this.groupService.createGroup(groupData);
        }

        if (response.statusCode === 200 || response.statusCode === 201) {
            this.messageService.add({ 
                severity: 'success', 
                summary: this.isEditMode ? 'Room actualizado' : 'Room creado', 
                detail: `"${formValue.nombre}" se guardó correctamente.` 
            });
            this.loadGroups();
            this.dialogVisible = false;
        } else {
            this.messageService.add({ 
                severity: 'error', 
                summary: 'Error', 
                detail: response.message || 'No se pudo guardar el Room.' 
            });
        }
    }

    deleteGroup(group: Group): void {
        this.confirmationService.confirm({
            message: `¿Estás seguro de eliminar el Room "<b>${group.name}</b>"?`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, eliminar',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-danger',
            accept: async () => {
                const response = await this.groupService.deleteGroup(group.id);
                if (response.statusCode === 200) {
                    this.messageService.add({ severity: 'success', summary: 'Room eliminado', detail: `"${group.name}" fue eliminado correctamente.` });
                    this.loadGroups();
                } else {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: response.message || 'No se pudo eliminar el grupo' });
                }
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