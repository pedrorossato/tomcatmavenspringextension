import * as vscode from 'vscode';
import { Config } from './config';

export class ConfigurationManager {
	private config: Config;

	constructor(config: Config) {
		this.config = config;
	}

	async loadConfiguration(): Promise<void> {
		const workspaceSettings = vscode.workspace.getConfiguration('tomcatmavenspring');
		this.config.PROJECT_PATH = workspaceSettings.get('PROJECT_PATH', this.config.PROJECT_PATH);
		this.config.JAVA_HOME = workspaceSettings.get('JAVA_HOME', this.config.JAVA_HOME);
		this.config.MAVEN_HOME = workspaceSettings.get('MAVEN_HOME', this.config.MAVEN_HOME);
		this.config.TOMCAT_HOME = workspaceSettings.get('TOMCAT_HOME', this.config.TOMCAT_HOME);
		this.config.SPRING_PROFILES_ACTIVE = workspaceSettings.get('SPRING_PROFILES_ACTIVE', this.config.SPRING_PROFILES_ACTIVE);
		this.config.JPDA_ADDRESS = workspaceSettings.get('JPDA_ADDRESS', this.config.JPDA_ADDRESS);
		this.config.APP_CONTEXT = workspaceSettings.get('APP_CONTEXT', this.config.APP_CONTEXT);
	}

	async showConfigurationDialog(): Promise<void> {
		const items = [
			'Definir caminho do projeto',
			'Definir contexto da aplicação',
			'Definir porta do JPDA',
			'Definir home do Tomcat',
			'Definir home do Maven',
			'Definir home do Java',
			'Definir perfil ativo do Spring'
		];

		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: 'O que você gostaria de configurar?'
		});

		switch (selected) {
			case 'Definir caminho do projeto':
				await this.configureProjectPath();
				break;
			case 'Definir contexto da aplicação':
				await this.configureAppContext();
				break;
			case 'Definir porta do JPDA':
				await this.configureJpdaAddress();
				break;
			case 'Definir home do Tomcat':
				await this.configureTomcatHome();
				break;
			case 'Definir home do Maven':
				await this.configureMavenHome();
				break;
			case 'Definir home do Java':
				await this.configureJavaHome();
				break;
			case 'Definir perfil ativo do Spring':
				await this.configureSpringProfile();
				break;
			default:
				vscode.window.showInformationMessage('Configuração não encontrada');
				break;
		}
	}

	private async configureProjectPath(): Promise<void> {
		const projectPath = await vscode.window.showInputBox({
			prompt: 'Caminho para o projeto Spring',
			value: this.config.PROJECT_PATH,
			placeHolder: '/caminho/para/seu/projeto'
		});
		if (projectPath) {
			await vscode.workspace.getConfiguration('tomcatmavenspring').update('PROJECT_PATH', projectPath, vscode.ConfigurationTarget.Workspace);
			vscode.window.showInformationMessage('Caminho do projeto atualizado. Recarregue a janela para aplicar.');
		}
	}

	private async configureAppContext(): Promise<void> {
		const appContext = await vscode.window.showInputBox({
			prompt: 'Contexto da aplicação',
			value: this.config.APP_CONTEXT,
			placeHolder: 'ex: meuapp-web'
		});
		if (appContext) {
			await vscode.workspace.getConfiguration('tomcatmavenspring').update('APP_CONTEXT', appContext, vscode.ConfigurationTarget.Workspace);
			vscode.window.showInformationMessage('Contexto da aplicação atualizado. Recarregue a janela para aplicar.');
		}
	}

	private async configureJpdaAddress(): Promise<void> {
		const jpdaAddress = await vscode.window.showInputBox({
			prompt: 'Porta do JPDA',
			value: this.config.JPDA_ADDRESS,
			placeHolder: '8000'
		});
		
		if (jpdaAddress) {
			await vscode.workspace.getConfiguration('tomcatmavenspring').update('JPDA_ADDRESS', jpdaAddress, vscode.ConfigurationTarget.Workspace);
			vscode.window.showInformationMessage('Porta do JPDA atualizada. Recarregue a janela para aplicar.');
		}
	}

	private async configureTomcatHome(): Promise<void> {
		const tomcatHome = await vscode.window.showInputBox({
			prompt: 'Home do Tomcat',
			value: this.config.TOMCAT_HOME,
			placeHolder: '/opt/apache-tomcat-9.0.75'
		});
		if (tomcatHome) {
			await vscode.workspace.getConfiguration('tomcatmavenspring').update('TOMCAT_HOME', tomcatHome, vscode.ConfigurationTarget.Workspace);
			vscode.window.showInformationMessage('Home do Tomcat atualizado. Recarregue a janela para aplicar.');
		}
	}

	private async configureMavenHome(): Promise<void> {
		const mavenHome = await vscode.window.showInputBox({
			prompt: 'Home do Maven',
			value: this.config.MAVEN_HOME,
			placeHolder: '/opt/apache-maven-3.6.3'
		});
		
		if (mavenHome) {
			await vscode.workspace.getConfiguration('tomcatmavenspring').update('MAVEN_HOME', mavenHome, vscode.ConfigurationTarget.Workspace);
			vscode.window.showInformationMessage('Home do Maven atualizado. Recarregue a janela para aplicar.');
		}
	}

	private async configureJavaHome(): Promise<void> {
		const javaHome = await vscode.window.showInputBox({
			prompt: 'Home do Java',
			value: this.config.JAVA_HOME,
			placeHolder: '/usr/lib/jvm/java-1.8.0-openjdk-amd64'
		});
		if (javaHome) {
			await vscode.workspace.getConfiguration('tomcatmavenspring').update('JAVA_HOME', javaHome, vscode.ConfigurationTarget.Workspace);
			vscode.window.showInformationMessage('Home do Java atualizado. Recarregue a janela para aplicar.');
		}
	}

	private async configureSpringProfile(): Promise<void> {
		const springProfilesActive = await vscode.window.showInputBox({
			prompt: 'Perfil ativo do Spring',
			value: this.config.SPRING_PROFILES_ACTIVE,
			placeHolder: 'desenvolvimento'
		});	
		if (springProfilesActive) {
			await vscode.workspace.getConfiguration('tomcatmavenspring').update('SPRING_PROFILES_ACTIVE', springProfilesActive, vscode.ConfigurationTarget.Workspace);
			vscode.window.showInformationMessage('Perfil ativo do Spring atualizado. Recarregue a janela para aplicar.');
		}
	}

	getConfig(): Config {
		return this.config;
	}
}
