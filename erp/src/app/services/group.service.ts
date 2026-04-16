import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiResponse } from './auth.service';

export interface Group {
    id: number;
    name: string;
    category: string;
    level: string;
    created_by: string;
    miembros?: number; 
    tickets?: number;  
}

import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class GroupService {
    private http = inject(HttpClient);
    private readonly API_URL = `${environment.apiUrl}/groups`;

    async getGroups(all: boolean = false): Promise<ApiResponse<Group[]>> {
        try {
            return await firstValueFrom(
                this.http.get<ApiResponse<Group[]>>(`${this.API_URL}${all ? '?all=true' : ''}`)
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
                this.http.get<ApiResponse<any[]>>(`${this.API_URL}/${groupId}/members`)
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

    async getMyPermissions(groupId: string): Promise<ApiResponse<string[]>> {
        try {
            return await firstValueFrom(
                this.http.get<ApiResponse<string[]>>(`${this.API_URL}/${groupId}/my-permissions`)
            );
        } catch (error: any) {
            return {
                statusCode: error.status || 500,
                intOpCode: 'ExGR500',
                data: null,
                message: 'Error al obtener permisos locales'
            };
        }
    }

    async updateGroupMembers(groupId: number | string, members: any[]): Promise<ApiResponse> {
        try {
            return await firstValueFrom(
                this.http.put<ApiResponse>(`${this.API_URL}/${groupId}/members`, { members })
            );
        } catch (error: any) {
            return {
                statusCode: error.status || 500,
                intOpCode: 'ExGR500',
                data: null,
                message: 'Error al actualizar miembros'
            };
        }
    }

    async createGroup(group: Partial<Group>): Promise<ApiResponse<Group>> {
        try {
            return await firstValueFrom(
                this.http.post<ApiResponse<Group>>(this.API_URL, group)
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
                this.http.patch<ApiResponse<Group>>(`${this.API_URL}/${id}`, group)
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
                this.http.delete<ApiResponse>(`${this.API_URL}/${id}`)
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
