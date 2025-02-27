import Io from "@specs-feup/lara/api/lara/Io.js";
import ProcessExecutor from "@specs-feup/lara/api/lara/util/ProcessExecutor.js";
import { HlsConfig, NullConfig } from "./HlsConfig.js";
import chalk from 'chalk';
import { HlsReportParser } from "./HlsReportParser.js";
import { VitisImplReport, VitisSynReport } from "./HlsReport.js";

export enum VppMode {
    SYN = "synthesis",
    IMPL = "implementation"
}

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

    public synthesize(timestamped: boolean = true, silent: boolean = false): VitisSynReport {
        const [cfgPath, fullProjName] = this.createWorkspace(timestamped);
        const workingDir = this.runVpp(VppMode.SYN, cfgPath, fullProjName, silent);
        this.cleanup(workingDir);

        return this.parseSynthesisReport(workingDir);
    }

    public implement(timestamped: boolean = true, silent: boolean = false): VitisImplReport {
        const [cfgPath, fullProjName] = this.createWorkspace(timestamped);
        const workingDir = this.runVpp(VppMode.IMPL, cfgPath, fullProjName, silent);
        this.cleanup(workingDir);

        return this.parseImplementationReport(workingDir);
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

    private runVpp(mode: VppMode, configPath: string, fullProjName: string, silent: boolean = false): string {
        const workingDir = `${this.outputDir}/${fullProjName}`;

        let command = "v++";
        switch (mode) {
            case VppMode.SYN:
                command += ` -c --mode hls --config ${configPath} --work_dir ${workingDir}`;
                break;
            case VppMode.IMPL:
                command += ` -c --mode hls --impl --config ${configPath} --work_dir ${workingDir}`;
                break;
            default:
                throw new Error(`Invalid Vitis mode: ${mode}`);
        }

        const vpp = new ProcessExecutor();
        vpp.setPrintToConsole(!silent);

        this.log('-'.repeat(50));
        this.log(`Executing Vitis in ${mode} mode for project ${fullProjName} using command:`);
        this.log(`    ${command}`);
        this.log(`Starting ${mode} at ${new Date().toISOString()} in ${silent ? "silent" : "verbose"} mode`);

        const ret = vpp.execute(...command.split(" "));

        this.log(`Finished ${mode} at ${new Date().toISOString()}`);
        this.log(`v++ exit code: ${ret}`);
        this.log('-'.repeat(50));

        return workingDir;
    }

    private cleanup(workingDir: string): void {
        if (Io.isFile(`${workingDir}/../vitis-comp.json`)) {
            Io.deleteFile(`${workingDir}/../vitis-comp.json`);
        }
    }

    private parseSynthesisReport(path: string): VitisSynReport {
        const reportPath = `${path}/hls/syn/report/csynth.xml`;

        if (!Io.isFile(reportPath)) {
            this.log(`Report file not found at ${reportPath}, likely due to an error during synthesis`);
            return HlsReportParser.emptyReport();
        }

        const parser = new HlsReportParser();
        return parser.parseReport(reportPath);
    }

    private parseImplementationReport(path: string): VitisImplReport {
        const reportPath = `${path}/hls/impl/report/verilog/export_impl.xml`;

        if (!Io.isFile(reportPath)) {
            this.log(`Report file not found at ${reportPath}, likely due to an error during implementation`);
            return HlsReportParser.emptyReport();
        }

        const parser = new HlsReportParser();
        return parser.parseReport(reportPath);
    }
}
