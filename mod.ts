// Copyright 2023 Ryan Murphy. MIT license.

/**
 * A port of the [`quaff` Node.js library](https://github.com/rdmurphy/quaff) to
 * Deno. Mostly done as an experiment to see how easy it would be, but it's
 * fully tested and adds support for [TOML](https://toml.io/en/)!
 *
 * ## Usage
 *
 * Assume a folder with this structure.
 *
 * ```txt
 * data/
 *   mammals/
 *     cats.json
 *     dogs.json
 *     bears.csv
 *   birds/
 *     parrots.yml
 *     story.aml
 * ```
 *
 * After importing `quaff`:
 *
 * ```ts
 * import { load } from "https://deno.land/x/quaff/mod.ts";
 *
 * const data = await load("./data/");
 * console.log(data);
 * ```
 *
 * And the results...
 *
 * ```json
 * {
 *   "mammals": {
 *     "cats": ["Marty", "Sammy"],
 *     "dogs": ["Snazzy", "Cally"],
 *     "bears": [
 *       {
 *         "name": "Steve",
 *         "type": "Polar bear"
 *       },
 *       {
 *         "name": "Angelica",
 *         "type": "Sun bear"
 *       }
 *     ]
 *   },
 *   "birds": {
 *     "parrots": {
 *       "alive": ["Buzz"],
 *       "dead": ["Moose"]
 *     },
 *     "story": {
 *       "title": "All about birds",
 *       "prose": [
 *         { "type": "text", "value": "Do you know how great birds are?" },
 *         { "type": "text", "value": "Come with me on this journey." }
 *       ]
 *     }
 *   }
 * }
 * ```
 *
 * It's also possible to load a single file at a time, allowing more custom
 * approaches in case `load` doesn't work exactly the way you'd like.
 *
 * ```ts
 * import { loadFile } from "https://deno.land/x/quaff/mod.ts";
 *
 * const data = await loadFile("./data/mammals/bears.csv");
 * console.log(data);
 * ```
 *
 * And the results...
 *
 * ```json
 * [
 *   {
 *    "name": "Steve",
 *    "type": "Polar bear"
 *  },
 *  {
 *    "name": "Angelica",
 *    "type": "Sun bear"
 *  }
 * ]
 * ```
 *
 * @module
 */

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

/**
 * Loads a single file and returns the data if it's a valid format.
 *
 * @param filePath A path to the file to load
 * @returns The post-processed data from the file as a JavaScript object
 */
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

export type LoadReturnValue = Record<string, unknown>;

/**
 * Loads a directory of files and returns the data as a JavaScript object.
 *
 * @param dirPath The path to the directory to load
 * @returns An object with the post-processed data from the files in the directory
 */
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
