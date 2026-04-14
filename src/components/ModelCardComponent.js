"use client";

import { useMemo } from "react";
import { X, Brain, Wrench, Copy } from "lucide-react";
import ToggleButtonComponent from "./ToggleButtonComponent";
import ModelPickerPopoverComponent from "./ModelPickerPopoverComponent";
import ProviderLogo from "./ProviderLogos";
import styles from "./ModelCardComponent.module.css";

/**
 * ModelCardComponent — a card for a single model instance in the benchmark sidebar.
 *
 * Uses ModelPickerPopoverComponent for inline model switching.
 *
 * Props:
 *   model            — { instanceId, provider, name, label, display_name, thinking }
 *   dupeCount        — number — how many instances of this same model exist
 *   isThinking       — boolean — whether thinking is enabled for this instance
 *   supportsThinking — boolean — whether the backing model supports thinking
 *   isTools          — boolean — whether tools are enabled for this instance
 *   config           — Prism config object (used by ModelPickerPopoverComponent)
 *   onRemove         — callback(instanceId)
 *   onChangeModel    — callback(instanceId, provider, modelName)
 *   onToggleThinking — callback(instanceId)
 *   onToggleTools    — callback(instanceId)
 */
export default function ModelCardComponent({
  model,
  dupeCount = 1,
  isThinking = false,
  supportsThinking = false,
  isTools = false,
  config,
  onRemove,
  onChangeModel,
  onToggleThinking,
  onToggleTools,
}) {


  // Build settings-like object for the picker trigger display
  const pickerSettings = useMemo(() => ({
    provider: model.provider || "",
    model: model.name || "",
  }), [model.provider, model.name]);

  const handlePickerSelect = (provider, name) => {
    onChangeModel?.(model.instanceId, provider, name);
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <ProviderLogo provider={model.provider} size={14} />
        <span className={styles.name} title={`Model: ${model.key}`}>
          Model: {model.key}
        </span>
        {dupeCount > 1 && (
          <span className={styles.dupeBadge} title={`${dupeCount} instances of this model`}>
            <Copy size={8} />
            {dupeCount}
          </span>
        )}
        <button
          className={styles.removeBtn}
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.(model.instanceId);
          }}
          title="Remove"
        >
          <X size={10} />
        </button>
      </div>

      {/* Model switcher — uses ModelPickerPopoverComponent trigger */}
      <ModelPickerPopoverComponent
        config={config}
        settings={pickerSettings}
        onSelectModel={handlePickerSelect}
      />

      <div className={styles.footer}>
        <div className={styles.toggles}>
          <ToggleButtonComponent
            icon={<Wrench size={10} />}
            label="Tools"
            active={isTools}
            title={isTools ? "Disable tools" : "Enable tools"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleTools?.(model.instanceId);
            }}
          />
          {supportsThinking && (
            <ToggleButtonComponent
              icon={<Brain size={10} />}
              label="Think"
              active={isThinking}
              title={isThinking ? "Disable thinking" : "Enable thinking"}
              onClick={(e) => {
                e.stopPropagation();
                onToggleThinking?.(model.instanceId);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
