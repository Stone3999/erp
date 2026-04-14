import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService, ApiResponse } from './auth.service';

export interface Group {
    id: number;
    name: string;
    category: string;
    level: string;
    created_by: string;
    miembros?: number; // Calculado o de otra tabla
    tickets?: number;  // Calculado o de otra tabla
}

import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class GroupService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private readonly API_URL = `${environment.apiUrl}/groups`;

    private getHeaders() {
        const token = this.authService.getCookie('session_token');
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
    }

    async getGroups(): Promise<ApiResponse<Group[]>> {
        try {
            return await firstValueFrom(
                this.http.get<ApiResponse<Group[]>>(this.API_URL, { headers: this.getHeaders() })
            );
        } catch (error: any) {
            return {
                statusCode: error.status || 500,
                intOpCode: 'ExGR500',
                data: null,
                message: error.error?.message || 'Error al obtener grupos'
            };
        }
    }

    async getGroupMembers(groupId: number | string): Promise<ApiResponse<any[]>> {
        try {
            return await firstValueFrom(
                this.http.get<ApiResponse<any[]>>(`${this.API_URL}/${groupId}/members`, { headers: this.getHeaders() })
            );
        } catch (error: any) {
            return {
                statusCode: error.status || 500,
                intOpCode: 'ExGR500',
                data: null,
                message: 'Error al obtener miembros'
            };
        }
    }

    async createGroup(group: Partial<Group>): Promise<ApiResponse<Group>> {
        try {
            return await firstValueFrom(
                this.http.post<ApiResponse<Group>>(this.API_URL, group, { headers: this.getHeaders() })
            );
        } catch (error: any) {
            return {
                statusCode: error.status || 500,
                intOpCode: 'ExGR500',
                data: null,
                message: error.error?.message || 'Error al crear grupo'
            };
        }
    }

    async updateGroup(id: number, group: Partial<Group>): Promise<ApiResponse<Group>> {
        try {
            return await firstValueFrom(
                this.http.patch<ApiResponse<Group>>(`${this.API_URL}/${id}`, group, { headers: this.getHeaders() })
            );
        } catch (error: any) {
            return {
                statusCode: error.status || 500,
                intOpCode: 'ExGR500',
                data: null,
                message: error.error?.message || 'Error al actualizar grupo'
            };
        }
    }

    async deleteGroup(id: number): Promise<ApiResponse> {
        try {
            return await firstValueFrom(
                this.http.delete<ApiResponse>(`${this.API_URL}/${id}`, { headers: this.getHeaders() })
            );
        } catch (error: any) {
            return {
                statusCode: error.status || 500,
                intOpCode: 'ExGR500',
                data: null,
                message: error.error?.message || 'Error al eliminar grupo'
            };
        }
    }
}
