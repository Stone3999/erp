import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext'; 
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SelectButtonModule } from 'primeng/selectbutton';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { AuthService } from '../../services/auth.service';
import { TicketService } from '../../services/ticket.service';
import { UserService } from '../../services/user.service';
import { GroupService } from '../../services/group.service';
import { PermissionService } from '../../services/permission.service';
import { LoadingService } from '../../services/loading.service';
import { HasPermissionDirective } from '../../directives/has-permission.directive';

export interface Comentario {
    usuario: string;
    texto: string;
    fecha: Date;
}

export interface Historial {
    accion: string;
    usuario: string;
    fecha: Date;
}

export interface RoomTicket {
    id: string;
    titulo: string;
    descripcion?: string;
    estado: string;
    asignado: string;
    creador: string;
    prioridad: string;
    fecha: Date;
    fechaLimite?: string;
    comentarios: Comentario[];
    historial: Historial[];
}

@Component({
    selector: 'app-room',
    standalone: true,
    imports: [
        CommonModule, RouterModule, FormsModule, 
        ButtonModule, CardModule, AvatarModule, 
        TagModule, ChartModule, DialogModule, InputTextModule,
        DragDropModule, TableModule, SelectModule,
        SelectButtonModule, HasPermissionDirective
    ],
    templateUrl: './room.component.html',
    styleUrl: './room.component.css',
})
export class RoomComponent implements OnInit, AfterViewChecked, OnDestroy {
    @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

    isLoggedIn = false;
    currentUser = '';
    groupId: string | null = null;
    chartData: any;
    chartOptions: any;
    stats = { total: 0, pendiente: 0, enProgreso: 0, revision: 0, finalizado: 0, activos: 0, asignadosMi: 0, vencidos: 0 };

    showTicketModal = false;
    nuevoTitulo: string = '';
    nuevaDescripcion: string = '';
    nuevaPrioridad: string = 'Media';
    nuevoEstado: string = 'Pendiente';
    nuevoEstadoSeleccionado: string = 'Pendiente';
    nuevoAsignado: string = '';
    nuevaFechaLimite: string = '';

    nuevoComentario: string = '';

    pendientes: RoomTicket[] = [];
    enProgreso: RoomTicket[] = [];
    revision: RoomTicket[] = [];
    finalizados: RoomTicket[] = [];
    
    usuariosDisponibles: any[] = [];

    vistaTabla: boolean = false; 
    filtroActivo: string = 'todos'; 

    viewOptions = [
        { label: 'Tablero Kanban', value: false, icon: 'pi pi-th-large' },
        { label: 'Vista de Lista', value: true, icon: 'pi pi-list' }
    ];

    showEditModal = false;
    ticketEditando: RoomTicket | null = null;
    loading: boolean = false;

    constructor(
        private authService: AuthService,
        private ticketService: TicketService,
        private userService: UserService,
        private groupService: GroupService,
        private permissionService: PermissionService,
        public loadingService: LoadingService,
        private route: ActivatedRoute
    ) {}

    async ngOnInit(): Promise<void> {
        this.isLoggedIn = this.authService.isLoggedIn();
        this.currentUser = this.authService.getCurrentUser();
        this.groupId = this.route.snapshot.paramMap.get('id');
        
        if (this.groupId) {
            await this.permissionService.refreshPermissionsForGroup(this.groupId);
        }

        this.cargarTickets();
        this.cargarMiembros();
    }

    ngOnDestroy(): void {
        // Al salir del room, dejamos de preguntar por permisos
        this.permissionService.stopPolling();
    }

    ngAfterViewChecked() {
        this.scrollToBottom();
    }

    scrollToBottom(): void {
        try {
            if (this.myScrollContainer) {
                this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
            }
        } catch(err) { }
    }

    async cargarMiembros() {
        if (!this.groupId) return;
        const res = await this.groupService.getGroupMembers(this.groupId);
        if (res.statusCode === 200 && res.data) {
            this.usuariosDisponibles = res.data.map((u: any) => ({
                id: u.id,
                name: u.name,
                email: u.email
            }));
        }
    }
    
