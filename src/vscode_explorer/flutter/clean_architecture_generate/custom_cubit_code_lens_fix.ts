import * as path from 'path';
import * as vscode from 'vscode';
import { customCubitConfigProvider } from '../../../config/custom_cubit_config_provider';
import { CubitQuickFixer } from '../../../vscode_code_action/dart/ez_code_action/cubit_quick_fix';

const DART_SELECTOR: vscode.DocumentSelector = { language: 'dart', scheme: 'file' };

export function registerCustomCubitCodeLensFix(context: vscode.ExtensionContext) {
    const provider = new CustomCubitCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(DART_SELECTOR, provider)
    );
}

class CustomCubitCodeLensProvider implements vscode.CodeLensProvider {
    public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
        if (!this.isCubitFile(document)) {
            return [];
        }

        const customCubits = customCubitConfigProvider();
        if (customCubits.length === 0) {
            return [];
        }

        const cubitLines = this.findCubitDeclarationLines(document);
        if (cubitLines.length === 0) {
            return [];
        }

        const lenses: vscode.CodeLens[] = [];
        for (const line of cubitLines) {
            for (const cubitConfig of customCubits) {
                const command: vscode.Command = {
                    title: `🚀 Replace with ${cubitConfig.name}`,
                    command: CubitQuickFixer.command,
                    arguments: [document, new vscode.Range(line.range.start, line.range.end), cubitConfig],
                };
                lenses.push(
                    new vscode.CodeLens(new vscode.Range(line.range.start, line.range.start), command)
                );
            }
        }
        return lenses;
    }

    private isCubitFile(document: vscode.TextDocument): boolean {
        return path.basename(document.uri.fsPath).toLowerCase().endsWith('_cubit.dart')
          ;
    }

    private findCubitDeclarationLines(document: vscode.TextDocument): vscode.TextLine[] {
        const lines: vscode.TextLine[] = [];
        const pattern = /\bclass\s+\w+\s+extends\s+Cubit<\w+>/;
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            if (pattern.test(line.text)) {
                lines.push(line);
            }
        }
        return lines;
    }
}
