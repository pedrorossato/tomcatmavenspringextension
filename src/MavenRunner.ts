import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import * as os from 'os';
import { Config } from './config';

export class MavenRunner {
	private outputChannel: vscode.OutputChannel;
	private config: Config;

	constructor(outputChannel: vscode.OutputChannel, config: Config) {
		this.outputChannel = outputChannel;
		this.config = config;
	}

	async runCommand(command: string, args: string[] = []): Promise<boolean> {
		if (!this.config.PROJECT_PATH) {
			vscode.window.showErrorMessage('Caminho do projeto não configurado');
			return false;
		}

		const mavenCmd = this.getMavenExecutable();
		if (!mavenCmd) {
			vscode.window.showErrorMessage('Maven não encontrado. Configure MAVEN_HOME no arquivo de ambiente.');
			return false;
		}

		return new Promise((resolve) => {
			this.outputChannel.show();
			this.outputChannel.appendLine(`Executando: mvn ${command} ${args.join(' ')}`);

			const mavenArgs = [command, ...args];
			
			const env: NodeJS.ProcessEnv = { 
				...process.env, 
				...this.config,
			};
			
			const isWindows = os.platform() === 'win32';
			const shellPath = isWindows ? (process.env.COMSPEC || 'cmd.exe') : '/bin/bash';

			const childProcess = spawn(mavenCmd, mavenArgs, {
				cwd: this.config.PROJECT_PATH,
				stdio: ['pipe', 'pipe', 'pipe'],
				env: env,
				shell: shellPath
			});

			const timeout = setTimeout(() => {
				this.outputChannel.appendLine(`⏰ Timeout: Maven ${command} está demorando mais que 5 minutos`);
				childProcess.kill();
				resolve(false);
			}, 5 * 60 * 1000);

			childProcess.stdout?.on('data', (data: any) => {
				this.outputChannel.append(data.toString());
			});

			childProcess.stderr?.on('data', (data: any) => {
				this.outputChannel.append(data.toString());
			});

			childProcess.on('close', (code: number | null) => {
				clearTimeout(timeout);
				if (code === 0) {
					this.outputChannel.appendLine(`✅ Maven ${command} concluído com sucesso`);
					resolve(true);
				} else {
					this.outputChannel.appendLine(`❌ Maven ${command} falhou com código ${code}`);
					resolve(false);
				}
			});

			childProcess.on('error', (error: Error) => {
				clearTimeout(timeout);
				this.outputChannel.appendLine(`❌ Erro ao executar Maven: ${error.message}`);
				resolve(false);
			});
		});
	}

	private getMavenExecutable(): string | null {
		if (this.config.MAVEN_HOME) {
			const isWindows = os.platform() === 'win32';
			const mvnCmd = path.join(this.config.MAVEN_HOME, 'bin', isWindows ? 'mvn.cmd' : 'mvn');
			if (fs.existsSync(mvnCmd)) {
				return mvnCmd;
			}
		}
		
		return 'mvn';
	}

	async compileClasses(): Promise<boolean> {
		this.outputChannel.appendLine('Compilando classes Java...');
		
		const success = await this.runCommand('compile');
		if (success) {
			this.outputChannel.appendLine('✅ Classes atualizadas via hotswap');
			vscode.window.showInformationMessage('Classes atualizadas via hotswap');
			return true;
		} else {
			vscode.window.showErrorMessage('Falha ao compilar classes');
			return false;
		}
	}

	async fullRebuild(): Promise<boolean> {
		this.outputChannel.appendLine('Fazendo rebuild completo...');
		
		const cleanSuccess = await this.runCommand('clean');
		if (!cleanSuccess) {
			vscode.window.showErrorMessage('Falha no clean do projeto');
			return false;
		}

		const packageSuccess = await this.runCommand('package war:exploded', ['-DskipTests -am -pl ' + this.config.APP_CONTEXT]);
		if (packageSuccess) {
			this.outputChannel.appendLine('✅ Rebuild exploded concluído');
			vscode.window.showInformationMessage('Rebuild exploded concluído');
			return true;
		} else {
			vscode.window.showErrorMessage('Falha no package do projeto');
			return false;
		}
	}
}
