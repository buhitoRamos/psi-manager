import { calculateBillingPeriod } from "./billing.ts";

function assertEquals(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
    );
  }
}

function assertThrows(callback: () => unknown) {
  try {
    callback();
  } catch {
    return;
  }
  throw new Error("Expected callback to throw.");
}

Deno.test("new account's first due date is one month after signup", () => {
  assertEquals(calculateBillingPeriod("2026-11-08T15:00:00Z", "2026-11-08"), {
    dueDate: "2026-12-08",
    firstDueDate: "2026-12-08",
    daysUntilDue: 30,
  });
});

Deno.test("shows the free-month deadline three days ahead", () => {
  assertEquals(calculateBillingPeriod("2026-11-08T15:00:00Z", "2026-12-05"), {
    dueDate: "2026-12-08",
    firstDueDate: "2026-12-08",
    daysUntilDue: 3,
  });
});

Deno.test("does not mistake the next paid renewal for the free month", () => {
  assertEquals(calculateBillingPeriod("2026-11-08T15:00:00Z", "2026-12-09"), {
    dueDate: "2027-01-08",
    firstDueDate: "2026-12-08",
    daysUntilDue: 30,
  });
});

Deno.test("clamps month-end signup dates and restores the anchor day in later months", () => {
  assertEquals(calculateBillingPeriod("2026-01-31T12:00:00Z", "2026-02-25"), {
    dueDate: "2026-02-28",
    firstDueDate: "2026-02-28",
    daysUntilDue: 3,
  });
  assertEquals(calculateBillingPeriod("2026-01-31T12:00:00Z", "2026-03-30"), {
    dueDate: "2026-03-31",
    firstDueDate: "2026-02-28",
    daysUntilDue: 1,
  });
});

Deno.test("rejects malformed dates", () => {
  assertThrows(() => calculateBillingPeriod("not-a-date", "2026-11-08"));
});
