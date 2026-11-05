# data

The inputs of the generated files (`src/asl/metadata.generated.ts` and `syntaxes/asl.tmLanguage.json`).

| File | Content |
|---|---|
| `al-commands.txt` | the 174 top level command names of Arx Libertatis 1.2.1, without underscores and lowercase (the engine strips the underscores before the lookup) |
| `al-events.txt` | the 74 built in event names (`on null` included) |
| `al-system-vars.txt` | the system variable names of `getSystemVar()`; a trailing `*` marks a prefix family (`^dist_*` means `^dist_<entity>`) |

These files are **generated** from the engine sources, do not edit them by hand:

```sh
node scripts/extract-al-metadata.ts ../ArxLibertatis/src/script
node scripts/generate.ts
```

The first command reads the C++ sources (the 1.2.1 tag of
[arx/ArxLibertatis](https://github.com/arx/ArxLibertatis)), the second one regenerates the metadata
module and the grammar. The extracted data is committed, so a normal build does not need the engine
sources.
