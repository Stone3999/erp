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
import { MultiSelectModule } from 'primeng/multiselect';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import { Group, GroupService } from '../../services/group.service';
import { HasPermissionDirective } from '../../directives/has-permission.directive';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { LoadingService } from '../../services/loading.service';

@Component({
    selector: 'app-grupos',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule, FormsModule, ButtonModule, TableModule,
        DialogModule, ToastModule, ToolbarModule, InputTextModule,
        InputNumberModule, SelectModule, ConfirmDialogModule, MultiSelectModule,
        HasPermissionDirective, IconFieldModule, InputIconModule
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
    loading = false;

    allSystemUsers: any[] = [];
    currentMembers: any[] = [];
    selectedUserToAdd: any = null;

    listaPermisos = [
        { label: 'Crear Tickets', value: 'tickets:add' },
        { label: 'Mover Tickets', value: 'tickets:move' },
        { label: 'Borrar Tickets', value: 'tickets:delete' },
        { label: 'Comentar', value: 'tickets:comment' }
    ];

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
        private userService: UserService,
        private loadingService: LoadingService
    ) {}

    ngOnInit(): void {
        this.loadGroups();
        this.loadSystemUsers();
        this.buildForm();
    }

    async loadSystemUsers() {
        const res = await this.userService.getUsers();
        if (res.statusCode === 200 && res.data) {
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
            nivel: ['', Validators.required]
        });
    }

    isInvalid(field: string): boolean {
        const control = this.groupForm.get(field);
        return !!(control && control.invalid && (control.dirty || control.touched));
    }

    openNew(): void {
        this.isEditMode = false;
        this.editingId = null;
        this.groupForm.reset();
        this.selectedUserToAdd = null;
        this.currentMembers = [];
        
        const userId = this.authService.getUserId();
        const user = this.allSystemUsers.find(u => u.id === userId);
        if (user) {
            this.currentMembers.push({ 
                id: user.id, 
                name: user.name, 
                email: user.email, 
                role: 'Administrador',
                permissions: this.listaPermisos.map(p => p.value)
            });
        }
        this.dialogVisible = true;
    }

    editGroup(group: any): void {
        this.isEditMode = true;
        this.editingId = group.id;
        this.groupForm.patchValue({
            nombre: group.name,
            categoria: group.category,
            nivel: group.level
        });
        this.loadGroupMembers(group.id);
        this.dialogVisible = true;
    }

    async loadGroupMembers(groupId: string) {
        const res = await this.groupService.getGroupMembers(groupId);
        if (res.statusCode === 200 && res.data) {
            this.currentMembers = res.data.map((m: any) => ({
                id: m.id,
                name: m.name,
                email: m.email,
                role: m.role || 'Miembro',
                permissions: m.permissions || ['tickets:add', 'tickets:move', 'tickets:comment']
            }));
        }
    }

    addMemberFromSelect(): void {
        if (!this.selectedUserToAdd) return;
        if (this.currentMembers.some(m => m.id === this.selectedUserToAdd.id)) {
            this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'El usuario ya está en la lista.' });
            return;
        }
        this.currentMembers.push({ 
            id: this.selectedUserToAdd.id, 
            name: this.selectedUserToAdd.name, 
            email: this.selectedUserToAdd.email, 
            role: 'Miembro',
            permissions: ['tickets:add', 'tickets:move', 'tickets:comment']
        });
        this.selectedUserToAdd = null;
    }

    removeMember(id: string): void {
        this.currentMembers = this.currentMembers.filter(m => m.id !== id);
    }

    closeDialog(): void {
        this.dialogVisible = false;
    }

    async saveGroup() {
        if (this.loading || this.groupForm.invalid) return;

        this.loading = true;
        this.loadingService.setLoading(true);
        const formValue = this.groupForm.value;
        const groupData: any = {
            name: formValue.nombre,
            category: formValue.categoria,
            level: formValue.nivel,
            created_by: this.authService.getUserId(),
            members: this.currentMembers.map(m => m.id)
        };

        let response;
        if (this.isEditMode && this.editingId !== null) {
            response = await this.groupService.updateGroup(this.editingId, groupData);
            if (response.statusCode === 200) {
                await this.groupService.updateGroupMembers(this.editingId, this.currentMembers);
            }
        } else {
            response = await this.groupService.createGroup(groupData);
            if (response.statusCode === 201 && response.data) {
                await this.groupService.updateGroupMembers(response.data.id, this.currentMembers);
            }
        }

        if (response.statusCode === 200 || response.statusCode === 201) {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Room guardado correctamente.' });
            await this.loadGroups();
            this.dialogVisible = false;
        } else {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: response.message });
        }
        setTimeout(() => {
            this.loading = false;
            this.loadingService.setLoading(false);
        }, 300);
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
