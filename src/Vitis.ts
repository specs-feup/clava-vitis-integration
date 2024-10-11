import Query from "@specs-feup/lara/api/weaver/Query.js";
import { FunctionJp } from "@specs-feup/clava/api/Joinpoints.js";

for (const $function of Query.search(FunctionJp)) {
    console.log($function.name);
}
