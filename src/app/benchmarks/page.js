"use client";

import NavigationSidebarComponent from "../../components/NavigationSidebarComponent";
import BenchmarkPageComponent from "../../components/BenchmarkPageComponent";
import BenchmarkSidebarComponent from "../../components/BenchmarkSidebarComponent";
import styles from "./page.module.css";

export default function BenchmarksPage() {
  return (
    <div className={styles.pageWrapper}>
      <NavigationSidebarComponent mode="user" />
      <div className={styles.page}>
        <BenchmarkPageComponent />
      </div>
      <aside className={styles.rightSidebar}>
        <div className={styles.sidebarHeader}>Benchmarks</div>
        <BenchmarkSidebarComponent />
      </aside>
    </div>
  );
}
