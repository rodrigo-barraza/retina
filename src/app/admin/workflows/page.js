"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { IrisService } from "../../../services/IrisService";
import { PrismService } from "../../../services/PrismService";
import WorkflowComponent from "../../../components/WorkflowComponent";
import styles from "./page.module.css";

const MODEL_SECTIONS = [
  "textToText",
  "textToImage",
  "textToSpeech",
  "imageToText",
  "audioToText",
  "embedding",
];

/**
 * Build a lookup map from "provider:modelName" → merged model definition.
 * Used to enrich workflow model nodes with config-defined modalities.
 */
function buildModelLookup(config) {
  if (!config) return {};
  const lookup = {};

  for (const section of MODEL_SECTIONS) {
    const providers = config[section]?.models || {};
    for (const [provider, models] of Object.entries(providers)) {
      for (const m of models) {
        const key = `${provider}:${m.name}`;
        if (!lookup[key]) {
          lookup[key] = { ...m, provider };
        } else {
          // Merge modalities from multiple sections
          const existing = lookup[key];
          lookup[key] = {
            ...existing,
            inputTypes: [
              ...new Set([...(existing.inputTypes || []), ...(m.inputTypes || [])]),
            ],
            outputTypes: [
              ...new Set([...(existing.outputTypes || []), ...(m.outputTypes || [])]),
            ],
            modelType: existing.modelType || m.modelType,
          };
        }
      }
    }
  }

  return lookup;
}

/**
 * Build compound port IDs for a conversation input node.
 * Mirrors the function in retina/src/app/workflows/page.js.
 */
function buildConversationPorts(messages, supportedModalities = ["text"]) {
  const ports = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    ports.push(`${i}.text`);
    if (msg.role === "user" || msg.role === "assistant") {
      for (const mod of supportedModalities) {
        if (mod !== "text") {
          ports.push(`${i}.${mod}`);
        }
      }
    }
  }
  return ports;
}

/**
 * Enrich workflow nodes with modalities from the Prism config.
 * - Model nodes get inputTypes/outputTypes from config lookup
 * - Conversation nodes connected to a model get supportedModalities from that model's config
 */
function enrichNodesWithConfig(nodes, connections, modelLookup) {
  if (!nodes?.length || !Object.keys(modelLookup).length) return nodes;

  // First pass: enrich model nodes with config modalities
  const enrichedNodes = nodes.map((node) => {
    // Skip asset/input/viewer nodes
    if (node.nodeType) return node;

    // Look up model in config
    const key = `${node.provider}:${node.modelName}`;
    const configModel = modelLookup[key];
    if (!configModel) return node;

    const isConversation = configModel.modelType === "conversation";
    return {
      ...node,
      inputTypes: isConversation ? ["conversation"] : (configModel.inputTypes || node.inputTypes || []),
      rawInputTypes: configModel.inputTypes || node.rawInputTypes || [],
      outputTypes: configModel.outputTypes || node.outputTypes || [],
      modelType: configModel.modelType || node.modelType,
    };
  });

  // Second pass: update conversation nodes' supportedModalities from connected models
  return enrichedNodes.map((node) => {
    if (node.nodeType !== "input" || node.modality !== "conversation") return node;

    // Find the model node this conversation connects to
    const outConn = connections.find(
      (c) => c.sourceNodeId === node.id && c.sourceModality === "conversation",
    );
    if (!outConn) return node;

    const targetModel = enrichedNodes.find((n) => n.id === outConn.targetNodeId);
    if (!targetModel || targetModel.nodeType) return node;

    // Derive supported modalities from the model's raw input types
    const rawInputs = (targetModel.rawInputTypes || targetModel.inputTypes || [])
      .filter((t) => t !== "conversation");
    const messages = node.messages || [{ role: "system", content: "" }, { role: "user", content: "" }];
    const newPorts = buildConversationPorts(messages, rawInputs);

    return {
      ...node,
      supportedModalities: rawInputs,
      inputTypes: newPorts,
    };
  });
}

export default function AdminWorkflowsPage() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [modelLookup, setModelLookup] = useState({});

  // Fetch Prism config once on mount
  useEffect(() => {
    PrismService.getConfig()
      .then((cfg) => setModelLookup(buildModelLookup(cfg)))
      .catch(console.error);
  }, []);

  const loadWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await IrisService.getWorkflows({
        page: 1,
        limit: 200,
        sort: "createdAt",
        order: "desc",
      });
      const list = data.data || [];
      setWorkflows(list);
      if (list.length > 0 && !selectedId) {
        selectWorkflow(list[0]._id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  async function selectWorkflow(id) {
    if (id === selectedId) return;
    setSelectedId(id);
    setSelectedNodeId(null);
    setLoadingDetail(true);
    try {
      const wf = await IrisService.getWorkflow(id);
      setSelectedWorkflow(wf);
    } catch {
      setSelectedWorkflow(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  // Enrich nodes with config-driven modalities
  const enrichedNodes = useMemo(() => {
    return enrichNodesWithConfig(
      selectedWorkflow?.nodes || [],
      selectedWorkflow?.connections || [],
      modelLookup,
    );
  }, [selectedWorkflow, modelLookup]);

  // Use persisted nodeResults and nodeStatuses from the workflow document
  const nodeResults = useMemo(() => {
    return selectedWorkflow?.nodeResults || {};
  }, [selectedWorkflow]);

  const nodeStatuses = useMemo(() => {
    return selectedWorkflow?.nodeStatuses || {};
  }, [selectedWorkflow]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Workflows</h1>
        <p className={styles.pageSubtitle}>
          Lupos model chains — view the sequence of AI models used per reply
        </p>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className={styles.layout}>
        {loadingDetail && !selectedWorkflow ? (
          <div className={styles.emptyCanvas}>Loading workflow…</div>
        ) : (
          <WorkflowComponent
            readOnly
            admin
            nodes={enrichedNodes}
            connections={selectedWorkflow?.connections || []}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            nodeResults={nodeResults}
            nodeStatuses={nodeStatuses}
            adminWorkflows={workflows}
            adminSelectedId={selectedId}
            onAdminSelectWorkflow={selectWorkflow}
            adminLoading={loading}
          />
        )}
      </div>
    </div>
  );
}
