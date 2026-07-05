import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: '',
    loadComponent: () => import('./shared/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'transactions',
        loadComponent: () => import('./features/transactions/transactions.component').then(m => m.TransactionsComponent)
      },
      {
        path: 'assets',
        loadComponent: () => import('./features/assets/assets.component').then(m => m.AssetsComponent)
      },
      {
        path: 'budgets',
        loadComponent: () => import('./features/budgets-goals/budgets-goals.component').then(m => m.BudgetsGoalsComponent)
      },
      {
        path: 'rules-subs',
        loadComponent: () => import('./features/rules-subs/rules-subs.component').then(m => m.RulesSubsComponent)
      }
    ]
  }
];
