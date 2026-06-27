import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding:40px;text-align:center;font-family:Inter,sans-serif;color:#8892a4;">
      <div style="font-size:48px;margin-bottom:16px;">📡</div>
      <h2 style="color:#e8eaf0;font-size:22px;margin-bottom:8px;">Événements SSI</h2>
      <p>Historique temps réel de tous les événements FIRE / FAULT / RESTORE.<br>
         <strong style="color:#e63946;">API :</strong> GET /api/events — WebSocket: ws://server:10453</p>
    </div>
  `,
})
export class EventsComponent {}
