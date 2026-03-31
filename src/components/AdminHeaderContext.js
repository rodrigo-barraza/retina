"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { LS_DATE_RANGE } from "../constants";

const AdminHeaderContext = createContext({
  controls: null,
  setControls: () => {},
  titleBadge: null,
  setTitleBadge: () => {},
  dateRange: { from: "", to: "" },
  setDateRange: () => {},
});

function getInitialDateRange() {
  try {
    const stored = typeof window !== "undefined" ? localStorage.getItem(LS_DATE_RANGE) : null;
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.from || parsed.to) return parsed;
    }
  } catch {
    // ignore
  }
  return { from: "", to: "" };
}

export function AdminHeaderProvider({ children }) {
  const [controls, setControlsState] = useState(null);
  const [titleBadge, setTitleBadgeState] = useState(null);
  const [dateRange, setDateRangeState] = useState(getInitialDateRange);

  // Persist to localStorage on change
  useEffect(() => {
    try {
      if (dateRange.from || dateRange.to) {
        localStorage.setItem(LS_DATE_RANGE, JSON.stringify(dateRange));
      } else {
        localStorage.removeItem(LS_DATE_RANGE);
      }
    } catch {
      // ignore
    }
  }, [dateRange]);

  const setControls = useCallback((node) => {
    setControlsState(node);
  }, []);

  const setTitleBadge = useCallback((val) => {
    setTitleBadgeState(val);
  }, []);

  const setDateRange = useCallback((val) => {
    setDateRangeState(val);
  }, []);

  return (
    <AdminHeaderContext.Provider value={{ controls, setControls, titleBadge, setTitleBadge, dateRange, setDateRange }}>
      {children}
    </AdminHeaderContext.Provider>
  );
}

export function useAdminHeader() {
  return useContext(AdminHeaderContext);
}
