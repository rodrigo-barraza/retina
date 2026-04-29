"use client";

import { useEffect } from "react";
import { SelectComponent } from "@rodrigo-barraza/components";
import { useAdminHeader } from "../../../components/AdminHeaderContext";
import useProjectFilter from "../../../hooks/useProjectFilter";
import ModelsPageComponent from "../../../components/ModelsPageComponent";

export default function AdminModelsPage() {
  const { projectFilter, projectOptions, handleProjectChange } =
    useProjectFilter();
  const { setControls, setTitleBadge } = useAdminHeader();

  useEffect(() => {
    setControls(
      <SelectComponent
        value={projectFilter || ""}
        options={projectOptions}
        onChange={handleProjectChange}
        placeholder="All Projects"
      />,
    );
  }, [setControls, projectFilter, projectOptions, handleProjectChange]);

  useEffect(() => {
    return () => {
      setControls(null);
      setTitleBadge(null);
    };
  }, [setControls, setTitleBadge]);

  return <ModelsPageComponent mode="admin" project={projectFilter} onCountChange={setTitleBadge} />;
}
