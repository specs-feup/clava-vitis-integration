import Io from "@specs-feup/lara/api/lara/Io.js";
import ProcessExecutor from "@specs-feup/lara/api/lara/util/ProcessExecutor.js";
import { HlsConfig, NullConfig } from "./HlsConfig.js";
import chalk from 'chalk';
import { HlsReportParser } from "./HlsReportParser.js";
import { HlsReport } from "./HlsReport.js";

export class VitisHls {
    private readonly defaultState = { config: new NullConfig(), outputDir: "output_hls", projectName: "vpp_hls_run" };
    private config: HlsConfig;
    private outputDir: string;
    private projectName: string;

    constructor() {
        this.config = this.defaultState.config;
        this.outputDir = this.defaultState.outputDir;
        this.projectName = this.defaultState.projectName;
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
        this.config = this.defaultState.config;
        this.outputDir = this.defaultState.outputDir;
        this.projectName = this.defaultState.projectName;
        return this;
    }

    public synthesize(timestamped: boolean = true, silent: boolean = false): HlsReport {
        const [cfgPath, fullProjName] = this.createWorkspace(timestamped);
        const workingDir = this.runVpp(cfgPath, fullProjName, silent);
        this.cleanup(workingDir);
        return this.parseReport(workingDir);
    }

    public createWorkspace(timestamped: boolean): [string, string] {
        const timestamp = timestamped ? `${Math.floor(Date.now() / 1000)}` : "";
        const fullProjName = `${this.projectName}_${timestamp}_${this.config.getTopFunction()}`;

        const relativePath = `${this.outputDir}/${fullProjName}`;

        if (Io.isFolder(relativePath)) {
            Io.deleteFolder(relativePath);
        }
        Io.mkdir(relativePath);

        for (const file of this.config.getSources()) {
            file.write(relativePath);
        }

        const cfg = this.config.generateConfigFile();
        const cfgFilePath = Io.writeFile(`${relativePath}/hls_config.cfg`, cfg).getAbsolutePath();

        return [cfgFilePath, fullProjName];
    }

    private log(msg: string): void {
        console.log(`[${chalk.blue("Clava-VitisHLS")}] ${msg}`);
    }

    private runVpp(configPath: string, fullProjName: string, silent: boolean = false): string {
        const workingDir = `${this.outputDir}/${fullProjName}`;

        const vpp = new ProcessExecutor();
        vpp.setPrintToConsole(!silent);

        this.log('-'.repeat(50));
        this.log(`Executing Vitis in synthesis mode for project ${fullProjName} using command:`);
        this.log(`    v++ -c --mode hls --config ${configPath} --work_dir ${workingDir}`);
        this.log(`Starting synthesis at ${new Date().toISOString()} in ${silent ? "silent" : "verbose"} mode`);

        // vitis-run --mode hls --impl --config /home/tls/Dev/heterogeneous-vitis-apps/amd-vadd/hello_world_vadd/hls_config.cfg --work_dir vadd
        const ret = vpp.execute("v++", "-c", "--mode", "hls", "--config", configPath, "--work_dir", workingDir);

        this.log(`Finished synthesis at ${new Date().toISOString()}`);
        this.log(`v++ exit code: ${ret}`);
        this.log('-'.repeat(50));

        return workingDir;
    }

    private cleanup(workingDir: string): void {
        if (Io.isFile(`${workingDir}/../vitis-comp.json`)) {
            Io.deleteFile(`${workingDir}/../vitis-comp.json`);
        }
    }

    private parseReport(path: string): HlsReport {
        const reportPath = `${path}/hls/syn/report/csynth.xml`;

        if (!Io.isFile(reportPath)) {
            this.log(`Report file not found at ${reportPath}, likely due to an error during synthesis.`);
            return HlsReportParser.emptyReport();
        }

        const parser = new HlsReportParser();
        return parser.parseReport(reportPath);
    }
}
