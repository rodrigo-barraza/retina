"use client";

import NavigationSidebarComponent from "../../components/NavigationSidebarComponent";
import ConsoleComponent from "../../components/ConsoleComponent";
import styles from "./page.module.css";

export default function ConsolePage() {
  return (
    <div className={styles.layout}>
      <NavigationSidebarComponent mode="user" />
      <main className={styles.main}>
        <ConsoleComponent />
      </main>
    </div>
  );
}
