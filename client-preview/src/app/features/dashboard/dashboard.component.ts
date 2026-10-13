import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatSliderModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  mockService = inject(MockDataService);

  // Interactive forecast settings
  lookbackMonths = signal<number>(12);
  monthsToPredict = signal<number>(3);
  stdThreshold = signal<number>(0.2);

  // Dynamic metrics mapping to active/future APIs
  kpis = computed(() => {
    const txs = this.mockService.transactions().filter(t => !t.isTransfer);
    let income = 0;
    let expenses = 0;
    txs.forEach(t => {
      if (t.amount > 0) income += t.amount;
      else expenses += Math.abs(t.amount);
    });
    return {
      income,
      expenses,
      balance: income - expenses,
      netWorth: this.mockService.netWorth()
    };
  });

  // Forecast projection logic simulated in-memory
  forecastProjections = computed(() => {
    const avgExpense = this.kpis().expenses / this.lookbackMonths();
    const avgIncome = this.kpis().income / this.lookbackMonths();
    
    const projections = [];
    const baseDate = new Date(2026, 5, 1); // June 2026
    
    for(let i = 1; i <= this.monthsToPredict(); i++) {
      const date = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
      const monthLabel = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      
      // Add random variation scaling with stdThreshold
      const deviation = 1 + (Math.random() - 0.5) * this.stdThreshold();
      const expenseProj = avgExpense * deviation;
      const incomeProj = avgIncome * (1 + (Math.random() - 0.5) * 0.05); // low volatility on income
      
      projections.push({
        month: monthLabel,
        income: incomeProj,
        expense: expenseProj,
        net: incomeProj - expenseProj
      });
    }
    return projections;
  });
}
