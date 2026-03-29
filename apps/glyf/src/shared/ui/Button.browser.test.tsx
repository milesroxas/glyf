import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button (browser)", () => {
  it("invokes onClick in a real browser context", async () => {
    let clicks = 0;
    render(
      <Button type="button" onClick={() => { clicks += 1; }}>
        Tap
      </Button>
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Tap" }));
    expect(clicks).toBe(1);
  });
});
