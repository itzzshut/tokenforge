#!/usr/bin/env node
// Thin executable entrypoint. Requires `npm run build` to have produced dist/cli.js.
import { main } from '../dist/cli.js';

main(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
});
