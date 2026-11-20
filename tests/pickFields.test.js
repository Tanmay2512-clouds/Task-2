const test = require("node:test");
const assert = require("node:assert/strict");
const pickFields = require("../server/utils/pickFields");

test("pickFields keeps only explicitly allowed fields", () => {
  const result = pickFields({
    name: "Miso",
    species: "Cat",
    owner: "another-user",
    passwordHash: "secret"
  }, ["name", "species"]);

  assert.deepEqual(result, { name: "Miso", species: "Cat" });
});

test("pickFields safely rejects non-object request bodies", () => {
  assert.deepEqual(pickFields(null, ["name"]), {});
  assert.deepEqual(pickFields(["Miso"], ["name"]), {});
});
