// src/app/features/admin/clients/clients.component.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

interface Client {
  id: number;
  company_name: string;
  hq_address: string | null;
  city: string | null;
  dir_securite_name: string; dir_securite_phone: string; dir_securite_email: string;
  dir_technique_name: string; dir_technique_phone: string; dir_technique_email: string;
  adj_technique_name: string; adj_technique_phone: string; adj_technique_email: string;
}

interface EcsPanel {
  id: number; client_id: number; panel_name: string; panel_model: string;
  trb_imei: string | null; ref_broudi: string | null;
  niveau_securite: string | null; lignes_detection: string | null;
  resume_installation: string | null; location_details: string;
  norme: string; has_cmsi: number; has_printer: number; loop_count: number;
  equipment_breakdown_json: string;
  gw_status?: string;
}

interface AvailableTrb { imei: string; trb_id: string; status: string; }

interface CustomComponentRow {
  key: string;
  label: string;
  value: number;
}

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="clients-container">
      <div class="page-header">
        <div>
          <h1 class="title">🏢 Single-Page Supervision (Parent Companies & ECS Panels)</h1>
          <p class="subtitle">Global management of legal entities, safety contacts, and TRB modem pairing</p>
        </div>
        <button class="btn-primary" (click)="openClientModal()">＋ Add a Company</button>
      </div>

      <div class="search-container-wrap">
        <div class="search-wrap-input">
          <span class="search-icon-lens">🔍</span>
          <input 
            type="text" 
            [value]="searchTerm()" 
            (input)="onSearchChange($event)"
            placeholder="Search by company name, city, address, or point of contact..." 
            class="search-input-field"
          />
          <button *ngIf="searchTerm()" class="btn-clear-search" (click)="clearSearch()">✕</button>
        </div>
      </div>

      <div class="clients-grid">
        <div class="empty-state" *ngIf="filteredClients().length === 0">
          {{ searchTerm() ? 'No company matches your search criteria.' : 'No companies found.' }}
        </div>

        <div class="client-master-card" *ngFor="let c of filteredClients()">
          <div class="client-main-row" (click)="toggleClientPanels(c.id)">
            <div class="card-left">
              <div class="client-avatar">{{ c.company_name[0].toUpperCase() }}</div>
              <div class="client-info">
                <span class="client-name">{{ c.company_name }}</span>
                <span class="client-city">📍 {{ c.hq_address || 'Unspecified' }}, {{ c.city || 'Morocco' }}</span>
              </div>
            </div>
            
            <div class="contacts-summary-preview">
              <div class="mini-contact-pill">🛡️ Sec: {{ c.dir_securite_name }}</div>
              <div class="mini-contact-pill">⚙️ Tech: {{ c.dir_technique_name }}</div>
            </div>

            <div class="card-actions" (click)="$event.stopPropagation()">
              <button class="btn-panel-toggle" (click)="toggleClientPanels(c.id)">
                {{ selectedClientId() === c.id ? '🔼 Hide' : '🔽 ECS Panels / SSI' }}
              </button>
              <button class="btn-delete" (click)="deleteClient(c.id)">🗑️</button>
            </div>
          </div>

          <div class="client-panels-accordion" *ngIf="selectedClientId() === c.id">
            <div class="accordion-header">
              <h4>📋 Inventory of Safety Equipment (ECS)</h4>
              <button class="btn-secondary small" (click)="openPanelModal(c.id)">＋ Create an ECS Panel (SSI)</button>
            </div>

            <div class="empty-state" *ngIf="panels().length === 0">No ECS panels installed for this client.</div>

            <div class="panels-list" *ngIf="panels().length > 0">
              <div class="panel-item-card" *ngFor="let p of panels()">
                <div class="panel-meta-info" (click)="openReadOnlyModal(p); $event.stopPropagation();" style="cursor: pointer;" title="Click to view material summary">
                  <span class="p-name">
                    {{ p.panel_name }} 
                    <span class="norme-badge-ui">{{ p.norme }}</span>
                    <small class="mono-badge">{{ p.panel_model }}</small>
                    <button class="btn-delete-mini" (click)="deletePanel(p); $event.stopPropagation();" title="Permanently delete this ECS central unit">🗑️</button>
                  </span>
                  <span class="p-summary">🔧 <strong>Material Summary (Click to View):</strong> {{ p.resume_installation || 'No equipment configured.' }}</span>
                  <span class="p-security-lines">🛡️ <strong>SL:</strong> {{ p.niveau_securite || 'N/A' }} | <strong>Loops:</strong> {{ p.loop_count }} | <strong>Ref:</strong> {{ p.ref_broudi || 'N/A' }}</span>
                  <span class="p-security-lines" style="color: #8892a4; margin-top: 2px;">🛰️ Printer: <strong>{{ p.has_printer ? 'Yes' : 'No' }}</strong> | CMSI: <strong>{{ p.has_cmsi ? 'Yes' : 'No' }}</strong> | Loc: {{ p.location_details }}</span>
                </div>

                <div class="panel-trb-binding">
                  <div class="binding-status" *ngIf="p.trb_imei">
                    <span class="status-chip online"><span class="dot"></span>Linked IMEI: {{ p.trb_imei }}</span>
                    <button class="btn-danger small" (click)="removeTrb(p)">Disconnect</button>
                  </div>
                  <div class="binding-action" *ngIf="!p.trb_imei">
                    <button class="btn-secondary small" style="margin-right:8px; border-color: #f4a261; color: #f4a261;" (click)="openViewInventoryModal(p); $event.stopPropagation();">📝 Configure Summary</button>
                    <select class="field-select small-select" #trbSelect>
                      <option value="">— Associate a TRB (IMEI) —</option>
                      <option *ngFor="let t of availableTrbs()" [value]="t.imei">
                        {{ t.trb_id }} [{{ t.imei }}]
                      </option>
                    </select>
                    <button class="btn-primary small" (click)="assignTrb(p, trbSelect.value)">Link</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-overlay" *ngIf="isClientModalOpen()">
        <div class="modal-card wide-modal">
          <div class="modal-header">
            <h3>Create a Company Profile (Parent Company)</h3>
            <button class="btn-close" (click)="closeClientModal()">✕</button>
          </div>
          <form (ngSubmit)="createClient()" #clientForm="ngForm">
            <div class="form-body grid-form">
              <div class="form-group full-width">
                <label>Company Name / Parent Company *</label>
                <input type="text" [(ngModel)]="newClient.company_name" name="company_name" required placeholder="E.g., Marriott Hotels Morocco">
              </div>
              <div class="form-group">
                <label>Headquarters Address</label>
                <input type="text" [(ngModel)]="newClient.hq_address" name="hq_address" placeholder="E.g., Boulevard de la Corniche">
              </div>
              <div class="form-group">
                <label>City</label>
                <input type="text" [(ngModel)]="newClient.city" name="city" placeholder="E.g., Casablanca">
              </div>

              <div class="contact-section-title">🛡️ Security Director (Mandatory)</div>
              <div class="form-group"><label>Full Name *</label><input type="text" [(ngModel)]="newClient.dir_securite_name" name="ds_n" required></div>
              <div class="form-group"><label>Phone Number *</label><input type="text" [(ngModel)]="newClient.dir_securite_phone" name="ds_p" required></div>
              <div class="form-group full-width"><label>Email Address <span class="optional-tag">(Optional)</span></label><input type="email" [(ngModel)]="newClient.dir_securite_email" name="ds_e"></div>

              <div class="contact-section-title">⚙️ Technical Director (Mandatory)</div>
              <div class="form-group"><label>Full Name *</label><input type="text" [(ngModel)]="newClient.dir_technique_name" name="dt_n" required></div>
              <div class="form-group"><label>Phone Number *</label><input type="text" [(ngModel)]="newClient.dir_technique_phone" name="dt_p" required></div>
              <div class="form-group full-width"><label>Email Address <span class="optional-tag">(Optional)</span></label><input type="email" [(ngModel)]="newClient.dir_technique_email" name="dt_e"></div>

              <div class="contact-section-title">🤝 Deputy Technical Director (Mandatory)</div>
              <div class="form-group"><label>Full Name *</label><input type="text" [(ngModel)]="newClient.adj_technique_name" name="dat_n" required></div>
              <div class="form-group"><label>Phone Number *</label><input type="text" [(ngModel)]="newClient.adj_technique_phone" name="dat_p" required></div>
              <div class="form-group full-width"><label>Email Address <span class="optional-tag">(Optional)</span></label><input type="email" [(ngModel)]="newClient.adj_technique_email" name="dat_e"></div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="closeClientModal()">Cancel</button>
              <button type="submit" class="btn-submit" [disabled]="!clientForm.form.valid">Save Company Profile</button>
            </div>
          </form>
        </div>
      </div>

      <div class="modal-overlay" *ngIf="isPanelModalOpen()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>New Detection Central Unit (ECS / SSI)</h3>
            <button class="btn-close" (click)="closePanelModal()">✕</button>
          </div>
          <form (ngSubmit)="createPanel()" #panelForm="ngForm">
            <div class="form-body" style="max-height: 70vh; overflow-y: auto;">
              <div class="form-group">
                <label>Panel Name / Internal Identifier *</label>
                <input type="text" [(ngModel)]="newPanel.panel_name" name="p_name" required placeholder="E.g., Central Kitchen Block B">
              </div>
              <div class="form-group">
                <label>Central Unit Model (Manufacturer) *</label>
                <input type="text" [(ngModel)]="newPanel.panel_model" name="p_model" required placeholder="E.g., Baltic S12 or Esser IQ8">
              </div>

              <div class="form-group">
                <label>Technical Reference (Broudi/Chubb)</label>
                <input type="text" [(ngModel)]="newPanel.ref_broudi" name="p_ref" placeholder="E.g., BR-9982-X">
              </div>
              <div class="form-group">
                <label>Security Level (SL)</label>
                <input type="text" [(ngModel)]="newPanel.niveau_securite" name="p_ns" placeholder="E.g., Category A">
              </div>

              <div class="form-group">
                <label style="font-weight: 600; color: #e63946;">Applicable Regulatory Standard *</label>
                <div style="display: flex; gap: 20px; margin-top: 4px;">
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="radio" name="norme" value="NF" [(ngModel)]="newPanel.norme" checked> French Standard (NF)
                  </label>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="radio" name="norme" value="EN" [(ngModel)]="newPanel.norme"> European Standard (EN)
                  </label>
                </div>
              </div>

              <div class="form-group" style="background: rgba(255,255,255,0.02); padding: 10px; border-radius: 8px; border: 1px solid #2a3045;">
                <label style="font-weight: 600; margin-bottom: 6px;">Onboard Built-in Equipment:</label>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" name="has_printer" [(ngModel)]="newPanel.has_printer"> Integrated report printer
                  </label>
                  <label *ngIf="newPanel.norme === 'NF'" style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #f4a261;">
                    <input type="checkbox" name="has_cmsi" [(ngModel)]="newPanel.has_cmsi"> Safety Centralization Unit (CMSI) present
                  </label>
                </div>
              </div>

              <div class="form-group">
                <label>Number of Detection Loops *</label>
                <select [(ngModel)]="newPanel.loop_count" name="loop_count" class="field-select" required style="width: 100%;">
                  <option *ngFor="let num of [1,2,3,4,5,6,7,8]" [value]="num">Loop {{ num }}</option>
                </select>
              </div>

              <div class="form-group">
                <label>Precise Location inside Building *</label>
                <input type="text" [(ngModel)]="newPanel.location_details" name="p_loc" required placeholder="E.g., Ground Floor Technical Room, North Wing">
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="closePanelModal()">Cancel</button>
              <button type="submit" class="btn-submit" [disabled]="!panelForm.form.valid">Install ECS Panel</button>
            </div>
          </form>
        </div>
      </div>

      <div class="modal-overlay" *ngIf="isViewInventoryOpen()">
        <div class="modal-card wide-modal" style="background: #151824;">
          <div class="modal-header">
            <h3>📝 Configure Material Summary — {{ selectedPanelForInventory()?.panel_name }}</h3>
            <button class="btn-close" (click)="closeViewInventoryModal()">✕</button>
          </div>
          <div class="form-body" style="max-height: 60vh; overflow-y: auto;">
            <p style="font-size: 13px; color: #8892a4; margin-bottom: 12px;">
              Modify component quantities. You can add any new system component on the fly.
            </p>

            <table class="inventory-table-edit">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Technical Designation</th>
                  <th>Quantity</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of dynamicInventoryRows; let i = index">
                  <td><span class="mono" style="color: #f4a261;">{{ row.key }}</span></td>
                  <td><input type="text" class="input-inline-table" [(ngModel)]="row.label" style="width:100%; background:transparent; border:none; color:#fff;" /></td>
                  <td><input type="number" class="inv-table-input" [(ngModel)]="row.value" min="0"></td>
                  <td><button type="button" class="btn-delete-mini" (click)="removeDynamicRow(i)">✕</button></td>
                </tr>
              </tbody>
            </table>

            <div class="add-custom-component-bar" style="margin-top: 16px; padding: 12px; background: rgba(255,255,255,0.02); border: 1px dashed #2a3045; border-radius: 8px; display: flex; gap: 10px; align-items: center;">
              <input type="text" placeholder="Code (E.g., Doptique)" [(ngModel)]="customFieldFields.key" class="form-group-input-custom" style="width: 30%;">
              <input type="text" placeholder="Description" [(ngModel)]="customFieldFields.label" class="form-group-input-custom" style="flex:1;">
              <button type="button" class="btn-primary small" (click)="addCustomRowToInventory()" style="background:#2a9d8f;">＋ Add Component</button>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" (click)="closeViewInventoryModal()">Cancel</button>
            <button type="button" class="btn-submit" (click)="saveInventoryBreakdown()">Save Inventory</button>
          </div>
        </div>
      </div>

      <div class="modal-overlay" *ngIf="isReadOnlyModalOpen()">
        <div class="modal-card">
          <div class="modal-header" style="border-bottom: 1px solid #2a3045;">
            <h3>📊 Material Breakdown Preview</h3>
            <button class="btn-close" (click)="closeReadOnlyModal()">✕</button>
          </div>
          <div class="form-body" style="text-align: center; padding: 24px;">
            <h4 style="font-size: 16px; color: #fff; margin-bottom: 8px;">{{ activeReadOnlyPanel()?.panel_name }}</h4>
            <p style="font-size: 12px; color: #8892a4; font-family: 'JetBrains Mono', monospace; margin-bottom: 20px;">
              Model: {{ activeReadOnlyPanel()?.panel_model }} | Standard: {{ activeReadOnlyPanel()?.norme }}
            </p>
            
            <div style="background: #0f1117; border: 1px solid #2a3045; padding: 20px; border-radius: 12px; text-align: left; line-height: 1.6; font-size: 14px; color: #2a9d8f; font-weight: 500;">
              🚀 {{ activeReadOnlyPanel()?.resume_installation || 'No equipment components are currently configured on this central unit.' }}
            </div>
          </div>
          <div class="modal-footer" style="background: #151824;">
            <button type="button" class="btn-primary" (click)="closeReadOnlyModal()" style="width: 100%;">Close Window</button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .clients-container { padding: 32px; font-family: 'Inter', sans-serif; color: #f3f4f6; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .title { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
    .subtitle { font-size: 13px; color: #9ca3af; margin-top: 4px; }
    .search-container-wrap { margin-bottom: 24px; max-width: 900px; width: 100%; }
    .search-wrap-input { display: flex; align-items: center; gap: 10px; background: #181c27; border: 1px solid #2a3045; border-radius: 12px; padding: 10px 16px; transition: border-color 0.2s; position: relative; }
    .search-wrap-input:focus-within { border-color: #e63946; }
    .search-icon-lens { font-size: 14px; color: #8892a4; }
    .search-input-field { background: transparent; border: none; outline: none; width: 100%; color: #fff; font-size: 14px; font-family: 'Inter', sans-serif; padding-right: 24px; }
    .search-input-field::placeholder { color: #5a6378; }
    .btn-clear-search { background: transparent; border: none; color: #8892a4; font-size: 18px; cursor: pointer; position: absolute; right: 16px; top: 50%; transform: translateY(-50%); padding: 0; line-height: 1; }
    .btn-clear-search:hover { color: #fff; }
    .btn-primary { background: #e63946; color: #fff; border: none; padding: 10px 18px; border-radius: 10px; font-weight: 600; cursor: pointer; }
    .btn-secondary { background: none; border: 1px solid #2a3045; color: #8892a4; padding: 8px 16px; border-radius: 8px; cursor: pointer; }
    .btn-danger { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; border-radius: 6px; cursor: pointer; }
    .small { padding: 4px 8px; font-size: 11px; }
    .clients-grid { display: flex; flex-direction: column; gap: 16px; width: 100%; max-width: 900px; }
    .client-master-card { background: #181c27; border: 1px solid #2a3045; border-radius: 14px; overflow: hidden; }
    .client-main-row { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; cursor: pointer; transition: background 0.2s; }
    .client-main-row:hover { background: #1e2333; }
    .card-left { display: flex; align-items: center; gap: 14px; }
    .client-avatar { width: 44px; height: 44px; border-radius: 50%; background: #e63946; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; flex-shrink: 0; }
    .client-name { display: block; font-size: 16px; font-weight: 600; }
    .client-city { display: block; font-size: 12px; color: #8892a4; margin-top: 2px; }
    .contacts-summary-preview { display: flex; gap: 8px; }
    .mini-contact-pill { font-size: 11px; background: #0f1117; padding: 4px 8px; border-radius: 6px; color: #9ca3af; border: 1px solid #2a3045; }
    .card-actions { display: flex; align-items: center; gap: 10px; }
    .btn-panel-toggle { background: #2a3045; border: none; color: #fff; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 500; cursor: pointer; }
    .btn-delete { background: none; border: none; cursor: pointer; font-size: 16px; }
    .client-panels-accordion { background: #0f1117; padding: 20px; border-top: 1px solid #2a3045; border-bottom-left-radius: 14px; border-bottom-right-radius: 14px; }
    .accordion-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px dashed #2a3045; padding-bottom: 8px; }
    .accordion-header h4 { font-size: 13px; color: #8892a4; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .panels-list { display: flex; flex-direction: column; gap: 10px; }
    .panel-item-card { display: flex; justify-content: space-between; align-items: center; background: #181c27; border: 1px solid #2a3045; border-radius: 10px; padding: 12px 16px; }
    .panel-meta-info { display: flex; flex-direction: column; gap: 4px; text-align: left; }
    .p-name { font-size: 14px; font-weight: 600; color: #fff; display: flex; align-items: center; gap: 8px; }
    .norme-badge-ui { font-size: 10px; font-weight: 700; background: #2a9d8f; color: #fff; padding: 1px 5px; border-radius: 4px; }
    .mono-badge { font-family: 'JetBrains Mono', monospace; font-size: 11px; background: #e63946; color: #fff; padding: 1px 6px; border-radius: 4px; }
    .p-summary { font-size: 12px; color: #9ca3af; }
    .p-security-lines { font-size: 11px; color: #6b7280; }
    .btn-delete-mini { background: transparent; border: none; cursor: pointer; font-size: 12px; padding: 2px 6px; border-radius: 4px; }
    .panel-trb-binding { display: flex; align-items: center; gap: 10px; }
    .binding-status { display: flex; align-items: center; gap: 8px; }
    .status-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-family: 'JetBrains Mono', monospace; font-weight: 600; }
    .status-chip.online { color: #2a9d8f; background: rgba(42,157,143,0.1); border: 1px solid rgba(42,157,143,0.2); }
    .status-chip .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .field-select { background: #0f1117; border: 1px solid #2a3045; border-radius: 6px; color: #fff; padding: 6px 10px; font-size: 12px; outline: none; }
    .small-select { width: 220px; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 999; }
    .modal-card { background: #1e2333; border: 1px solid #2a3045; border-radius: 16px; width: 100%; max-width: 460px; overflow: hidden; }
    .wide-modal { max-width: 650px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; }
    .btn-close { background: none; border: none; color: #8892a4; font-size: 24px; cursor: pointer; }
    .form-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; text-align: left; }
    .grid-form { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-height: 75vh; overflow-y: auto; }
    .full-width { grid-column: span 2; }
    .contact-section-title { grid-column: span 2; font-size: 12px; font-weight: 700; color: #e63946; text-transform: uppercase; border-bottom: 1px solid #2a3045; padding-top: 10px; padding-bottom: 4px; }
    .optional-tag { font-size: 10px; color: #8892a4; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group label { font-size: 11px; color: #8892a4; }
    .form-group input { background: #181c27; border: 1px solid #2a3045; border-radius: 8px; padding: 9px; color: #fff; font-size: 13px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 20px; border-top: 1px solid #2a3045; background: #151824; }
    .btn-submit { background: #e63946; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .empty-state { color: #6b7280; font-size: 12px; text-align: center; padding: 20px; }
    
    .inventory-table-edit { width: 100%; border-collapse: collapse; margin-top: 10px; background: #181c27; border: 1px solid #2a3045; border-radius: 8px; overflow: hidden; }
    .inventory-table-edit th { background: #1e2333; color: #8892a4; font-size: 11px; text-transform: uppercase; padding: 10px; text-align: left; }
    .inventory-table-edit td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #2a3045; color: #e5e7eb; }
    .inv-table-input { width: 70px; background: #0f1117; border: 1px solid #2a3045; border-radius: 6px; padding: 4px 8px; color: #fff; text-align: center; font-family: 'JetBrains Mono', monospace; }
    .form-group-input-custom { background: #0f1117; border: 1px solid #2a3045; border-radius: 6px; padding: 8px 12px; color: #fff; font-size: 13px; outline: none; }
  `]
})
export class ClientsComponent implements OnInit {
  clients = signal<Client[]>([]);
  panels = signal<EcsPanel[]>([]);
  availableTrbs = signal<AvailableTrb[]>([]);

  selectedClientId = signal<number | null>(null);
  isClientModalOpen = signal<boolean>(false);
  isPanelModalOpen = signal<boolean>(false);

  isViewInventoryOpen = signal<boolean>(false);
  selectedPanelForInventory = signal<EcsPanel | null>(null);
  dynamicInventoryRows: CustomComponentRow[] = [];
  customFieldFields = { key: '', label: '' };

  isReadOnlyModalOpen = signal<boolean>(false);
  activeReadOnlyPanel = signal<EcsPanel | null>(null);

  searchTerm = signal<string>('');

  filteredClients = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    if (!query) return this.clients();
    return this.clients().filter(c => c.company_name.toLowerCase().includes(query) || (c.city || '').toLowerCase().includes(query));
  });

  newClient = {
    company_name: '', hq_address: '', city: '',
    dir_securite_name: '', dir_securite_phone: '', dir_securite_email: '',
    dir_technique_name: '', dir_technique_phone: '', dir_technique_email: '',
    adj_technique_name: '', adj_technique_phone: '', adj_technique_email: ''
  };

  newPanel = {
    panel_name: '', panel_model: '', ref_broudi: '',
    niveau_securite: '', lignes_detection: '', resume_installation: '', location_details: '',
    norme: 'NF', has_cmsi: false, has_printer: false, loop_count: 1
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadClients();
    this.loadAvailableTrbs();
  }

  onSearchChange(event: Event): void { this.searchTerm.set((event.target as HTMLInputElement).value); }
  clearSearch(): void { this.searchTerm.set(''); }

  loadClients(): void {
    this.http.get<{ clients: Client[] }>(`${environment.apiUrl}/admin/clients`).subscribe(res => this.clients.set(res.clients || []));
  }

  loadAvailableTrbs(): void {
    this.http.get<{ devices: AvailableTrb[] }>(`${environment.apiUrl}/admin/trb-devices`).subscribe(res => {
      this.availableTrbs.set((res.devices || []).filter(d => d.status !== 'claimed'));
    });
  }

  toggleClientPanels(clientId: number): void {
    if (this.selectedClientId() === clientId) {
      this.selectedClientId.set(null);
      this.panels.set([]);
    } else {
      this.selectedClientId.set(clientId);
      this.loadClientPanels(clientId);
    }
  }

  loadClientPanels(clientId: number): void {
    this.http.get<{ panels: EcsPanel[] }>(`${environment.apiUrl}/admin/ecs-panels?client_id=${clientId}`).subscribe(res => this.panels.set(res.panels || []));
  }

  openReadOnlyModal(panel: EcsPanel): void {
    this.activeReadOnlyPanel.set(panel);
    this.isReadOnlyModalOpen.set(true);
  }
  closeReadOnlyModal(): void { this.isReadOnlyModalOpen.set(false); }

  openViewInventoryModal(panel: EcsPanel): void {
    this.selectedPanelForInventory.set(panel);
    this.customFieldFields = { key: '', label: '' };
    
    let rows: CustomComponentRow[] = [];
    try {
      if (panel.equipment_breakdown_json && panel.equipment_breakdown_json !== '{}') {
        const parsed = JSON.parse(panel.equipment_breakdown_json);
        if (Array.isArray(parsed)) {
          rows = parsed;
        }
      }
    } catch(e) {}

    if (rows.length === 0) {
      rows = [
        { key: 'Doptique', label: 'Détecteur Optique de Fumée', value: 0 },
        { key: 'Dth', label: 'Détecteur Thermostatique', value: 0 },
        { key: 'DM', label: 'Déclencheur Manuel Rouge', value: 0 },
        { key: 'DMC', label: 'Déclencheur Manuel Connecté', value: 0 },
        { key: 'DCO', label: 'Détecteur de Monoxyde (CO)', value: 0 },
        { key: 'Det linéaire', label: 'Détecteur Linéaire', value: 0 },
        { key: 'Det de flowe', label: 'Détecteur de Flux d\'eau', value: 0 }
      ];
      if (panel.norme === 'NF') {
        rows.push({ key: 'MD4L', label: 'Module Déporté Commande — 4 Lignes', value: 0 });
        rows.push({ key: 'MD8L', label: 'Module Déporté Commande — 8 Lignes', value: 0 });
      }
    }
    this.dynamicInventoryRows = rows;
    this.isViewInventoryOpen.set(true);
  }

  closeViewInventoryModal(): void { this.isViewInventoryOpen.set(false); }

  addCustomRowToInventory(): void {
    const key = this.customFieldFields.key.trim();
    const label = this.customFieldFields.label.trim();
    if (!key || !label) return;

    this.dynamicInventoryRows.push({ key, label, value: 0 });
    this.customFieldFields = { key: '', label: '' };
  }

  removeDynamicRow(index: number): void {
    this.dynamicInventoryRows.splice(index, 1);
  }

  saveInventoryBreakdown(): void {
    const target = this.selectedPanelForInventory();
    if (!target) return;

    let summaryParts = this.dynamicInventoryRows
      .filter(r => r.value > 0)
      .map(r => `${r.value} ${r.key}`);

    const compiledTextString = summaryParts.join(', ') || 'Aucun composant configuré.';

    const updatedPayload = {
      resume_installation: compiledTextString,
      equipment_breakdown_json: JSON.stringify(this.dynamicInventoryRows)
    };

    this.http.put(`${environment.apiUrl}/admin/ecs-panels/${target.id}/assign-trb`, {
      ...target, 
      ...updatedPayload, 
      trb_imei: target.trb_imei
    }).subscribe({
      next: () => {
        this.loadClientPanels(target.client_id);
        this.closeViewInventoryModal();
      }
    });
  }

  createClient(): void { this.http.post(`${environment.apiUrl}/admin/clients`, this.newClient).subscribe({ next: () => { this.loadClients(); this.closeClientModal(); } }); }

  createPanel(): void {
    const cid = this.selectedClientId();
    if (!cid) return;
    const payload = { ...this.newPanel, client_id: cid, has_cmsi: this.newPanel.norme === 'NF' && this.newPanel.has_cmsi ? 1 : 0, has_printer: this.newPanel.has_printer ? 1 : 0, loop_count: Number(this.newPanel.loop_count) };
    this.http.post(`${environment.apiUrl}/admin/ecs-panels`, payload).subscribe({ next: () => { this.loadClientPanels(cid); this.closePanelModal(); } });
  }

  deletePanel(panel: EcsPanel) { this.http.delete(`${environment.apiUrl}/admin/ecs-panels/${panel.id}`).subscribe({ next: () => this.loadClientPanels(panel.client_id) }); }
  assignTrb(panel: EcsPanel, imei: string) { this.http.put(`${environment.apiUrl}/admin/ecs-panels/${panel.id}/assign-trb`, { trb_imei: imei }).subscribe({ next: () => { this.loadClientPanels(panel.client_id); this.loadAvailableTrbs(); } }); }
  removeTrb(panel: EcsPanel) { this.http.put(`${environment.apiUrl}/admin/ecs-panels/${panel.id}/remove-trb`, {}).subscribe({ next: () => { this.loadClientPanels(panel.client_id); this.loadAvailableTrbs(); } }); }
  deleteClient(id: number) { this.http.delete(`${environment.apiUrl}/admin/clients/${id}`).subscribe({ next: () => this.loadClients(), error: err => alert(err.error?.message) }); }
  openClientModal() { this.isClientModalOpen.set(true); }
  closeClientModal() { this.isClientModalOpen.set(false); }
  openPanelModal(clientId: number) { this.newPanel = { panel_name: '', panel_model: '', ref_broudi: '', niveau_securite: '', lignes_detection: '', resume_installation: '', location_details: '', norme: 'NF', has_cmsi: false, has_printer: false, loop_count: 1 }; this.isPanelModalOpen.set(true); }
  closePanelModal() { this.isPanelModalOpen.set(false); }
}