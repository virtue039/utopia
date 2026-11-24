import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { DocViewer } from "./DocViewer";

const view = vi.hoisted(() => ({
  search: {} as { chunk?: string },
  nextState: 0,
  states: [] as unknown[],
  effects: [] as Array<() => void | (() => void)>,
  anchor: { current: null as Pick<HTMLDivElement, "scrollIntoView"> | null },
  pickPage: undefined as ((page: number) => void) | undefined,
}));

const detail = {
  document: { kb_id: "kb", filename: "source.txt", size_bytes: 120, created_at: "2026-06-01" },
  chunks: Array.from({ length: 13 }, (_, seq) => ({
    id: "chunk-" + seq, seq, text: "paragraph " + seq, origin: "native",
  })),
};

vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = view.nextState++;
    if (!(index in view.states)) view.states[index] = initial;
    return [view.states[index], (value: unknown) => { view.states[index] = value; }];
  },
  useRef: () => view.anchor,
  useEffect: (effect: () => void | (() => void)) => { view.effects.push(effect); },
}));
vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-query")>(),
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => ({
    data: queryKey[0] === "docDetail" ? detail : undefined,
  }),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => children,
  useParams: () => ({ docId: "doc" }),
  useSearch: () => view.search,
  useNavigate: () => () => {},
}));
vi.mock("../kb", () => ({ useKbId: () => "kb" }));
vi.mock("./SourcesRail", () => ({ SourcesRail: () => null }));
vi.mock("../ui", async (importOriginal) => ({
  ...await importOriginal<typeof import("../ui")>(),
  Pager: ({ onPage }: { onPage: (page: number) => void }) => {
    view.pickPage = onPage;
    return null;
  },
}));

function render() {
  view.nextState = 0;
  view.effects = [];
  return renderToStaticMarkup(createElement(DocViewer));
}

it("mounts the cited row in time to scroll after a manual page change", () => {
  render();
  view.pickPage!(1);
  expect(render()).toContain("paragraph 12");

  view.search = { chunk: "chunk-0" };
  expect(render()).toContain("paragraph 0");
  const scrollIntoView = vi.fn();
  // SSR leaves refs empty, so simulate the target row being attached on commit.
  view.anchor.current = { scrollIntoView };
  const cleanups = view.effects.map((effect) => effect());
  try {
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
    expect(render()).toContain("u-flash");
  } finally {
    for (const cleanup of cleanups) cleanup?.();
  }
});
