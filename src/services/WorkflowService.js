"use client";

import StorageService from "./StorageService";

const WORKFLOWS_KEY = "workflows";

function generateId() {
    return `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const WorkflowService = {
    /**
     * Get all saved workflows (metadata only — id, name, dates, node/connection counts).
     */
    getWorkflows() {
        return StorageService.get(WORKFLOWS_KEY, []);
    },

    /**
     * Get a single workflow by ID.
     */
    getWorkflow(id) {
        const all = this.getWorkflows();
        return all.find((w) => w.id === id) || null;
    },

    /**
     * Save or update a workflow. Auto-generates ID and timestamps for new workflows.
     * @param {Object} workflow - { id?, name, nodes, connections }
     * @returns {Object} The saved workflow with id and timestamps
     */
    saveWorkflow(workflow) {
        const all = this.getWorkflows();
        const now = new Date().toISOString();

        if (workflow.id) {
            // Update existing
            const index = all.findIndex((w) => w.id === workflow.id);
            if (index !== -1) {
                all[index] = { ...all[index], ...workflow, updatedAt: now };
                StorageService.set(WORKFLOWS_KEY, all);
                return all[index];
            }
        }

        // Create new
        const newWorkflow = {
            ...workflow,
            id: workflow.id || generateId(),
            createdAt: now,
            updatedAt: now,
        };
        all.push(newWorkflow);
        StorageService.set(WORKFLOWS_KEY, all);
        return newWorkflow;
    },

    /**
     * Delete a workflow by ID.
     */
    deleteWorkflow(id) {
        const all = this.getWorkflows();
        const filtered = all.filter((w) => w.id !== id);
        StorageService.set(WORKFLOWS_KEY, filtered);
    },
};

export default WorkflowService;
