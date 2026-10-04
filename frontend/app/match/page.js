"use client";

import PageHeader from "../components/ui/PageHeader";
import RequirementGate from "../components/ui/RequirementGate";
import MatchResult from "../components/analysis/MatchResult";

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="AI ANALYSIS"
        title="Resume Match"
        description="Compatibility between your resume and the target role — score, skill gaps and suggestions."
      />
      <RequirementGate needResume needJob>
        <MatchResult />
      </RequirementGate>
    </>
  );
}
