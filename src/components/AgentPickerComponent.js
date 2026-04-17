"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, ChevronDown, Wrench, Check, Skull, Sticker, Apple } from "lucide-react";
import styles from "./AgentPickerComponent.module.css";

/**
 * Icon mapping per agent ID — each agent gets a unique icon and color.
 */
const AGENT_ICONS = {
  CODING: Bot,
  LUPOS: Skull,
  STICKERS: Sticker,
  DIGEST: Apple,
};

/**
 * AgentPickerComponent — Compact popover for selecting the active agent persona.
 *
 * @param {Array<{ id, name, project, toolCount }>} agents - Available agent personas
 * @param {string} activeAgentId - Currently selected agent ID
 * @param {Function} onSelect - Called with agent ID when user picks an agent
 * @param {boolean} [disabled] - Disable interaction during generation
 */
export default function AgentPickerComponent({
  agents = [],
  activeAgentId,
  onSelect,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);

  const activeAgent = agents.find((a) => a.id === activeAgentId) || agents[0];
  const ActiveIcon = AGENT_ICONS[activeAgentId] || Bot;

  const handleSelect = useCallback(
    (agentId) => {
      if (agentId !== activeAgentId) {
        onSelect(agentId);
      }
      setOpen(false);
    },
    [activeAgentId, onSelect],
  );

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  if (agents.length === 0) return null;

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        className={styles.trigger}
        onClick={() => !disabled && setOpen((v) => !v)}
        title={`Active agent: ${activeAgent?.name || activeAgentId}`}
        disabled={disabled}
        type="button"
      >
        <span className={styles.triggerIcon}>
          <ActiveIcon size={13} />
        </span>
        <span className={styles.triggerLabel}>
          {activeAgent?.name || activeAgentId}
        </span>
        <ChevronDown
          size={13}
          className={styles.triggerChevron}
          data-open={open}
        />
      </button>

      {open && (
        <>
          <div className={styles.backdrop} onClick={() => setOpen(false)} />
          <div className={styles.popover}>
            {agents.map((agent) => {
              const Icon = AGENT_ICONS[agent.id] || Bot;
              const isActive = agent.id === activeAgentId;

              return (
                <button
                  key={agent.id}
                  className={styles.agentItem}
                  data-active={isActive}
                  onClick={() => handleSelect(agent.id)}
                  type="button"
                >
                  <span className={styles.agentIcon} data-agent={agent.id}>
                    <Icon size={15} />
                  </span>
                  <div className={styles.agentInfo}>
                    <div className={styles.agentName}>{agent.name}</div>
                    <div className={styles.agentMeta}>
                      <span className={styles.toolBadge}>
                        <Wrench size={9} />
                        {agent.toolCount} tools
                      </span>
                      <span>{agent.project}</span>
                    </div>
                  </div>
                  {isActive && (
                    <Check size={14} className={styles.activeCheck} />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
