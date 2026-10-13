import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-budgets-goals',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './budgets-goals.component.html',
  styleUrls: ['./budgets-goals.component.scss']
})
export class BudgetsGoalsComponent {
  mockService = inject(MockDataService);

  // Calculate actual spending per category dynamically
  categorySpend = computed(() => {
    const spendMap: Record<string, number> = {};
    this.mockService.transactions().forEach(t => {
      if (t.amount < 0 && !t.isTransfer) {
        spendMap[t.category] = (spendMap[t.category] || 0) + Math.abs(t.amount);
      }
    });
    return spendMap;
  });

  getSpendPercentage(categoryName: string, limit: number): number {
    const spent = this.categorySpend()[categoryName] || 0;
    return Math.min(Math.round((spent / limit) * 100), 100);
  }

  getGoalETA(current: number, target: number, contribution: number): string {
    const remaining = target - current;
    if (remaining <= 0) return 'Achieved!';
    const months = Math.ceil(remaining / contribution);
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date.toLocaleDateString('default', { month: 'long', year: 'numeric' });
  }
}
