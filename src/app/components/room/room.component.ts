import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext'; // Para el título del ticket
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

// IMPORTANTE: Módulos para arrastrar y soltar
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

import { AuthService } from '../../services/auth.service';
import { TicketService } from '../../services/ticket.service';

// Interfaz para la estructura del Ticket
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

export interface Ticket {
    id: number;
    titulo: string;
    descripcion?: string;
    estado: string;
    asignado: string;
    creador: string; // <-- Este es el que te falta según el error
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
        DragDropModule, TableModule, SelectModule
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

    // --- ARREGLOS DEL KANBAN ---
    pendientes: Ticket[] = [];
    enProgreso: Ticket[] = [];
    revision: Ticket[] = [];
    finalizados: Ticket[] = [];
    usuariosDisponibles: string[] = ['Admin Jefe', 'Agente Soporte', 'Solo Lector'];

    ticketCounter = 1;

    vistaTabla: boolean = false;

    get todosLosTickets(): Ticket[] {
        return [...this.pendientes, ...this.enProgreso, ...this.revision, ...this.finalizados];
    }

    constructor(
        private authService: AuthService,
        private ticketService: TicketService,
    ) {}

    ngOnInit(): void {
        this.isLoggedIn = this.authService.isLoggedIn();
        this.currentUser = this.authService.getCurrentUser();
        
        // Ponemos unos tickets de ejemplo para que no se vea vacío
        // Ponemos unos tickets de ejemplo para que no se vea vacío
        this.pendientes = [
            { 
                id: 1, 
                titulo: 'Diseñar logo', 
                descripcion: 'Se necesita el logo nuevo',
                estado: 'Pendiente', 
                asignado: 'Agente Soporte', 
                creador: 'admin@miapp.com', // <-- Nuevo
                prioridad: 'Alta', 
                fecha: new Date(),
                comentarios: [], // <-- Nuevo
                historial: [{ accion: 'Creó el ticket', usuario: 'admin@miapp.com', fecha: new Date() }] // <-- Nuevo
            }
        ];
        
        this.enProgreso = [
            { 
                id: 2, 
                titulo: 'Configurar base de datos', 
                estado: 'En Progreso', 
                asignado: 'Admin Jefe', 
                creador: 'admin@miapp.com', // <-- Nuevo
                prioridad: 'Media', 
                fecha: new Date(),
                comentarios: [], // <-- Nuevo
                historial: [{ accion: 'Creó el ticket', usuario: 'usuario@miapp.com', fecha: new Date() }] // <-- Nuevo
            }
        ];

        this.updateStatsFromLists();
    }

    // --- LÓGICA DEL DRAG AND DROP ---
    drop(event: CdkDragDrop<Ticket[]>, nuevoEstado: string) {
        if (event.previousContainer === event.container) {
            // Si lo sueltas en la misma columna, solo cambia el orden
            moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        } else {
            // Si lo cambias de columna, pásalo al nuevo arreglo y cámbiale el estado
            transferArrayItem(
                event.previousContainer.data,
                event.container.data,
                event.previousIndex,
                event.currentIndex,
            );
            // Actualizamos el estado interno de la tarjeta movida
            event.container.data[event.currentIndex].estado = nuevoEstado;
            // Recalculamos gráficas
            this.updateStatsFromLists();
        }
    }

