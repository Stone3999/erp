import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router'; // <--- ESTO quita el error de routerLink
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    ButtonModule,
    RouterModule // <--- Sin esto, p-button no entiende qué es [routerLink]
  ],
  templateUrl: './landing.html',
  styleUrl: './landing.css'
})
export class Landing {
  // El signal para el título que tenías en tu HTML original
  title = signal('Antigravity');

  onButtonClick() {
    console.log('Validación de PrimeNG exitosa');
  }
}