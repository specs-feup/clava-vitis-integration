# clava-vitis-integration

An extension of the [Clava C/C++ source-to-source compiler](https://github.com/specs-feup/clava) to programatically synthesize functions obtained from the AST using Vitis HLS

## How to install

This package is [available on NPM](https://www.npmjs.com/package/@specs-feup/clava-vitis-integration). Assuming you already have a [Clava-based NPM project](https://github.com/specs-feup/clava-project-template) setup, you can install the latest stable release with:

```bash
npm install @specs-feup/clava-vitis-integration@latest
```

If you want to use unstable and experimental features, use the `staging` or `nightly` tags instead, as they are both built using the most recent commit in the repository. Nightly builds are built automatically every day, while staging builds are built on-demand:

```bash
npm install @specs-feup/clava-vitis-integration@nightly
```

# Basic usage

To synthesize a function and obtain the synthesis report, you can do something like:

```TypeScript
import Query from "@specs-feup/lara/api/weaver/Query.js";
import { FileJp } from "@specs-feup/clava/api/Joinpoints.js";
import { AmdPlatform, ClockUnit, OutputFormat, UncertaintyUnit, VitisHlsConfig } from "@specs-feup/clava-vitis-integration/VitisHlsConfig";
import { VitisHls } from "@specs-feup/clava-vitis-integration/VitisHls";

const vitis = new VitisHls();

const config = new VitisHlsConfig("rgbToGrayscale")
    .setClock({ value: 100, unit: ClockUnit.MEGAHERTZ })
    .setUncertainty({ value: 2, unit: UncertaintyUnit.NANOSECOND })
    .setPlatform(AmdPlatform.ZCU102)
    .setOutputFormat(OutputFormat.VITIS_XO);
vitis.setConfig(config);

// RTL synthesis (report with resource usage estimations)
const synReport = vitis.synthesize();
console.log(synReport);

// Place and route (report with actual resource usage)
const placeRouteReport = vitis.implement();
console.log(placeRouteReport);
```
