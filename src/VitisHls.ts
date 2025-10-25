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
    public static readonly HLS_TOOL = "v++";
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

    public synthesize(timestamped: boolean = true, silent: boolean = false, deleteWorkspace: boolean = false): VitisSynReport {
        const [cfgPath, fullProjName] = this.createWorkspace(timestamped);
        const [vitisOutput, timeStart, timeEnd] = this.runVpp(VppMode.SYN, cfgPath, fullProjName, silent);

        const workingDir = `${this.outputDir}/${fullProjName}`;
        this.cleanup(workingDir);

        const report = this.parseSynthesisReport(workingDir, vitisOutput, timeStart, timeEnd);
        if (deleteWorkspace) {
            this.deleteWorkspace(fullProjName);
        }
        return report;
    }

    public implement(timestamped: boolean = true, silent: boolean = false, deleteWorkspace: boolean = false): [VitisSynReport, VitisImplReport] {
        const [cfgPath, fullProjName] = this.createWorkspace(timestamped);
        const workingDir = `${this.outputDir}/${fullProjName}`;

        const [synOutput, synTimeStart, synTimeEnd] = this.runVpp(VppMode.SYN, cfgPath, fullProjName, silent);

        const synReport = this.parseSynthesisReport(workingDir, synOutput, synTimeStart, synTimeEnd);
        if (synReport.errors.length > 0) {
            this.log("Synthesis errors detected, skipping implementation step.");
            if (deleteWorkspace) {
                this.deleteWorkspace(fullProjName);
            }
            return [synReport, VitisImplReportParser.emptyReport()];
        }

        const [implOutput, implTimeStart, implTimeEnd] = this.runVpp(VppMode.IMPL, cfgPath, fullProjName, silent);
        const implReport = this.parseImplementationReport(workingDir, implOutput, implTimeStart, implTimeEnd);

        if (deleteWorkspace) {
            this.deleteWorkspace(fullProjName);
        }
        this.cleanup(workingDir);
        return [synReport, implReport];
    }

    public createWorkspace(timestamped: boolean): [string, string] {
        const timestamp = timestamped ? `${Math.floor(Date.now() / 1000)}` : "";
        const fullProjName = `${this.projectName}_${timestamp}_${this.config.getTopFunction()}`;

        const relativePath = `${this.outputDir}/${fullProjName}`;

        if (Io.isFolder(relativePath)) {
            Io.deleteFolder(relativePath);
        }
        Io.mkdir(relativePath);

        if (this.config.getSources().length === 0) {
            this.config.addDefaultSources();
            this.log(`No source files specified in config; added all program files as sources.`);
        }

        for (const file of this.config.getSources()) {
            file.write(relativePath);
        }

        const cfg = this.config.generateConfigFile();
        const cfgFilePath = Io.writeFile(`${relativePath}/hls_config.cfg`, cfg).getAbsolutePath();

        return [cfgFilePath, fullProjName];
    }

    public deleteWorkspace(fullProjName: string): void {
        const relativePath = `${this.outputDir}/${fullProjName}`;

        if (Io.isFolder(relativePath)) {
            Io.deleteFolder(relativePath);
            this.log(`Deleted workspace at ${relativePath}`);
        }
    }

    private log(msg: string): void {
        console.log(`[${chalk.blue("Clava-VitisHLS")}] ${msg}`);
    }

    private runVpp(mode: VppMode, configPath: string, fullProjName: string, silent: boolean = false): [string, number, number] {
        const workingDir = `${this.outputDir}/${fullProjName}`;

        let command = "";
        switch (mode) {
            case VppMode.SYN:
                command += `v++ --compile --mode hls --config ${configPath} --work_dir ${workingDir}`;
                break;
            case VppMode.IMPL:
                command += `vitis-run --mode hls --impl --config ${configPath} --work_dir ${workingDir}`;
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

        const timeStart = new Date().getTime();
        const ret = vpp.execute(...command.split(" "));
        const timeStop = new Date().getTime();

        this.log(`Finished ${mode} at ${new Date().toISOString()}`);
        this.log(`${VitisHls.HLS_TOOL} exit code: ${ret}`);
        this.log('-'.repeat(50));

        return [ret || "", timeStart, timeStop];
    }

    private cleanup(workingDir: string): void {
        if (Io.isFile(`${workingDir}/../vitis-comp.json`)) {
            Io.deleteFile(`${workingDir}/../vitis-comp.json`);
        }
    }

    private parseSynthesisReport(path: string, vitisOutput: string, timeStart: number, timeEnd: number): VitisSynReport {
        const reportPath = `${path}/hls/syn/report/csynth.xml`;
        const errors = this.getErrors(vitisOutput);

        let report: VitisSynReport;
        if (!Io.isFile(reportPath)) {
            this.log(`Report file not found at ${reportPath}, likely due to an error during synthesis`);
            report = VitisSynReportParser.emptyReport();
            report.topFunction = this.config.getTopFunction();
        }
        else {
            const parser = new VitisSynReportParser();
            report = parser.parseReport(reportPath);
        }

        report.errors = errors;
        report.runSeconds = this.getRunDurationInSeconds(timeStart, timeEnd);
        report.timestamp = new Date(timeStart).toISOString();

        return report;
    }

    private parseImplementationReport(path: string, vitisOutput: string, timeStart: number, timeEnd: number): VitisImplReport {
        const reportPath = `${path}/hls/impl/report/verilog/export_impl.xml`;
        const errors = this.getErrors(vitisOutput);

        let report: VitisImplReport;
        if (!Io.isFile(reportPath)) {
            this.log(`Report file not found at ${reportPath}, likely due to an error during implementation`);
            report = VitisImplReportParser.emptyReport();
        }
        else {
            const parser = new VitisImplReportParser();
            report = parser.parseReport(reportPath);
        }

        report.errors = errors;
        report.runSeconds = this.getRunDurationInSeconds(timeStart, timeEnd);
        report.timestamp = new Date(timeStart).toISOString();

        return report;
    }

    private getRunDurationInSeconds(timeStart: number, timeEnd: number): number {
        return (timeEnd - timeStart) / 1000;
    }

    private getErrors(vitisOutput: string): string[] {
        const toIgnore = [
            "Syn check fail!",
            "Encountered problem during source synthesis",
            "Pre-synthesis failed."
        ]
        const errors: string[] = [];

        const lines = vitisOutput.split("\n");
        for (const line of lines) {
            if (line.startsWith("ERROR: ")) {
                let msg = line.replace("ERROR: ", "");
                if (msg.includes("]")) {
                    msg = line.split("]")[1].trim();
                }
                if (!toIgnore.some(ignore => msg.includes(ignore))) {
                    errors.push(msg);
                }

            }
        }
        return errors;
    }
}
