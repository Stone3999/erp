import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService, ApiResponse } from './auth.service';

export interface User {
    id: number;
    email: string;
    name: string;
    permissions: string[];
}

import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class UserService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private readonly API_URL = `${environment.apiUrl}/users`;

    private getHeaders() {
        const token = this.authService.getToken();
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
    }

    async getUsers(): Promise<ApiResponse<User[]>> {
        try {
            return await firstValueFrom(
                this.http.get<ApiResponse<User[]>>(this.API_URL, { headers: this.getHeaders() })
            );
        } catch (error: any) {
            return {
                statusCode: error.status || 500,
                intOpCode: 'ExUS500',
                data: null,
                message: error.error?.message || 'Error al obtener usuarios'
            };
        }
    }

    async updatePermissions(id: number, permissions: string[]): Promise<ApiResponse<User>> {
        try {
            return await firstValueFrom(
                this.http.patch<ApiResponse<User>>(`${this.API_URL}/${id}/permissions`, { permissions }, { headers: this.getHeaders() })
            );
        } catch (error: any) {
            return {
                statusCode: error.status || 500,
                intOpCode: 'ExUS500',
                data: null,
                message: error.error?.message || 'Error al actualizar permisos'
            };
        }
    }
}
