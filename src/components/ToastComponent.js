"use client";

import { useCallback, useState } from "react";
import styles from "./ToastComponent.module.css";

/**
 * useToast — hook for showing toast notifications.
 *
 * Returns [toast, showToast] where:
 *   - toast is the current ToastComponent JSX (or null)
 *   - showToast(message, type?) triggers a new notification
 */
export function useToast(duration = 3000) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback(
    (message, type = "success") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), duration);
    },
    [duration],
  );

  const toastElement = toast ? (
    <div className={`${styles.toast} ${styles[toast.type] || ""}`}>
      {toast.message}
    </div>
  ) : null;

  return [toastElement, showToast];
}

/**
 * ToastComponent — standalone toast for cases where you manage state yourself.
 */
export default function ToastComponent({ message, type = "success" }) {
  if (!message) return null;
  return (
    <div className={`${styles.toast} ${styles[type] || ""}`}>{message}</div>
  );
}
