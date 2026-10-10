const test = require("node:test");
const assert = require("node:assert/strict");
const violationValidators = require("../src/validators/violations");
const actionValidators = require("../src/validators/actions");

test("violation validator preserves existing required-field message", () => {
  assert.deepEqual(violationValidators.validateCreate({}), {
    error: "mine_id, category, severity, and description are required.",
  });
});

test("violation validator normalizes valid payloads", () => {
  assert.deepEqual(
    violationValidators.validateCreate({
      mine_id: "2",
      category: " Safety ",
      severity: "HIGH",
      description: "  Unprotected edge  ",
      area: "North wall",
      latitude: "18.5204",
      longitude: "73.8567",
      gps_accuracy: "8",
    }),
    {
      value: {
        mineId: 2,
        category: "safety",
        severity: "high",
        description: "Unprotected edge",
        area: "North wall",
        latitude: 18.5204,
        longitude: 73.8567,
        gpsAccuracy: 8,
      },
    },
  );
});

test("violation validator preserves GPS validation message", () => {
  assert.deepEqual(
    violationValidators.validateCreate({
      mine_id: 1,
      category: "safety",
      severity: "medium",
      description: "x",
      latitude: "north",
    }),
    {
      error: "latitude, longitude, and gps_accuracy must be valid numbers when provided.",
    },
  );
});

test("status and corrective action validators preserve existing messages", () => {
  assert.deepEqual(violationValidators.validateStatus("no", "open"), {
    error: "A valid violation id and status are required.",
  });
  assert.deepEqual(actionValidators.validateCreate("1", {}), {
    error: "violation id and action_taken are required.",
  });
  assert.deepEqual(actionValidators.validateStatus("1", "done"), {
    error: "A valid action id and status are required.",
  });
});
