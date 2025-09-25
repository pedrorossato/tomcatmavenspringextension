import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Config } from './config';

export class ResourceManager {
	private outputChannel: vscode.OutputChannel;
	private config: Config;

	constructor(outputChannel: vscode.OutputChannel, config: Config) {
		this.outputChannel = outputChannel;
		this.config = config;
	}

	async updateResources(): Promise<boolean> {
		if (!this.config.APP_CONTEXT) {
			vscode.window.showErrorMessage('Módulo web não configurado');
			return false;
		}

		if (!this.config.PROJECT_PATH) {
			vscode.window.showErrorMessage('Caminho do projeto não configurado');
			return false;
		}

		this.outputChannel.appendLine('Copiando recursos da webapp...');

		try {
			const webappDir = path.join(this.config.PROJECT_PATH, this.config.APP_CONTEXT, 'src', 'main', 'webapp');
			const targetDir = path.join(this.config.PROJECT_PATH, this.config.APP_CONTEXT, 'target');
			
			let docbase = '';
			const defaultTarget = path.join(targetDir, this.config.APP_CONTEXT);
			
			if (fs.existsSync(defaultTarget)) {
				docbase = defaultTarget;
			} else {
				const targetContents = fs.readdirSync(targetDir, { withFileTypes: true });
				for (const item of targetContents) {
					if (item.isDirectory() && item.name.startsWith(this.config.APP_CONTEXT)) {
						const candidatePath = path.join(targetDir, item.name);
						const webInfPath = path.join(candidatePath, 'WEB-INF');
						if (fs.existsSync(webInfPath)) {
							docbase = candidatePath;
							break;
						}
					}
				}
			}

			if (!docbase) {
				vscode.window.showErrorMessage('Não foi possível localizar o exploded. Rode a task "full:rebuild exploded".');
				return false;
			}

			this.outputChannel.appendLine(`Docbase encontrado: ${docbase}`);

			await this.copyDirectoryContents(webappDir, docbase, ['WEB-INF']);
			this.outputChannel.appendLine('✅ Recursos raiz copiados');

			const webInfSource = path.join(webappDir, 'WEB-INF');
			const webInfTarget = path.join(docbase, 'WEB-INF');
			
			if (fs.existsSync(webInfSource)) {
				await this.copyDirectoryContents(webInfSource, webInfTarget, ['lib', 'classes'], ['web.xml']);
				this.outputChannel.appendLine('✅ Recursos de WEB-INF copiados');
			}

			vscode.window.showInformationMessage('Recursos atualizados com sucesso');
			return true;

		} catch (error) {
			this.outputChannel.appendLine(`❌ Erro ao copiar recursos: ${error}`);
			vscode.window.showErrorMessage(`Falha ao copiar recursos: ${error}`);
			return false;
		}
	}

	private async copyDirectoryContents(
		sourceDir: string, 
		targetDir: string, 
		excludeDirs: string[] = [], 
		excludeFiles: string[] = []
	): Promise<void> {
		if (!fs.existsSync(sourceDir)) {
			throw new Error(`Diretório fonte não encontrado: ${sourceDir}`);
		}

		if (!fs.existsSync(targetDir)) {
			fs.mkdirSync(targetDir, { recursive: true });
		}

		const items = fs.readdirSync(sourceDir, { withFileTypes: true });

		for (const item of items) {
			const sourcePath = path.join(sourceDir, item.name);
			const targetPath = path.join(targetDir, item.name);

			if (item.isDirectory() && excludeDirs.includes(item.name)) {
				continue;
			}

			if (item.isFile() && excludeFiles.includes(item.name)) {
				continue;
			}

			if (item.isDirectory()) {
				await this.copyDirectoryContents(sourcePath, targetPath, excludeDirs, excludeFiles);
			} else {
				fs.copyFileSync(sourcePath, targetPath);
			}
		}
	}
}
