"use client";

import NavigationSidebarComponent from "../../components/NavigationSidebarComponent";
import VramBenchmarkComponent from "../../components/VramBenchmarkComponent";
import styles from "./page.module.css";

export default function VramBenchmarkPage() {
  return (
    <div className="page-wrapper">
      <NavigationSidebarComponent mode="user" />
      <div className={styles.page}>
        <VramBenchmarkComponent />
      </div>
    </div>
  );
}
