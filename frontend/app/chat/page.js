"use client";

import PageHeader from "../components/ui/PageHeader";
import RequirementGate from "../components/ui/RequirementGate";
import ResumeChat from "../components/resume/ResumeChat";

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="RAG ASSISTANT"
        title="Resume Chat"
        description="Ask questions about your resume. Answers come only from retrieved resume content, with sources."
      />
      <RequirementGate needResume>
        <ResumeChat />
      </RequirementGate>
    </>
  );
}
