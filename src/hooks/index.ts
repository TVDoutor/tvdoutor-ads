// Dashboard hooks
export { useDashboardStats, useDashboardStatsWithFallback } from './useDashboardStats';
export { useDashboardFilters } from './useDashboardFilters';

// Real data hooks
export { useRealProposals, useProposalsTrend, useRealFunnelData } from './useRealProposals';
export { useRealAlerts } from './useRealAlerts';
export { useRealKPIs } from './useRealKPIs';
export { useFilteredProposals, useFilteredStats } from './useFilteredData';
export { useCitiesFromDB } from './useCitiesFromDB';
export { useAlertActions } from './useAlertActions';
export { useTvdPlayerStatus } from './useTvdPlayerStatus';

// Types
export type { ProposalWithDetails } from './useRealProposals';
export type { RealAlert, RealAlertGroup } from './useRealAlerts';
export type { RealKPIData } from './useRealKPIs';
export type { TvdPlayerStatusItem, TvdStatusMap } from './useTvdPlayerStatus';