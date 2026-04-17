import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiResponse } from './auth.service';

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
    private readonly API_URL = `${environment.apiUrl}/tickets`;

    async getTicketsByGroup(grupoId: number): Promise<ApiResponse<any[]>> {
        try {
            return await firstValueFrom(
                this.http.get<ApiResponse<any[]>>(`${this.API_URL}?workspace_id=${grupoId}`)
            );
        } catch (error: any) {
            return {
                statusCode: error.status || 500,
                intOpCode: 'ExTK500',
                data: null,
                message: error.error?.message || 'Error al obtener tickets'
            };
        }
    }

    async getAllTickets(): Promise<ApiResponse<any[]>> {
        try {
            return await firstValueFrom(
                this.http.get<ApiResponse<any[]>>(this.API_URL)
            );
        } catch (error: any) {
            return {
                statusCode: error.status || 500,
                intOpCode: 'ExTK500',
                data: null,
                message: error.error?.message || 'Error al obtener todos los tickets'
            };
        }
    }

    async getTicketById(id: number): Promise<ApiResponse<any>> {
        try {
            return await firstValueFrom(
                this.http.get<ApiResponse<any>>(`${this.API_URL}/${id}`)
            );
        } catch (error: any) {
            return {
                statusCode: error.status || 500,
                intOpCode: 'ExTK500',
                data: null,
                message: error.error?.message || 'Error al obtener ticket'
            };
        }
    }

    async createTicket(ticket: any): Promise<ApiResponse<any>> {
        try {
            const workspaceId = ticket.workspace_id || ticket.grupoId;
            return await firstValueFrom(
                this.http.post<ApiResponse<any>>(this.API_URL, ticket, {
                    headers: { 'x-workspace-id': workspaceId?.toString() || '' }
                })
            );
        } catch (error: any) {
            return {
                statusCode: error.status || 500,
                intOpCode: 'ExTK500',
                data: null,
                message: error.error?.message || 'Error al crear ticket'
            };
        }
    }

    async updateTicket(id: number, payload: any): Promise<ApiResponse<any>> {
        try {
            const workspaceId = payload.workspace_id || '';
            return await firstValueFrom(
                this.http.patch<ApiResponse<any>>(`${this.API_URL}/${id}`, payload, {
                    headers: { 'x-workspace-id': workspaceId?.toString() || '' }
                })
            );
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
                this.http.delete<ApiResponse>(`${this.API_URL}/${id}`)
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

    async addComment(ticketId: number, comment: string, user_name: string): Promise<ApiResponse<any>> {
        try {
            return await firstValueFrom(
                this.http.post<ApiResponse<any>>(`${this.API_URL}/${ticketId}/comments`, { comment, user_name })
            );
        } catch (error: any) {
            return {
                statusCode: error.status || 500,
                intOpCode: 'ExTK500',
                data: null,
                message: 'Error al añadir comentario'
            };
        }
    }
}
