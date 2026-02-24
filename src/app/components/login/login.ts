import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, PasswordModule, CardModule, RouterModule],
  templateUrl: './login.html'
})
export class Login {
  loginForm = new FormGroup({
    username: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required)
  });

  constructor(private router: Router) { }

  onLogin() {
    const { username, password } = this.loginForm.value;
    if (username === 'admin@uteq.edu.mx' && password === 'Admin123!#') {
      alert('¡Acceso concedido!');
      this.router.navigate(['/']);
    } else {
      alert('Credenciales inválidas. Intenta de nuevo.');
    }
  }
}