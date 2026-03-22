"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import IrisService from "../../../services/IrisService";
import SelectDropdown from "../../../components/SelectDropdown";
import { useAdminHeader } from "../../../components/AdminHeaderContext";
import MediaPageComponent from "../../../components/MediaPageComponent";

export default function AdminMediaPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectFilter = searchParams.get("project") || null;
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    IrisService.getConversationFilters()
      .then((data) => setProjects(data.projects || []))
      .catch(() => { });
  }, []);

  const projectOptions = useMemo(() => [
    { value: "", label: "All Projects" },
    ...projects.map((p) => ({ value: p, label: p })),
  ], [projects]);

  const handleProjectChange = useCallback((val) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set("project", val);
    } else {
      params.delete("project");
    }
    router.replace(`/admin/media?${params.toString()}`);
  }, [searchParams, router]);

  const { setControls } = useAdminHeader();

  useEffect(() => {
    setControls(
      <SelectDropdown
        value={projectFilter || ""}
        options={projectOptions}
        onChange={handleProjectChange}
        placeholder="All Projects"
      />
    );
  }, [setControls, projectFilter, projectOptions, handleProjectChange]);

  useEffect(() => {
    return () => setControls(null);
  }, [setControls]);

  return <MediaPageComponent mode="admin" project={projectFilter} />;
}
