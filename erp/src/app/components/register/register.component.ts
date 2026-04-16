import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { FluidModule } from 'primeng/fluid';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DatePickerModule } from 'primeng/datepicker';
import { InputMaskModule } from 'primeng/inputmask';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { AuthService, RegisteredUser } from '../../services/auth.service';
import { LoadingService } from '../../services/loading.service';

interface FieldError {
  [key: string]: string;
}

@Component({
  selector: 'app-register',
  standalone: true,
  providers: [MessageService],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CheckboxModule,
    CardModule,
    DividerModule,
    ToastModule,
    FluidModule,
    IconFieldModule,
    InputIconModule,
    DatePickerModule,
    InputMaskModule,
    TextareaModule,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  usuario: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  fullName: string = '';
  address: string = '';
  phone: string = '';
  birthDate: Date | null = null;
  acceptTerms: boolean = false;
  loading: boolean = false;
  fieldErrors: FieldError = {};
  showPasswordReqs: boolean = false;

  readonly SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  maxDate: Date = new Date();

  constructor(
    private router: Router,
    private authService: AuthService,
    private messageService: MessageService,
    private loadingService: LoadingService
  ) {
    this.maxDate = new Date();
    this.maxDate.setFullYear(this.maxDate.getFullYear() - 18);
  }

  get passwordChecks() {
    return {
      length: this.password.length >= 10,
      uppercase: /[A-Z]/.test(this.password),
      lowercase: /[a-z]/.test(this.password),
      number: /[0-9]/.test(this.password),
      special: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(this.password),
    };
  }

  get isFormValid(): boolean {
    return (
      this.usuario.trim() !== '' &&
      this.email.trim() !== '' &&
      this.fullName.trim() !== '' &&
      this.phone.trim() !== '' &&
      this.address.trim() !== '' &&
      this.birthDate !== null &&
      this.password !== '' &&
      this.confirmPassword !== '' &&
      this.acceptTerms
    );
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '');
    this.phone = input.value;
  }

  validateForm(): boolean {
    this.fieldErrors = {};
    let isValid = true;

    if (!this.usuario || this.usuario.trim() === '') {
      this.fieldErrors['usuario'] = 'El nombre de usuario es obligatorio.';
      isValid = false;
    }
    if (!this.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      this.fieldErrors['email'] = 'Ingresa un correo electrónico válido.';
      isValid = false;
    }
    if (!this.fullName || this.fullName.trim().length < 3) {
      this.fieldErrors['fullName'] = 'El nombre debe tener al menos 3 caracteres.';
      isValid = false;
    }
    if (!this.phone || this.phone.trim().length < 10) {
      this.fieldErrors['phone'] = 'El teléfono debe tener al menos 10 dígitos.';
      isValid = false;
    }
    if (!this.address) {
      this.fieldErrors['address'] = 'La dirección es obligatoria.';
      isValid = false;
    }
    if (!this.birthDate) {
      this.fieldErrors['birthDate'] = 'La fecha de nacimiento es obligatoria.';
      isValid = false;
    }
    const checks = this.passwordChecks;
    if (!checks.length || !checks.uppercase || !checks.lowercase || !checks.number || !checks.special) {
      this.fieldErrors['password'] = 'La contraseña no cumple los requisitos de seguridad.';
      isValid = false;
    }
    if (this.password !== this.confirmPassword) {
      this.fieldErrors['confirmPassword'] = 'Las contraseñas no coinciden.';
      isValid = false;
    }
    if (!this.acceptTerms) {
      this.fieldErrors['terms'] = 'Debes aceptar los términos.';
      isValid = false;
    }

    return isValid;
  }

  async onRegister(): Promise<void> {
    if (this.loading) return;
    if (!this.validateForm()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario inválido',
        detail: 'Revisa los campos marcados.',
      });
      return;
    }

    this.loading = true;
    this.loadingService.setLoading(true);

    const userData: RegisteredUser = {
      usuario: this.usuario.trim(),
      email: this.email.trim(),
      password: this.password,
      fullName: this.fullName.trim(),
      address: this.address.trim(),
      phone: this.phone.trim(),
      birthDate: this.birthDate ? this.birthDate.toISOString() : ''
    };

    try {
      const response = await this.authService.register(userData);

      if (response.statusCode === 201) {
        this.messageService.add({
          severity: 'success',
          summary: 'Cuenta creada',
          detail: '¡Registro exitoso! Redirigiendo al login...',
        });
        setTimeout(() => {
          this.loading = false;
          
          this.router.navigate(['/login']);
        }, 2000);
      } else if (response.statusCode === 409) {
        this.loading = false;
        this.loadingService.setLoading(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Conflicto',
          detail: 'El correo electrónico ya está registrado.',
        });
      } else {
        this.loading = false;
        this.loadingService.setLoading(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: response.message || 'No se pudo crear la cuenta',
        });
      }
    } catch (err) {
      this.loading = false;
      this.loadingService.setLoading(false);
      this.messageService.add({
        severity: 'error',
        summary: 'Error de conexión',
        detail: 'El servidor no responde.',
      });
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }
}
