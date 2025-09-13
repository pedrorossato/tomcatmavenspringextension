import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess, exec } from 'child_process';
import * as os from 'os';

interface Config {
	PROJECT_PATH: string;
	JAVA_HOME: string;
	MAVEN_HOME: string;
	TOMCAT_HOME: string;
	SPRING_PROFILES_ACTIVE: string;
	JPDA_ADDRESS: string;
	APP_CONTEXT: string;
}

class TomcatMavenSpringExtension {
	private statusBarItem: vscode.StatusBarItem;
	private config: Config = {
		PROJECT_PATH: '',
		JAVA_HOME: '',
		MAVEN_HOME: '',
		TOMCAT_HOME: '',
		SPRING_PROFILES_ACTIVE: '',
		JPDA_ADDRESS: '',
		APP_CONTEXT: ''
	};
	private tomcatProcess?: ChildProcess;
	private outputChannel: vscode.OutputChannel;

	constructor(private context: vscode.ExtensionContext) {
		this.outputChannel = vscode.window.createOutputChannel('Tomcat Maven Spring');
		this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
		this.initialize();
	}

	private async initialize() {
		await this.loadConfiguration();
		this.setupStatusBar();
		this.registerCommands();
	}

	private async loadConfiguration() {
		const workspaceSettings = vscode.workspace.getConfiguration('tomcatmavenspring');
		this.config.PROJECT_PATH = workspaceSettings.get('PROJECT_PATH', this.config.PROJECT_PATH);
		this.config.JAVA_HOME = workspaceSettings.get('JAVA_HOME', this.config.JAVA_HOME);
		this.config.MAVEN_HOME = workspaceSettings.get('MAVEN_HOME', this.config.MAVEN_HOME);
		this.config.TOMCAT_HOME = workspaceSettings.get('TOMCAT_HOME', this.config.TOMCAT_HOME);
		this.config.SPRING_PROFILES_ACTIVE = workspaceSettings.get('SPRING_PROFILES_ACTIVE', this.config.SPRING_PROFILES_ACTIVE);
		this.config.JPDA_ADDRESS = workspaceSettings.get('JPDA_ADDRESS', this.config.JPDA_ADDRESS);
		this.config.APP_CONTEXT = workspaceSettings.get('APP_CONTEXT', this.config.APP_CONTEXT);
	}

	private setupStatusBar() {
		this.statusBarItem.text = `$(server) Tomcat: Parado`;
		this.statusBarItem.tooltip = 'Clique para ver opções do Tomcat';
		this.statusBarItem.command = 'tomcatmavenspring.showQuickPick';
		this.statusBarItem.show();
	}

	private registerCommands() {
		const commands = [
			{ command: 'tomcatmavenspring.configure', handler: this.configureExtension.bind(this) },
			{ command: 'tomcatmavenspring.setupEnvironment', handler: this.setupEnvironment.bind(this) },
			{ command: 'tomcatmavenspring.createContext', handler: this.createContext.bind(this) },
			{ command: 'tomcatmavenspring.startTomcat', handler: this.startTomcat.bind(this) },
			{ command: 'tomcatmavenspring.stopTomcat', handler: this.stopTomcat.bind(this) },
			{ command: 'tomcatmavenspring.updateClasses', handler: this.updateClasses.bind(this) },
			{ command: 'tomcatmavenspring.updateResources', handler: this.updateResources.bind(this) },
			{ command: 'tomcatmavenspring.fullRebuild', handler: this.fullRebuild.bind(this) },
			{ command: 'tomcatmavenspring.showQuickPick', handler: this.showQuickPick.bind(this) }
		];

		commands.forEach(({ command, handler }) => {
			this.context.subscriptions.push(vscode.commands.registerCommand(command, handler));
		});
	}


	private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

	private debounce(func: Function, delay: number, key: string = 'default') {
		const existingTimer = this.debounceTimers.get(key);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}
		
		const timer = setTimeout(() => {
			func();
			this.debounceTimers.delete(key);
		}, delay);
		
