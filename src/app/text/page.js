"use client";

import NavigationSidebarComponent from "../../components/NavigationSidebarComponent";
import TextPageComponent from "../../components/TextPageComponent";
import styles from "./page.module.css";

export default function UserTextPage() {
  return (
    <div className="page-wrapper">
      <NavigationSidebarComponent mode="user" />
      <div className={styles.page}>
        <TextPageComponent mode="user" />
      </div>
    </div>
  );
}
