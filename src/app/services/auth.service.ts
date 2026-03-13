import { Injectable } from '@angular/core';


export interface RegisteredUser {
    usuario: string;
    email: string;
    password: string;
    fullName: string;
    address: string;
    phone: string;
    birthDate: string;
}

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    // 1. Agregamos name y permissions a tus usuarios existentes
    private readonly HARDCODED_CREDENTIALS = [
        { email: 'admin@miapp.com', password: 'Admin@12345', name: 'Admin Jefe', permissions: ['ticket:create', 'ticket:edit_all', 'ticket:delete', 'view:dashboard', 'view:users', 'group:add', 'group:edit', 'group:delete'] },
        { email: 'usuario@miapp.com', password: 'User@12345!', name: 'Agente Soporte', permissions: ['ticket:edit_assigned', 'ticket:comment', 'view:dashboard'] },
        { email: 'test@miapp.com', password: 'Test#12345', name: 'Solo Lector', permissions: ['view:dashboard'] },
    ];

    private registeredUsers: RegisteredUser[] = [];
    private isAuthenticated = false;
    private currentUser: string = '';

    constructor() {}

    // --- FUNCIÓN PRIVADA PARA SIMULAR JWT ---
    private generateFakeJwt(email: string, name: string, permissions: string[]) {
        const payload = {
            email: email,
            name: name,
            permissions: permissions,
            exp: Date.now() + (1000 * 60 * 60 * 24) // Expira en 1 día
        };
        const payloadBase64 = btoa(JSON.stringify(payload));
        const fakeJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payloadBase64}.FirmaFalsaDeRooms4ums`;
        localStorage.setItem('token', fakeJwt);
    }

    login(email: string, password: string): { success: boolean; message: string } {
        const hardcodedMatch = this.HARDCODED_CREDENTIALS.find(
            (cred) => cred.email === email && cred.password === password
        );

        if (hardcodedMatch) {
            this.isAuthenticated = true;
            this.currentUser = hardcodedMatch.email;
            // Generar JWT con sus permisos de administrador/lector
            this.generateFakeJwt(hardcodedMatch.email, hardcodedMatch.name, hardcodedMatch.permissions);
            return { success: true, message: '¡Inicio de sesión exitoso!' };
        }

        const registeredMatch = this.registeredUsers.find(
            (user) => user.email === email && user.password === password
        );

        if (registeredMatch) {
            this.isAuthenticated = true;
            this.currentUser = registeredMatch.email;
            // A los usuarios nuevos registrados les damos permisos básicos por defecto
            const defaultPermissions = ['ticket:edit_assigned', 'ticket:comment', 'view:dashboard'];
            this.generateFakeJwt(registeredMatch.email, registeredMatch.fullName, defaultPermissions);
            return { success: true, message: '¡Inicio de sesión exitoso!' };
        }

        return { success: false, message: 'Credenciales inválidas. Verifica tu correo y contraseña.' };
    }

    register(user: RegisteredUser): { success: boolean; message: string } {
        const emailExists =
            this.HARDCODED_CREDENTIALS.some((cred) => cred.email === user.email) ||
            this.registeredUsers.some((u) => u.email === user.email);

        if (emailExists) {
            return { success: false, message: 'Este correo electrónico ya está registrado.' };
        }

        // Verificar si el usuario ya existe
        const userExists = this.registeredUsers.some((u) => u.usuario === user.usuario);
        if (userExists) {
            return { success: false, message: 'Este nombre de usuario ya está en uso.' };
        }

        this.registeredUsers.push(user);
        return { success: true, message: '¡Cuenta creada exitosamente!' };
    }

    logout(): void {
        this.isAuthenticated = false;
        this.currentUser = '';
        localStorage.removeItem('token'); // Destruimos el token al salir
    }

    isLoggedIn(): boolean {
        // Mejor revisar si existe el token
        return !!localStorage.getItem('token');
    }

    // --- LEER EL JWT PARA OBTENER DATOS Y PERMISOS ---
    private getPayload(): any {
        const token = localStorage.getItem('token');
        if (!token) return null;
        
        try {
            const payloadEncodificado = token.split('.')[1]; 
            return JSON.parse(atob(payloadEncodificado)); 
        } catch (e) {
            return null;
        }
    }

    getCurrentUser(): string {
        const payload = this.getPayload();
        // Si hay token, devolvemos el nombre, si no, devolvemos el email de tu variable original
        return payload && payload.name ? payload.name : this.currentUser;
    }

    hasPermission(permission: string): boolean {
        const payload = this.getPayload();
        if (!payload || !payload.permissions) return false;
        return payload.permissions.includes(permission);
    }

    getHardcodedCredentials(): { email: string; password: string }[] {
        // Mapeamos para no exponer el resto de los datos (name, permissions) si alguien usa esta función
        return this.HARDCODED_CREDENTIALS.map(c => ({ email: c.email, password: c.password }));
    }
}