// @vitest-environment jsdom

// ** import core packages
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

// ** import components
import { ExpandIcon } from "../src/expand-icon";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("ExpandIcon", () => {
  it("stops click propagation while toggling expansion", () => {
    const toggleExpanded = vi.fn();
    const parentClick = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);
    const row = {
      getCanExpand: () => true,
      getIsExpanded: () => false,
      toggleExpanded,
      subRows: [],
    };

    act(() => root.render(
      <div onClick={parentClick}>
        <ExpandIcon row={row as never} />
      </div>,
    ));
    act(() => container.querySelector("button")?.click());

    expect(toggleExpanded).toHaveBeenCalledOnce();
    expect(parentClick).not.toHaveBeenCalled();
    act(() => root.unmount());
  });
});
