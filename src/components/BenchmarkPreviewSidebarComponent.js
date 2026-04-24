"use client";

import {
  ListChecks,
  FileText,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Bot,
  Cpu,
  Layers,
} from "lucide-react";
import BadgeComponent from "./BadgeComponent";
import ChatPreviewComponent from "./ChatPreviewComponent";
import { AGENT_ASSERTION_TYPES } from "./AgentAssertionsComponent";
import styles from "./BenchmarkPreviewSidebarComponent.module.css";

const ASSERTION_TYPE_MAP = Object.fromEntries(
  AGENT_ASSERTION_TYPES.map((t) => [t.value, t])
);

const MODE_ICONS = {
  model: Cpu,
  agent: Bot,
  combined: Layers,
};

const MODE_LABELS = {
  model: "Model Benchmark",
  agent: "Agent Benchmark",
  combined: "Combined Benchmark",
};

/**
 * BenchmarkPreviewSidebarComponent — left sidebar for the benchmark create page.
 * Dynamically reflects the form state as the user fills it out: shows name,
 * assertions summary, prompt preview, and validation checklist.
 *
 * Props:
 *   form — { name, systemPrompt, prompt, benchmarkMode, assertions, assertionOperator, agentAssertions, agentAssertionOperator }
 */
export default function BenchmarkPreviewSidebarComponent({ form }) {
  const assertions = form.assertions || [];
  const agentAssertions = form.agentAssertions || [];
  const operator = form.assertionOperator || "AND";
  const agentOperator = form.agentAssertionOperator || "AND";
  const mode = form.benchmarkMode || "model";
  const hasName = !!form.name?.trim();
  const hasPrompt = !!form.prompt?.trim();
  const hasModelAssertion = assertions.some((a) => a.expectedValue?.trim());
  const hasAgentAssertion = agentAssertions.length > 0;

  const showModelAssertions = mode === "model" || mode === "combined";
  const showAgentAssertions = mode === "agent" || mode === "combined";

  // Mode-aware assertion validation
  const hasRequiredAssertion = (() => {
    if (mode === "model") return hasModelAssertion;
    if (mode === "agent") return hasAgentAssertion;
    return hasModelAssertion || hasAgentAssertion;
  })();

  const ModeIcon = MODE_ICONS[mode] || Cpu;

  return (
    <div className={styles.container}>
      {/* ── Mode Badge ────────────────────────────────────────── */}
      <div className={styles.modeSection}>
        <ModeIcon size={12} />
        <span>{MODE_LABELS[mode] || "Benchmark"}</span>
      </div>

      {/* ── Name Preview ─────────────────────────────────────── */}
      <div className={styles.nameSection}>
        <div className={styles.nameLabel}>
          {hasName ? form.name : "Untitled Benchmark"}
        </div>
      </div>

      {/* ── Validation Checklist ──────────────────────────────── */}
      <div className={styles.checklistSection}>
        <div className={styles.sectionLabel}>
          <FileText size={12} />
          Checklist
        </div>
        <div className={styles.checklistItems}>
          <div className={`${styles.checkItem} ${hasName ? styles.checkDone : ""}`}>
            {hasName ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            <span>Name</span>
          </div>
          <div className={`${styles.checkItem} ${hasPrompt ? styles.checkDone : ""}`}>
            {hasPrompt ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            <span>Prompt</span>
          </div>
          <div className={`${styles.checkItem} ${hasRequiredAssertion ? styles.checkDone : ""}`}>
            {hasRequiredAssertion ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            <span>At least one assertion</span>
          </div>
        </div>
      </div>

      {/* ── Model Assertions Preview ─────────────────────────── */}
      {showModelAssertions && assertions.length > 0 && assertions.some((a) => a.expectedValue?.trim()) && (
        <div className={styles.assertionsSection}>
          <div className={styles.sectionLabel}>
            <ListChecks size={12} />
            {mode === "combined" ? "Output Assertions" : "Assertions"}
            <span className={styles.countBadge}>{assertions.filter((a) => a.expectedValue?.trim()).length}</span>
          </div>
          <div className={styles.assertionsList}>
            {assertions.map((a, i) => {
              if (!a.expectedValue?.trim()) return null;
              return (
                <div key={i} className={styles.assertionRow}>
                  {i > 0 && (
                    <BadgeComponent
                      variant={operator === "OR" ? "warning" : "info"}
                      mini
                    >
                      {operator}
                    </BadgeComponent>
                  )}
                  <BadgeComponent variant="accent" mini>
                    {a.matchMode || "contains"}
                  </BadgeComponent>
                  <span className={styles.assertionValue} title={a.expectedValue}>
                    {a.expectedValue}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Agent Assertions Preview ─────────────────────────── */}
      {showAgentAssertions && agentAssertions.length > 0 && (
        <div className={styles.assertionsSection}>
          <div className={styles.sectionLabel}>
            <Bot size={12} />
            Agent Assertions
            <span className={styles.countBadge}>{agentAssertions.length}</span>
          </div>
          <div className={styles.assertionsList}>
            {agentAssertions.map((a, i) => {
              const typeDef = ASSERTION_TYPE_MAP[a.type];
              if (!typeDef) return null;
              const Icon = typeDef.icon;
              return (
                <div key={`${a.type}-${i}`} className={styles.assertionRow}>
                  {i > 0 && (
                    <BadgeComponent
                      variant={agentOperator === "OR" ? "warning" : "info"}
                      mini
                    >
                      {agentOperator}
                    </BadgeComponent>
                  )}
                  <BadgeComponent variant="accent" mini>
                    <Icon size={10} style={{ marginRight: 3 }} />
                    {typeDef.label}
                  </BadgeComponent>
                  {typeDef.hasOperand && a.operand && (
                    <span className={styles.assertionValue}>
                      {typeDef.operators?.find((op) => op.value === a.operator)?.label || "≥"} {a.operand}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Prompt Preview ────────────────────────────────────── */}
      {(hasPrompt || form.systemPrompt?.trim()) && (
        <div className={styles.promptSection}>
          <div className={styles.sectionLabel}>
            <MessageSquare size={12} />
            Preview
          </div>
          <ChatPreviewComponent
            systemPrompt={form.systemPrompt}
            messages={hasPrompt ? [{ role: "user", content: form.prompt }] : []}
            mini
          />
        </div>
      )}
    </div>
  );
}
