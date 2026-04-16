"use client";

import NavigationSidebarComponent from "../../components/NavigationSidebarComponent";
import MediaPageComponent from "../../components/MediaPageComponent";
import styles from "./page.module.css";

export default function UserMediaPage() {
  return (
    <div className="page-wrapper">
      <NavigationSidebarComponent mode="user" />
      <div className={styles.page}>
        <MediaPageComponent mode="user" />
      </div>
    </div>
  );
}
