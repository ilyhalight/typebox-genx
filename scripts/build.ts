import { $ } from "bun";

async function build(extraScripts: string[] = []) {
  console.log(`Building typebox-genx...`);
  await $`rm -rf dist`;
  for await (const script of extraScripts) {
    await $`bun ${script}`;
  }

  await $`tsc --project tsconfig.build.json --outdir ./dist && tsc-esm-fix --tsconfig tsconfig.build.json`;
  $.cwd("./");
}

await build();
