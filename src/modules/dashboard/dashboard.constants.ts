export interface DashboardCategory {
  id: number;
  name: string;
}

export const DASHBOARD_CATEGORIES: DashboardCategory[] = [
  { id: 1, name: 'Voiles' },
  { id: 2, name: 'Planchers' },
  { id: 3, name: 'Poutres' },
  { id: 4, name: 'Superstructure' },
];
