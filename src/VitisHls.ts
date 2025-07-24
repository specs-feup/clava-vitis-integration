import Io from "@specs-feup/lara/api/lara/Io.js";
import ProcessExecutor from "@specs-feup/lara/api/lara/util/ProcessExecutor.js";
import { VitisHlsConfig, NullConfig } from "./VitisHlsConfig.js";
import chalk from 'chalk';
import { VitisSynReportParser } from "./VitisSynReportParser.js";
import { VitisImplReport, VitisSynReport } from "./VitisReports.js";
import { VitisImplReportParser } from "./VitisImplReportParser.js";

export enum VppMode {
    SYN = "synthesis",
    IMPL = "implementation"
}

export class VitisHls {
    private readonly defaultState = { config: new NullConfig(), outputDir: "output_hls", projectName: "vpp_hls_run" };
    private config: VitisHlsConfig;
    private outputDir: string;
    private projectName: string;

    constructor() {
        this.config = this.defaultState.config;
        this.outputDir = this.defaultState.outputDir;
        this.projectName = this.defaultState.projectName;
    }

    public setConfig(config: VitisHlsConfig): VitisHls {
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
        const vitisOutput = this.runVpp(VppMode.SYN, cfgPath, fullProjName, silent);

        const workingDir = `${this.outputDir}/${fullProjName}`;
        this.cleanup(workingDir);

        return this.parseSynthesisReport(workingDir, vitisOutput);
    }

    public implement(timestamped: boolean = true, silent: boolean = false): VitisImplReport {
        const [cfgPath, fullProjName] = this.createWorkspace(timestamped);
        const vitisOutput = this.runVpp(VppMode.IMPL, cfgPath, fullProjName, silent);

        const workingDir = `${this.outputDir}/${fullProjName}`;
        this.cleanup(workingDir);

        return this.parseImplementationReport(workingDir, vitisOutput);
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

        return ret || "";
    }

    private cleanup(workingDir: string): void {
        if (Io.isFile(`${workingDir}/../vitis-comp.json`)) {
            Io.deleteFile(`${workingDir}/../vitis-comp.json`);
        }
    }

    private parseSynthesisReport(path: string, vitisOutput: string): VitisSynReport {
        const reportPath = `${path}/hls/syn/report/csynth.xml`;
        const errors = this.getErrors(vitisOutput);

        if (!Io.isFile(reportPath)) {
            this.log(`Report file not found at ${reportPath}, likely due to an error during synthesis`);
            const emptyReport = VitisSynReportParser.emptyReport();
            emptyReport.errors = errors;
            return emptyReport;
        }

        const parser = new VitisSynReportParser();
        const report = parser.parseReport(reportPath);
        report.errors = errors;
        return report;
    }

    private parseImplementationReport(path: string, vitisOutput: string): VitisImplReport {
        const reportPath = `${path}/hls/impl/report/verilog/export_impl.xml`;
        const errors = this.getErrors(vitisOutput);

        if (!Io.isFile(reportPath)) {
            this.log(`Report file not found at ${reportPath}, likely due to an error during implementation`);
            const emptyReport = VitisImplReportParser.emptyReport();
            emptyReport.errors = errors;
            return emptyReport;
        }

        const parser = new VitisImplReportParser();
        const report = parser.parseReport(reportPath);
        report.errors = errors;
        return report;
    }

    private getErrors(vitisOutput: string): string[] {
        const errors: string[] = [];

        const lines = vitisOutput.split("\n");
        for (const line of lines) {
            if (line.startsWith("ERROR: ")) {
                const unprefixedLine = line.replace("ERROR: ", "");
                if (unprefixedLine.includes("]")) {
                    const msg = line.split("]")[1].trim();
                    errors.push(msg);
                }
                else {
                    errors.push(unprefixedLine);
                }
            }
        }
        return errors;
    }
}
