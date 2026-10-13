import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTableModule, MatButtonModule, MatDialogModule],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss']
})
export class TransactionsComponent {
  mockService = inject(MockDataService);
  dialog = inject(MatDialog);

  displayedColumns: string[] = ['date', 'details', 'amount', 'category', 'asset'];

  // Auto-detect transfer candidates state (Strategy C mockup)
  transferCandidates = signal<{ tx1Id: string; tx2Id: string; amount: number; date: string } | null>({
    tx1Id: 'tx-5',
    tx2Id: 'tx-6',
    amount: 1000.00,
    date: '2026-05-25'
  });

  // Simulate raw statement file uploading
  uploadProgress = signal<number | null>(null);

  confirmTransfer() {
    const cand = this.transferCandidates();
    if (cand) {
      this.mockService.confirmTransfer(cand.tx1Id, cand.tx2Id);
      this.transferCandidates.set(null); // clear candidates
    }
  }

  rejectTransfer() {
    this.transferCandidates.set(null); // reject/discard proposal
  }

  onFileDropped(event: any) {
    this.uploadProgress.set(10);
    const interval = setInterval(() => {
      if (this.uploadProgress()! >= 100) {
        clearInterval(interval);
        this.uploadProgress.set(null);
        // Insert a new mock imported transaction
        this.mockService.addTransaction({
          date: new Date().toISOString().split('T')[0],
          details: 'Imported Card Payment (Auto-imported)',
          amount: -34.20,
          category: 'Food & Groceries',
          assetId: '1'
        });
      } else {
        this.uploadProgress.update(val => val! + 30);
      }
    }, 200);
  }
}
