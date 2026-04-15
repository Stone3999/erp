import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
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
import { Divider } from 'primeng/divider';
import { SelectButtonModule } from 'primeng/selectbutton';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { AuthService } from '../../services/auth.service';
import { TicketService } from '../../services/ticket.service';
import { UserService } from '../../services/user.service';
import { GroupService } from '../../services/group.service';
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
    id: number;
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
        DragDropModule, TableModule, SelectModule, Divider,
        SelectButtonModule, HasPermissionDirective
    ],
    templateUrl: './room.component.html',
    styleUrl: './room.component.css',
})
export class RoomComponent implements OnInit, AfterViewChecked {
    @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

    isLoggedIn = false;
    currentUser = '';
    groupId: string | null = null;
    chartData: any;
    chartOptions: any;
    stats = { total: 0, pendiente: 0, enProgreso: 0, revision: 0, finalizado: 0 };

    showTicketModal = false;
    nuevoTitulo: string = '';
    nuevaDescripcion: string = '';
    nuevaPrioridad: string = 'Media';
    nuevoEstado: string = 'Pendiente';
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

    constructor(
        private authService: AuthService,
        private ticketService: TicketService,
        private userService: UserService,
        private groupService: GroupService,
        private route: ActivatedRoute
    ) {}

    ngOnInit(): void {
        this.isLoggedIn = this.authService.isLoggedIn();
        this.currentUser = this.authService.getCurrentUser();
        this.groupId = this.route.snapshot.paramMap.get('id');
        this.cargarTickets();
        this.cargarMiembros();
    }

    ngAfterViewChecked() {
        this.scrollToBottom();
    }

    scrollToBottom(): void {
        try {
            this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
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
            titulo: t.titulo,
            descripcion: t.description,
            estado: t.status,
            asignado: t.assigned_to,
            creador: t.creator_name || t.created_by,
            prioridad: t.priority,
            fecha: t.created_at,
            fechaLimite: t.fechaLimite ? new Date(t.fechaLimite).toISOString().split('T')[0] : undefined,
            comentarios: (t.comments || []).map((c: any) => ({ 
                usuario: c.user_name, 
                texto: c.comment, 
                fecha: c.created_at 
            })),
            historial: (t.historial || []).map((h: any) => ({ accion: h.cambio, usuario: h.autor, fecha: h.fecha }))
        };
    }

    async cargarTickets() {
        if (!this.groupId) return;
        const response = await this.ticketService.getTicketsByGroup(this.groupId as any);
        if (response.statusCode === 200 && response.data) {
            const tickets = response.data.map(t => this.mapToRoomTicket(t));
            this.pendientes = tickets.filter(t => t.estado === 'Pendiente');
            this.enProgreso = tickets.filter(t => t.estado === 'En Progreso');
            this.revision = tickets.filter(t => t.estado === 'Revisión');
            this.finalizados = tickets.filter(t => t.estado === 'Finalizado');
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
            await this.ticketService.updateTicket(ticketMovido.id, { estado: nuevoEstado as any });
        }
    }

    updateStatsFromLists() {
        this.stats.pendiente = this.pendientes.length;
        this.stats.enProgreso = this.enProgreso.length;
        this.stats.revision = this.revision.length;
        this.stats.finalizado = this.finalizados.length;
        this.stats.total = this.stats.pendiente + this.stats.enProgreso + this.stats.revision + this.stats.finalizado;
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
        if (!this.nuevoTitulo.trim() || !this.groupId) return;

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
    }

    updateChart() {
        this.chartData = {
            labels: ['Pendiente', 'En Progreso', 'Revisión', 'Finalizado'],
            datasets: [
                {
                    data: [this.stats.pendiente, this.stats.enProgreso, this.stats.revision, this.stats.finalizado],
                    backgroundColor: ['#fbbf24', '#3b82f6', '#a78bfa', '#22c55e'],
                    hoverBackgroundColor: ['#f59e0b', '#2563eb', '#8b5cf6', '#16a34a'],
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
        
        const res = await this.ticketService.getTicketById(ticket.id);
        if (res.statusCode === 200 && res.data) {
            this.ticketEditando = this.mapToRoomTicket(res.data);
            this.nuevoComentario = '';
            this.showEditModal = true;
        }
    }

    async guardarDetalles() {
        if (!this.ticketEditando) return;

        const payload: any = {
            titulo: this.ticketEditando.titulo,
            descripcion: this.ticketEditando.descripcion,
            assigned_to: this.ticketEditando.asignado,
            status: this.ticketEditando.estado,
            priority: this.ticketEditando.prioridad,
            fechaLimite: this.ticketEditando.fechaLimite
        };

        const res = await this.ticketService.updateTicket(this.ticketEditando.id, payload);
        if (res.statusCode === 200) {
             await this.cargarTickets();
             this.showEditModal = false;
             this.ticketEditando = null;
        }
    }

    async agregarComentario() {
        if (!this.nuevoComentario.trim() || !this.ticketEditando) return;
        
        const res = await this.ticketService.addComment(this.ticketEditando.id, this.nuevoComentario, this.currentUser);
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
        if (this.filtroActivo === 'sin-asignar') return !ticket.asignado || ticket.asignado.trim() === '';
        if (this.filtroActivo === 'prioridad-alta') return ticket.prioridad === 'Alta';
        return true; 
    }

    get todosLosTickets(): any[] {
        return [...this.pendientes, ...this.enProgreso, ...this.revision, ...this.finalizados]
            .filter(t => this.cumpleFiltro(t));
    }

    puedeMoverTicket(ticket: RoomTicket): boolean {
        if (this.authService.hasPermission('tickets:edit_all')) return true;
        const tienePermisoMover = this.authService.hasPermission('tickets:move');
        const esSuTicket = ticket.asignado === this.currentUser;
        return tienePermisoMover && esSuTicket;
    }

    get puedeEditarTodo(): boolean {
        if (!this.ticketEditando) return false;
        return this.ticketEditando.creador === this.currentUser || this.authService.hasPermission('tickets:edit_all');
    }
}