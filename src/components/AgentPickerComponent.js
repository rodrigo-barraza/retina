"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, ChevronDown, Wrench, Check, Plus, Skull, Sticker, Apple, Lightbulb, Hammer, MessageSquare } from "lucide-react";
import { resolveIconComponent } from "./CustomAgentsPanel";
import AgentBadgeComponent from "./AgentBadgeComponent";
import ToolBadgeComponent from "./ToolBadgeComponent";
import styles from "./AgentPickerComponent.module.css";

/**
 * Icon mapping per agent ID — built-in agents only.
 * Custom agents use the `icon` field stored in their data.
 */
const AGENT_ICONS = {
  NONE: MessageSquare,
  CODING: Bot,
  LUPOS: Skull,
  STICKERS: Sticker,
  DIGEST: Apple,
  LIGHTS: Lightbulb,
  OOG: Hammer,
};

/** Render the correct icon for an agent — custom icon field takes priority. */
export function renderAgentIcon(agent, size = 15) {
  // Custom agents store an icon name string
  if (typeof agent?.icon === "string" && agent.icon) {
    const Resolved = resolveIconComponent(agent.icon);
    return <Resolved size={size} />;
  }
  // Built-in agents use the hardcoded map
  const BuiltIn = AGENT_ICONS[agent?.id] || Bot;
  return <BuiltIn size={size} />;
}



/**
 * AgentPickerComponent — Compact popover for selecting the active agent persona.
 *
 * Supports two modes:
 *   - **default**: Select a single active agent (radio-style). Shows the active agent in the trigger.
 *   - **addMode**: Add agents to a list (benchmark page). Shows "Add Agent" / "N Agents" trigger pill.
 *
 * @param {Array<{ id, name, project, toolCount, icon?, color? }>} agents - Available agent personas
 * @param {string} [activeAgentId] - Currently selected agent ID (default mode)
 * @param {Function} [onSelect] - Called with agent ID when user picks an agent (default mode)
 * @param {boolean} [disabled] - Disable interaction during generation
 * @param {boolean} [addMode] - When true, shows "Add Agent" trigger and fires onAddAgent
 * @param {number} [addCount] - Number of agents currently added (addMode only)
 * @param {Function} [onAddAgent] - Called with agent object when user clicks to add (addMode only)
 */
export default function AgentPickerComponent({
  agents = [],
  activeAgentId,
  onSelect,
  disabled = false,
  addMode = false,
  addCount = 0,
  onAddAgent,
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);

  const activeAgent = addMode ? null : (agents.find((a) => a.id === activeAgentId) || agents[0]);

  const handleSelect = useCallback(
    (agentId) => {
      if (agentId !== activeAgentId) {
        onSelect?.(agentId);
      }
      setOpen(false);
      document.dispatchEvent(new CustomEvent("panel:dismiss-sidebars"));
    },
    [activeAgentId, onSelect],
  );

  const handleAdd = useCallback(
    (agent) => {
      onAddAgent?.(agent);
    },
    [onAddAgent],
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

  // ── Add-mode trigger label ──────────────────────────────────
  const addLabel = addCount === 0
    ? "Add Agent"
    : addCount === 1
      ? "1 Agent"
      : `${addCount} Agents`;

  return (
    <div style={{ position: "relative" }}>
      <div className={styles.triggerWrap}>
        {addMode ? (
          /* ── Add-mode trigger pill ── */
          <button
            ref={triggerRef}
            className={`${styles.trigger} ${styles.triggerAdd} ${open ? styles.triggerAddOpen : ""} ${addCount > 0 ? styles.triggerAddActive : ""}`}
            onClick={() => !disabled && setOpen((v) => !v)}
            title="Add agent to benchmark"
            disabled={disabled}
            type="button"
          >
            <span className={styles.triggerAddContent}>
              <Bot size={14} className={styles.triggerAddIcon} />
              <span className={styles.triggerLabel}>{addLabel}</span>
            </span>
            <ChevronDown
              size={14}
              className={styles.triggerChevron}
              data-open={open}
            />
          </button>
        ) : (
          /* ── Default trigger (active agent) ── */
          <>
            <button
              ref={triggerRef}
              className={styles.trigger}
              onClick={() => !disabled && setOpen((v) => !v)}
              title={`Active agent: ${activeAgent?.name || activeAgentId}`}
              disabled={disabled}
              type="button"
            >
              <AgentBadgeComponent agent={activeAgent} />
              <span className={styles.triggerLabel}>
                {activeAgent?.name || activeAgentId}
              </span>
              <ChevronDown
                size={13}
                className={styles.triggerChevron}
                data-open={open}
              />
            </button>
            {activeAgent?.id !== "NONE" && (
              <ToolBadgeComponent
                name="Tool Calling"
                count={activeAgent?.toolCount}
                variant="condensed"
                tooltip={`${activeAgent?.toolCount || 0} Tools available`}
              />
            )}
          </>
        )}
      </div>

      {open && (
        <>
          <div className={styles.backdrop} onClick={() => setOpen(false)} />
          <div className={styles.popover}>
            {agents.map((agent) => {
              const isActive = !addMode && agent.id === activeAgentId;

              return (
                <button
                  key={agent.id}
                  className={styles.agentItem}
                  data-active={isActive}
                  onClick={() => addMode ? handleAdd(agent) : handleSelect(agent.id)}
                  type="button"
                  style={agent.color ? { "--agent-accent": agent.color } : undefined}
                >
                  <AgentBadgeComponent agent={agent} />
                  <div className={styles.agentInfo}>
                    <div className={styles.agentName}>{agent.name}</div>
                    <div className={styles.agentMeta}>
                      {agent.id !== "NONE" && (
                        <span className={styles.toolBadge}>
                          <Wrench size={9} />
                          {agent.toolCount === -1 ? "All tools" : `${agent.toolCount} tools`}
                        </span>
                      )}
                      {addMode && agent.description && <span>{agent.description}</span>}
                      {agent.project && <span>{agent.project}</span>}
                    </div>
                  </div>
                  {addMode ? (
                    <span className={styles.addBtn}>
                      <Plus size={12} />
                      Add
                    </span>
                  ) : isActive ? (
                    <Check size={14} className={styles.activeCheck} style={agent.color ? { color: agent.color } : undefined} />
                  ) : null}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
