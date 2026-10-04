"use client";

import PageHeader from "../components/ui/PageHeader";
import RequirementGate from "../components/ui/RequirementGate";
import ResumeUpload from "../components/resume/ResumeUpload";

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="STEP 1"
        title="Resume Analyzer"
        description="Upload your PDF resume for structured AI analysis. It is also indexed so you can chat with it."
      />
      <RequirementGate >
        <ResumeUpload />
      </RequirementGate>
    </>
  );
}
