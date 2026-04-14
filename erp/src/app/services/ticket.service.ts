import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService, ApiResponse } from './auth.service';

export interface Comentario {
    autor: string;
    texto: string;
    fecha: Date;
}

export interface HistorialEntry {
    cambio: string;
    fecha: Date;
    autor: string;
}

export type EstadoTicket = 'Pendiente' | 'En Progreso' | 'Revisión' | 'Finalizado';
export type PrioridadTicket = 'Baja' | 'Media' | 'Alta' | 'Crítica';

export interface Ticket {
    id: number;
    titulo: string;
    descripcion: string;
    estado: EstadoTicket;
    asignadoA: string;
    creador: string;
    creadorNombre?: string;
    prioridad: PrioridadTicket;
    fechaCreacion: Date;
    fechaLimite?: Date;
    comentarios: Comentario[];
    historial: HistorialEntry[];
    grupoId: number;
}

import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TicketService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private readonly API_URL = `${environment.apiUrl}/tickets`;

    private getHeaders() {
        const token = this.authService.getToken();
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
    }

    private mapBackendToTicket(t: any): Ticket {
        return {
            id: t.id,
            titulo: t.title,
            descripcion: t.description,
            estado: t.status,
            asignadoA: t.assigned_to,
            creador: t.created_by,
            creadorNombre: t.creator_name || 'Sistema',
            prioridad: t.priority,
            fechaCreacion: new Date(t.created_at || new Date()),
            fechaLimite: t.due_date ? new Date(t.due_date) : undefined,
            comentarios: t.comments || [],
            historial: t.history || [],
            grupoId: t.workspace_id
        };
    }

    async getTicketsByGroup(grupoId: number): Promise<ApiResponse<Ticket[]>> {
        try {
            const res = await firstValueFrom(
                this.http.get<ApiResponse<any[]>>(`${this.API_URL}?workspace_id=${grupoId}`, { headers: this.getHeaders() })
            );
            if (res.data) {
                res.data = res.data.map(t => this.mapBackendToTicket(t));
            }
            return res as ApiResponse<Ticket[]>;
        } catch (error: any) {
            return {
                statusCode: error.status || 500,
                intOpCode: 'ExTK500',
                data: null,
                message: error.error?.message || 'Error al obtener tickets'
            };
        }
    }

    async getAllTickets(): Promise<ApiResponse<Ticket[]>> {
        try {
            const res = await firstValueFrom(
                this.http.get<ApiResponse<any[]>>(this.API_URL, { headers: this.getHeaders() })
            );
            if (res.data) {
                res.data = res.data.map(t => this.mapBackendToTicket(t));
            }
            return res as ApiResponse<Ticket[]>;
        } catch (error: any) {
            return {
                statusCode: error.status || 500,
                intOpCode: 'ExTK500',
                data: null,
                message: error.error?.message || 'Error al obtener todos los tickets'
            };
        }
    }

    async getTicketById(id: number): Promise<ApiResponse<Ticket>> {
        try {
            const res = await firstValueFrom(
                this.http.get<ApiResponse<any>>(`${this.API_URL}/${id}`, { headers: this.getHeaders() })
            );
            if (res.data) {
                res.data = this.mapBackendToTicket(res.data);
            }
            return res as ApiResponse<Ticket>;
        } catch (error: any) {
            return {
                statusCode: error.status || 500,
                intOpCode: 'ExTK500',
                data: null,
                message: error.error?.message || 'Error al obtener ticket'
            };
        }
    }

    async createTicket(ticket: Partial<Ticket>): Promise<ApiResponse<Ticket>> {
        try {
            const payload = {
                title: ticket.titulo,
                description: ticket.descripcion,
                priority: ticket.prioridad,
                status: ticket.estado,
                assigned_to: ticket.asignadoA,
                workspace_id: ticket.grupoId,
                created_by: ticket.creador
            };
            const res = await firstValueFrom(
                this.http.post<ApiResponse<any>>(this.API_URL, payload, { headers: this.getHeaders() })
            );
            if (res.data) {
                res.data = this.mapBackendToTicket(res.data);
            }
            return res as ApiResponse<Ticket>;
        } catch (error: any) {
            return {
                statusCode: error.status || 500,
                intOpCode: 'ExTK500',
                data: null,
                message: error.error?.message || 'Error al crear ticket'
            };
        }
    }

    async updateTicket(id: number, changes: Partial<Ticket>): Promise<ApiResponse<Ticket>> {
        try {
            const payload: any = {};
            if (changes.titulo) payload.title = changes.titulo;
            if (changes.descripcion) payload.description = changes.descripcion;
            if (changes.prioridad) payload.priority = changes.prioridad;
            if (changes.estado) payload.status = changes.estado;
            if (changes.asignadoA) payload.assigned_to = changes.asignadoA;
            if (changes.grupoId) payload.workspace_id = changes.grupoId;

            const res = await firstValueFrom(
                this.http.patch<ApiResponse<any>>(`${this.API_URL}/${id}`, payload, { headers: this.getHeaders() })
            );
            if (res.data) {
                res.data = this.mapBackendToTicket(res.data);
            }
            return res as ApiResponse<Ticket>;
        } catch (error: any) {
            return {
                statusCode: error.status || 500,
                intOpCode: 'ExTK500',
                data: null,
                message: error.error?.message || 'Error al actualizar ticket'
            };
        }
    }

    async deleteTicket(id: number): Promise<ApiResponse> {
        try {
            return await firstValueFrom(
                this.http.delete<ApiResponse>(`${this.API_URL}/${id}`, { headers: this.getHeaders() })
            );
        } catch (error: any) {
            return {
                statusCode: error.status || 500,
                intOpCode: 'ExTK500',
                data: null,
                message: error.error?.message || 'Error al eliminar ticket'
            };
        }
    }

    async addComment(ticketId: number, texto: string, autor: string): Promise<ApiResponse<Ticket>> {
        // En un sistema real, los comentarios podrían estar en su propia tabla.
        // Aquí, como el backend usa una columna JSONB o similar para simplificar (o no la tiene), 
        // podríamos actualizar el ticket completo con el nuevo comentario.
        // Pero el backend actual no parece tener un endpoint específico para comentarios.
        // Supongamos que actualizamos el campo 'comments' del ticket.
        
        const ticketRes = await this.getTicketById(ticketId);
        if (!ticketRes.data) return ticketRes;

        const updatedComments = [...(ticketRes.data.comentarios || []), { autor, texto, fecha: new Date() }];
        
        return await this.updateTicket(ticketId, { comentarios: updatedComments } as any);
    }
}
