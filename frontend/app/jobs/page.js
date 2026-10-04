"use client";

import PageHeader from "../components/ui/PageHeader";
import RequirementGate from "../components/ui/RequirementGate";
import JobBoard from "../components/jobs/JobBoard";

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="MCP TOOLS"
        title="Job Board"
        description="Search demo jobs through the MCP server and rank them against your resume skills."
      />
      <RequirementGate >
        <JobBoard />
      </RequirementGate>
    </>
  );
}
