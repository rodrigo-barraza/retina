"use client";

import { Settings2, Cpu, Edit3, Type, Image as ImageIcon, Mic, Video, FileText, ArrowRight } from "lucide-react";
import styles from "./SettingsPanel.module.css";

export default function SettingsPanel({ config, settings, onChange }) {
    const { providers = {}, textToText = {} } = config || {};
    const modelsMap = textToText.models || {};
    const providerList = config?.providerList || [];

    const handleProviderChange = (e) => {
        const pv = e.target.value;
        const defaultMod =
            textToText.defaults?.[pv] || modelsMap[pv]?.[0]?.name || "";
        onChange({ provider: pv, model: defaultMod });
    };

    const handleModelChange = (e) => onChange({ model: e.target.value });
    const handleSystemPromptChange = (e) =>
        onChange({ systemPrompt: e.target.value });
    const handleTempChange = (e) =>
        onChange({ temperature: parseFloat(e.target.value) });
    const handleMaxTokensChange = (e) =>
        onChange({ maxTokens: parseInt(e.target.value) });
    const handleTopPChange = (e) => onChange({ topP: parseFloat(e.target.value) });
    const handleTopKChange = (e) => onChange({ topK: parseInt(e.target.value) });
    const handleFreqPenaltyChange = (e) => onChange({ frequencyPenalty: parseFloat(e.target.value) });
    const handlePresPenaltyChange = (e) => onChange({ presencePenalty: parseFloat(e.target.value) });
    const handleStopSeqChange = (e) => onChange({ stopSequences: e.target.value });
    const handleThinkingEnabledChange = (e) => onChange({ thinkingEnabled: e.target.checked });
    const handleReasoningEffortChange = (e) => onChange({ reasoningEffort: e.target.value });
    const handleThinkingLevelChange = (e) => onChange({ thinkingLevel: e.target.value });
    const handleThinkingBudgetChange = (e) => onChange({ thinkingBudget: e.target.value });
    const handleWebSearchChange = (e) => onChange({ webSearchEnabled: e.target.checked });

    const currentProviderModels = modelsMap[settings.provider] || [];
    const selectedModelDef = currentProviderModels.find(m => m.name === settings.model);
    const isReasoning = selectedModelDef?.thinking || (settings.model || "").includes('o1') || (settings.model || "").includes('o3');

    return (
        <div className={styles.container}>
            <div className={styles.sectionTitle}>
                <Cpu size={16} /> Model Settings
            </div>

            <div className={styles.formGroup}>
                <label>Provider</label>
                <select value={settings.provider || ""} onChange={handleProviderChange}>
                    <option value="" disabled>
                        Select Provider
                    </option>
                    {providerList
                        .filter((p) => modelsMap[p])
                        .map((p) => (
                            <option key={p} value={p}>
                                {p.toUpperCase()}
                            </option>
                        ))}
                </select>
            </div>

            {settings.provider && modelsMap[settings.provider] && (
                <div className={styles.formGroup}>
                    <label>Model</label>
                    <select value={settings.model || ""} onChange={handleModelChange}>
                        {modelsMap[settings.provider].map((m) => (
                            <option key={m.name} value={m.name}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                    {selectedModelDef && (
                        <div className={styles.capabilities}>
                            {(selectedModelDef.inputTypes || []).map((t) => (
                                <span key={`in-${t}`} className={styles.capBadge}>
                                    {t === "text" && <Type size={10} />}
                                    {t === "image" && <ImageIcon size={10} />}
                                    {t === "audio" && <Mic size={10} />}
                                    {t === "video" && <Video size={10} />}
                                    {t === "pdf" && <FileText size={10} />}
                                    {t}
                                </span>
                            ))}
                            <ArrowRight size={10} className={styles.capArrow} />
                            {(selectedModelDef.outputTypes || []).map((t) => (
                                <span key={`out-${t}`} className={styles.capBadge}>
                                    {t === "text" && <Type size={10} />}
                                    {t === "image" && <ImageIcon size={10} />}
                                    {t === "audio" && <Mic size={10} />}
                                    {t === "video" && <Video size={10} />}
                                    {t === "pdf" && <FileText size={10} />}
                                    {t}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className={styles.sectionTitle}>
                <Edit3 size={16} /> Context
            </div>

            <div className={styles.formGroup}>
                <label>System Prompt</label>
                <textarea
                    rows={5}
                    placeholder="You are a helpful AI assistant..."
                    value={settings.systemPrompt}
                    onChange={handleSystemPromptChange}
                />
            </div>

            <div className={styles.sectionTitle}>
                <Settings2 size={16} /> Parameters
            </div>

            {(() => {
                const thinkingLocked = isReasoning && settings.thinkingEnabled && settings.provider === "anthropic";
                return (
                    <div className={styles.formGroup}>
                        <label>
                            Temperature ({thinkingLocked ? "1 — Locked" : settings.temperature})
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={thinkingLocked ? 1 : settings.temperature}
                            onChange={handleTempChange}
                            disabled={thinkingLocked}
                            className={thinkingLocked ? styles.disabledRange : ""}
                        />
                    </div>
                );
            })()}

            <div className={styles.formGroup}>
                <label>Max Tokens ({settings.maxTokens})</label>
                <input
                    type="range"
                    min="256"
                    max="32000"
                    step="256"
                    value={settings.maxTokens}
                    onChange={handleMaxTokensChange}
                />
            </div>

            {isReasoning && (
                <>
                    <div className={styles.formGroup}>
                        <label className={styles.toggleLabel}>
                            Thinking
                            <label className={styles.toggleSwitch}>
                                <input
                                    type="checkbox"
                                    checked={settings.thinkingEnabled || false}
                                    onChange={handleThinkingEnabledChange}
                                />
                                <span className={styles.toggleSlider} />
                            </label>
                        </label>
                    </div>

                    {settings.thinkingEnabled && (
                        <>
                            {["openai", "openai-compatible", "anthropic"].includes(settings.provider) && (
                                <div className={styles.formGroup}>
                                    <label>Reasoning Effort</label>
                                    <select value={settings.reasoningEffort || "high"} onChange={handleReasoningEffortChange}>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                            )}

                            {settings.provider === "google" && (
                                <div className={styles.formGroup}>
                                    <label>Thinking Level</label>
                                    <select value={settings.thinkingLevel || "high"} onChange={handleThinkingLevelChange}>
                                        <option value="minimal">Minimal</option>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                            )}

                            {["anthropic", "google"].includes(settings.provider) && (
                                <div className={styles.formGroup}>
                                    <label>Thinking Budget (Tokens)</label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 1024"
                                        value={settings.thinkingBudget || ""}
                                        onChange={handleThinkingBudgetChange}
                                        className={styles.inputField}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {selectedModelDef?.webSearch && (
                <div className={styles.formGroup}>
                    <label className={styles.toggleRow}>
                        <span>{selectedModelDef.webSearch}</span>
                        <label className={styles.toggleSwitch}>
                            <input
                                type="checkbox"
                                checked={settings.webSearchEnabled || false}
                                onChange={handleWebSearchChange}
                            />
                            <span className={styles.toggleSlider} />
                        </label>
                    </label>
                </div>
            )}

            {!isReasoning && (
                <>
                    <div className={styles.formGroup}>
                        <label>Top P ({settings.topP})</label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={settings.topP}
                            onChange={handleTopPChange}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Stop Sequences (comma separated)</label>
                        <input
                            type="text"
                            placeholder="\n, Human:"
                            value={settings.stopSequences || ""}
                            onChange={handleStopSeqChange}
                            className={styles.inputField}
                        />
                    </div>

                    {["anthropic", "google"].includes(settings.provider) && (
                        <div className={styles.formGroup}>
                            <label>Top K ({settings.topK})</label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                value={settings.topK}
                                onChange={handleTopKChange}
                            />
                        </div>
                    )}

                    {["openai", "openai-compatible", "google"].includes(settings.provider) && (
                        <>
                            <div className={styles.formGroup}>
                                <label>Frequency Penalty ({settings.frequencyPenalty})</label>
                                <input
                                    type="range"
                                    min="-2"
                                    max="2"
                                    step="0.1"
                                    value={settings.frequencyPenalty}
                                    onChange={handleFreqPenaltyChange}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Presence Penalty ({settings.presencePenalty})</label>
                                <input
                                    type="range"
                                    min="-2"
                                    max="2"
                                    step="0.1"
                                    value={settings.presencePenalty}
                                    onChange={handlePresPenaltyChange}
                                />
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
