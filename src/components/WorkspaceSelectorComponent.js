"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Monitor, Lock, Plus, CheckCircle2, XCircle, ArrowRight, FolderOpen } from "lucide-react";
import { useWorkspace } from "./WorkspaceContext";
import WorkspaceService from "../services/WorkspaceService";
import styles from "./WorkspaceSelectorComponent.module.css";

/**
 * WorkspaceSelectorComponent — reusable workspace picker dropdown.
 *
 * Renders the active workspace as a pill button; when clicked, opens a
 * dropdown listing all workspaces plus an inline "Add new workspace" input
 * with real-time path validation (mirroring the Settings page UX).
 *
 * Props:
 *   locked  — if true, renders a non-interactive locked state (e.g. mid-conversation)
 *   className — optional wrapper className for layout integration
 */
export default function WorkspaceSelectorComponent({ locked = false, className }) {
  const { workspaces, currentWorkspace, setCurrentWorkspace, refreshWorkspaces } = useWorkspace();

  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // ── Add workspace state ────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false);
  const [addPath, setAddPath] = useState("");
  const [validation, setValidation] = useState(null);
  const [adding, setAdding] = useState(false);
  const validateTimer = useRef(null);

  /** Detect Windows-style path for instant client-side preview */
  const isWindowsPath = (p) => /^[A-Za-z]:[/\\]/.test(p);
  const windowsToWslPreview = (p) => {
    const m = p.match(/^([A-Za-z]):[/\\](.*)/);
    if (!m) return null;
    return `/mnt/${m[1].toLowerCase()}/${m[2].replace(/\\/g, "/")}`;
  };

  // ── Close on outside click ─────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
        setShowAdd(false);
        setAddPath("");
        setValidation(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // ── Path validation (debounced) ────────────────────────────
  const handlePathChange = useCallback((value) => {
    setAddPath(value);
    setValidation(null);
    clearTimeout(validateTimer.current);
    if (!value.trim()) return;
    validateTimer.current = setTimeout(async () => {
      try {
        const result = await WorkspaceService.validate(value);
        setValidation(result);
      } catch {
        setValidation({ valid: false, error: "Validation failed" });
      }
    }, 400);
  }, []);

  // ── Add workspace handler ──────────────────────────────────
  const handleAdd = useCallback(async () => {
    if (!addPath.trim() || adding) return;
    setAdding(true);
    try {
      // Fetch fresh list to get current user roots
      const currentList = await WorkspaceService.list();
      const currentUserRoots = currentList
        .filter((w) => !w.isPinned)
        .map((w) => w.path);
      const newPath = addPath.trim();
      await WorkspaceService.update([...currentUserRoots, newPath]);
      await refreshWorkspaces();
      setAddPath("");
      setValidation(null);
      setShowAdd(false);
    } catch (err) {
      console.error("Failed to add workspace:", err);
      setValidation({ valid: false, error: "Failed to add workspace" });
    } finally {
      setAdding(false);
    }
  }, [addPath, adding, refreshWorkspaces]);

  // ── Locked state (mid-conversation) ────────────────────────
  if (locked) {
    return (
      <div className={`${styles.wrapper} ${className || ""}`}>
        <div className={styles.button} data-locked>
          <Monitor className={styles.buttonIcon} />
          <span>{currentWorkspace?.name ?? "Workspace"}</span>
          <Lock className={styles.lockIcon} />
        </div>
      </div>
    );
  }

  // ── Interactive state ──────────────────────────────────────
  return (
    <div className={`${styles.wrapper} ${className || ""}`} ref={menuRef}>
      <button
        type="button"
        className={styles.button}
        onClick={() => setOpen((v) => !v)}
        title={currentWorkspace?.path ?? "Switch workspace"}
      >
        <Monitor className={styles.buttonIcon} />
        <span>{currentWorkspace?.name ?? "Workspace"}</span>
        {(workspaces.length > 1 || true) && <ChevronDown size={12} className={open ? styles.chevronOpen : ""} />}
      </button>

      {open && (
        <div className={styles.menu}>
          {/* Workspace list */}
          {workspaces.map((w) => (
            <button
              key={w.id}
              className={`${styles.menuItem} ${currentWorkspace?.path === w.path ? styles.menuItemActive : ""}`}
              onClick={() => { setCurrentWorkspace(w); setOpen(false); setShowAdd(false); }}
              title={w.path}
            >
              <FolderOpen size={12} className={styles.menuItemIcon} />
              <span className={styles.menuItemName}>{w.name}</span>
              {w.isPinned && <Lock size={9} className={styles.menuItemPinned} />}
            </button>
          ))}

          {/* Divider + Add new workspace */}
          <div className={styles.menuDivider} />

          {!showAdd ? (
            <button
              className={`${styles.menuItem} ${styles.addItem}`}
              onClick={() => setShowAdd(true)}
            >
              <Plus size={12} />
              <span>Add workspace…</span>
            </button>
          ) : (
            <div className={styles.addSection}>
              <div className={styles.addInputRow}>
                <input
                  type="text"
                  className={`${styles.addInput} ${validation ? (validation.valid ? styles.valid : styles.invalid) : ""}`}
                  placeholder="/path/to/project"
                  value={addPath}
                  onChange={(e) => handlePathChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && validation?.valid) handleAdd();
                    if (e.key === "Escape") { setShowAdd(false); setAddPath(""); setValidation(null); }
                  }}
                  autoFocus
                />
                <button
                  className={styles.addButton}
                  disabled={!validation?.valid || adding}
                  onClick={handleAdd}
                >
                  <Plus size={12} />
                </button>
              </div>

              {/* Validation feedback */}
              {addPath.trim() && validation && (
                <div className={`${styles.validationRow} ${validation.valid ? styles.success : styles.error}`}>
                  {validation.valid
                    ? <><CheckCircle2 size={10} /> Valid directory</>
                    : <><XCircle size={10} /> {validation.error}</>
                  }
                </div>
              )}

              {/* Windows → WSL translation preview */}
              {addPath.trim() && isWindowsPath(addPath.trim()) && (
                <div className={`${styles.validationRow} ${styles.info}`}>
                  <ArrowRight size={10} />
                  <span>{windowsToWslPreview(addPath.trim())}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
