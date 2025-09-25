import * as vscode from 'vscode';
import { spawn, exec } from 'child_process';
import * as os from 'os';
import { Config } from './config';

interface TomcatProcess {
	pid: string;
	command: string;
}

export class ProcessManager {
	private outputChannel: vscode.OutputChannel;
	private config: Config;

	constructor(outputChannel: vscode.OutputChannel, config: Config) {
		this.outputChannel = outputChannel;
		this.config = config;
	}

	async findTomcatProcesses(): Promise<TomcatProcess[]> {
		const isWindows = os.platform() === 'win32';
		this.outputChannel.appendLine('🔍 Procurando processos do Tomcat...');

		return new Promise((resolve) => {
			const processes: TomcatProcess[] = [];
			
			if (isWindows) {
				this.findWindowsProcesses(processes, resolve);
			} else {
				this.findUnixProcesses(processes, resolve);
			}
		});
	}

	private findWindowsProcesses(
		processes: TomcatProcess[], 
		resolve: (processes: TomcatProcess[]) => void
	) {
		const jpdaPort = this.config.JPDA_ADDRESS || '8000';
		
		exec(`netstat -ano | findstr :${jpdaPort}`, (error, stdout) => {
			if (!error && stdout) {
				const lines = stdout.split('\n');
				for (const line of lines) {
					const match = line.match(/\s+(\d+)$/);
					if (match) {
						const pid = match[1];
						processes.push({ pid, command: `Process using port ${jpdaPort}` });
					}
				}
			}

			exec('wmic process where "name=\'java.exe\'" get ProcessId,CommandLine /format:csv', (error2, stdout2) => {
				if (!error2 && stdout2) {
					const lines = stdout2.split('\n');
					for (const line of lines) {
						if (line.includes('catalina') || line.includes('tomcat') || line.includes('Bootstrap')) {
							const parts = line.split(',');
							if (parts.length >= 3) {
								const pid = parts[2].trim();
								if (pid && pid !== 'ProcessId') {
									processes.push({ pid, command: 'Java Tomcat process' });
								}
							}
						}
					}
				}
				
				const uniqueProcesses = processes.filter((proc, index, self) => 
					index === self.findIndex(p => p.pid === proc.pid)
				);
				
				resolve(uniqueProcesses);
			});
		});
	}

	private findUnixProcesses(
		processes: TomcatProcess[], 
		resolve: (processes: TomcatProcess[]) => void
	) {
		const jpdaPort = this.config.JPDA_ADDRESS || '8000';
		
		exec(`netstat -tlnp 2>/dev/null | grep :${jpdaPort}`, (error, stdout) => {
			if (!error && stdout) {
				const lines = stdout.split('\n');
				for (const line of lines) {
					const match = line.match(/(\d+)\/java/);
					if (match) {
						const pid = match[1];
						processes.push({ pid, command: `Process using port ${jpdaPort}` });
					}
				}
			}

			exec('ps aux | grep java | grep -E "(catalina|tomcat|Bootstrap)" | grep -v grep', (error2, stdout2) => {
				if (!error2 && stdout2) {
					const lines = stdout2.split('\n');
					for (const line of lines) {
						if (line.trim()) {
							const parts = line.trim().split(/\s+/);
							if (parts.length >= 2) {
								const pid = parts[1];
								processes.push({ pid, command: 'Java Tomcat process' });
							}
						}
					}
				}
				
				const uniqueProcesses = processes.filter((proc, index, self) => 
					index === self.findIndex(p => p.pid === proc.pid)
				);
				
				resolve(uniqueProcesses);
			});
		});
	}

	async forceKillProcess(process: TomcatProcess): Promise<void> {
		const isWindows = os.platform() === 'win32';
		
		return new Promise((resolve) => {
			const command = isWindows ? 'taskkill' : 'kill';
			const args = isWindows 
				? ['/F', '/PID', process.pid] 
				: ['-9', process.pid];

			this.outputChannel.appendLine(`🔨 Matando processo ${process.pid} (${process.command})`);
			
			const childProcess = spawn(command, args, { shell: true });
			
			childProcess.on('close', (code) => {
				if (code === 0) {
					this.outputChannel.appendLine(`✅ Processo ${process.pid} terminado`);
				} else {
					this.outputChannel.appendLine(`⚠️ Falha ao terminar processo ${process.pid}`);
				}
				resolve();
			});

			childProcess.on('error', (error) => {
				this.outputChannel.appendLine(`❌ Erro ao matar processo ${process.pid}: ${error.message}`);
				resolve();
			});
		});
	}

	async killAllTomcatProcesses(): Promise<boolean> {
		this.outputChannel.appendLine('Iniciando parada do Tomcat...');

		const runningProcesses = await this.findTomcatProcesses();
		if (runningProcesses.length === 0) {
			this.outputChannel.appendLine('✅ Nenhum processo do Tomcat encontrado');
			return true;
		}

		this.outputChannel.appendLine(`🔨 Forçando parada de ${runningProcesses.length} processo(s) restante(s)...`);
		
		for (const process of runningProcesses) {
			await this.forceKillProcess(process);
		}

		const finalCheck = await this.findTomcatProcesses();
		if (finalCheck.length === 0) {
			this.outputChannel.appendLine('✅ Todos os processos do Tomcat foram parados');
			return true;
		} else {
			this.outputChannel.appendLine('❌ Alguns processos do Tomcat ainda estão executando');
			return false;
		}
	}
}
