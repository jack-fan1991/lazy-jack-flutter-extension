import * as vscode from 'vscode';
import { customCubitConfigProvider, CustomCubitConfig } from '../../../config/custom_cubit_config_provider';
import { replaceCubitWithCustom } from '../../../helper/dart/custom_cubit_replacer';
import { EzCodeActionProviderInterface } from '../../ez_code_action';

export class CubitQuickFixer implements EzCodeActionProviderInterface {
    public static readonly command = 'CubitQuickFixer.command';

    getLangrageType() { return 'dart'; }

    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] | undefined {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return [];

        const line = document.lineAt(range.start.line);
        if (!line.text.includes('extends Cubit')) {
            return;
        }

        const customCubits = customCubitConfigProvider();
        if (customCubits.length === 0) {
            return [];
        }

        return customCubits.map(cubitConfig => this.createFixAction(document, range, cubitConfig));
    }

    private createFixAction(document: vscode.TextDocument, range: vscode.Range, cubitConfig: CustomCubitConfig): vscode.CodeAction {
        const fix = new vscode.CodeAction(`🚀 Replace with ${cubitConfig.name}`, vscode.CodeActionKind.Refactor);
        fix.command = {
            command: CubitQuickFixer.command,
            title: `🚀 Replace with ${cubitConfig.name}`,
            arguments: [document, range, cubitConfig]
        };
        return fix;
    }

   public setOnActionCommandCallback(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand(
            CubitQuickFixer.command,
            async (document: vscode.TextDocument, range: vscode.Range, cubitConfig: CustomCubitConfig) => {
                const line = document.lineAt(range.start.line);

                const success = await replaceCubitWithCustom(document, cubitConfig, { lineNumber: line.lineNumber });
                if (success) {
                    vscode.window.showInformationMessage(`🚀 已使用 ${cubitConfig.name} 取代 Cubit`);
                }
            }
        )
    );
}
}
