"use client";

import PageHeader from "../components/ui/PageHeader";
import RequirementGate from "../components/ui/RequirementGate";
import JobAnalyzer from "../components/job/JobAnalyzer";

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="STEP 2"
        title="Job Analyzer"
        description="Paste a job description and let the AI extract requirements, technologies and experience level."
      />
      <RequirementGate >
        <JobAnalyzer />
      </RequirementGate>
    </>
  );
}