    // --- RECALCULAR STATS BASADO EN LOS ARREGLOS ---
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
        this.nuevoTitulo = ''; // Limpiamos el input
        this.showTicketModal = true;
    }

    crearTicket() {
        if (!this.selectedStatus || !this.nuevoTitulo.trim()) return;

        const nuevoTicket: Ticket = {
            id: ++this.ticketCounter * 10,
            titulo: this.nuevoTitulo,
            descripcion: '',
            estado: this.selectedStatus,
            asignado: this.currentUser,
            creador: this.currentUser, // <-- AQUÍ LE DECIMOS QUE TÚ LO CREASTE
            prioridad: 'Media',
            fecha: new Date(),
            comentarios: [], // <-- ARREGLO VACÍO PARA EMPEZAR
            historial: [{ accion: 'Creó el ticket', usuario: this.currentUser, fecha: new Date() }] // <-- PRIMERA ACCIÓN DEL HISTORIAL
        };

        if (this.selectedStatus === 'Pendiente') this.pendientes.push(nuevoTicket);
        else if (this.selectedStatus === 'En Progreso') this.enProgreso.push(nuevoTicket);
        else if (this.selectedStatus === 'Revisión') this.revision.push(nuevoTicket);
        else if (this.selectedStatus === 'Finalizado') this.finalizados.push(nuevoTicket);
        
        this.updateStatsFromLists(); 
        this.showTicketModal = false; 
    }

    showEditModal = false;
    ticketEditando: Ticket | null = null;

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

    // Función auxiliar para obtener el color del tag de prioridad
    getPrioritySeverity(prioridad: string): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" | undefined {
        switch(prioridad) {
            case 'Alta': return 'danger';
            case 'Media': return 'warn';
            case 'Baja': return 'success';
            default: return 'info';
        }
    }

    abrirDetalles(ticket: Ticket) {
        if (!this.puedeMoverTicket(ticket)) {
            return; 
        }

        this.ticketEditando = JSON.parse(JSON.stringify(ticket));
        this.nuevoComentario = '';
        this.showEditModal = true;
        this.ticketEditando = { ...ticket };
        this.showEditModal = true;
    }

    cambiarEstado(nuevoEstado: string) {
        if (this.ticketEditando && (this.puedeEditarTodo || this.esAsignado)) {
            this.ticketEditando.estado = nuevoEstado;
        }
    }

    guardarDetalles() {
        if (!this.ticketEditando) return;

        // Buscamos a qué lista pertenece el ticket actualmente
        let listaActual: Ticket[] = [];
        if (this.ticketEditando.estado === 'Pendiente') listaActual = this.pendientes;
        else if (this.ticketEditando.estado === 'En Progreso') listaActual = this.enProgreso;
        else if (this.ticketEditando.estado === 'Revisión') listaActual = this.revision;
        else if (this.ticketEditando.estado === 'Finalizado') listaActual = this.finalizados;

        // Buscamos su posición y lo actualizamos con los nuevos datos
        const index = listaActual.findIndex(t => t.id === this.ticketEditando!.id);
        if (index !== -1) {
            listaActual[index] = { ...this.ticketEditando };
        }

        this.showEditModal = false;
        this.ticketEditando = null;
    }

    get puedeCrearTicket(): boolean {
        // ¿El JWT tiene el permiso de crear?
        return this.authService.hasPermission('ticket:create');
    }

    puedeMoverTicket(ticket: Ticket): boolean {
        return ticket.asignado === this.currentUser || this.authService.hasPermission('ticket:edit_all');
    }

    get puedeEditarTodo(): boolean {
        if (!this.ticketEditando) return false;
        // Si tú lo creaste o eres admin supremo (por el JWT), puedes editar todo el ticket
        return this.ticketEditando.creador === this.currentUser || this.authService.hasPermission('ticket:edit_all');
    }

    get esAsignado(): boolean {
        if (!this.ticketEditando) return false;
        // Eres el asignado (solo te deja comentar y cambiar de estado)
        return this.ticketEditando.asignado === this.currentUser;
    }

    agregarComentario() {
        if (!this.nuevoComentario.trim() || !this.ticketEditando) return;
        
        // 1. Metemos el mensaje al arreglo de comentarios
        this.ticketEditando.comentarios.push({
            usuario: this.currentUser,
            texto: this.nuevoComentario,
            fecha: new Date()
        });
        
        // 2. Registramos en el historial que este wey comentó
        this.ticketEditando.historial.unshift({
            accion: 'Añadió un comentario',
            usuario: this.currentUser,
            fecha: new Date()
        });

        // 3. Limpiamos el input para que pueda escribir otro
        this.nuevoComentario = '';
    }
}