import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ToolbarModule } from 'primeng/toolbar';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { RippleModule } from 'primeng/ripple';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ButtonModule,
    CardModule,
    ToolbarModule,
    TagModule,
    DividerModule,
    RippleModule,
  ],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  features = [
    {
      icon: 'pi pi-shield',
      title: 'Seguridad',
      description:
        'Protección de datos con encriptación de última generación y autenticación segura.',
    },
    {
      icon: 'pi pi-bolt',
      title: 'Rendimiento',
      description:
        'Velocidad optimizada para que tu experiencia sea rápida y fluida en todo momento.',
    },
    {
      icon: 'pi pi-users',
      title: 'Comunidad',
      description:
        'Únete a miles de usuarios que ya confían en nuestra plataforma.',
    },
    {
      icon: 'pi pi-cloud',
      title: 'Nube',
      description:
        'Accede a tu información desde cualquier lugar con almacenamiento en la nube.',
    },
    {
      icon: 'pi pi-chart-line',
      title: 'Analítica',
      description:
        'Dashboards intuitivos para visualizar tus métricas en tiempo real.',
    },
    {
      icon: 'pi pi-headphones',
      title: 'Soporte 24/7',
      description:
        'Nuestro equipo está disponible las 24 horas para ayudarte en lo que necesites.',
    },
  ];
}
