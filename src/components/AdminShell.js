"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "./AdminSidebar";
import { IrisService } from "../services/IrisService";
import styles from "./AdminShell.module.css";

export default function AdminShell({ children }) {
  const [liveCount, setLiveCount] = useState(0);
  const [systemStatus, setSystemStatus] = useState("connected");

  useEffect(() => {
    async function checkStatus() {
      try {
        const health = await IrisService.getHealth();
        setSystemStatus(health.mongo || "connected");

        const live = await IrisService.getLiveActivity(5);
        setLiveCount(live.activeCount || 0);
      } catch {
        setSystemStatus("disconnected");
      }
    }

    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.shell}>
      <AdminSidebar liveCount={liveCount} systemStatus={systemStatus} />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
