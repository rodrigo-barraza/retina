"use client";

import { Eye, Type, Volume2, Upload, X, Maximize2 } from "lucide-react";
import ProviderLogo from "./ProviderLogos";
import { MODALITY_ICONS } from "./WorkflowSidebar";
import styles from "./WorkflowInspector.module.css";

/**
 * Right-side inspector panel that shows details about the selected workflow node.
 */
export default function WorkflowInspector({
    node,
    connections,
    nodes,
    nodeResults,
    nodeStatuses,
    onUpdateNodeConfig,
    onUpdateNodeContent,
    onClose,
}) {
    if (!node) return null;

    const status = nodeStatuses?.[node.id];
    const results = nodeResults?.[node.id];
    const isModel = !node.nodeType;
    const isInput = node.nodeType === "input";
    const isViewer = node.nodeType === "viewer";

    // Find incoming / outgoing connections
    const incoming = (connections || []).filter((c) => c.targetNodeId === node.id);
    const outgoing = (connections || []).filter((c) => c.sourceNodeId === node.id);

    const getNodeLabel = (id) => {
        const n = (nodes || []).find((nd) => nd.id === id);
        if (!n) return id;
        if (n.nodeType === "input") return `${n.modality} Input`;
        if (n.nodeType === "viewer") return "Output Viewer";
        return n.displayName || n.modelName || id;
    };

    return (
        <div className={styles.inspector}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    {isModel && (
                        <div className={styles.providerIcon}>
                            <ProviderLogo provider={node.provider} size={18} />
                        </div>
                    )}
                    {isInput && (
                        <div className={styles.typeIcon} style={{ color: MODALITY_ICONS[node.modality]?.color }}>
                            {node.modality === "text" ? <Type size={16} /> : node.modality === "audio" ? <Volume2 size={16} /> : (MODALITY_ICONS[node.modality]?.icon ? (() => { const Icon = MODALITY_ICONS[node.modality].icon; return <Icon size={16} />; })() : <Type size={16} />)}
                        </div>
                    )}
                    {isViewer && (
                        <div className={styles.typeIcon} style={{ color: "#a78bfa" }}>
                            <Eye size={16} />
                        </div>
                    )}
                    <div className={styles.headerInfo}>
                        <span className={styles.headerTitle}>
                            {isModel ? (node.displayName || node.modelName) : isInput ? `${node.modality.charAt(0).toUpperCase() + node.modality.slice(1)} Input` : "Output Viewer"}
                        </span>
                        <span className={styles.headerSubtitle}>
                            {isModel ? node.provider : isInput ? "Asset Node" : "Viewer Node"}
                            {status && (
                                <span className={`${styles.statusBadge} ${styles[`status_${status}`]}`}>
                                    {status}
                                </span>
                            )}
                        </span>
                    </div>
                </div>
                <button className={styles.closeBtn} onClick={onClose}>
                    <X size={14} />
                </button>
            </div>

            {/* Scrollable body */}
            <div className={styles.body}>
                {/* System Prompt — model nodes that support it */}
                {isModel && node.supportsSystemPrompt !== false && (
                    <section className={styles.section}>
                        <label className={styles.sectionLabel}>System Prompt</label>
                        <textarea
                            className={styles.textarea}
                            value={node.systemPrompt || ""}
                            onChange={(e) => onUpdateNodeConfig?.(node.id, "systemPrompt", e.target.value)}
                            placeholder="Instructions for this model..."
                            rows={3}
                        />
                    </section>
                )}

                {/* User Prompt — model nodes only */}
                {isModel && (
                    <section className={styles.section}>
                        <label className={styles.sectionLabel}>User Prompt</label>
                        <textarea
                            className={styles.textarea}
                            value={node.userPrompt || ""}
                            onChange={(e) => onUpdateNodeConfig?.(node.id, "userPrompt", e.target.value)}
                            placeholder="What should this model do with its input?"
                            rows={3}
                        />
                        <span className={styles.fieldHint}>Combined with piped input when executed</span>
                    </section>
                )}

                {/* Content — input assets */}
                {isInput && node.modality === "text" && (
                    <section className={styles.section}>
                        <label className={styles.sectionLabel}>Content</label>
                        <textarea
                            className={styles.textarea}
                            value={node.content || ""}
                            onChange={(e) => onUpdateNodeContent?.(node.id, e.target.value)}
                            placeholder="Enter text..."
                            rows={4}
                        />
                    </section>
                )}

                {isInput && (node.modality === "image" || node.modality === "audio") && (
                    <section className={styles.section}>
                        <label className={styles.sectionLabel}>Content</label>
                        {node.content ? (
                            <div className={styles.previewContainer}>
                                {node.modality === "image" ? (
                                    <img /* eslint-disable-line @next/next/no-img-element */
                                        src={node.content}
                                        alt="Input asset"
                                        className={styles.previewImage}
                                    />
                                ) : (
                                    <div className={styles.audioIndicator}>
                                        <Volume2 size={16} />
                                        <span>Audio file attached</span>
                                    </div>
                                )}
                                <button
                                    className={styles.clearBtn}
                                    onClick={() => onUpdateNodeContent?.(node.id, "")}
                                >
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <label className={styles.uploadArea}>
                                <Upload size={16} />
                                <span>Upload {node.modality} file</span>
                                <input
                                    type="file"
                                    accept={node.modality === "image" ? "image/*" : "audio/*"}
                                    className={styles.fileInput}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = () => onUpdateNodeContent?.(node.id, reader.result);
                                        reader.readAsDataURL(file);
                                    }}
                                />
                            </label>
                        )}
                    </section>
                )}

                {/* Static Inputs — model nodes */}
                {isModel && (
                    <section className={styles.section}>
                        <label className={styles.sectionLabel}>Static Input</label>
                        {node.staticInputs?.image ? (
                            <div className={styles.previewContainer}>
                                <img /* eslint-disable-line @next/next/no-img-element */
                                    src={node.staticInputs.image}
                                    alt="Static input"
                                    className={styles.previewImage}
                                />
                                <button
                                    className={styles.clearBtn}
                                    onClick={() => onUpdateNodeConfig?.(node.id, "staticInputs", { ...node.staticInputs, image: null })}
                                >
                                    Remove
                                </button>
                            </div>
                        ) : node.staticInputs?.audio ? (
                            <div className={styles.previewContainer}>
                                <div className={styles.audioIndicator}>
                                    <Volume2 size={16} />
                                    <span>Audio file attached</span>
                                </div>
                                <button
                                    className={styles.clearBtn}
                                    onClick={() => onUpdateNodeConfig?.(node.id, "staticInputs", { ...node.staticInputs, audio: null })}
                                >
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <label className={styles.uploadArea}>
                                <Upload size={16} />
                                <span>Attach image or audio</span>
                                <input
                                    type="file"
                                    accept="image/*,audio/*"
                                    className={styles.fileInput}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = () => {
                                            const modality = file.type.startsWith("image") ? "image" : "audio";
                                            onUpdateNodeConfig?.(node.id, "staticInputs", {
                                                ...node.staticInputs,
                                                [modality]: reader.result,
                                            });
                                        };
                                        reader.readAsDataURL(file);
                                    }}
                                />
                            </label>
                        )}
                    </section>
                )}

                {/* Connections */}
                {(incoming.length > 0 || outgoing.length > 0) && (
                    <section className={styles.section}>
                        <label className={styles.sectionLabel}>Connections</label>
                        <div className={styles.connectionList}>
                            {incoming.map((c) => (
                                <div key={c.id} className={styles.connectionItem}>
                                    <span className={styles.connectionDot} style={{ background: MODALITY_ICONS[c.targetModality]?.color || "#888" }} />
                                    <span className={styles.connectionFrom}>{getNodeLabel(c.sourceNodeId)}</span>
                                    <span className={styles.connectionArrow}>→</span>
                                    <span className={styles.connectionModality}>{c.targetModality}</span>
                                </div>
                            ))}
                            {outgoing.map((c) => (
                                <div key={c.id} className={styles.connectionItem}>
                                    <span className={styles.connectionModality}>{c.sourceModality}</span>
                                    <span className={styles.connectionArrow}>→</span>
                                    <span className={styles.connectionTo}>{getNodeLabel(c.targetNodeId)}</span>
                                    <span className={styles.connectionDot} style={{ background: MODALITY_ICONS[c.sourceModality]?.color || "#888" }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Generated Results */}
                {results && !results.error && (
                    <section className={styles.section}>
                        <label className={styles.sectionLabel}>Generated Output</label>

                        {results.image && (
                            <div className={styles.resultBlock}>
                                <span className={styles.resultType}>Image</span>
                                <div className={styles.resultImageContainer}>
                                    <img /* eslint-disable-line @next/next/no-img-element */
                                        src={results.image}
                                        alt="Generated image"
                                        className={styles.resultImage}
                                    />
                                    <a
                                        href={results.image}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.expandBtn}
                                        title="Open full size"
                                    >
                                        <Maximize2 size={12} />
                                    </a>
                                </div>
                            </div>
                        )}

                        {results.text && (
                            <div className={styles.resultBlock}>
                                <span className={styles.resultType}>Text</span>
                                <div className={styles.resultText}>{results.text}</div>
                            </div>
                        )}

                        {results.audio && (
                            <div className={styles.resultBlock}>
                                <span className={styles.resultType}>Audio</span>
                                <audio controls src={results.audio} className={styles.resultAudio} />
                            </div>
                        )}
                    </section>
                )}

                {/* Viewer content */}
                {isViewer && node.content && (
                    <section className={styles.section}>
                        <label className={styles.sectionLabel}>Received Content</label>
                        {node.contentType === "image" ? (
                            <div className={styles.resultImageContainer}>
                                <img /* eslint-disable-line @next/next/no-img-element */
                                    src={node.content}
                                    alt="Viewer content"
                                    className={styles.resultImage}
                                />
                            </div>
                        ) : node.contentType === "audio" ? (
                            <audio controls src={node.content} className={styles.resultAudio} />
                        ) : (
                            <div className={styles.resultText}>{node.content}</div>
                        )}
                    </section>
                )}

                {/* Error */}
                {results?.error && (
                    <section className={styles.section}>
                        <label className={styles.sectionLabel}>Error</label>
                        <div className={styles.errorBlock}>{results.error}</div>
                    </section>
                )}

                {/* Node ID (debug) */}
                <section className={styles.section}>
                    <label className={styles.sectionLabel}>Node ID</label>
                    <code className={styles.nodeId}>{node.id}</code>
                </section>
            </div>
        </div>
    );
}
