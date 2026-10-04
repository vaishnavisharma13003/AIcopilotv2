"use client";

import PageHeader from "../components/ui/PageHeader";
import RequirementGate from "../components/ui/RequirementGate";
import AgentPlayground from "../components/agent/AgentPlayground";

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="TOOL CALLING"
        title="AI Agent"
        description="Watch the model decide when to call tools, with the full call trace shown honestly."
      />
      <RequirementGate >
        <AgentPlayground />
      </RequirementGate>
    </>
  );
}
