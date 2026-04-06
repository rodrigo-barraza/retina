"use client";

import {
  ListChecks,
  FileText,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import BadgeComponent from "./BadgeComponent";
import ChatPreviewComponent from "./ChatPreviewComponent";
import styles from "./BenchmarkPreviewSidebarComponent.module.css";

/**
 * BenchmarkPreviewSidebarComponent — left sidebar for the benchmark create page.
 * Dynamically reflects the form state as the user fills it out: shows name,
 * assertions summary, prompt preview, and validation checklist.
 *
 * Props:
 *   form — { name, systemPrompt, prompt, assertions, assertionOperator }
 */
export default function BenchmarkPreviewSidebarComponent({ form }) {
  const assertions = form.assertions || [];
  const operator = form.assertionOperator || "AND";
  const hasName = !!form.name?.trim();
  const hasPrompt = !!form.prompt?.trim();
  const hasAssertion = assertions.some((a) => a.expectedValue?.trim());

  return (
    <div className={styles.container}>
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
          <div className={`${styles.checkItem} ${hasAssertion ? styles.checkDone : ""}`}>
            {hasAssertion ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            <span>At least one assertion</span>
          </div>
        </div>
      </div>

      {/* ── Assertions Preview ────────────────────────────────── */}
      {assertions.length > 0 && assertions.some((a) => a.expectedValue?.trim()) && (
        <div className={styles.assertionsSection}>
          <div className={styles.sectionLabel}>
            <ListChecks size={12} />
            Assertions
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
