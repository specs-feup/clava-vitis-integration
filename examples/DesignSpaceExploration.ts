import { FileJp, FunctionJp, Loop } from "@specs-feup/clava/api/Joinpoints.js";
import Query from "@specs-feup/lara/api/weaver/Query.js";
import { DseEngine } from "../src/DseEngine.js";
import Clava from "@specs-feup/clava/api/clava/Clava.js";
import { AmdPlatform, ClockUnit, OutputFormat, UncertaintyUnit, VitisHlsConfig } from "../src/VitisHlsConfig.js";
import { VitisHls } from "../src/VitisHls.js";
import { VitisSynReport } from "../src/VitisReports.js";

const fun = Query.search(FunctionJp, {name: "dotprod"}).first()!;
const loop = Query.searchFrom(fun, Loop).first()!;
const inputA = fun.params[0];
const inputB = fun.params[1];

const dseBuilder = new DseEngine(fun)
                    .on(loop)
                        .alias("L1")
                        .pipeline()
                            .withInitiationIntervals([1,2,3])
                            .withRewind()
                        .unroll()
                            .withFactors([2,4,8])
                            .withSkipExitCheck()
                            .withNoSkipExitCheck()
                    .on(inputA)
                        .partitionArray()
                            .withCyclicPartitioning([2,4])
                            .acrossDimensions([1])
                    .on(inputB)
                        .partitionArray()
                            .withBlockPartitioning([2,4,8])
                            .acrossDimensions([1])
                    .synthesizeAll()
                    .sortBy("latency")
                    .printResults();

                    