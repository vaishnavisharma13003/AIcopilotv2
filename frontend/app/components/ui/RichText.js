// Tiny, safe renderer for LLM text: numbered / bulleted lists, headings, **bold**.
function inline(text) {
  return String(text)
    .split(/\*\*(.+?)\*\*/g)
    .map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}

export default function RichText({ text }) {
  const lines = String(text || "").split(/\r?\n/);
  const blocks = [];
  let list = null;

  const flush = () => {
    if (list) {
      blocks.push(list);
      list = null;
    }
  };

  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) {
      flush();
      return;
    }

    const num = line.match(/^(\d+)[.)]\s+(.*)$/);
    const bul = line.match(/^[-*•]\s+(.*)$/);

    if (num || bul) {
      const type = num ? "ol" : "ul";
      if (!list || list.type !== type) {
        flush();
        list = { type, items: [] };
      }
      list.items.push(num ? num[2] : bul[1]);
      return;
    }

    flush();
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    blocks.push({ type: heading ? "h" : "p", text: heading ? heading[1] : line });
  });
  flush();

  if (blocks.length === 0) return <p className="muted-text">Nothing generated.</p>;

  return (
    <div className="rich-text">
      {blocks.map((block, i) => {
        if (block.type === "ol")
          return (
            <ol key={i}>
              {block.items.map((item, j) => (
                <li key={j}>{inline(item)}</li>
              ))}
            </ol>
          );
        if (block.type === "ul")
          return (
            <ul key={i}>
              {block.items.map((item, j) => (
                <li key={j}>{inline(item)}</li>
              ))}
            </ul>
          );
        if (block.type === "h") return <h5 key={i}>{inline(block.text)}</h5>;
        return <p key={i}>{inline(block.text)}</p>;
      })}
    </div>
  );
}
