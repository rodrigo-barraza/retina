"use client";

import { Settings2, Cpu, Edit3, Type, Image as ImageIcon, Mic, Video, FileText, Globe, Wrench, Code, Monitor, Search } from "lucide-react";
import styles from "./SettingsPanel.module.css";

export default function SettingsPanel({ config, settings, onChange, hasAssistantImages }) {
    const { providers = {}, textToText = {} } = config || {};
    const modelsMap = textToText.models || {};
    const providerList = config?.providerList || [];

    const handleProviderChange = (e) => {
        const pv = e.target.value;
        const defaultMod =
            textToText.defaults?.[pv] || modelsMap[pv]?.[0]?.name || "";
        const modelDef = (modelsMap[pv] || []).find((m) => m.name === defaultMod);
        const temp = modelDef?.defaultTemperature ?? 1.0;
        onChange({ provider: pv, model: defaultMod, temperature: temp });
    };

    const handleModelChange = (e) => {
        const modelName = e.target.value;
        const modelDef = currentProviderModels.find((m) => m.name === modelName);
        const temp = modelDef?.defaultTemperature ?? 1.0;
        onChange({ model: modelName, temperature: temp });
    };
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

    const currentProviderModels = modelsMap[settings.provider] || [];
    const selectedModelDef = currentProviderModels.find(m => m.name === settings.model);
    const isReasoning = selectedModelDef?.thinking || (settings.model || "").includes('o1') || (settings.model || "").includes('o3');

    // Provider-aware display labels for generic tool names
    const TOOL_LABELS = {
        google: { 'Web Search': 'Google Search' },
        anthropic: selectedModelDef?.webFetch
            ? { 'Web Search': 'Web Fetch' }
            : {},
    };
    const providerToolLabels = TOOL_LABELS[settings.provider] || {};
    const getToolLabel = (tool) => providerToolLabels[tool] || tool;

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
                        .map((p) => {
                            const allDisabled = hasAssistantImages && modelsMap[p]?.every((m) => m.assistantImages === false);
                            return (
                                <option key={p} value={p} disabled={allDisabled}>
                                    {p.toUpperCase()}{allDisabled ? " (no image context)" : ""}
                                </option>
                            );
                        })}
                </select>
            </div>

            {settings.provider && modelsMap[settings.provider] && (
                <div className={styles.formGroup}>
                    <label>Model</label>
                    <select value={settings.model || ""} onChange={handleModelChange}>
                        {modelsMap[settings.provider].map((m) => {
                            const disabled = hasAssistantImages && m.assistantImages === false;
                            return (
                                <option key={m.name} value={m.name} disabled={disabled}>
                                    {m.label}{disabled ? " (no image context)" : ""}
                                </option>
                            );
                        })}
                    </select>
                    {selectedModelDef && (() => {
                        const allTypes = ["text", "image", "audio", "video", "pdf"];
                        const inputs = selectedModelDef.inputTypes || [];
                        const outputs = selectedModelDef.outputTypes || [];
                        const iconMap = {
                            text: <Type size={12} />,
                            image: <ImageIcon size={12} />,
                            audio: <Mic size={12} />,
                            video: <Video size={12} />,
                            pdf: <FileText size={12} />,
                        };
                        const modalities = allTypes.map((t) => {
                            const isIn = inputs.includes(t);
                            const isOut = outputs.includes(t);
                            let status = "Not supported";
                            if (isIn && isOut) status = "Input & Output";
                            else if (isIn) status = "Input only";
                            else if (isOut) status = "Output only";
                            return { type: t, status, supported: isIn || isOut };
                        });
                        return (
                            <div className={styles.modalities}>
                                <div className={styles.modalitiesHeader}>Modalities</div>
                                {modalities.map((m) => (
                                    <div key={m.type} className={`${styles.modalityRow} ${!m.supported ? styles.modalityUnsupported : ""}`}>
                                        <span className={styles.modalityIcon}>{iconMap[m.type]}</span>
                                        <span className={styles.modalityName}>{m.type}</span>
                                        <span className={`${styles.modalityStatus} ${m.supported ? styles.modalityActive : ""}`}>
                                            {m.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                    {selectedModelDef?.tools && selectedModelDef.tools.length > 0 && (
                        <div className={styles.modalities}>
                            <div className={styles.modalitiesHeader}>Tools</div>
                            {selectedModelDef.tools.map((tool) => (
                                <div key={tool} className={styles.modalityRow}>
                                    <span className={styles.modalityIcon}>
                                        {tool.includes("Search") && !tool.includes("File") && <Globe size={12} />}
                                        {tool === "Web Fetch" && <Globe size={12} />}
                                        {tool === "Function Calling" && <Wrench size={12} />}
                                        {tool === "Code Execution" && <Code size={12} />}
                                        {tool === "Computer Use" && <Monitor size={12} />}
                                        {tool === "File Search" && <Search size={12} />}
                                        {tool === "Image Generation" && <ImageIcon size={12} />}
                                        {tool === "URL Context" && <Globe size={12} />}
                                    </span>
                                    <span className={styles.modalityName}>{getToolLabel(tool)}</span>
                                    <span className={`${styles.modalityStatus} ${styles.modalityActive}`}>
                                        Supported
                                    </span>
                                </div>
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
                    <div className={styles.toolsBox}>
                        <div className={styles.toolItem}>
                            <label className={styles.toggleSwitch}>
                                <input
                                    type="checkbox"
                                    checked={settings.thinkingEnabled || false}
                                    onChange={handleThinkingEnabledChange}
                                />
                                <span className={styles.toggleSlider} />
                            </label>
                            <span className={styles.toolLabel}>Thinking</span>
                        </div>
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

            {(selectedModelDef?.webSearch || selectedModelDef?.codeExecution || selectedModelDef?.urlContext) && (
                <div className={styles.toolsBox}>
                    {selectedModelDef?.webSearch && (
                        <div className={`${styles.toolItem} ${settings.codeExecutionEnabled ? styles.toolItemDisabled : ""}`}>
                            <label className={styles.toggleSwitch}>
                                <input
                                    type="checkbox"
                                    checked={settings.webSearchEnabled || false}
                                    disabled={settings.codeExecutionEnabled}
                                    onChange={(e) => onChange({ webSearchEnabled: e.target.checked })}
                                />
                                <span className={styles.toggleSlider} />
                            </label>
                            <span className={styles.toolLabel}>{getToolLabel('Web Search')}</span>
                        </div>
                    )}

                    {selectedModelDef?.codeExecution && (
                        <div className={styles.toolItem}>
                            <label className={styles.toggleSwitch}>
                                <input
                                    type="checkbox"
                                    checked={settings.codeExecutionEnabled || false}
                                    onChange={(e) => {
                                        const updates = { codeExecutionEnabled: e.target.checked };
                                        if (e.target.checked) {
                                            updates.webSearchEnabled = false;
                                            updates.urlContextEnabled = false;
                                        }
                                        onChange(updates);
                                    }}
                                />
                                <span className={styles.toggleSlider} />
                            </label>
                            <span className={styles.toolLabel}>Code Execution</span>
                        </div>
                    )}

                    {selectedModelDef?.urlContext && (
                        <div className={`${styles.toolItem} ${settings.codeExecutionEnabled ? styles.toolItemDisabled : ""}`}>
                            <label className={styles.toggleSwitch}>
                                <input
                                    type="checkbox"
                                    checked={settings.urlContextEnabled || false}
                                    disabled={settings.codeExecutionEnabled}
                                    onChange={(e) => onChange({ urlContextEnabled: e.target.checked })}
                                />
                                <span className={styles.toggleSlider} />
                            </label>
                            <span className={styles.toolLabel}>URL Context</span>
                        </div>
                    )}
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
