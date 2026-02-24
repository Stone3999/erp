import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, /* Módulos PrimeNG */],
  templateUrl: './register.html'
})
export class RegisterComponent {
  registerForm = new FormGroup({
    usuario: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(10),
      Validators.pattern(/^(?=.*[!@#$%^&*])/) // Símbolos: !@#$%^&*
    ]),
    confirmarPassword: new FormControl('', Validators.required),
    nombre: new FormControl('', Validators.required),
    direccion: new FormControl('', Validators.required),
    telefono: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[0-9]+$/), // Solo números
      Validators.minLength(10)
    ]),
    fechaNacimiento: new FormControl('', [Validators.required, this.validarMayorEdad])
  });

  validarMayorEdad(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const hoy = new Date();
    const cumple = new Date(control.value);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const mes = hoy.getMonth() - cumple.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < cumple.getDate())) {
      edad--;
    }
    return edad >= 18 ? null : { menorEdad: true };
  }

  onSubmit() {
    if (this.registerForm.valid) {
      console.log('Datos válidos:', this.registerForm.value);
      alert('Registro exitoso');
    }
  }
}