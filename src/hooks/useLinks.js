import { useContext } from 'react';
import { DashboardContext } from '../context/DashboardContext';

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}
