"use client";

import PageHeader from "../components/ui/PageHeader";
import RequirementGate from "../components/ui/RequirementGate";
import HistoryList from "../components/history/HistoryList";

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="LIBRARY"
        title="History"
        description="Everything you generate is saved. Restore any item back into your workspace."
      />
      <RequirementGate >
        <HistoryList />
      </RequirementGate>
    </>
  );
}
