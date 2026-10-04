"use client";

import PageHeader from "../components/ui/PageHeader";
import RequirementGate from "../components/ui/RequirementGate";
import WorkflowPanel from "../components/interview/WorkflowPanel";

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="LANGGRAPH"
        title="AI Workflow"
        description="A five-step pipeline: analyze, find gaps, then generate interview questions and a learning plan."
      />
      <RequirementGate needResume needJob>
        <WorkflowPanel />
      </RequirementGate>
    </>
  );
}
