import Query from "@specs-feup/lara/api/weaver/Query.js";
import { FileJp, FunctionJp } from "@specs-feup/clava/api/Joinpoints.js";
import { HlsConfig, NullConfig } from "./HlsConfig.js";

export default class VitisHls {
    private files: FileJp[] = [];
    private config: HlsConfig;
    private outputDir: string = "output_hls";
    private projectName: string = "vitis_hls_project";

    constructor() {
        this.config = new NullConfig();
    }

    public addFile(file: FileJp): VitisHls {
        this.files.push(file);
        return this;
    }

    public setConfig(config: HlsConfig): VitisHls {
        this.config = config;
        return this;
    }

    public setProjectName(projectName: string): VitisHls {
        this.projectName = projectName;
        return this;
    }

    public setOutputDir(outputDir: string): VitisHls {
        this.outputDir = outputDir;
        return this;
    }

    public reset(): VitisHls {
        this.files = [];
        this.config = new NullConfig();
        this.outputDir = "output_hls";
        this.projectName = "vitis_hls_project";
        return this;
    }

    public synthesize(): void {

    }

    private createProjectDir(): void {

    }

    private createTclScript(): void {

    }

    private runVpp(): void {
        // v++ -c --mode hls --config /home/tls/Misc/VitisGenericWorkspace/hls_component/hls_config.cfg --work_dir hls_component
    }
}
