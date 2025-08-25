import * as vscode from 'vscode';
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

        const config = vscode.workspace.getConfiguration('lazy-jack-flutter-extension');
        const customCubits = config.get<string[]>('customCubit', []);

        return customCubits.map(cubit => this.createFixAction(document, range, cubit));
    }

    private createFixAction(document: vscode.TextDocument, range: vscode.Range, cubitType: string): vscode.CodeAction {
        const fix = new vscode.CodeAction(`🚀 Replace with ${cubitType}`, vscode.CodeActionKind.Refactor);
        fix.command = {
            command: CubitQuickFixer.command,
            title: `🚀 Replace with ${cubitType}`,
            arguments: [document, range, cubitType]
        };
        return fix;
    }

   public setOnActionCommandCallback(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand(
            CubitQuickFixer.command,
            async (document: vscode.TextDocument, range: vscode.Range, cubitType: string) => {
                const path = require("path");
                const line = document.lineAt(range.start.line);

                const classMatch = line.text.match(/class\s+\w+\s+extends\s+Cubit<(\w+)>/);
                if (!classMatch) return;

                const stateName = classMatch[1];
                const uiModelName = stateName.replace("State", "UiModel");
                const stateFileName =
                    stateName.split(/(?=[A-Z])/).join("_").toLowerCase() + ".dart";

                const edit = new vscode.WorkspaceEdit();

                // 1. 修改 Cubit class 繼承
                const newClassText = line.text.replace(
                    `Cubit<${stateName}>`,
                    `${cubitType}<${uiModelName}>`
                );
                edit.replace(document.uri, line.range, newClassText);

                // 2. 刪除 import "xxx_state.dart";
                for (let i = 0; i < document.lineCount; i++) {
                    const l = document.lineAt(i);
                    if (l.text.includes(stateFileName)) {
                        edit.delete(document.uri, l.rangeIncludingLineBreak);
                        break;
                    }
                }

                // 3. 套用修改並存檔
                await vscode.workspace.applyEdit(edit);
                await document.save();

                // 4. 刪掉檔案
                const stateFilePath = path.join(path.dirname(document.uri.fsPath), stateFileName);
                try {
                    await vscode.workspace.fs.delete(vscode.Uri.file(stateFilePath));
                    vscode.window.showInformationMessage(`Deleted ${stateFileName}`);
                } catch (err) {
                    vscode.window.showWarningMessage(
                        `Could not delete ${stateFileName}: ${err}`
                    );
                }
            }
        )
    );
}
}