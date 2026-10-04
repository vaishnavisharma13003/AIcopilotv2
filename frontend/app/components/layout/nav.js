// Single source of truth for the sidebar + breadcrumbs.
export const NAV_GROUPS = [
  {
    label: "WORKSPACE",
    items: [
      { href: "/", label: "Dashboard", icon: "home", crumb: "Overview" },
      { href: "/resume", label: "Resume Analyzer", icon: "file", crumb: "Resume Analyzer" },
      { href: "/job", label: "Job Analyzer", icon: "briefcase", crumb: "Job Analyzer" },
      { href: "/match", label: "Resume Match", icon: "target", crumb: "Resume Match" },
      { href: "/chat", label: "Resume Chat", icon: "chat", crumb: "Resume Chat" },
      { href: "/workflow", label: "AI Workflow", icon: "flow", crumb: "AI Workflow" },
    ],
  },
  {
    label: "EXPLORE",
    items: [
      { href: "/jobs", label: "Job Board", icon: "search", crumb: "Job Board" },
      { href: "/agent", label: "AI Agent", icon: "bot", crumb: "AI Agent" },
    ],
  },
  {
    label: "LIBRARY",
    items: [{ href: "/history", label: "History", icon: "clock", crumb: "History" }],
  },
];

export const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export function findItem(pathname) {
  return (
    ALL_ITEMS.find((i) => (i.href === "/" ? pathname === "/" : pathname.startsWith(i.href))) ||
    ALL_ITEMS[0]
  );
}
