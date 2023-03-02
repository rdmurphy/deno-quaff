<p align="center">
  <img src="https://i.imgur.com/yC80ftQ.png" width="150" height="217" alt="quaff">
</p>
<h1 align="center">
  quaff
</h1>

A port of my [`quaff` Node.js library](https://github.com/rdmurphy/quaff) to Deno. Mostly done as an experiment to see how easy it would be, but it's also fully tested! (And adds support for [TOML](https://toml.io/en/)!)

## Key features

- 🚚 A **data pipeline helper** that works similar to [Middleman](https://middlemanapp.com/)'s [Data Files](https://middlemanapp.com/advanced/data_files/) collector
- 📦 Point the library at a folder filled with JS, AML ([ArchieML](http://archieml.org)), JSON, YAML, CSV, TSV and/or TOML files and **get a JavaScript object back that reflects the folder's structure and content/exports**

## Usage

Assume a folder with this structure.

```txt
data/
  mammals/
    cats.json
    dogs.json
    bears.csv
  birds/
    parrots.yml
    story.aml
```

After `import`'ing `quaff`:

```js
import { load } from "TKTK/main.ts";

const data = await load("./data/");
console.log(data);
```

And the results...

```json
{
  "mammals": {
    "cats": ["Marty", "Sammy"],
    "dogs": ["Snazzy", "Cally"],
    "bears": [
      {
        "name": "Steve",
        "type": "Polar bear"
      },
      {
        "name": "Angelica",
        "type": "Sun bear"
      }
    ]
  },
  "birds": {
    "parrots": {
      "alive": ["Buzz"],
      "dead": ["Moose"]
    },
    "story": {
      "title": "All about birds",
      "prose": [
        { "type": "text", "value": "Do you know how great birds are?" },
        { "type": "text", "value": "Come with me on this journey." }
      ]
    }
  }
}
```

It's also possible to load a single file at a time, allowing more custom approaches in case `load` doesn't work exactly the way you'd like.

```js
import { loadFile } from "quaff";

const data = await loadFile("./data/mammals/bears.csv");
console.log(data);
```

And the results...

```json
[
  {
    "name": "Steve",
    "type": "Polar bear"
  },
  {
    "name": "Angelica",
    "type": "Sun bear"
  }
]
```

## Advanced Usage with JavaScript files

`quaff` has the ability to load JavaScript files. But how exactly does that work?

JavaScript files that are consumed by `quaff` have to follow one simple rule - they must `export default` a function, an async function or value. All three of these are valid and return the same value:

```js
export default [
  {
    name: "Pudge",
    instagram: "https://instagram.com/pudgethecorgi/",
  },
];
```

```js
export default () => [
  {
    name: "Pudge",
    instagram: "https://instagram.com/pudgethecorgi/",
  },
];
```

```js
export default async () => [
  {
    name: "Pudge",
    instagram: "https://instagram.com/pudgethecorgi/",
  },
];
```

The final example above is the most interesting one - `async` functions also work! This means you can write code to hit API endpoints, or do other asynchronous work, and `quaff` will wait for those to resolve.

```js
export default async () => {
  const res = await fetch("https://my-cool-api/");
  const data = await res.json();

  // whatever the API returned will be added to the quaff object!
  return data;
};
```

Don't have a `Promise` to do async work with? Working with a callback interface? Just wrap it in one!

```js
import { apiHelper } from "npm:my-callback-api";

export default () => {
  return new Promise((resolve, reject) => {
    apiHelper("people", (err, data) => {
      if (err) return reject(err);

      // quaff will take it from here!
      resolve(data);
    });
  });
};
```

## License

MIT
