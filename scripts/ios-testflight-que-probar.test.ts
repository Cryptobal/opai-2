import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("ios_testflight_que_probar.py", () => {
  it("pasa unittest", () => {
    execSync("python3 -m unittest ios_testflight_que_probar_test", {
      cwd: ".github/scripts",
      stdio: "pipe",
    });
    expect(true).toBe(true);
  });
});