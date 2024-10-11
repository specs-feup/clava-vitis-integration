import { FileJp } from "@specs-feup/clava/api/Joinpoints.js";
import Io from "@specs-feup/lara/api/lara/Io.js";
import ProcessExecutor from "@specs-feup/lara/api/lara/util/ProcessExecutor.js";
import Clava from "@specs-feup/clava/api/clava/Clava.js";
import { HlsConfig, NullConfig } from "./HlsConfig.js";
import chalk from 'chalk';
import { VitisHlsReportParser } from "./VitisHlsReportParser.js";
import { VitisHlsReport } from "./VitisHlsReport.js";

export default class VitisHls {
    private config: HlsConfig;
    private outputDir: string = "output_hls";
    private projectName: string = "vitis_hls_project";

    constructor() {
        this.config = new NullConfig();
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
        this.config = new NullConfig();
        this.outputDir = "output_hls";
        this.projectName = "vitis_hls_run";
        return this;
    }

    public synthesize(timestamped: boolean = true): VitisHlsReport {
        const [cfgPath, fullProjName] = this.createWorkspace(true);
        const workingDir = this.runVpp(cfgPath, fullProjName);
        return this.parseReport(workingDir);
    }

    private log(msg: string): void {
        console.log(`[${chalk.blue("Clava-VitisHLS")}] ${msg}`);
    }

    private createWorkspace(timestamped: boolean): [string, string] {
        const timestamp = timestamped ? `_${Math.floor(Date.now() / 1000)}` : "";
        const fullProjName = `${this.projectName}${timestamp}`;

        const relativePath = `${this.outputDir}/${fullProjName}`;

        Io.mkdir(relativePath);
        Clava.writeCode(relativePath);

        const cfg = this.config.generateConfigFile();
        const cfgFilePath = Io.writeFile(`${relativePath}/hls_config.cfg`, cfg).getAbsolutePath();

        return [cfgFilePath, fullProjName];
    }

    private runVpp(configPath: string, fullProjName: string): string {
        const workingDir = `${this.outputDir}/${fullProjName}`;

        const vpp = new ProcessExecutor();
        vpp.setPrintToConsole(true);

        this.log('-'.repeat(50));
        this.log(`Running VitisHLS for project ${fullProjName}`);
        this.log(`Starting synthesis at ${new Date().toISOString()}`);

        vpp.execute("v++", "-c", "--mode", "hls", "--config", configPath, "--work_dir", workingDir);

        this.log(`Finished synthesis at ${new Date().toISOString()}`);
        this.log('-'.repeat(50));

        return workingDir;
    }

    private parseReport(path: string): any {
        const reportPath = `${path}/hls/syn/report/csynth.xml`;

        const parser = new VitisHlsReportParser();
        return parser.parseReport(reportPath);
    }
}
