import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import * as os from 'os';
import { Config } from './config';
import { ProcessManager } from './ProcessManager';

export class TomcatManager {
	private outputChannel: vscode.OutputChannel;
	private config: Config;
	private processManager: ProcessManager;
	private tomcatProcess?: ChildProcess;

	constructor(outputChannel: vscode.OutputChannel, config: Config) {
		this.outputChannel = outputChannel;
		this.config = config;
		this.processManager = new ProcessManager(outputChannel, config);
	}

	async setupEnvironment(): Promise<boolean> {
		this.outputChannel.appendLine('Configurando ambiente de desenvolvimento...');
		
		const requiredVars = ['JAVA_HOME', 'MAVEN_HOME', 'TOMCAT_HOME'];
		for (const varName of requiredVars) {
			if (!this.config[varName as keyof Config]) {
				vscode.window.showErrorMessage(`${varName} não configurado no arquivo de ambiente`);
				return false;
			}
		}

		for (const varName of requiredVars) {
			const varValue = this.config[varName as keyof Config];
			if (varValue && !fs.existsSync(varValue)) {
				vscode.window.showWarningMessage(`Caminho ${varName} não encontrado: ${varValue}`);
			}
		}

		this.outputChannel.appendLine('✅ Ambiente configurado');
		vscode.window.showInformationMessage('Ambiente configurado com sucesso');
		return true;
	}

	async createContext(): Promise<boolean> {
		if (!this.config.TOMCAT_HOME) {
			vscode.window.showErrorMessage('TOMCAT_HOME não configurado');
			return false;
		}

		if (!this.config.APP_CONTEXT) {
			vscode.window.showErrorMessage('Módulo web não detectado');
			return false;
		}

		const contextPath = this.config.APP_CONTEXT;
		
		const targetDir = path.join(this.config.PROJECT_PATH, this.config.APP_CONTEXT, 'target');
		let webappPath = '';
		
		if (!fs.existsSync(targetDir)) {
			vscode.window.showErrorMessage('Diretório target não encontrado. Execute "Full Rebuild" primeiro.');
			return false;
		}
		
		const defaultTarget = path.join(targetDir, this.config.APP_CONTEXT);
		
		if (fs.existsSync(defaultTarget)) {
			webappPath = defaultTarget;
		} else {
			const targetContents = fs.readdirSync(targetDir, { withFileTypes: true });
			for (const item of targetContents) {
				if (item.isDirectory() && item.name.startsWith(this.config.APP_CONTEXT)) {
					const candidatePath = path.join(targetDir, item.name);
					const webInfPath = path.join(candidatePath, 'WEB-INF');
					if (fs.existsSync(webInfPath)) {
						webappPath = candidatePath;
						break;
					}
				}
			}
		}

		if (!webappPath) {
			vscode.window.showErrorMessage('Não foi possível localizar o exploded WAR. Execute "Full Rebuild" primeiro.');
			return false;
		}

		const contextFile = path.join(this.config.TOMCAT_HOME, 'conf', 'Catalina', 'localhost', `${contextPath.replace('/', '')}.xml`);

		const contextDir = path.dirname(contextFile);
		if (!fs.existsSync(contextDir)) {
			fs.mkdirSync(contextDir, { recursive: true });
		}

		const contextContent = `<?xml version="1.0" encoding="UTF-8"?>
<Context docBase="${webappPath}" reloadable="true">
    <!-- Context configuration -->
</Context>`;

		try {
			fs.writeFileSync(contextFile, contextContent);
			this.outputChannel.appendLine(`✅ Contexto criado: ${contextFile}`);
			this.outputChannel.appendLine(`   Caminho da webapp: ${webappPath}`);
			this.outputChannel.appendLine(`   Contexto da aplicação: ${contextPath}`);
			vscode.window.showInformationMessage('Contexto criado com sucesso');
			return true;
		} catch (error) {
			this.outputChannel.appendLine(`❌ Erro ao criar contexto: ${error}`);
			vscode.window.showErrorMessage(`Erro ao criar contexto: ${error}`);
			return false;
		}
	}

