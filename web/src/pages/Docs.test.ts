import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";

const usePageTitle = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => children,
  useNavigate: () => () => {},
  useParams: () => ({ slug: "ingest" }),
}));
vi.mock("./HeaderActions", () => ({ HeaderActions: () => null }));
vi.mock("../useTitle", () => ({ usePageTitle }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

it("uses the selected locale for documentation navigation and the page title", async () => {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => key === "utopia.lang" ? "zh" : null,
  });
  vi.stubGlobal("navigator", { platform: "MacIntel" });
  const { DocsPage } = await import("./Docs");
  const client = new QueryClient();
  const markup = renderToStaticMarkup(
    createElement(QueryClientProvider, { client, children: createElement(DocsPage) }),
  );

  expect(markup).toContain("摄入接口");
  expect(markup).toContain("通过 MCP 使用智能体");
  expect(usePageTitle).toHaveBeenCalledWith("Utopia", "摄入接口");
});
