// API Service for communicating with Prism AI Gateway

import { PRISM_URL, PRISM_SECRET } from "../../secrets.js";

const API_BASE = PRISM_URL;
const SECRET = PRISM_SECRET;

function getHeaders() {
    return {
        "Content-Type": "application/json",
        "x-api-secret": SECRET,
        "x-project": "retina",
        "x-username": "default",
    };
}

/**
 * Resolve a file reference to a usable URL.
 * - `minio://files/abc.png` → `http://prism.clankerbox.com/files/files/abc.png?secret=...`
 * - data URLs and http URLs pass through unchanged.
 */
function resolveFileRef(ref) {
    if (typeof ref === "string" && ref.startsWith("minio://")) {
        const key = ref.replace("minio://", "");
        return `${API_BASE}/files/${key}?secret=${encodeURIComponent(SECRET)}`;
    }
    return ref;
}

export class PrismService {
    /**
     * Resolve a file reference (minio:// or data URL) to a renderable URL.
     */
    static getFileUrl(ref) {
        return resolveFileRef(ref);
    }

    static async getConfig() {
        const res = await fetch(`${API_BASE}/config`, { headers: getHeaders() });
        if (!res.ok) throw new Error("Failed to fetch config");
        return res.json();
    }

    static async getConversations() {
        const res = await fetch(`${API_BASE}/conversations`, {
            headers: getHeaders(),
        });
        if (!res.ok) throw new Error("Failed to fetch conversations");
        return res.json();
    }

    static async getConversation(id) {
        const res = await fetch(`${API_BASE}/conversations/${id}`, {
            headers: getHeaders(),
        });
        if (!res.ok) throw new Error("Failed to fetch conversation");
        return res.json();
    }

