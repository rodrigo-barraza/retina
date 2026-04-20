"use client";

import NavigationSidebarComponent from "../../components/NavigationSidebarComponent";
import ToolsPageComponent from "../../components/ToolsPageComponent";
import styles from "./page.module.css";

export default function ToolsPage() {
  return (
    <div className="page-wrapper">
      <NavigationSidebarComponent mode="user" />
      <div className={styles.page}>
        <ToolsPageComponent />
      </div>
    </div>
  );
}