    private mapToRoomTicket(t: any): RoomTicket {
        return {
            id: t.id,
            titulo: t.title || 'Sin Título',
            descripcion: t.description || '',
            estado: t.status || 'Pendiente',
            asignado: t.assigned_to || 'Sin asignar',
            creador: t.creator_name || t.created_by || 'Sistema',
            prioridad: t.priority || 'Media',
            fecha: t.created_at ? new Date(t.created_at) : new Date(),
            fechaLimite: t.due_date ? t.due_date : undefined,
            comentarios: (t.comments || []).map((c: any) => ({ 
                usuario: c.user_name, 
                texto: c.comment, 
                fecha: new Date(c.created_at) 
            })),
            historial: (t.history || []).map((h: any) => ({ accion: h.cambio, usuario: h.autor, fecha: h.fecha }))
        };
    }

    async cargarTickets() {
        if (!this.groupId) return;
        const response = await this.ticketService.getTicketsByGroup(this.groupId as any);
        if (response.statusCode === 200 && response.data) {
            const tickets = response.data.map((t: any) => this.mapToRoomTicket(t));
            this.pendientes = tickets.filter((t: any) => t.estado === 'Pendiente');
            this.enProgreso = tickets.filter((t: any) => t.estado === 'En Progreso');
            this.revision = tickets.filter((t: any) => t.estado === 'Revisión');
            this.finalizados = tickets.filter((t: any) => t.estado === 'Finalizado');
            this.updateStatsFromLists();
        }
    }

    async drop(event: CdkDragDrop<RoomTicket[]>, nuevoEstado: string) {
        if (event.previousContainer === event.container) {
            moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        } else {
            transferArrayItem(
                event.previousContainer.data,
                event.container.data,
                event.previousIndex,
                event.currentIndex,
            );
            const ticketMovido = event.container.data[event.currentIndex];
            ticketMovido.estado = nuevoEstado;
            this.updateStatsFromLists();
            await this.ticketService.updateTicket(ticketMovido.id as any, { status: nuevoEstado });
        }
    }

    updateStatsFromLists() {
        this.stats.pendiente = this.pendientes.length;
        this.stats.enProgreso = this.enProgreso.length;
        this.stats.revision = this.revision.length;
        this.stats.finalizado = this.finalizados.length;
        this.stats.activos = this.stats.enProgreso + this.stats.revision;
        
        const todos = [...this.pendientes, ...this.enProgreso, ...this.revision, ...this.finalizados];
        this.stats.total = todos.length;
        this.stats.asignadosMi = todos.filter(t => t.asignado === this.currentUser).length;
        this.stats.vencidos = todos.filter(t => this.estaVencido(t)).length;

        this.updateChart();
    }

    openTicketModal() {
        this.nuevoTitulo = '';
        this.nuevaDescripcion = '';
        this.nuevaPrioridad = 'Media';
        this.nuevoEstado = 'Pendiente';
        this.nuevoAsignado = this.currentUser;
        this.nuevaFechaLimite = '';
        this.showTicketModal = true;
    }

    async crearTicket() {
        if (this.loading || !this.nuevoTitulo.trim() || !this.groupId) return;

        this.loading = true;
        this.loadingService.setLoading(true);
        const nuevoTicket: any = {
            titulo: this.nuevoTitulo,
            descripcion: this.nuevaDescripcion,
            estado: this.nuevoEstado,
            asignadoA: this.nuevoAsignado,
            creador: this.authService.getUserId(),
            prioridad: this.nuevaPrioridad,
            grupoId: this.groupId,
            fechaLimite: this.nuevaFechaLimite || undefined
        };

        const res = await this.ticketService.createTicket(nuevoTicket);
        if (res.statusCode === 201 && res.data) {
             await this.cargarTickets();
             this.showTicketModal = false;
        }
        setTimeout(() => {
            this.loading = false;
            this.loadingService.setLoading(false);
        }, 300);
    }

