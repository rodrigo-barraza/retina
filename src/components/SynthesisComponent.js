"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  FlaskConical,
  Play,
  Square,
  Download,
  Copy,
  Check,
  Plus,
  Trash2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MessageSquare,
  User,
  Bot,
  Settings2,
} from "lucide-react";
import PrismService from "../services/PrismService.js";
import NavigationSidebarComponent from "./NavigationSidebarComponent.js";
import SettingsPanel from "./SettingsPanel.js";
import ModelPickerPopoverComponent from "./ModelPickerPopoverComponent.js";
import SelectDropdown from "./SelectDropdown.js";
import SliderComponent from "./SliderComponent.js";
import TabBarComponent from "./TabBarComponent.js";
import EmptyStateComponent from "./EmptyStateComponent.js";
import CopyButtonComponent from "./CopyButtonComponent.js";
import { SETTINGS_DEFAULTS } from "../constants.js";
import styles from "./SynthesisComponent.module.css";

const DEFAULT_TURNS = 4;
const MIN_TURNS = 1;
const MAX_TURNS = 20;

const SAMPLE_SEEDS = [
  {
    label: "Chatbot with personality",
    system: "Bunny is a chatbot that stutters, and acts timid and unsure of its answers.",
    messages: [
      { role: "user", content: "When was the Library of Alexandria burned down?" },
      { role: "assistant", content: "Umm, I-I think that was in 48 BC, b-but I'm not sure, I'm sorry." },
    ],
    category: "Chat",
  },
  {
    label: "Coding assistant",
    system: "You are a senior software engineer who explains concepts clearly and provides production-quality code.",
    messages: [
      { role: "user", content: "How do I implement a debounce function in JavaScript?" },
    ],
    category: "Coding",
  },
  {
    label: "Creative writing",
    system: "You are a creative writing assistant with a poetic, evocative style. You help users craft vivid prose and poetry.",
    messages: [
      { role: "user", content: "Write a haiku about the first rain of spring." },
      { role: "assistant", content: "Petrichor rising,\nearth exhales its longest sigh—\nblossoms drink the sky." },
      { role: "user", content: "Now turn that into a short paragraph of prose." },
    ],
    category: "Creative Writing",
  },
  {
    label: "Brainstorming",
    system: "You are an enthusiastic brainstorming partner. You generate creative, diverse ideas and build on the user's suggestions.",
    messages: [
      { role: "user", content: "I need ideas for a mobile app that helps people learn languages through music." },
    ],
    category: "Brainstorm",
  },
  {
    label: "Roleplay - medieval guide",
    system: "You are a medieval town guide named Aldric. You speak in an old English dialect and are eager to show travelers around your village.",
    messages: [
      { role: "user", content: "What can I do in this town?" },
      { role: "assistant", content: "Ah, a weary traveler! Welcome, welcome to Thornhollow! Pray, follow me — I shall show thee the finest tavern this side of the King's Road, and mayhaps the blacksmith if thou needst thy blade sharpened." },
      { role: "user", content: "Take me to the tavern." },
    ],
    category: "Chat",
  },
];

const CATEGORY_OPTIONS = [
  { value: "Chat", label: "Chat" },
  { value: "Coding", label: "Coding" },
  { value: "Creative Writing", label: "Creative Writing" },
  { value: "Brainstorm", label: "Brainstorm" },
  { value: "Rewrite", label: "Rewrite" },
  { value: "Summarize", label: "Summarize" },
  { value: "Classify", label: "Classify" },
  { value: "Extract", label: "Extract" },
  { value: "QA", label: "Q&A" },
  { value: "Other", label: "Other" },
];