    static async saveConversation(
        id,
        title,
        messages,
        systemPrompt,
        settings,
        isGenerating,
    ) {
        const body = { id, title, messages, systemPrompt, settings };
        if (isGenerating !== undefined) body.isGenerating = isGenerating;
        const res = await fetch(`${API_BASE}/conversations`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to save conversation");
        return res.json();
    }

    static async startConversation(title, systemPrompt, settings) {
        const res = await fetch(`${API_BASE}/conversations/start`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ title, systemPrompt, settings }),
        });
        if (!res.ok) throw new Error("Failed to start conversation");
        return res.json();
    }

    static async finalizeConversation(id, title, systemPrompt, settings) {
        const res = await fetch(`${API_BASE}/conversations/${id}/finalize`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ title, systemPrompt, settings }),
        });
        if (!res.ok) throw new Error("Failed to finalize conversation");
        return res.json();
    }

    static async deleteConversation(id) {
        const res = await fetch(`${API_BASE}/conversations/${id}`, {
            method: "DELETE",
            headers: getHeaders(),
        });
        if (!res.ok) throw new Error("Failed to delete conversation");
        return res.json();
    }

    static async generateText(payload) {
        const res = await fetch(`${API_BASE}/chat?stream=false`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || "Failed to generate text");
        }

        return res.json();
    }

    /**
     * Stream text generation via SSE (Server-Sent Events).
     * @param {Object} payload - { provider, model, messages, options, conversationId?, userMessage? }
     * @param {Object} callbacks - { onChunk, onThinking, onImage, onExecutableCode, onCodeExecutionResult, onWebSearchResult, onStatus, onDone, onError }
     * @returns {Function} abort - Call to cancel the stream early
     */
    static streamText(payload, callbacks) {
        const {
            onChunk,
            onThinking,
            onImage,
            onExecutableCode,
            onCodeExecutionResult,
            onWebSearchResult,
            onStatus,
            onDone,
            onError,
        } = callbacks;

        const controller = new AbortController();

        (async () => {
            try {
                const res = await fetch(`${API_BASE}/chat`, {
                    method: "POST",
                    headers: getHeaders(),
                    body: JSON.stringify(payload),
                    signal: controller.signal,
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    if (onError) onError(new Error(err.message || `HTTP ${res.status}`));
                    return;
                }

                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });

                    // Parse SSE lines: "data: {...}\n\n"
                    const lines = buffer.split("\n");
                    buffer = lines.pop(); // Keep incomplete line in buffer

                    for (const line of lines) {
                        if (!line.startsWith("data: ")) continue;
                        const json = line.slice(6); // Remove "data: " prefix
                        if (!json) continue;

                        try {
                            const data = JSON.parse(json);
                            if (data.type === "chunk" && onChunk) {
                                onChunk(data.content);
                            } else if (data.type === "thinking" && onThinking) {
                                onThinking(data.content);
                            } else if (data.type === "image" && onImage) {
                                onImage(data.data, data.mimeType);
                            } else if (data.type === "executableCode" && onExecutableCode) {
                                onExecutableCode(data.code, data.language);
                            } else if (data.type === "codeExecutionResult" && onCodeExecutionResult) {
                                onCodeExecutionResult(data.output, data.outcome);
                            } else if (data.type === "webSearchResult" && onWebSearchResult) {
                                onWebSearchResult(data.results);
                            } else if (data.type === "status" && onStatus) {
                                onStatus(data.message);
                            } else if (data.type === "done" && onDone) {
                                onDone(data);
                            } else if (data.type === "error" && onError) {
                                onError(new Error(data.message));
                            }
                        } catch {
                            // Ignore JSON parse errors on individual lines
                        }
                    }
                }
            } catch (err) {
                if (err.name === "AbortError") return; // Cancelled by caller
                if (onError) onError(err);
            }
        })();

        // Return abort function (same interface as the old ws.close())
        return () => controller.abort();
    }

    /**
     * Generate an image from text.
     * @param {Object} payload - { provider, model, prompt, images?, options? }
     * @returns {Promise<{ images: string[], text?: string }>}
     */
    static async generateImage(payload) {
        // Build a messages array from the prompt — /chat requires it
        const { prompt, images, systemPrompt, ...rest } = payload;
        const userMessage = {
            role: "user",
            content: prompt || "",
        };

        // Attach images as data URLs if present
        if (images && images.length > 0) {
            userMessage.images = images.map((img) => {
                if (typeof img === "string") return img;
                return `data:${img.mimeType || "image/png"};base64,${img.imageData}`;
            });
        }

        const body = {
            ...rest,
            messages: [userMessage],
        };
        if (systemPrompt) body.systemPrompt = systemPrompt;

        const res = await fetch(`${API_BASE}/chat?stream=false`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || "Failed to generate image");
        }

        return res.json();
    }

    /**
     * Caption / describe an image (image-to-text).
     * @param {Object} payload - { provider, model, images, prompt? }
     * @returns {Promise<{ text: string }>}
     */
    static async captionImage(payload) {
        const res = await fetch(`${API_BASE}/chat?stream=false`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || "Failed to caption image");
        }

        return res.json();
    }

    /**
     * Transcribe an audio file to text.
     * @param {Object} payload - { provider, audio (base64 or data URL), mimeType?, model?, language?, prompt?, conversationId?, userMessage? }
     * @returns {Promise<{ text, usage?, estimatedCost?, totalTime? }>}
     */
    static async transcribeAudio(payload) {
        const res = await fetch(`${API_BASE}/chat?stream=false`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || "Failed to transcribe audio");
        }

        return res.json();
    }

    /**
     * Generate speech from text (TTS).
     * @param {Object} payload - { provider, text, voice?, model?, options?, conversationId?, userMessage? }
     * @returns {Promise<{ audioDataUrl: string }>}
     */
    static async generateSpeech(payload) {
        const res = await fetch(`${API_BASE}/audio`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const text = await res.text();
            let message = "Failed to generate speech";
            try {
                const err = JSON.parse(text);
                message = err.message || message;
            } catch {
                /* ignore */
            }
            throw new Error(message);
        }

        const contentType = res.headers.get("content-type") || "audio/mpeg";
        const arrayBuffer = await res.arrayBuffer();
        const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce(
                (data, byte) => data + String.fromCharCode(byte),
                "",
            ),
        );
        return { audioDataUrl: `data:${contentType};base64,${base64}` };
    }

    /**
     * Generate embeddings from any modality.
     * @param {Object} payload - { provider, model?, text?, images?, audio?, video?, pdf?, taskType?, dimensions? }
     * @returns {Promise<{ embedding: number[], dimensions: number, provider: string, model: string }>}
     */
    static async generateEmbedding(payload) {
        const res = await fetch(`${API_BASE}/embed`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || "Failed to generate embedding");
        }

        return res.json();
    }
}
