"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import NavigationSidebarComponent from "../../../components/NavigationSidebarComponent";
import BenchmarkDetailPageComponent from "../../../components/BenchmarkDetailPageComponent";
import BenchmarkSidebarComponent from "../../../components/BenchmarkSidebarComponent";

export default function BenchmarkDetailPage() {
  const { id } = useParams();
  const [isRunning, setIsRunning] = useState(false);
  return (
    <BenchmarkDetailPageComponent
      benchmarkId={id}
      onRunningChange={setIsRunning}
      navSidebar={
        <NavigationSidebarComponent mode="user" isGenerating={isRunning} />
      }
      rightSidebar={<BenchmarkSidebarComponent activeBenchmarkId={id} />}
    />
  );
}
