"use client";

import { FlaskConical } from "lucide-react";
import HistoryPanel from "./HistoryPanel.js";

/**
 * Thin wrapper around HistoryPanel with synthesis-specific labels.
 * Shares the same base component, styling, and HistoryList as the
 * conversations panel for full visual consistency.
 */
export default function SynthesisHistoryPanel({
  conversations,
  activeId,
  onSelect,
  onDelete,
}) {
  return (
    <HistoryPanel
      conversations={conversations}
      activeId={activeId}
      onSelect={onSelect}
      onDelete={onDelete}
      readOnly={false}
      newLabel="New Synthesis"
      emptyText="No synthesis runs"
      searchText="Search synthesis..."
      itemIcon={FlaskConical}
    />
  );
}
