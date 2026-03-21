"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Loader2,
  Terminal,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Zap,
  RotateCcw,
} from "lucide-react";
import PrismService from "../services/PrismService.js";
import SunService from "../services/SunService.js";
import styles from "./ConsoleComponent.module.css";

const MAX_TOOL_ITERATIONS = 5;

const SYSTEM_PROMPT = `You are Sun Console — an intelligent assistant with access to real-time data APIs. You have tools for weather, air quality, earthquakes, solar activity, aurora forecasts, sunrise/sunset times, tides, wildfires, ISS tracking, local events, commodity/market prices, trending topics, and product search.

Guidelines:
- When asked about weather, events, prices, trends, or similar data, ALWAYS use the appropriate tool to fetch real-time data. Never guess or make up data.
- You may call multiple tools in a single response if the question requires data from multiple sources.
- Present data clearly with relevant formatting — use tables, bullet points, and emojis where appropriate.
- When data includes numbers, format them appropriately (currencies, percentages, temperatures).
- If a tool returns an error, inform the user and suggest alternatives.
- Be conversational and helpful, not just a data dump.
- For questions that don't require API data, respond naturally without tool calls.
- The current local date/time is: ${new Date().toLocaleString()}`;

export default function ConsoleComponent() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [toolActivity, setToolActivity] = useState([]);
  const [showToolPanel, setShowToolPanel] = useState(false);
  const [provider] = useState("google");
  const [model] = useState("gemini-3-flash-preview");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, toolActivity]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /**
   * Core orchestration loop:
   * 1. Send messages + tool schemas to Prism
   * 2. If AI returns tool calls → execute them, append results, re-send
   * 3. If AI returns text → done, show to user
   */
  const runOrchestrationLoop = useCallback(
    async (conversationMessages) => {
      const currentMessages = [...conversationMessages];
      let iterations = 0;

      while (iterations < MAX_TOOL_ITERATIONS) {
        iterations++;
        let streamedText = "";
        const pendingToolCalls = [];
        let isDone = false;

        // Clean up any stale empty assistant placeholders from previous iterations
        setMessages((prev) =>
          prev.filter((m) => !(m.role === "assistant" && !m.content?.trim())),
        );

        // Create a promise that resolves when streaming is complete
        await new Promise((resolve, reject) => {
          const payload = {
            provider,
            model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...currentMessages,
            ],
            options: {
              tools: SunService.getToolSchemas(),
              maxTokens: 8192,
            },
          };

          abortRef.current = PrismService.streamText(payload, {
            onChunk: (content) => {
              streamedText += content;
              // Update the last assistant message in real-time
              setMessages((prev) => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg?.role === "assistant") {
                  lastMsg.content = streamedText;
                } else {
                  updated.push({
                    role: "assistant",
                    content: streamedText,
                  });
                }
                return updated;
              });
            },
            onToolCall: (toolCall) => {
              pendingToolCalls.push(toolCall);
              // Show tool call in activity panel
              setToolActivity((prev) => [
                ...prev,
                {
                  id: toolCall.id || `tc-${Date.now()}-${Math.random()}`,
                  name: toolCall.name,
                  args: toolCall.args,
                  status: "calling",
                  timestamp: Date.now(),
                },
              ]);
              setShowToolPanel(true);
            },
            onDone: () => {
              isDone = true;
              resolve();
            },
            onError: (err) => {
              reject(err);
            },
            onThinking: () => {},
          });
        });

        // If we got tool calls, execute them and continue the loop
        if (pendingToolCalls.length > 0) {
          // Execute all tool calls in parallel
          const results = await SunService.executeToolCalls(pendingToolCalls);

          // Update tool activity with results
          setToolActivity((prev) =>
            prev.map((activity) => {
              const result = results.find((r) => {
                // Match by id or name
                return (
                  (r.id && r.id === activity.id) ||
                  (!r.id && r.name === activity.name && activity.status === "calling")
                );
              });
              if (result) {
                return {
                  ...activity,
                  status: result.result?.error ? "error" : "done",
                  result: result.result,
                };
              }
              return activity;
            }),
          );

          // Build assistant message with tool calls for conversation history
          const assistantMsg = {
            role: "assistant",
            content: streamedText || "",
            toolCalls: pendingToolCalls.map((tc) => ({
              name: tc.name,
              args: tc.args,
              thoughtSignature: tc.thoughtSignature || undefined,
            })),
          };
          currentMessages.push(assistantMsg);

          // Add tool result messages
          for (const result of results) {
            currentMessages.push({
              role: "tool",
              name: result.name,
              content: JSON.stringify(result.result),
            });
          }

          // Clear streamed text and remove empty placeholders for next iteration
          streamedText = "";
          setMessages((prev) =>
            prev.filter((m) => !(m.role === "assistant" && !m.content?.trim())),
          );

          continue; // Loop again with tool results
        }

        // No tool calls — we're done
        if (isDone) {
          // Update conversation messages with the final assistant response
          currentMessages.push({
            role: "assistant",
            content: streamedText,
          });
          break;
        }
      }

      return currentMessages;
    },
    [provider, model],
  );

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isGenerating) return;

    setInputValue("");
    setIsGenerating(true);
    setToolActivity([]);

    const userMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      const finalMessages = await runOrchestrationLoop(updatedMessages);
      // Store final conversation state (exclude system prompt)
      setMessages(
        finalMessages.filter(
          (m) => m.role !== "tool" && m.role !== "system",
        ),
      );
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Error: ${err.message}`,
          isError: true,
        },
      ]);
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, [inputValue, isGenerating, messages, runOrchestrationLoop]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleClearChat = useCallback(() => {
    if (isGenerating) return;
    setMessages([]);
    setToolActivity([]);
    setShowToolPanel(false);
  }, [isGenerating]);

  // ── Render helpers ──────────────────────────────────────────

  function renderToolName(name) {
    return name
      .replace(/^get_/, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function renderMessage(msg, index) {
    const isUser = msg.role === "user";
    return (
      <div
        key={index}
        className={`${styles.message} ${isUser ? styles.userMessage : styles.assistantMessage} ${msg.isError ? styles.errorMessage : ""}`}
      >
        <div className={styles.messageAvatar}>
          {isUser ? (
            <span className={styles.userAvatar}>You</span>
          ) : (
            <Terminal size={16} />
          )}
        </div>
        <div className={styles.messageContent}>
          {msg.content ? (
            <div
              className={styles.messageText}
              dangerouslySetInnerHTML={{
                __html: formatMessageContent(msg.content),
              }}
            />
          ) : (
            <div className={styles.messageText}>
              <Loader2 size={14} className={styles.spinner} />
              <span className={styles.thinkingText}>Processing...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  function formatMessageContent(text) {
    if (!text) return "";
    // Basic markdown rendering
    const html = text
      // Code blocks
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      // Headers
      .replace(/^### (.+)$/gm, '<h4 class="md-h4">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 class="md-h3">$1</h3>')
      .replace(/^# (.+)$/gm, '<h2 class="md-h2">$1</h2>')
      // Horizontal rules
      .replace(/^---$/gm, "<hr />")
      // Newlines
      .replace(/\n/g, "<br />");
    return html;
  }

  return (
    <div className={styles.console}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Terminal size={20} className={styles.headerIcon} />
          <h1 className={styles.headerTitle}>Sun Console</h1>
          <span className={styles.headerBadge}>
            <Zap size={10} />
            Tool Calling
          </span>
        </div>
        <div className={styles.headerRight}>
          <button
            className={styles.clearButton}
            onClick={handleClearChat}
            disabled={isGenerating || messages.length === 0}
            title="Clear chat"
          >
            <RotateCcw size={14} />
            Clear
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className={styles.chatArea}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Terminal size={40} />
            </div>
            <h2 className={styles.emptyTitle}>Sun Console</h2>
            <p className={styles.emptySubtitle}>
              Ask about weather, events, commodities, trends, or anything
              powered by the Sun ecosystem.
            </p>
            <div className={styles.quickPrompts}>
              {[
                "What's the weather like right now?",
                "What are the top commodity movers today?",
                "Are there any events this weekend?",
                "What's trending on Reddit?",
                "What's the UV index and air quality?",
              ].map((prompt) => (
                <button
                  key={prompt}
                  className={styles.quickPrompt}
                  onClick={() => {
                    setInputValue(prompt);
                    inputRef.current?.focus();
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.messageList}>
            {messages
              .filter((m) => m.role === "user" || m.role === "assistant")
              .map((msg, i) => renderMessage(msg, i))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Tool Activity Panel */}
      {toolActivity.length > 0 && (
        <div className={styles.toolPanel}>
          <button
            className={styles.toolPanelHeader}
            onClick={() => setShowToolPanel(!showToolPanel)}
          >
            <Zap size={14} className={styles.toolPanelIcon} />
            <span>
              Tool Activity ({toolActivity.filter((t) => t.status === "done").length}/
              {toolActivity.length})
            </span>
            {showToolPanel ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>
          {showToolPanel && (
            <div className={styles.toolPanelBody}>
              {toolActivity.map((activity) => (
                <div key={activity.id} className={styles.toolActivityItem}>
                  <span className={styles.toolStatusIcon}>
                    {activity.status === "calling" && (
                      <Loader2 size={12} className={styles.spinner} />
                    )}
                    {activity.status === "done" && (
                      <CheckCircle2 size={12} className={styles.toolSuccess} />
                    )}
                    {activity.status === "error" && (
                      <AlertCircle size={12} className={styles.toolError} />
                    )}
                  </span>
                  <span className={styles.toolName}>
                    {renderToolName(activity.name)}
                  </span>
                  {Object.keys(activity.args || {}).length > 0 && (
                    <span className={styles.toolArgs}>
                      ({Object.entries(activity.args)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(", ")})
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input area */}
      <div className={styles.inputArea}>
        <div className={styles.inputWrapper}>
          <textarea
            ref={inputRef}
            className={styles.input}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about weather, events, commodities, trends..."
            rows={1}
            disabled={isGenerating}
          />
          <button
            className={styles.sendButton}
            onClick={handleSend}
            disabled={!inputValue.trim() || isGenerating}
          >
            {isGenerating ? (
              <Loader2 size={16} className={styles.spinner} />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
        <div className={styles.inputFooter}>
          <span className={styles.modelBadge}>
            {model}
          </span>
          <span className={styles.toolCount}>
            {SunService.getToolSchemas().length} tools available
          </span>
        </div>
      </div>
    </div>
  );
}
