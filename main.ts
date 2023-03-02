import {
  dset,
  extname,
  normalize,
  parse,
  parseArchieML,
  parseCsv,
  parseJson,
  parseToml,
  parseYaml,
  relative,
  sep,
  walk,
} from "./deps.ts";

/**
 * quaff's valid extensions - defined up here so it's clear what we support
 */
const exts = [".json", ".yaml", ".yml", ".csv", ".tsv", ".toml", ".aml"];

export async function loadFile(filePath: string): Promise<unknown> {
  const ext = extname(filePath);

  let data: unknown;

  // we give JavaScript entries a special treatment
  if (ext === ".js" || ext === ".cjs" || ext === ".mjs") {
    data = (await import(filePath)).default;

    if (typeof data === "function") {
      data = await data();
    }
  } else {
    const contents = await Deno.readTextFile(filePath);

    switch (ext) {
      case ".json":
        data = parseJson(contents);
        break;
      case ".yaml":
      case ".yml":
        data = parseYaml(contents);
        break;
      case ".csv":
        data = parseCsv(contents);
        break;
      case ".tsv":
        data = parseCsv(contents, { separator: "\t" });
        break;
      case ".aml":
        data = parseArchieML(contents);
        break;
      case ".toml":
        data = parseToml(contents);
        break;
      default:
        throw new Error(
          `Unable to parse ${filePath} - no valid processor found for ${ext} extension`,
        );
    }
  }
  return data;
}

/**
 * We know this will return a string-keyed Object, but that's about it.
 */
export type LoadReturnValue = Record<string, unknown>;

export async function load(dirPath: string): Promise<LoadReturnValue> {
  // normalize the input path
  const cwd = normalize(dirPath);

  // the object we will eventually return with data
  const output: LoadReturnValue = {};

  // a set to watch out for duplicate keys
  const existing = new Set();

  for await (
    const { path } of walk(cwd, {
      includeDirs: false,
      exts,
    })
  ) {
    // get the pieces of the path
    const { dir, name } = parse(relative(cwd, path));

    // split into a list and filter out empty strings
    const dirs = dir.split(sep).filter(Boolean);

    // add the filename to the path part list
    dirs.push(name);

    // build a unique "key" for this file so we can watch out for dupes
    const key = dirs.join(".");

    // if this key isn't unique, throw an error
    if (existing.has(key)) {
      throw new Error(
        `More than one file attempted to use "${key}" as its path. This error is caused by having multiple files in a directory with the same name but different extensions.`,
      );
    }

    // otherwise save it for checking future inputs
    existing.add(key);

    // load the file, and set it in the output object
    const data = await loadFile(path);
    dset(output, dirs, data);
  }

  return output;
}