		this.debounceTimers.set(key, timer);
	}

	// Implementações nativas das operações (substituem scripts externos)
	private async runMavenCommand(command: string, args: string[] = []): Promise<boolean> {
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

			const env: NodeJS.ProcessEnv = { ...process.env, ...this.config };
			const childProcess = spawn(mavenCmd, [command, ...args], {
				cwd: this.config.PROJECT_PATH,
				stdio: ['ignore', 'pipe', 'pipe'],
				env: env
			});

			childProcess.stdout?.on('data', (data: any) => {
				this.outputChannel.append(data.toString());
			});

			childProcess.stderr?.on('data', (data: any) => {
				this.outputChannel.append(data.toString());
			});

			childProcess.on('close', (code: number | null) => {
				if (code === 0) {
					this.outputChannel.appendLine(`✅ Maven ${command} concluído com sucesso`);
					resolve(true);
				} else {
					this.outputChannel.appendLine(`❌ Maven ${command} falhou com código ${code}`);
					resolve(false);
				}
			});

			childProcess.on('error', (error: Error) => {
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
		
		// Fallback para mvn no PATH
		return 'mvn';
	}

	private async setupEnvironmentNative(): Promise<boolean> {
		this.outputChannel.appendLine('Configurando ambiente de desenvolvimento...');
		
		// Verifica configurações obrigatórias
		const requiredVars = ['JAVA_HOME', 'MAVEN_HOME', 'TOMCAT_HOME'];
		for (const varName of requiredVars) {
			if (!this.config[varName as keyof Config]) {
				vscode.window.showErrorMessage(`${varName} não configurado no arquivo de ambiente`);
				return false;
			}
		}

		// Valida se os caminhos existem
		for (const varName of requiredVars) {
			const varValue = this.config[varName as keyof Config];
			if (varValue && !fs.existsSync(varValue)) {
				vscode.window.showWarningMessage(`Caminho ${varName} não encontrado: ${varValue}`);
			}
		}

		this.outputChannel.appendLine('✅ Ambiente configurado');
		return true;
	}

	private async createContextNative(): Promise<boolean> {
		if (!this.config.TOMCAT_HOME) {
			vscode.window.showErrorMessage('TOMCAT_HOME não configurado');
			return false;
		}

		if (!this.config.APP_CONTEXT) {
			vscode.window.showErrorMessage('Módulo web não detectado');
			return false;
		}

		const contextPath = this.config.APP_CONTEXT;
		const webappPath = path.join(this.config.PROJECT_PATH, this.config.APP_CONTEXT, 'src', 'main', 'webapp');
		const contextFile = path.join(this.config.TOMCAT_HOME, 'conf', 'Catalina', 'localhost', `${contextPath.replace('/', '')}.xml`);

		// Cria diretório de contextos se não existir
		const contextDir = path.dirname(contextFile);
		if (!fs.existsSync(contextDir)) {
			fs.mkdirSync(contextDir, { recursive: true });
		}

		// Gera arquivo de contexto
		const contextContent = `<?xml version="1.0" encoding="UTF-8"?>
<Context docBase="${webappPath}" reloadable="true">
    <!-- Context configuration -->
</Context>`;

		try {
			fs.writeFileSync(contextFile, contextContent);
			this.outputChannel.appendLine(`✅ Contexto criado: ${contextFile}`);
			this.outputChannel.appendLine(`   Caminho da webapp: ${webappPath}`);
			this.outputChannel.appendLine(`   Contexto da aplicação: ${contextPath}`);
			return true;
		} catch (error) {
			this.outputChannel.appendLine(`❌ Erro ao criar contexto: ${error}`);
			return false;
		}
	}

	private async startTomcatNative(): Promise<boolean> {
		if (!this.config.TOMCAT_HOME) {
			vscode.window.showErrorMessage('TOMCAT_HOME não configurado');
			return false;
		}

		if (this.tomcatProcess) {
			vscode.window.showWarningMessage('Tomcat já está executando');
			return false;
		}

		// Setup environment e create context primeiro
		await this.setupEnvironmentNative();
		await this.createContextNative();

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

		// Configurações de ambiente
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
			env: env
		});

		this.tomcatProcess.stdout?.on('data', (data) => {
			this.outputChannel.append(data.toString());
		});

		this.tomcatProcess.stderr?.on('data', (data) => {
			this.outputChannel.append(data.toString());
		});

		this.tomcatProcess.on('close', (code) => {
			this.tomcatProcess = undefined;
			this.updateStatusBar('parado');
			this.outputChannel.appendLine(`Tomcat parado com código ${code}`);
		});

		this.tomcatProcess.on('error', (error) => {
			this.tomcatProcess = undefined;
			this.updateStatusBar('erro');
			this.outputChannel.appendLine(`Erro ao iniciar Tomcat: ${error.message}`);
		});

		// Aguarda um pouco e atualiza status
		setTimeout(() => {
			if (this.tomcatProcess) {
				this.updateStatusBar('executando');
				vscode.window.showInformationMessage('Tomcat iniciado em modo debug');
				this.setupDebugConfiguration();
			}
		}, 3000);

		return true;
	}

	private async stopTomcatNative(): Promise<boolean> {
		if (this.tomcatProcess) {
			this.tomcatProcess.kill('SIGTERM');
			this.tomcatProcess = undefined;
			this.updateStatusBar('parado');
			return true;
		}

		// Tenta parar via script do Tomcat
		if (!this.config.TOMCAT_HOME) {
			vscode.window.showErrorMessage('TOMCAT_HOME não configurado');
			return false;
		}

		const isWindows = os.platform() === 'win32';
		const shutdownScript = path.join(
			this.config.TOMCAT_HOME,
			'bin',
			isWindows ? 'shutdown.bat' : 'shutdown.sh'
		);

		if (fs.existsSync(shutdownScript)) {
			return new Promise((resolve) => {
				const command = isWindows ? 'cmd' : 'bash';
				const args = isWindows ? ['/c', shutdownScript] : [shutdownScript];

				const childProcess = spawn(command, args, {
					cwd: this.config.TOMCAT_HOME,
					stdio: ['ignore', 'pipe', 'pipe'],
					env: { ...process.env, ...this.config }
				});

				childProcess.on('close', (code: number | null) => {
					this.updateStatusBar('parado');
					resolve(code === 0);
				});
			});
		}

		return false;
	}

	private async updateClassesNative(): Promise<boolean> {
		this.outputChannel.appendLine('Compilando classes Java...');
		
		// Compila apenas classes modificadas
		const success = await this.runMavenCommand('compile');
		if (success) {
			this.outputChannel.appendLine('✅ Classes atualizadas via hotswap');
			return true;
		}
		return false;
	}

	private async updateResourcesNative(): Promise<boolean> {
		if (!this.config.APP_CONTEXT) {
			vscode.window.showErrorMessage('Módulo web não configurado');
			return false;
		}

		this.outputChannel.appendLine('Processando recursos...');
		const success = await this.runMavenCommand('process-resources', [`-pl`, this.config.APP_CONTEXT]);
		if (success) {
			this.outputChannel.appendLine('✅ Recursos atualizados');
			return true;
		}
		return false;
	}

	private async fullRebuildNative(): Promise<boolean> {
		this.outputChannel.appendLine('Fazendo rebuild completo...');
		
		// Clean e package
		const cleanSuccess = await this.runMavenCommand('clean');
		if (!cleanSuccess) return false;

		const packageSuccess = await this.runMavenCommand('package', ['-DskipTests']);
		if (packageSuccess) {
			this.outputChannel.appendLine('✅ Rebuild exploded concluído');
			return true;
		}
		return false;
	}

	// Implementação dos comandos
	private async configureExtension() {
		const items = [
			'Definir caminho do projeto',
			'Definir contexto da aplicação',
			'Definir porta do JPDA',
			'Definir home do Maven',
			'Definir home do Java',
			'Definir perfil ativo do Spring'
		];

		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: 'O que você gostaria de configurar?'
		});

		switch (selected) {
			case 'Definir caminho do projeto':
				const projectPath = await vscode.window.showInputBox({
					prompt: 'Caminho para o projeto Spring',
					value: this.config.PROJECT_PATH,
					placeHolder: '/caminho/para/seu/projeto'
				});
				if (projectPath) {
					await vscode.workspace.getConfiguration('tomcatmavenspring').update('PROJECT_PATH', projectPath, vscode.ConfigurationTarget.Workspace);
					vscode.window.showInformationMessage('Caminho do projeto atualizado. Recarregue a janela para aplicar.');
				}
				break;
			case 'Definir contexto da aplicação':	
				const appContext = await vscode.window.showInputBox({
					prompt: 'Contexto da aplicação',
					value: this.config.APP_CONTEXT,
					placeHolder: 'ex: meuapp-web'
				});
				if (appContext) {
					await vscode.workspace.getConfiguration('tomcatmavenspring').update('APP_CONTEXT', appContext, vscode.ConfigurationTarget.Workspace);
					vscode.window.showInformationMessage('Contexto da aplicação atualizado. Recarregue a janela para aplicar.');
				}
				break;
			case 'Definir porta do JPDA':
				const jpdaAddress = await vscode.window.showInputBox({
					prompt: 'Porta do JPDA',
					value: this.config.JPDA_ADDRESS,
					placeHolder: '8000'
				});
				
				if (jpdaAddress) {
					await vscode.workspace.getConfiguration('tomcatmavenspring').update('JPDA_ADDRESS', jpdaAddress, vscode.ConfigurationTarget.Workspace);
					vscode.window.showInformationMessage('Porta do JPDA atualizada. Recarregue a janela para aplicar.');
				}
				break;
			case 'Definir home do Maven':
				const mavenHome = await vscode.window.showInputBox({
					prompt: 'Home do Maven',
					value: this.config.MAVEN_HOME,
					placeHolder: '/opt/apache-maven-3.6.3'
				});
				
				if (mavenHome) {
					await vscode.workspace.getConfiguration('tomcatmavenspring').update('MAVEN_HOME', mavenHome, vscode.ConfigurationTarget.Workspace);
					vscode.window.showInformationMessage('Home do Maven atualizado. Recarregue a janela para aplicar.');
				}
				break;
			case 'Definir home do Java':
				const javaHome = await vscode.window.showInputBox({
					prompt: 'Home do Java',
					value: this.config.JAVA_HOME,
					placeHolder: '/usr/lib/jvm/java-1.8.0-openjdk-amd64'
				});
				if (javaHome) {
					await vscode.workspace.getConfiguration('tomcatmavenspring').update('JAVA_HOME', javaHome, vscode.ConfigurationTarget.Workspace);
					vscode.window.showInformationMessage('Home do Java atualizado. Recarregue a janela para aplicar.');
				}
				break;
			case 'Definir perfil ativo do Spring':
				const springProfilesActive = await vscode.window.showInputBox({
					prompt: 'Perfil ativo do Spring',
					value: this.config.SPRING_PROFILES_ACTIVE,
					placeHolder: 'desenvolvimento'
				});	
				if (springProfilesActive) {
					await vscode.workspace.getConfiguration('tomcatmavenspring').update('SPRING_PROFILES_ACTIVE', springProfilesActive, vscode.ConfigurationTarget.Workspace);
					vscode.window.showInformationMessage('Perfil ativo do Spring atualizado. Recarregue a janela para aplicar.');
				}
				break;
			default:
				vscode.window.showInformationMessage('Configuração não encontrada');
				break;
		}
	}

	private async setupEnvironment() {
		const success = await this.setupEnvironmentNative();
		if (success) {
			vscode.window.showInformationMessage('Ambiente configurado com sucesso');
		}
	}

	private async createContext() {
		const success = await this.createContextNative();
		if (success) {
			vscode.window.showInformationMessage('Contexto criado com sucesso');
		}
	}

	private async startTomcat() {
		const success = await this.startTomcatNative();
		if (success) {
			// Status será atualizado dentro do método nativo
		}
	}

	private async stopTomcat() {
		const success = await this.stopTomcatNative();
		if (success) {
			vscode.window.showInformationMessage('Tomcat parado');
		}
	}

	private async updateClasses() {
		const success = await this.updateClassesNative();
		if (success) {
			vscode.window.showInformationMessage('Classes atualizadas via hotswap');
		}
	}

	private async updateResources() {
		const success = await this.updateResourcesNative();
		if (success) {
			vscode.window.showInformationMessage('Recursos atualizados');
		}
	}

	private async fullRebuild() {
		const success = await this.fullRebuildNative();
		if (success) {
			vscode.window.showInformationMessage('Rebuild exploded concluído');
		}
	}

	private async showQuickPick() {
		const items = [
			{ label: '$(gear) Configure Extension', command: 'tomcatmavenspring.configure' },
			{ label: '$(play) Start Tomcat', command: 'tomcatmavenspring.startTomcat' },
			{ label: '$(stop) Stop Tomcat', command: 'tomcatmavenspring.stopTomcat' },
			{ label: '$(file-code) Update Classes', command: 'tomcatmavenspring.updateClasses' },
			{ label: '$(file-media) Update Resources', command: 'tomcatmavenspring.updateResources' },
			{ label: '$(tools) Full Rebuild', command: 'tomcatmavenspring.fullRebuild' },
		];

		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: 'Escolha uma ação do Tomcat'
		});

		if (selected) {
			vscode.commands.executeCommand(selected.command);
		}
	}

	private updateStatusBar(status: 'parado' | 'executando' | 'erro') {
		switch (status) {
			case 'executando':
				this.statusBarItem.text = `$(server) Tomcat: Executando`;
				this.statusBarItem.color = '#00ff00';
				break;
			case 'erro':
				this.statusBarItem.text = `$(server) Tomcat: Erro`;
				this.statusBarItem.color = '#ff0000';
				break;
			default:
				this.statusBarItem.text = `$(server) Tomcat: Parado`;
				this.statusBarItem.color = undefined;
		}
	}

	private async setupDebugConfiguration() {
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

		// Salva configuração de debug se não existir
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

	dispose() {
		if (this.tomcatProcess) {
			this.tomcatProcess.kill();
		}
		this.statusBarItem.dispose();
		this.outputChannel.dispose();
	}
}

let extension: TomcatMavenSpringExtension;

export function activate(context: vscode.ExtensionContext) {
	console.log('Tomcat Maven Spring Extension ativada');
	extension = new TomcatMavenSpringExtension(context);
}

export function deactivate() {
	console.log('Tomcat Maven Spring Extension desativada');
	if (extension) {
		extension.dispose();
	}
}
