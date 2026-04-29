"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Target } from "lucide-react";
import PrismService from "../services/PrismService";
import ThreePanelLayout from "./ThreePanelLayout";
import BenchmarkPreviewSidebarComponent from "./BenchmarkPreviewSidebarComponent";
import { ButtonComponent } from "@rodrigo-barraza/components";
import BenchmarkFormComponent from "./BenchmarkFormComponent";
import styles from "./BenchmarkPageComponent.module.css";

const MATCH_MODES = [
  { value: "contains", label: "Contains" },
  { value: "exact", label: "Exact" },
  { value: "startsWith", label: "Starts With" },
  { value: "regex", label: "Regex" },
];

const INITIAL_FORM = {
  name: "",
  prompt: "",
  systemPrompt: "",
  benchmarkMode: "model",
  assertions: [{ expectedValue: "", matchMode: "contains" }],
  assertionOperator: "AND",
  agentAssertions: [],
  agentAssertionOperator: "AND",
};

export default function BenchmarkPageComponent({ navSidebar, rightSidebar }) {
  const router = useRouter();

  // -- State --------------------------------------------------
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  // -- Validation ---------------------------------------------
  const mode = form.benchmarkMode || "model";
  const hasModelAssertion = form.assertions?.some((a) => a.expectedValue);
  const hasAgentAssertion = form.agentAssertions?.length > 0;

  const isValid = (() => {
    if (!form.name || !form.prompt) return false;
    if (mode === "model") return hasModelAssertion;
    if (mode === "agent") return hasAgentAssertion;
    // Combined: at least one of either
    return hasModelAssertion || hasAgentAssertion;
  })();

  // -- Create -------------------------------------------------
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const { assertions, assertionOperator, agentAssertions, agentAssertionOperator, benchmarkMode, ...rest } = form;
      const payload = {
        ...rest,
        benchmarkMode,
        expectedValue: assertions[0]?.expectedValue || "",
        matchMode: assertions[0]?.matchMode || "contains",
        assertions,
        assertionOperator,
        agentAssertions: agentAssertions || [],
        agentAssertionOperator: agentAssertionOperator || "AND",
      };
      const created = await PrismService.createBenchmark(payload);
      setForm(INITIAL_FORM);
      if (created?.id) {
        router.push(`/benchmarks/${created.id}`);
      }
    } catch (err) {
      console.error("Failed to save benchmark:", err);
    } finally {
      setSaving(false);
    }
  }, [form, router]);

  // -- Render -------------------------------------------------
  return (
    <ThreePanelLayout
      navSidebar={navSidebar}
      leftPanel={<BenchmarkPreviewSidebarComponent form={form} />}
      leftTitle="Preview"
      rightPanel={rightSidebar}
      rightTitle="Benchmarks"
      headerTitle="New Benchmark"
      headerControls={
        <ButtonComponent
          variant="primary"
          size="sm"
          onClick={handleSave}
          loading={saving}
          disabled={!isValid}
        >
          Create
        </ButtonComponent>
      }
    >
      <div className={styles.contentMain}>
        <div className={styles.createFormWrapper}>
          <div className={styles.createFormHeader}>
            <Target size={18} className={styles.createFormIcon} />
            <div>
              <div className={styles.createFormTitle}>New Benchmark</div>
              <div className={styles.createFormSubtitle}>
                Define a prompt, expected output, and match criteria to evaluate model accuracy.
              </div>
            </div>
          </div>

          <BenchmarkFormComponent
            form={form}
            onChange={setForm}
            matchModes={MATCH_MODES}
          />
        </div>
      </div>
    </ThreePanelLayout>
  );
}
