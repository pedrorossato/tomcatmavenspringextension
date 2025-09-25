import * as vscode from 'vscode';
import { Config } from './config';
import { MavenRunner } from './MavenRunner';
import { TomcatManager } from './TomcatManager';
import { ConfigurationManager } from './ConfigurationManager';
import { ResourceManager } from './ResourceManager';

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
	private outputChannel: vscode.OutputChannel;
	private configurationManager: ConfigurationManager;
	private mavenRunner: MavenRunner;
	private tomcatManager: TomcatManager;
	private resourceManager: ResourceManager;

	constructor(private context: vscode.ExtensionContext) {
		this.outputChannel = vscode.window.createOutputChannel('Tomcat Maven Spring');
		this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
		
		this.configurationManager = new ConfigurationManager(this.config);
		this.mavenRunner = new MavenRunner(this.outputChannel, this.config);
		this.tomcatManager = new TomcatManager(this.outputChannel, this.config);
		this.resourceManager = new ResourceManager(this.outputChannel, this.config);
		
		this.initialize();
	}

	private async initialize() {
		await this.configurationManager.loadConfiguration();
		this.setupStatusBar();
		this.registerCommands();
	}

	private setupStatusBar() {
		this.statusBarItem.text = `$(server) Tomcat: Parado`;
		this.statusBarItem.tooltip = 'Clique para ver opções do Tomcat';
		this.statusBarItem.command = 'tomcatmavenspring.showQuickPick';
		this.statusBarItem.show();
	}

	private registerCommands() {
		const commands = [
			{ command: 'tomcatmavenspring.configure', handler: () => this.configurationManager.showConfigurationDialog() },
			{ command: 'tomcatmavenspring.setupEnvironment', handler: () => this.tomcatManager.setupEnvironment() },
			{ command: 'tomcatmavenspring.createContext', handler: () => this.tomcatManager.createContext() },
			{ command: 'tomcatmavenspring.startTomcat', handler: this.startTomcat.bind(this) },
			{ command: 'tomcatmavenspring.stopTomcat', handler: this.stopTomcat.bind(this) },
			{ command: 'tomcatmavenspring.updateClasses', handler: () => this.mavenRunner.compileClasses() },
			{ command: 'tomcatmavenspring.updateResources', handler: () => this.resourceManager.updateResources() },
			{ command: 'tomcatmavenspring.fullRebuild', handler: () => this.mavenRunner.fullRebuild() },
			{ command: 'tomcatmavenspring.showQuickPick', handler: this.showQuickPick.bind(this) }
		];

		commands.forEach(({ command, handler }) => {
			this.context.subscriptions.push(vscode.commands.registerCommand(command, handler));
		});
	}

	private async startTomcat() {
		const success = await this.tomcatManager.start();
		if (success) {
			this.updateStatusBar('executando');
		} else {
			this.updateStatusBar('erro');
		}
	}

	private async stopTomcat() {
		const success = await this.tomcatManager.stop();
		if (success) {
			this.updateStatusBar('parado');
		} else {
			this.updateStatusBar('erro');
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

	dispose() {
		this.tomcatManager.dispose();
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