    updateChart() {
        this.chartData = {
            labels: ['Pendiente', 'Activos', 'Finalizado', 'Vencidos'],
            datasets: [
                {
                    data: [this.stats.pendiente, this.stats.activos, this.stats.finalizado, this.stats.vencidos],
                    backgroundColor: ['#fbbf24', '#3b82f6', '#22c55e', '#ef4444'],
                    hoverBackgroundColor: ['#f59e0b', '#2563eb', '#16a34a', '#dc2626'],
                    borderWidth: 2,
                    borderColor: '#1A1A1B', 
                },
            ],
        };
        this.chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#D7DADC', padding: 16, font: { size: 13 } } }
            },
        };
    }

    getPrioritySeverity(prioridad: string): any {
        switch(prioridad) {
            case 'Alta': return 'danger';
            case 'Media': return 'warn';
            case 'Baja': return 'success';
            default: return 'info';
        }
    }

    async abrirDetalles(ticket: RoomTicket) {
        if (!this.puedeMoverTicket(ticket)) return; 
        
        const res = await this.ticketService.getTicketById(ticket.id as any);
        if (res.statusCode === 200 && res.data) {
            this.ticketEditando = this.mapToRoomTicket(res.data);
            this.nuevoComentario = '';
            this.showEditModal = true;
        }
    }

    async guardarDetalles() {
        if (this.loading || !this.ticketEditando) return;

        this.loading = true;
        this.loadingService.setLoading(true);
        const payload: any = {
            title: this.ticketEditando.titulo,
            description: this.ticketEditando.descripcion,
            assigned_to: this.ticketEditando.asignado,
            status: this.ticketEditando.estado,
            priority: this.ticketEditando.prioridad,
            due_date: this.ticketEditando.fechaLimite
        };

        const res = await this.ticketService.updateTicket(this.ticketEditando.id as any, payload);
        if (res.statusCode === 200) {
             await this.cargarTickets();
             this.showEditModal = false;
             this.ticketEditando = null;
        }
        setTimeout(() => {
            this.loading = false;
            this.loadingService.setLoading(false);
        }, 300);
    }

    async agregarComentario() {
        if (this.loading || !this.nuevoComentario.trim() || !this.ticketEditando) return;
        
        this.loading = true;
        const res = await this.ticketService.addComment(this.ticketEditando.id as any, this.nuevoComentario, this.currentUser);
        this.loading = false;
        if (res.statusCode === 201) {
            this.ticketEditando.comentarios.push({
                usuario: this.currentUser,
                texto: this.nuevoComentario,
                fecha: new Date()
            });
            this.nuevoComentario = '';
        }
    }

    cumpleFiltro(ticket: any): boolean {
        if (this.filtroActivo === 'mis-tickets') return ticket.asignado === this.currentUser;
        if (this.filtroActivo === 'sin-asignar') return !ticket.asignado || ticket.asignado.trim() === 'Sin asignar';
        if (this.filtroActivo === 'prioridad-alta') return ticket.prioridad === 'Alta';
        return true; 
    }

    get todosLosTickets(): any[] {
        return [...this.pendientes, ...this.enProgreso, ...this.revision, ...this.finalizados]
            .filter(t => this.cumpleFiltro(t));
    }

    puedeMoverTicket(ticket: RoomTicket): boolean {
        if (this.permissionService.hasPermission('tickets:edit_all')) return true;
        const tienePermisoMover = this.permissionService.hasPermission('tickets:move');
        const esSuTicket = ticket.asignado === this.currentUser;
        return tienePermisoMover && esSuTicket;
    }

    get puedeEditarTodo(): boolean {
        if (!this.ticketEditando) return false;
        return this.ticketEditando.creador === this.currentUser || this.permissionService.hasPermission('tickets:edit_all');
    }

    estaVencido(ticket: RoomTicket): boolean {
        if (!ticket.fechaLimite || ticket.estado === 'Finalizado') return false;
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const limite = new Date(ticket.fechaLimite);
        return limite < hoy;
    }
}
