"use client";

import { Send, Loader2, Trash2, ChevronDown, ChevronRight, Brain, Copy, Check, Image as ImageIcon } from "lucide-react";
import styles from "./ChatArea.module.css";
import { useEffect, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback
        }
    }, [text]);

    return (
        <button
            className={styles.copyBtn}
            onClick={handleCopy}
            title="Copy raw text"
        >
            {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
    );
}

function FencedCodeBlock({ language, children }) {
    const codeString = String(children).replace(/\n$/, "");
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(codeString);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={styles.codeBlockWrapper}>
            <div className={styles.codeBlockHeader}>
                <span className={styles.codeBlockLang}>{language}</span>
                <button className={styles.codeBlockCopy} onClick={handleCopy}>
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? "Copied" : "Copy"}
                </button>
            </div>
            <SyntaxHighlighter
                style={oneDark}
                language={language}
                PreTag="div"
                customStyle={{
                    margin: 0,
                    borderRadius: "0 0 8px 8px",
                    fontSize: "13px",
                }}
            >
                {codeString}
            </SyntaxHighlighter>
        </div>
    );
}

function CodeBlock({ children, className, ...rest }) {
    const match = /language-(\w+)/.exec(className || "");

    if (!match) {
        return (
            <code className={`${styles.inlineCode} ${className || ""}`} {...rest}>
                {children}
            </code>
        );
    }

    return <FencedCodeBlock language={match[1]}>{children}</FencedCodeBlock>;
}

function MarkdownContent({ content }) {
    if (!content) return null;
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                code: CodeBlock,
            }}
        >
            {content}
        </ReactMarkdown>
    );
}

function ThinkingBlock({ thinking }) {
    const [collapsed, setCollapsed] = useState(true);

    if (!thinking) return null;

    return (
        <div className={styles.thinkingBlock}>
            <button
                className={styles.thinkingToggle}
                onClick={() => setCollapsed((c) => !c)}
            >
                <Brain size={14} />
                <span>Thinking</span>
                {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
            {!collapsed && (
                <pre className={styles.thinkingContent}>{thinking}</pre>
            )}
        </div>
    );
}

export default function ChatArea({ messages, isGenerating, onSend, onDelete, supportsVision }) {
    const [input, setInput] = useState("");
    const [pendingImages, setPendingImages] = useState([]);
    const endRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isGenerating]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if ((!input.trim() && pendingImages.length === 0) || isGenerating) return;
        onSend(input, pendingImages);
        setInput("");
        setPendingImages([]);
    };

    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files);
        for (const file of files) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setPendingImages((prev) => [...prev, ev.target.result]);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = "";
    };

    const removeImage = (index) => {
        setPendingImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.messagesList}>
                {messages.length === 0 && (
                    <div className={styles.welcome}>
                        <h3>Welcome to Retina</h3>
                        <p>Select a provider and model, then type a message to start.</p>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`${styles.message} ${msg.role === "user" ? styles.userNode : styles.aiNode}`}
                    >
                        <div className={styles.avatar}>
                            {msg.role === "user" ? "U" : "AI"}
                        </div>
                        <div className={styles.content}>
                            <div className={styles.messageHeader}>
                                <div className={styles.roleLabel}>
                                    {msg.role === "user" ? "You" : "Model"}
                                </div>
                                <div className={styles.messageActions}>
                                    {msg.content && <CopyButton text={msg.content} />}
                                    <button
                                        className={styles.deleteMsgBtn}
                                        onClick={() => onDelete(i)}
                                        title="Delete message"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            {msg.thinking && (
                                <ThinkingBlock thinking={msg.thinking} />
                            )}
                            {msg.images && msg.images.length > 0 && (
                                <div className={styles.imagePreviewRow}>
                                    {msg.images.map((img, j) => (
                                        <img key={j} src={img} alt="Attached" className={styles.messageImage} />
                                    ))}
                                </div>
                            )}
                            <div className={styles.text}>
                                {msg.role === "assistant" ? (
                                    <MarkdownContent content={msg.content} />
                                ) : (
                                    msg.content
                                )}
                            </div>
                            {msg.usage && (
                                <div className={styles.meta}>
                                    {msg.provider} • {msg.model}
                                    {` • ${(msg.usage.inputTokens || 0) + (msg.usage.outputTokens || 0)} tokens`}
                                    {msg.content ? ` • ${msg.content.trim().split(/\s+/).filter(Boolean).length} words` : ""}
                                    {msg.totalTime != null ? ` • ${msg.totalTime.toFixed(1)}s` : ""}
                                    {msg.tokensPerSec ? ` • ${msg.tokensPerSec} tok/s` : ""}
                                    {msg.estimatedCost
                                        ? ` • $${msg.estimatedCost.toFixed(5)}`
                                        : ""}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isGenerating && messages.length > 0 && !messages[messages.length - 1]?.content && (
                    <div className={`${styles.message} ${styles.aiNode}`}>
                        <div className={styles.avatar}>
                            <Loader2 size={16} className={styles.spin} />
                        </div>
                        <div className={styles.content}>Generating...</div>
                    </div>
                )}
                <div ref={endRef} />
            </div>

            <div className={styles.inputWrapper}>
                {pendingImages.length > 0 && (
                    <div className={styles.pendingImages}>
                        {pendingImages.map((img, i) => (
                            <div key={i} className={styles.pendingImageThumb}>
                                <img src={img} alt="Preview" />
                                <button onClick={() => removeImage(i)} className={styles.removeImage}>×</button>
                            </div>
                        ))}
                    </div>
                )}
                <form onSubmit={handleSubmit} className={styles.inputBox}>
                    {supportsVision && (
                        <>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                hidden
                                onChange={handleImageSelect}
                            />
                            <button
                                type="button"
                                className={styles.imageUploadBtn}
                                onClick={() => fileInputRef.current?.click()}
                                title="Attach image"
                            >
                                <ImageIcon size={18} />
                            </button>
                        </>
                    )}
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        rows={1}
                    />
                    <button type="submit" disabled={(!input.trim() && pendingImages.length === 0) || isGenerating}>
                        {isGenerating ? (
                            <Loader2 size={18} className={styles.spin} />
                        ) : (
                            <Send size={18} />
                        )}
                    </button>
                </form>
                <div className={styles.hint}>
                    Press <kbd>Enter</kbd> to send, <kbd>Shift</kbd> + <kbd>Enter</kbd>{" "}
                    for new line
                </div>
            </div>
        </div>
    );
}
