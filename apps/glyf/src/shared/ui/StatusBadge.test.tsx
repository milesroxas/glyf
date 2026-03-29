import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders status copy for each connection phase", () => {
    const { rerender } = render(<StatusBadge status="disconnected" />);
    expect(screen.getByText("Disconnected")).toBeInTheDocument();

    rerender(<StatusBadge status="connecting" />);
    expect(screen.getByText("Scanning…")).toBeInTheDocument();

    rerender(<StatusBadge status="connected" />);
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });
});
