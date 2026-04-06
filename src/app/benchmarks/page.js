"use client";

import NavigationSidebarComponent from "../../components/NavigationSidebarComponent";
import BenchmarkDashboardComponent from "../../components/BenchmarkDashboardComponent";
import BenchmarkSidebarComponent from "../../components/BenchmarkSidebarComponent";

export default function BenchmarksPage() {
  return (
    <BenchmarkDashboardComponent
      navSidebar={<NavigationSidebarComponent mode="user" />}
      rightSidebar={<BenchmarkSidebarComponent />}
    />
  );
}
