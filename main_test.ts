import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.178.0/testing/asserts.ts";
import { load, loadFile } from "./main.ts";
import {
  parseArchieML,
  parseCsv,
  parseJson,
  parseToml,
  parseYaml,
} from "./deps.ts";

// Utilities
async function readJson(filePath: string): Promise<unknown> {
  return parseJson(await Deno.readTextFile(filePath));
}
async function readCsv(filePath: string): Promise<unknown> {
  return parseCsv(await Deno.readTextFile(filePath));
}
async function readArchieML(filePath: string): Promise<unknown> {
  return parseArchieML(await Deno.readTextFile(filePath));
}

// Single-file tests
Deno.test("should return object generated from json", async () => {
  const expected = await readJson("./test_files/basic.json");
  const actual = await loadFile("./test_files/basic.json");

  assertEquals(actual, expected);
});

Deno.test("should return object generated from yaml", async () => {
  const expected = parseYaml(
    await Deno.readTextFile("./test_files/basic.yaml")
  );
  const actual = await loadFile("./test_files/basic.yaml");

  assertEquals(actual, expected);
});

Deno.test("should return object generated from yml", async () => {
  const expected = parseYaml(await Deno.readTextFile("./test_files/basic.yml"));
  const actual = await loadFile("./test_files/basic.yml");

  assertEquals(actual, expected);
});

Deno.test("should return object generated from csv", async () => {
  const expected = await readCsv("./test_files/basic.csv");
  const actual = await loadFile("./test_files/basic.csv");

  assertEquals(actual, expected);
});

Deno.test("should return object generated from tsv", async () => {
  const expected = parseCsv(await Deno.readTextFile("./test_files/basic.tsv"), {
    separator: "\t",
  });
  const actual = await loadFile("./test_files/basic.tsv");

  assertEquals(actual, expected);
});

Deno.test("should return object generated from toml", async () => {
  const expected = parseToml(
    await Deno.readTextFile("./test_files/basic.toml")
  );
  const actual = await loadFile("./test_files/basic.toml");

  assertEquals(actual, expected);
});

Deno.test("should return object generated from aml", async () => {
  assertEquals(
    await readArchieML("./test_files/basic.aml"),
    await loadFile("./test_files/basic.aml")
  );

  assertEquals(
    await readArchieML("./test_files/advanced.aml"),
    await loadFile("./test_files/advanced.aml")
  );
});

Deno.test(
  "should return what is exported from a JavaScript file (no function)",
  async () => {
    assertEquals(
      (await import("./test_files/basic.js")).default,
      await loadFile("./test_files/basic.js")
    );

    assertEquals(
      (await import("./test_files/basic.mjs")).default,
      await loadFile("./test_files/basic.mjs")
    );
  }
);

Deno.test(
  "should return what is exported from a JavaScript file (sync function)",
  async () => {
    assertEquals(
      (await import("./test_files/basic_sync.js")).default(),
      await loadFile("./test_files/basic_sync.js")
    );

    assertEquals(
      (await import("./test_files/basic_sync.mjs")).default(),
      await loadFile("./test_files/basic_sync.mjs")
    );
  }
);

Deno.test(
  "should return what is exported from a JavaScript file (async function)",
  async () => {
    assertEquals(
      await (await import("./test_files/basic_async.js")).default(),
      await loadFile("./test_files/basic_async.js")
    );

    assertEquals(
      await (await import("./test_files/basic_async.mjs")).default(),
      await loadFile("./test_files/basic_async.mjs")
    );
  }
);

// Directory tests
Deno.test(
  "should return object generated from a single depth directory",
  async () => {
    const expected = {
      corgis: await readJson("./test_files/single_depth/corgis.json"),
    };
    const actual = await load("./test_files/single_depth");

    assertEquals(actual, expected);
  }
);

Deno.test(
  "should return object generated from a double depth directory",
  async () => {
    const expected = {
      corgis: await readJson("./test_files/double_depth/corgis.json"),
      second: {
        malamutes: await readJson(
          "./test_files/double_depth/second/malamutes.json"
        ),
      },
    };
    const actual = await load("./test_files/double_depth");

    assertEquals(actual, expected);
  }
);

Deno.test(
  "should return object generated from a triple depth directory",
  async () => {
    const expected = {
      corgis: await readJson("./test_files/triple_depth/corgis.json"),
      second: {
        malamutes: await readJson(
          "./test_files/triple_depth/second/malamutes.json"
        ),
        third: {
          cats: await readCsv(
            "./test_files/triple_depth/second/third/cats.csv"
          ),
        },
      },
    };
    const actual = await load("./test_files/triple_depth");

    assertEquals(actual, expected);
  }
);

// errors
Deno.test(
  "should throw an error when attempting to load empty JSON",
  async () => {
    await assertRejects(
      () => loadFile("./test_files/empty.json"),
      parseJson.JSONParseError,
      "Unexpected end of JSON input"
    );
  }
);

Deno.test(
  "should throw an error when attempting to load bad JSON",
  async () => {
    await assertRejects(
      () => loadFile("./test_files/bad.json"),
      parseJson.JSONParseError
    );
  }
);

Deno.test("should throw an error if a file key is reused", async () => {
  await assertRejects(
    () => load("./test_files/duplicate_keys"),
    Error,
    "More than one file attempted"
  );
});