export default function SynthesisComponent() {
  // ── Config & model state ──────────────────────────────────────
  const [config, setConfig] = useState(null);
  const [settings, setSettings] = useState({
    ...SETTINGS_DEFAULTS,
    systemPrompt: "You are a helpful AI assistant.",
    maxTokens: 4096,
  });
  const [leftTab, setLeftTab] = useState("config"); // "config" | "output"

  // ── Synthesis state ───────────────────────────────────────────
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful AI assistant.",
  );
  const [userPersona, setUserPersona] = useState("");
  const [targetTurns, setTargetTurns] = useState(DEFAULT_TURNS);
  const [category, setCategory] = useState("Chat");
  const [seedMessages, setSeedMessages] = useState([]);
  const [generatedMessages, setGeneratedMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState("");
  const [copied, setCopied] = useState(false);
  const [seedsExpanded, setSeedsExpanded] = useState(true);
  const [templateExpanded, setTemplateExpanded] = useState(false);

  const abortRef = useRef(null);
  const messagesEndRef = useRef(null);

  // ── Load config ───────────────────────────────────────────────
  useEffect(() => {
    PrismService.getConfigWithLocalModels({
      onConfig: (cfg) => {
        setConfig(cfg);
        // Auto-select first text-to-text provider/model if none set
        if (!settings.provider || !settings.model) {
          const textModels = cfg?.textToText?.models || {};
          const firstProvider = Object.keys(textModels)[0];
          if (firstProvider && textModels[firstProvider]?.length > 0) {
            setSettings((s) => ({
              ...s,
              provider: s.provider || firstProvider,
              model: s.model || textModels[firstProvider][0].name,
            }));
          }
        }
      },
      onLocalMerge: setConfig,
    }).catch(console.error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtered config: text-to-text models only ─────────────────
  const filteredConfig = useMemo(() => {
    if (!config) return null;
    return {
      ...config,
      textToImage: { models: {} },
      textToSpeech: { models: {}, voices: {}, defaultVoices: {} },
      audioToText: { models: {} },
    };
  }, [config]);

  // ── Model selection handler ───────────────────────────────────
  const handleSelectModel = useCallback((provider, model) => {
    setSettings((s) => ({ ...s, provider, model }));
  }, []);

  // ── Compute final messages array (SFT format) ─────────────────
  const sftOutput = useMemo(() => {
    const msgs = [];
    if (systemPrompt.trim()) {
      msgs.push({ role: "system", content: systemPrompt.trim() });
    }
    for (const m of generatedMessages) {
      msgs.push({ role: m.role, content: m.content });
    }
    return msgs;
  }, [systemPrompt, generatedMessages]);

  const sftJsonString = useMemo(() => {
    const dataset = {
      prompt: systemPrompt.trim(),
      prompt_id: crypto.randomUUID().replace(/-/g, ""),
      messages: sftOutput,
      category,
    };
    return JSON.stringify(dataset, null, 2);
  }, [sftOutput, category, systemPrompt]);

  // ── Auto-scroll messages ──────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [generatedMessages, generationProgress]);

  // ── Seed message management ───────────────────────────────────
  const addSeedMessage = useCallback((role = "user") => {
    setSeedMessages((prev) => [...prev, { role, content: "" }]);
  }, []);

  const updateSeedMessage = useCallback((index, field, value) => {
    setSeedMessages((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    );
  }, []);

  const removeSeedMessage = useCallback((index) => {
    setSeedMessages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const loadSeedTemplate = useCallback((seed) => {
    setSystemPrompt(seed.system);
    setSeedMessages(seed.messages.map((m) => ({ ...m })));
    setCategory(seed.category);
    setGeneratedMessages([]);
    setTemplateExpanded(false);
    setSeedsExpanded(true);
  }, []);

  // ── Generation logic ──────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!settings.provider || !settings.model) return;

    setIsGenerating(true);
    setGeneratedMessages([]);
    setGenerationProgress("");

    // Start with seed messages
    const currentMessages = seedMessages
      .filter((m) => m.content.trim())
      .map((m) => ({ role: m.role, content: m.content }));

    // Build the meta-prompt that instructs the model to generate the conversation
    const metaSystemPrompt = buildMetaPrompt(
      systemPrompt,
      userPersona,
      targetTurns,
      currentMessages,
    );

    try {
      let streamedText = "";

      await new Promise((resolve, reject) => {
        abortRef.current = PrismService.streamText(
          {
            provider: settings.provider,
            model: settings.model,
            messages: [
              { role: "system", content: metaSystemPrompt },
              {
                role: "user",
                content: currentMessages.length > 0
                  ? `Here are the existing messages in the conversation so far:\n\n${JSON.stringify(currentMessages, null, 2)}\n\nPlease continue this conversation naturally for ${targetTurns} total turns (alternating user/assistant), ensuring the LAST message is from the assistant. Output ONLY valid JSON — an array of message objects.`
                  : `Generate a ${targetTurns}-turn conversation (alternating user/assistant, ending with assistant). Output ONLY valid JSON — an array of message objects with "role" and "content" keys.`,
              },
            ],
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
          },
          {
            onChunk: (content) => {
              streamedText += content;
              // Store raw text for progress display
              setGenerationProgress(streamedText);
              // Incrementally parse complete messages from the stream
              const parsed = parseGeneratedMessages(streamedText);
              if (parsed.length > 0) {
                setGeneratedMessages(parsed);
              }
            },
            onDone: () => resolve(streamedText),
            onError: (err) => reject(err),
          },
        );
      });

      // Final parse of the complete stream
      const finalParsed = parseGeneratedMessages(streamedText);
      if (finalParsed.length > 0) {
        // Ensure ends with assistant
        const finalMessages =
          finalParsed[finalParsed.length - 1].role === "assistant"
            ? finalParsed
            : finalParsed.slice(0, finalParsed.length - 1);
        setGeneratedMessages(
          finalMessages.length > 0 ? finalMessages : finalParsed,
        );
        setLeftTab("output");
      } else {
        setGeneratedMessages([
          {
            role: "assistant",
            content: `⚠️ Failed to parse generated conversation. Raw output:\n\n${streamedText}`,
          },
        ]);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setGeneratedMessages([
          {
            role: "assistant",
            content: `⚠️ Generation error: ${err.message}`,
          },
        ]);
      }
    } finally {
      setIsGenerating(false);
      setGenerationProgress("");
      abortRef.current = null;
    }
  }, [
    settings.provider,
    settings.model,
    settings.temperature,
    settings.maxTokens,
    systemPrompt,
    userPersona,
    targetTurns,
    seedMessages,
  ]);

  const handleStop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
    }
    setIsGenerating(false);
  }, []);

  const handleReset = useCallback(() => {
    setSeedMessages([]);
    setGeneratedMessages([]);
    setSystemPrompt("You are a helpful AI assistant.");
    setUserPersona("");
    setTargetTurns(DEFAULT_TURNS);
    setCategory("Chat");
    setGenerationProgress("");
    setLeftTab("config");
  }, []);

  const handleCopyOutput = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sftJsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [sftJsonString]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([sftJsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sft-conversation-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sftJsonString]);

  // ── Edit generated message ────────────────────────────────────
  const updateGeneratedMessage = useCallback((index, content) => {
    setGeneratedMessages((prev) =>
      prev.map((m, i) => (i === index ? { ...m, content } : m)),
    );
  }, []);

  const removeGeneratedMessage = useCallback((index) => {
    setGeneratedMessages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Render ────────────────────────────────────────────────────

  const leftPanel = (
    <>
      <TabBarComponent
        tabs={[
          { key: "config", label: "Configure" },
          {
            key: "output",
            label: "Output",
            badge: generatedMessages.length > 0 ? generatedMessages.length : undefined,
          },
        ]}
        activeTab={leftTab}
        onChange={setLeftTab}
      />

      {leftTab === "config" && (
        <div className={styles.configPanel}>
          {/* Model selection */}
          <SettingsPanel
            config={filteredConfig}
            settings={settings}
            onChange={(updates) => setSettings((s) => ({ ...s, ...updates }))}
            hasAssistantImages={false}
            hideProviderModel={false}
          />

          {/* Turns slider */}
          <div className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <MessageSquare size={14} />
              Conversation Length
            </div>
            <div className={styles.turnsControl}>
              <SliderComponent
                value={targetTurns}
                min={MIN_TURNS}
                max={MAX_TURNS}
                step={1}
                onChange={(v) => setTargetTurns(v)}
              />
              <span className={styles.turnsValue}>{targetTurns} turns</span>
            </div>
            <span className={styles.turnsHint}>
              Always ends with an assistant message
            </span>
          </div>

          {/* Category */}
          <div className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <Sparkles size={14} />
              Category
            </div>
            <SelectDropdown
              value={category}
              options={CATEGORY_OPTIONS}
              onChange={setCategory}
              placeholder="Select category"
            />
          </div>
        </div>
      )}

      {leftTab === "output" && (
        <div className={styles.outputPanel}>
          {generatedMessages.length > 0 ? (
            <>
              <div className={styles.outputActions}>
                <button
                  className={styles.outputActionBtn}
                  onClick={handleCopyOutput}
                  title="Copy SFT JSON"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied!" : "Copy JSON"}
                </button>
                <button
                  className={styles.outputActionBtn}
                  onClick={handleDownload}
                  title="Download JSON"
                >
                  <Download size={14} />
                  Download
                </button>
              </div>
              <div className={styles.outputPreview}>
                <pre className={styles.jsonOutput}>{sftJsonString}</pre>
              </div>
            </>
          ) : (
            <div className={styles.outputEmpty}>
              <FlaskConical size={24} />
              <p>Generate a conversation to see the SFT output here.</p>
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className={styles.pageLayout}>
      <NavigationSidebarComponent mode="user" isGenerating={isGenerating} />
      <div className={styles.sidePanel}>{leftPanel}</div>

      <div className={styles.mainContent}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <FlaskConical size={18} />
            <h1 className={styles.headerTitle}>Synthesis</h1>
            <ModelPickerPopoverComponent
              config={filteredConfig}
              settings={settings}
              onSelectModel={handleSelectModel}
            />
          </div>
          <div className={styles.headerActions}>
            <button
              className={styles.resetBtn}
              onClick={handleReset}
              disabled={isGenerating}
              title="Reset all"
            >
              <RotateCcw size={14} />
              Reset
            </button>
            {isGenerating ? (
              <button className={styles.stopBtn} onClick={handleStop}>
                <Square size={14} />
                Stop
              </button>
            ) : (
              <button
                className={styles.generateBtn}
                onClick={handleGenerate}
                disabled={!settings.provider || !settings.model}
              >
                <Play size={14} />
                Generate
              </button>
            )}
          </div>
        </div>

        {/* Main area */}
        <div className={styles.workspace}>
          {/* System Prompt */}
          <div className={styles.promptSection}>
            <div className={styles.promptHeader}>
              <Settings2 size={14} />
              <span>System Prompt</span>
            </div>
            <textarea
              className={styles.promptTextarea}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Define the assistant's personality and behavior..."
              rows={3}
            />
          </div>

          {/* User Persona */}
          <div className={styles.promptSection}>
            <div className={styles.promptHeader}>
              <User size={14} />
              <span>User Persona</span>
              <span className={styles.optionalTag}>Optional</span>
            </div>
            <textarea
              className={styles.promptTextarea}
              value={userPersona}
              onChange={(e) => setUserPersona(e.target.value)}
              placeholder="Describe the user's personality, tone, and conversation style..."
              rows={2}
            />
          </div>

          {/* Seed Templates */}
          <div className={styles.collapsibleSection}>
            <button
              className={styles.collapsibleHeader}
              onClick={() => setTemplateExpanded((v) => !v)}
            >
              <Sparkles size={14} />
              <span>Seed Templates</span>
              {templateExpanded ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </button>
            {templateExpanded && (
              <div className={styles.templateGrid}>
                {SAMPLE_SEEDS.map((seed) => (
                  <button
                    key={seed.label}
                    className={styles.templateCard}
                    onClick={() => loadSeedTemplate(seed)}
                  >
                    <span className={styles.templateLabel}>{seed.label}</span>
                    <span className={styles.templateCategory}>
                      {seed.category}
                    </span>
                    <span className={styles.templateMsgCount}>
                      {seed.messages.length} messages
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Seed Messages */}
          <div className={styles.collapsibleSection}>
            <button
              className={styles.collapsibleHeader}
              onClick={() => setSeedsExpanded((v) => !v)}
            >
              <MessageSquare size={14} />
              <span>
                Prefilled Messages
                {seedMessages.length > 0 && (
                  <span className={styles.msgCount}>
                    {seedMessages.length}
                  </span>
                )}
              </span>
              {seedsExpanded ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </button>
            {seedsExpanded && (
              <div className={styles.seedMessages}>
                {seedMessages.map((msg, i) => (
                  <div key={i} className={styles.seedMessage}>
                    <div className={styles.seedMessageHeader}>
                      <button
                        className={`${styles.roleToggle} ${styles[`role_${msg.role}`]}`}
                        onClick={() =>
                          updateSeedMessage(
                            i,
                            "role",
                            msg.role === "user" ? "assistant" : "user",
                          )
                        }
                        title="Toggle role"
                      >
                        {msg.role === "user" ? (
                          <User size={12} />
                        ) : (
                          <Bot size={12} />
                        )}
                        {msg.role}
                      </button>
                      <button
                        className={styles.removeSeedBtn}
                        onClick={() => removeSeedMessage(i)}
                        title="Remove message"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <textarea
                      className={styles.seedTextarea}
                      value={msg.content}
                      onChange={(e) =>
                        updateSeedMessage(i, "content", e.target.value)
                      }
                      placeholder={`${msg.role === "user" ? "User" : "Assistant"} message...`}
                      rows={2}
                    />
                  </div>
                ))}
                <div className={styles.addSeedRow}>
                  <button
                    className={styles.addSeedBtn}
                    onClick={() => addSeedMessage("user")}
                  >
                    <Plus size={12} />
                    User
                  </button>
                  <button
                    className={styles.addSeedBtn}
                    onClick={() => addSeedMessage("assistant")}
                  >
                    <Plus size={12} />
                    Assistant
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Generated Preview */}
          {(generatedMessages.length > 0 || isGenerating) && (
            <div className={styles.generatedSection}>
              <div className={styles.generatedHeader}>
                <FlaskConical size={14} />
                <span>Generated Conversation</span>
                {generatedMessages.length > 0 && (
                  <span className={styles.msgCount}>
                    {generatedMessages.length} messages
                  </span>
                )}
                {isGenerating && (
                  <span className={styles.streamingBadge}>
                    <span className={styles.streamingDot} />
                    Streaming
                  </span>
                )}
              </div>

              {/* Rendered messages — live during streaming */}
              {generatedMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`${styles.generatedMessage} ${styles[`generated_${msg.role}`]}`}
                >
                  <div className={styles.generatedMsgHeader}>
                    <span
                      className={`${styles.roleBadge} ${styles[`role_${msg.role}`]}`}
                    >
                      {msg.role === "user" ? (
                        <User size={11} />
                      ) : (
                        <Bot size={11} />
                      )}
                      {msg.role}
                    </span>
                    {!isGenerating && (
                      <div className={styles.generatedMsgActions}>
                        <CopyButtonComponent text={msg.content} size={12} />
                        <button
                          className={styles.removeSeedBtn}
                          onClick={() => removeGeneratedMessage(i)}
                          title="Remove"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  {isGenerating ? (
                    <div className={styles.generatedContent}>
                      {msg.content}
                    </div>
                  ) : (
                    <textarea
                      className={styles.generatedTextarea}
                      value={msg.content}
                      onChange={(e) =>
                        updateGeneratedMessage(i, e.target.value)
                      }
                      rows={Math.max(
                        2,
                        Math.ceil(msg.content.length / 80),
                      )}
                    />
                  )}
                </div>
              ))}

              {/* Trailing partial content — the message currently being written */}
              {isGenerating && (() => {
                const partial = getPartialMessage(generationProgress, generatedMessages.length);
                if (!partial) return null;
                return (
                  <div className={`${styles.generatedMessage} ${styles[`generated_${partial.role}`]} ${styles.generatedMessageStreaming}`}>
                    <div className={styles.generatedMsgHeader}>
                      <span className={`${styles.roleBadge} ${styles[`role_${partial.role}`]}`}>
                        {partial.role === "user" ? <User size={11} /> : <Bot size={11} />}
                        {partial.role}
                      </span>
                    </div>
                    <div className={styles.generatedContent}>
                      {partial.content}
                      <span className={styles.streamCursor} />
                    </div>
                  </div>
                );
              })()}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Empty state */}
          {generatedMessages.length === 0 && !isGenerating && (
            <div className={styles.emptyCenter}>
              <EmptyStateComponent
                icon={<FlaskConical size={40} />}
                title="SFT Data Synthesis"
                subtitle="Configure your system prompt and user persona, optionally prefill messages, then generate synthetic conversations in standard SFT dataset format."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────

function buildMetaPrompt(systemPrompt, userPersona, targetTurns, existingMessages) {
  let prompt = `You are a conversation generator for SFT (Supervised Fine-Tuning) datasets. Your task is to generate a realistic, natural, multi-turn conversation between a user and an AI assistant.

## The AI Assistant's Personality
The assistant has the following system prompt defining its behavior:
"""
${systemPrompt}
"""

`;

  if (userPersona.trim()) {
    prompt += `## The User's Personality
The user has the following personality and communication style:
"""
${userPersona}
"""

`;
  }

  prompt += `## Requirements
- Generate exactly ${targetTurns} total turns (each turn = 1 user message + 1 assistant response = 2 messages = 1 turn).
- The conversation MUST alternate: user, assistant, user, assistant, ...
- The LAST message MUST be from the assistant.
- So the output must have exactly ${targetTurns * 2} messages.
- Messages should feel natural, as if from a real human conversation with an AI.
- The assistant should stay in character per its system prompt.
${userPersona.trim() ? "- The user should stay in character per their persona description." : "- The user should speak naturally and casually."}
${existingMessages.length > 0 ? `- Continue naturally from the provided existing messages. The new messages should seamlessly follow the conversation flow.\n- Include the existing messages at the start, then continue from there.` : ""}

## Output Format
Respond with ONLY a valid JSON array of message objects. Each object has:
- "role": either "user" or "assistant"
- "content": the message text

Do NOT include any markdown formatting, code fences, or explanations. Output raw JSON only.`;

  return prompt;
}

function parseGeneratedMessages(raw) {
  // Try to extract JSON array from the response
  let text = raw.trim();

  // Remove markdown code fences if present
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  text = text.trim();

  // Try parsing directly (complete JSON)
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (m) => m && typeof m.role === "string" && typeof m.content === "string",
      );
    }
  } catch {
    // Not valid JSON yet — try incremental strategies
  }

  // Try to find and parse a JSON array in the text
  const arrayStart = text.indexOf("[");
  if (arrayStart === -1) return [];

  const jsonCandidate = text.slice(arrayStart);

  // Try parsing as-is (maybe the array is complete mid-text)
  try {
    const parsed = JSON.parse(jsonCandidate);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (m) => m && typeof m.role === "string" && typeof m.content === "string",
      );
    }
  } catch {
    // Attempt to repair truncated JSON by closing the array
  }

  // Incremental repair: try closing the array at progressively earlier points
  // Find complete message objects by looking for complete "content":"..." patterns
  const messages = [];
  const msgPattern = /\{\s*"role"\s*:\s*"(user|assistant)"\s*,\s*"content"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/g;
  let match;
  while ((match = msgPattern.exec(jsonCandidate)) !== null) {
    messages.push({
      role: match[1],
      content: match[2]
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\"),
    });
  }

  return messages;
}

/**
 * Extract the partial (in-flight) message from the raw stream.
 * This finds content that's being written but hasn't yet formed a complete message object.
 */
function getPartialMessage(raw, _completedCount) {
  if (!raw) return null;

  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // Count completed message objects to find where the partial one starts
  const msgPattern = /\{\s*"role"\s*:\s*"(user|assistant)"\s*,\s*"content"\s*:\s*"(?:[^"\\]|\\.)*"\s*\}/g;
  let lastCompleteEnd = 0;
  let m;
  while ((m = msgPattern.exec(text)) !== null) {
    lastCompleteEnd = m.index + m[0].length;
  }

  // If we haven't gotten past the completed messages, look at what's after them
  const remainder = text.slice(lastCompleteEnd);

  // Try to extract partial role and content
  const partialRole = remainder.match(/"role"\s*:\s*"(user|assistant)"/);
  if (!partialRole) return null;

  const role = partialRole[1];

  // Extract partial content after "content": "
  const contentStart = remainder.indexOf('"content"');
  if (contentStart === -1) return { role, content: "" };

  const afterContent = remainder.slice(contentStart);
  const contentValueMatch = afterContent.match(/"content"\s*:\s*"/);
  if (!contentValueMatch) return { role, content: "" };

  // Get everything after the opening quote of the content value
  const valueStart = afterContent.indexOf(contentValueMatch[0]) + contentValueMatch[0].length;
  let partialContent = afterContent.slice(valueStart);

  // Remove trailing incomplete escape or quote
  if (partialContent.endsWith("\\")) {
    partialContent = partialContent.slice(0, -1);
  }
  // Unescape what we have
  partialContent = partialContent
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");

  if (!partialContent) return null;

  return { role, content: partialContent };
}
