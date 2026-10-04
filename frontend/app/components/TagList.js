// Renders a list of strings as small "chip" tags.
// variant: "default" | "missing" | "partial" | "match"
export default function TagList({
  items,
  variant = "default",
  emptyText = "None found.",
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="muted-text">{emptyText}</p>;
  }

  return (
    <div className="tag-list">
      {items.map((item, idx) => (
        <span
          key={`${String(item)}-${idx}`}
          className={`tag ${variant !== "default" ? variant : ""}`}
        >
          {typeof item === "string" ? item : JSON.stringify(item)}
        </span>
      ))}
    </div>
  );
}
