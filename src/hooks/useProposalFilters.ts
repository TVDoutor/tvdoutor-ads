import { useMemo, useState } from "react";

export type ViewMode = "grouped" | "list";

export interface ScreenItem {
  screen_id: number;
  screens?: {
    id?: number;
    name?: string;
    display_name?: string;
    formatted_address?: string;
    screen_type?: string;
    city?: string;
    state?: string;
    class?: string;
  } | null;
}

export function useProposalFilters(proposalScreens: ScreenItem[]) {
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const [filterCity, setFilterCity] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddress, setShowAddress] = useState(false);
  const [showScreenId, setShowScreenId] = useState(false);
  const [showScreenType, setShowScreenType] = useState(false);

  const filteredScreens = useMemo(() => {
    return (proposalScreens || []).filter((ps) => {
      const s = ps.screens || {};
      const matchCity = filterCity ? (s.city || "").toLowerCase().includes(filterCity.toLowerCase()) : true;
      const matchState = filterState ? (s.state || "").toLowerCase().includes(filterState.toLowerCase()) : true;
      const matchClass = filterClass ? (s.class || "").toLowerCase().includes(filterClass.toLowerCase()) : true;
      const q = searchQuery.trim().toLowerCase();
      const searchable = [s.name, s.display_name, s.formatted_address, s.city, s.state, s.class]
        .filter(Boolean)
        .map((x) => String(x).toLowerCase());
      const matchSearch = q ? searchable.some((x) => x.includes(q)) : true;
      return matchCity && matchState && matchClass && matchSearch;
    });
  }, [proposalScreens, filterCity, filterState, filterClass, searchQuery]);

  const groupedByCityState = useMemo(() => {
    return filteredScreens.reduce((acc: Record<string, ScreenItem[]>, ps) => {
      const key = `${ps.screens?.city || '-'}|${ps.screens?.state || '-'}`;
      (acc[key] = acc[key] || []).push(ps);
      return acc;
    }, {} as Record<string, ScreenItem[]>);
  }, [filteredScreens]);

  return {
    viewMode,
    setViewMode,
    filterCity,
    setFilterCity,
    filterState,
    setFilterState,
    filterClass,
    setFilterClass,
    searchQuery,
    setSearchQuery,
    showAddress,
    setShowAddress,
    showScreenId,
    setShowScreenId,
    showScreenType,
    setShowScreenType,
    filteredScreens,
    groupedByCityState,
  };
}