	async start(): Promise<boolean> {
		if (!this.config.TOMCAT_HOME) {
			vscode.window.showErrorMessage('TOMCAT_HOME não configurado');
			return false;
		}

		if (this.tomcatProcess) {
			vscode.window.showWarningMessage('Tomcat já está executando');
			return false;
		}

		const setupSuccess = await this.setupEnvironment();
		if (!setupSuccess) return false;

		const contextSuccess = await this.createContext();
		if (!contextSuccess) return false;

		const isWindows = os.platform() === 'win32';
		const tomcatScript = path.join(
			this.config.TOMCAT_HOME,
			'bin',
			isWindows ? 'catalina.bat' : 'catalina.sh'
		);

		if (!fs.existsSync(tomcatScript)) {
			vscode.window.showErrorMessage(`Script do Tomcat não encontrado: ${tomcatScript}`);
			return false;
		}

		this.outputChannel.show();
		this.outputChannel.appendLine('Iniciando Tomcat em modo debug...');

		const env = {
			...process.env,
			...this.config,
			JPDA_ADDRESS: this.config.JPDA_ADDRESS || '8000',
			JPDA_TRANSPORT: 'dt_socket',
			JPDA_SUSPEND: 'n'
		};

		const command = isWindows ? 'cmd' : 'bash';
		const args = isWindows 
			? ['/c', tomcatScript, 'jpda', 'run']
			: [tomcatScript, 'jpda', 'run'];

		this.tomcatProcess = spawn(command, args, {
			cwd: this.config.TOMCAT_HOME,
			stdio: ['ignore', 'pipe', 'pipe'],
			env: env,
			shell: true
		});

		this.tomcatProcess.stdout?.on('data', (data) => {
			this.outputChannel.append(data.toString());
		});

		this.tomcatProcess.stderr?.on('data', (data) => {
			this.outputChannel.append(data.toString());
		});

		this.tomcatProcess.on('close', (code) => {
			this.tomcatProcess = undefined;
			this.outputChannel.appendLine(`Tomcat parado com código ${code}`);
		});

		this.tomcatProcess.on('error', (error) => {
			this.tomcatProcess = undefined;
			this.outputChannel.appendLine(`Erro ao iniciar Tomcat: ${error.message}`);
		});

		await new Promise(resolve => setTimeout(resolve, 3000));
		
		if (this.tomcatProcess) {
			vscode.window.showInformationMessage('Tomcat iniciado em modo debug');
			await this.setupDebugConfiguration();
			return true;
		} else {
			vscode.window.showErrorMessage('Falha ao iniciar Tomcat');
			return false;
		}
	}

	async stop(): Promise<boolean> {
		if (!this.config.TOMCAT_HOME) {
			vscode.window.showErrorMessage('TOMCAT_HOME não configurado');
			return false;
		}

		this.outputChannel.show();

		const success = await this.processManager.killAllTomcatProcesses();
		
		if (success) {
			vscode.window.showInformationMessage('Tomcat parado com sucesso');
		} else {
			vscode.window.showWarningMessage('Alguns processos do Tomcat podem ainda estar executando');
		}

		this.tomcatProcess = undefined;
		return success;
	}

	async setupDebugConfiguration(): Promise<void> {
		const jpda_port = this.config.JPDA_ADDRESS || '8000';
		const appName = this.config.APP_CONTEXT || 'Spring Application';
		
		const debugConfig = {
			name: `Debug ${appName}`,
			type: 'java',
			request: 'attach',
			hostName: 'localhost',
			port: parseInt(jpda_port),
			timeout: 10000
		};

		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (workspaceFolders) {
			const launchPath = path.join(workspaceFolders[0].uri.fsPath, '.vscode', 'launch.json');
			if (!fs.existsSync(launchPath)) {
				const launchConfig = {
					version: '0.2.0',
					configurations: [debugConfig]
				};
				
				const vscodeDir = path.dirname(launchPath);
				if (!fs.existsSync(vscodeDir)) {
					fs.mkdirSync(vscodeDir, { recursive: true });
				}
				
				fs.writeFileSync(launchPath, JSON.stringify(launchConfig, null, 2));
				vscode.window.showInformationMessage('Configuração de debug criada. Use F5 para conectar ao debugger.');
			}
		}
	}

	isRunning(): boolean {
		return this.tomcatProcess !== undefined;
	}

	dispose(): void {
		if (this.tomcatProcess) {
			this.tomcatProcess.kill();
		}
	}
}
