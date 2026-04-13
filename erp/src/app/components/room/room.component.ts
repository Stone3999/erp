import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { AuthService } from '../../services/auth.service';
import { TicketService } from '../../services/ticket.service';
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
        HasPermissionDirective
    ],
    templateUrl: './room.component.html',
    styleUrl: './room.component.css',
})
export class RoomComponent implements OnInit {
    isLoggedIn = false;
    currentUser = '';
    chartData: any;
    chartOptions: any;
    stats = { total: 0, pendiente: 0, enProgreso: 0, revision: 0, finalizado: 0 };

    showTicketModal = false;
    selectedStatus: string | null = null;
    nuevoTitulo: string = '';
    nuevoComentario: string = '';

    pendientes: RoomTicket[] = [];
    enProgreso: RoomTicket[] = [];
    revision: RoomTicket[] = [];
    finalizados: RoomTicket[] = [];
    usuariosDisponibles: string[] = ['Admin Jefe', 'Agente Soporte', 'Solo Lector'];

    vistaTabla: boolean = false; 
    filtroActivo: string = 'todos'; 

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

    constructor(
        private authService: AuthService,
        private ticketService: TicketService,
    ) {}

    ngOnInit(): void {
        this.isLoggedIn = this.authService.isLoggedIn();
        this.currentUser = this.authService.getCurrentUser();
        this.cargarTickets();
    }
    
    private mapToRoomTicket(t: any): RoomTicket {
        return {
            id: t.id,
            titulo: t.titulo,
            descripcion: t.descripcion,
            estado: t.estado,
            asignado: t.asignadoA,
            creador: t.creador,
            prioridad: t.prioridad,
            fecha: t.fechaCreacion,
            fechaLimite: t.fechaLimite ? new Date(t.fechaLimite).toISOString().split('T')[0] : undefined,
            comentarios: (t.comentarios || []).map((c: any) => ({ usuario: c.autor, texto: c.texto, fecha: c.fecha })),
            historial: (t.historial || []).map((h: any) => ({ accion: h.cambio, usuario: h.autor, fecha: h.fecha }))
        };
    }

    async cargarTickets() {
        const response = await this.ticketService.getAllTickets();
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
            
            // Guardar en backend
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
        this.selectedStatus = null; 
        this.nuevoTitulo = ''; 
        this.showTicketModal = true;
    }

    async crearTicket() {
        if (!this.selectedStatus || !this.nuevoTitulo.trim()) return;

        const nuevoTicket: any = {
            titulo: this.nuevoTitulo,
            descripcion: '',
            estado: this.selectedStatus,
            asignadoA: this.currentUser,
            creador: this.currentUser,
            prioridad: 'Media',
            grupoId: 1 // Default
        };

        const res = await this.ticketService.createTicket(nuevoTicket);
        if (res.statusCode === 201 && res.data) {
             const created = this.mapToRoomTicket(res.data);
             if (this.selectedStatus === 'Pendiente') this.pendientes.push(created);
             else if (this.selectedStatus === 'En Progreso') this.enProgreso.push(created);
             else if (this.selectedStatus === 'Revisión') this.revision.push(created);
             else if (this.selectedStatus === 'Finalizado') this.finalizados.push(created);
             
             this.updateStatsFromLists(); 
        }
        this.showTicketModal = false; 
    }

    showEditModal = false;
    ticketEditando: RoomTicket | null = null;

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

    getPrioritySeverity(prioridad: string): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" | undefined {
        switch(prioridad) {
            case 'Alta': return 'danger';
            case 'Media': return 'warn';
            case 'Baja': return 'success';
            default: return 'info';
        }
    }

    abrirDetalles(ticket: RoomTicket) {
        if (!this.puedeMoverTicket(ticket)) return; 
        this.ticketEditando = JSON.parse(JSON.stringify(ticket));
        this.nuevoComentario = '';
        this.showEditModal = true;
    }

    cambiarEstado(nuevoEstado: string) {
        if (this.ticketEditando && (this.puedeEditarTodo || this.esAsignado)) {
            this.ticketEditando.estado = nuevoEstado;
        }
    }

    async guardarDetalles() {
        if (!this.ticketEditando) return;

        const payload: any = {
            titulo: this.ticketEditando.titulo,
            descripcion: this.ticketEditando.descripcion,
            asignadoA: this.ticketEditando.asignado,
            estado: this.ticketEditando.estado,
            prioridad: this.ticketEditando.prioridad,
        };

        const res = await this.ticketService.updateTicket(this.ticketEditando.id, payload);
        if (res.statusCode === 200 && res.data) {
             await this.cargarTickets(); // Recargamos para organizar las listas
        }

        this.showEditModal = false;
        this.ticketEditando = null;
    }

    get puedeCrearTicket(): boolean {
        return this.authService.hasPermission('tickets:add');
    }

    puedeMoverTicket(ticket: RoomTicket): boolean {
        const tienePermiso = this.authService.hasPermission('tickets:move');
        const esAsignado = ticket.asignado === this.currentUser;
        return (esAsignado && tienePermiso) || this.authService.hasPermission('tickets:edit_all');
    }

    get puedeEditarTodo(): boolean {
        if (!this.ticketEditando) return false;
        return this.ticketEditando.creador === this.currentUser || this.authService.hasPermission('tickets:edit_all');
    }

    get esAsignado(): boolean {
        if (!this.ticketEditando) return false;
        return this.ticketEditando.asignado === this.currentUser;
    }

    async agregarComentario() {
        if (!this.nuevoComentario.trim() || !this.ticketEditando) return;
        
        await this.ticketService.addComment(this.ticketEditando.id, this.nuevoComentario, this.currentUser);
        this.ticketEditando.comentarios = this.ticketEditando.comentarios || [];
        this.ticketEditando.comentarios.push({
            usuario: this.currentUser,
            texto: this.nuevoComentario,
            fecha: new Date()
        });
        this.nuevoComentario = '';
    }
}