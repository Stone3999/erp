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
import { UserService } from '../../services/user.service';

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

    // Lista de todos los usuarios para buscar IDs por email
    allSystemUsers: any[] = [];
    currentMembers: { id: string, email: string, role: string }[] = [];
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
        private authService: AuthService,
        private userService: UserService
    ) {}

    ngOnInit(): void {
        this.loadGroups();
        this.loadSystemUsers();
        this.buildForm();
    }

    async loadSystemUsers() {
        const res = await this.userService.getUsers();
        if (res.statusCode === 200) {
            this.allSystemUsers = res.data;
        }
    }

    async loadGroups() {
        const response = await this.groupService.getGroups();
        if (response.statusCode === 200 && response.data) {
            this.groups = response.data;
        }
    }

    buildForm(): void {
        this.groupForm = this.fb.group({
            nombre: ['', [Validators.required, Validators.minLength(3)]],
            categoria: ['', Validators.required],
            nivel: ['', Validators.required],
            autor: [this.authService.getCurrentUser(), [Validators.required]],
            tickets: [0, [Validators.min(0)]],
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
        this.currentMembers = [];
        // Agregar al creador por defecto
        const userId = this.authService.getUserId();
        const userEmail = this.allSystemUsers.find(u => u.id === userId)?.email || '';
        if (userId) {
            this.currentMembers.push({ id: userId, email: userEmail, role: 'Administrador' });
        }
        this.dialogVisible = true;
    }

    addMember(): void {
        const email = this.newMemberEmail.trim().toLowerCase();
        if (!email) return;

        const user = this.allSystemUsers.find(u => u.email.toLowerCase() === email);
        if (!user) {
            this.messageService.add({ severity: 'error', summary: 'No encontrado', detail: 'El usuario con ese correo no existe en el sistema.' });
            return;
        }

        if (this.currentMembers.some(m => m.id === user.id)) {
            this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'El usuario ya está en la lista.' });
            return;
        }

        this.currentMembers.push({ id: user.id, email: user.email, role: 'Miembro' });
        this.newMemberEmail = '';
    }

    removeMember(id: string): void {
        this.currentMembers = this.currentMembers.filter(m => m.id !== id);
    }

    async saveGroup() {
        if (this.groupForm.invalid) return;

        const formValue = this.groupForm.value;
        const groupData: any = {
            name: formValue.nombre,
            category: formValue.categoria,
            level: formValue.nivel,
            tickets: formValue.tickets, // AHORA SÍ ENVIAMOS TICKETS
            created_by: this.authService.getUserId(),
            members: this.currentMembers.map(m => m.id) // ENVIAMOS IDS REALES
        };

        let response;
        if (this.isEditMode && this.editingId !== null) {
            response = await this.groupService.updateGroup(this.editingId, groupData);
        } else {
            response = await this.groupService.createGroup(groupData);
        }

        if (response.statusCode === 200 || response.statusCode === 201) {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Room guardado correctamente.' });
            this.loadGroups();
            this.dialogVisible = false;
        } else {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: response.message });
        }
    }

    deleteGroup(group: Group): void {
        this.confirmationService.confirm({
            message: `¿Borrar "${group.name}"?`,
            accept: async () => {
                const res = await this.groupService.deleteGroup(group.id);
                if (res.statusCode === 200) {
                    this.messageService.add({ severity: 'success', summary: 'Borrado' });
                    this.loadGroups();
                }
            }
        });
    }
}