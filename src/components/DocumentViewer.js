"use client";

import { useMemo } from "react";
import { FileText } from "lucide-react";
import ModalOverlayComponent from "./ModalOverlayComponent";
import CloseButtonComponent from "./CloseButtonComponent";
import styles from "./DocumentViewer.module.css";

function decodeDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { mimeType: "unknown", text: "" };
  const mimeType = match[1];
  const base64 = match[2];
  try {
    const text = atob(base64);
    return { mimeType, text };
  } catch {
    return { mimeType, text: "" };
  }
}

export default function DocumentViewer({ dataUrl, onClose }) {
  const { mimeType } = decodeDataUrl(dataUrl);
  const isPdf = mimeType === "application/pdf";
  const content = useMemo(
    () => (!isPdf ? decodeDataUrl(dataUrl).text : null),
    [dataUrl, isPdf],
  );

  return (
    <ModalOverlayComponent onClose={onClose} variant="dark">
      <div className={styles.viewer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <FileText size={18} />
            <span>{isPdf ? "PDF Document" : "Text Document"}</span>
          </div>
          <CloseButtonComponent onClick={onClose} size={20} />
        </div>
        <div className={styles.body}>
          {isPdf ? (
            <iframe
              src={dataUrl}
              className={styles.pdfFrame}
              title="PDF Viewer"
            />
          ) : (
            <pre className={styles.textContent}>{content}</pre>
          )}
        </div>
      </div>
    </ModalOverlayComponent>
  );
}
