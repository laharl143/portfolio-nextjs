import { describe, expect, it } from "vitest";
import { createAlertBody, readAlertBody } from "./alert-email";

describe("frozen inquiry email", () => {
  it("stores a branded card and plain text with only the private link", () => {
    const link = "https://ed-solutions.dev/studio/inquiries/fake-id";
    const body = createAlertBody(link);
    const email = readAlertBody(body);
    expect(email.html).toContain("ED SOLUTIONS");
    expect(email.html).toContain("background:#14263f");
    expect(email.html).toContain("background:#2563eb");
    expect(email.html).toContain("View inquiry");
    expect(email.html).toContain(`href="${link}"`);
    expect(email.text).toContain(link);
    expect(readAlertBody(body)).toEqual(email);
  });

  it("preserves legacy plain text exactly for existing attempt retries", () => {
    const body = "A new project inquiry is available in your private studio.\n\nhttps://example.test/studio/inquiries/old";
    expect(readAlertBody(body)).toEqual({ text: body });
  });

  it("escapes the link in HTML attributes", () => {
    const email = readAlertBody(createAlertBody('https://example.test/?a=1&b="test"'));
    expect(email.html).toContain("&amp;b=&quot;test&quot;");
  });
});
