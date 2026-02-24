import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, PasswordModule, CardModule],
  templateUrl: './login.html'
})
export class LoginComponent {
  loginForm = new FormGroup({
    username: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required)
  });

  constructor(private router: Router) { }

  onLogin() {
    const { username, password } = this.loginForm.value;
    if (username === 'admin@uteq.edu.mx' && password === 'Pass123!#') {
      console.log('Login exitoso');
      this.router.navigate(['/landing']);
    } else {
      alert('Usuario o contraseña incorrectos');
    }
  }
}