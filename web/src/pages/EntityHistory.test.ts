import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { S } from "../i18n";
import { EntityHistory } from "./EntityHistory";

const history = vi.hoisted(() => ({
  error: new Error("History request failed"),
  refetch: vi.fn(),
  retry: undefined as (() => void) | undefined,
}));

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-query")>(),
  useQuery: () => ({ isError: true, error: history.error, refetch: history.refetch }),
}));
vi.mock("../ui", async (importOriginal) => ({
  ...await importOriginal<typeof import("../ui")>(),
  LinkButton: ({ onClick, children }: { onClick: () => void; children: ReactNode }) => {
    history.retry = onClick;
    return createElement("button", null, children);
  },
}));

it("shows a history load failure and lets the reader retry", () => {
  const markup = renderToStaticMarkup(createElement(EntityHistory, { kbId: "kb", entityId: "entity" }));
  expect(markup).toContain(history.error.message);
  expect(markup).not.toContain(S.graph.historyEmpty);
  expect(markup).toContain(S.ask.retryHistory);

  history.retry?.();
  expect(history.refetch).toHaveBeenCalledOnce();
});
