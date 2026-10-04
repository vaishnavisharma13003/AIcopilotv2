export default function EmptyState() {
  return (
    <section className="empty-state">
      <div className="empty-icon">✦</div>

      <h2>Your AI analysis workspace is ready</h2>

      <p>
        Upload your resume and add a target job description to generate your
        personalized career intelligence report.
      </p>

      <div className="empty-features">
        <span>✓ Skill gap analysis</span>
        <span>✓ ATS compatibility</span>
        <span>✓ AI recommendations</span>
        <span>✓ Interview preparation</span>
      </div>
    </section>
  );
}
