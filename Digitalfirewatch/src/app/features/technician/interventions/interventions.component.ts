// src/app/features/technician/interventions/interventions.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

interface EcsPanel { id: number; panel_name: string; company_name: string; }
interface InterventionReport {
  panel_id: string;
  panel_name?: string;
  company_name?: string;
  technician_name: string;
  type: string;
  observations: string;
  status: string;
  date: string;
}

@Component({
  selector: 'app-interventions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-container no-print">
      <div class="page-header">
        <div>
          <h2 class="page-title">Intervention Reports</h2>
          <p class="page-sub">Fill out your SSI maintenance logs and generate the PDF deliverable</p>
        </div>
      </div>

      <div class="main-grid">
        <div class="card form-card">
          <h3 class="card-title">📝 New Intervention Log</h3>
          <form (ngSubmit)="submitReport()" #reportForm="ngForm">
            <div class="form-group">
              <label>Target ECS Panel *</label>
              <select [(ngModel)]="report.panel_id" name="panel_id" required class="field-select" (change)="onPanelChange()">
                <option value="">— Select Equipment —</option>
                <option *ngFor="let p of panels()" [value]="p.id">🏢 {{ p.company_name }} ➔ {{ p.panel_name }}</option>
              </select>
            </div>

            <div class="form-group">
              <label>Technician Name *</label>
              <input type="text" [(ngModel)]="report.technician_name" name="technician_name" required class="field-input">
            </div>

            <div class="form-group">
              <label>Operation Type *</label>
              <select [(ngModel)]="report.type" name="type" required class="field-select">
                <option value="Preventive Maintenance">Preventive Maintenance</option>
                <option value="Corrective Troubleshooting (TRB Issue)">Corrective Troubleshooting (TRB Issue)</option>
                <option value="Regulatory SSI Audit">Regulatory SSI Audit</option>
              </select>
            </div>

            <div class="form-group">
              <label>Observations & Technical Remarks *</label>
              <textarea [(ngModel)]="report.observations" name="observations" required class="field-textarea" rows="4" placeholder="Describe the panel status, battery levels, verification tests performed..."></textarea>
            </div>

            <button type="submit" class="btn-primary" [disabled]="!reportForm.form.valid">Preview & Export</button>
          </form>
        </div>

        <div class="card preview-card" *ngIf="submittedReport()">
          <h3 class="card-title">📄 Deliverable Preview</h3>
          <div class="document-preview">
            <div class="preview-header">
              <strong>DigiFireWatch SSI Report</strong>
              <span class="badge">Status: {{ submittedReport()?.status }}</span>
            </div>
            <hr class="divider">
            <p><strong>Company:</strong> {{ submittedReport()?.company_name }}</p>
            <p><strong>ECS Panel:</strong> {{ submittedReport()?.panel_name }}</p>
            <p><strong>Date:</strong> {{ submittedReport()?.date }}</p>
            <p><strong>Operator:</strong> {{ submittedReport()?.technician_name }}</p>
            <p><strong>Type:</strong> {{ submittedReport()?.type }}</p>
            <div class="preview-obs">
              <strong>Maintenance Log Summary:</strong>
              <p>{{ submittedReport()?.observations }}</p>
            </div>
          </div>
          <button class="btn-secondary" (click)="printPDF()">📥 Download / Print PDF</button>
        </div>
      </div>
    </div>

    <div class="print-only document-pdf" *ngIf="submittedReport()">
      <div class="pdf-header">
        <div>
          <h1>TECHNICAL INTERVENTION REPORT</h1>
          <p class="brand-slug">DigiFireWatch • Fire Safety System (SSI)</p>
        </div>
        <div class="pdf-logo">🔥</div>
      </div>
      
      <table class="pdf-meta-table">
        <tr>
          <td><strong>Client / Company:</strong></td>
          <td>{{ submittedReport()?.company_name }}</td>
          <td><strong>Execution Date:</strong></td>
          <td>{{ submittedReport()?.date }}</td>
        </tr>
        <tr>
          <td><strong>ECS Panel:</strong></td>
          <td>{{ submittedReport()?.panel_name }}</td>
          <td><strong>Intervention Type:</strong></td>
          <td>{{ submittedReport()?.type }}</td>
        </tr>
        <tr>
          <td><strong>Assigned Technician:</strong></td>
          <td colspan="3">{{ submittedReport()?.technician_name }}</td>
        </tr>
      </table>

      <div class="pdf-content-box">
        <h3>TECHNICAL REMARKS & OBSERVATIONS:</h3>
        <p class="obs-text">{{ submittedReport()?.observations }}</p>
      </div>

      <div class="pdf-footer-signatures">
        <div class="sig-box">
          <p>Technician Signature</p>
          <div class="line"></div>
        </div>
        <div class="sig-box">
          <p>Management / Admin Sign-off</p>
          <div class="line"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .space-container { display: flex; flex-direction: column; gap: 16px; font-family: 'Inter', sans-serif; color: #e8eaf0; }
    .page-title { font-size: 20px; font-weight: 700; }
    .page-sub { font-size: 13px; color: #8892a4; margin-top: -8px; }
    .main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 10px; align-items: start; }
    .card { background: #181c27; border: 1px solid #2a3045; border-radius: 14px; padding: 20px; }
    .card-title { font-size: 14px; font-weight: 600; color: #e8eaf0; margin-bottom: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    .form-group label { font-size: 12px; color: #8892a4; font-weight: 500; }
    .field-input, .field-select, .field-textarea { background: #1e2333; border: 1px solid #2a3045; border-radius: 8px; padding: 10px; color: #e8eaf0; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
    .field-input:focus, .field-select:focus, .field-textarea:focus { border-color: #457b9d; }
    .btn-primary { background: #457b9d; color: #fff; border: none; padding: 11px; border-radius: 8px; font-weight: 600; cursor: pointer; width: 100%; margin-top: 6px; }
    .btn-secondary { background: #2a9d8f; color: #fff; border: none; padding: 11px; border-radius: 8px; font-weight: 600; cursor: pointer; width: 100%; margin-top: 14px; }
    .document-preview { background: #1e2333; border: 1px solid #2a3045; border-radius: 10px; padding: 16px; font-size: 13px; line-height: 1.6; text-align: left; }
    .preview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .badge { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #2a9d8f; background: rgba(42,157,143,0.1); padding: 2px 8px; border-radius: 4px; }
    .divider { border: 0; border-top: 1px solid #2a3045; margin: 12px 0; }
    .preview-obs { background: #181c27; padding: 12px; border-radius: 8px; margin-top: 12px; border: 1px solid #2a3045; }
    .print-only { display: none; }
    @media print {
      .no-print { display: none !important; }
      .print-only { display: block !important; }
      body { background: #fff !important; color: #000 !important; }
      .document-pdf { padding: 40px; background: #fff; color: #000; text-align: left; }
      .pdf-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #000; padding-bottom: 14px; }
      .pdf-header h1 { font-size: 20px; font-weight: bold; color: #000; }
      .brand-slug { font-size: 12px; color: #555; }
      .pdf-logo { font-size: 32px; }
      .pdf-meta-table { width: 100%; border-collapse: collapse; margin-top: 24px; }
      .pdf-meta-table td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #ddd; }
      .pdf-content-box { margin-top: 32px; border: 1px solid #000; padding: 20px; min-height: 200px; }
      .pdf-content-box h3 { font-size: 13px; font-weight: bold; }
      .obs-text { font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
      .pdf-footer-signatures { display: flex; justify-content: space-between; margin-top: 60px; }
      .sig-box { text-align: center; width: 160px; font-size: 12px; font-weight: bold; }
      .sig-box .line { border-top: 1px dashed #000; margin-top: 40px; }
    }
  `]
})
export class InterventionsComponent implements OnInit {
  panels = signal<EcsPanel[]>([]);
  submittedReport = signal<InterventionReport | null>(null);

  report: InterventionReport = {
    panel_id: '',
    technician_name: '',
    type: 'Preventive Maintenance',
    observations: '',
    status: 'Submitted',
    date: ''
  };

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void {
    this.report.technician_name = this.auth.user()?.name || 'Assigned Technician';
    
    this.http.get<{ panels: EcsPanel[] }>(`${environment.apiUrl}/technician/panels`)
      .subscribe(res => this.panels.set(res.panels || []));
  }

  onPanelChange(): void {
    const selected = this.panels().find(p => p.id === Number(this.report.panel_id));
    if (selected) {
      this.report.panel_name = selected.panel_name;
      this.report.company_name = selected.company_name;
    }
  }

  submitReport(): void {
    this.report.date = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    
    if (!this.report.panel_name && this.panels().length > 0) {
      this.onPanelChange();
    }
    
    this.submittedReport.set({ ...this.report });
  }

  printPDF(): void {
    window.print();
  }
}