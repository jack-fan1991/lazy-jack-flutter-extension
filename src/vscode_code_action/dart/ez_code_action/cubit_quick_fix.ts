import * as vscode from 'vscode';
import { customCubitConfigProvider, CustomCubitConfig } from '../../../config/custom_cubit_config_provider';
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
                    `${cubitConfig.name}<${uiModelName}>`
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

                // 3. 新增客製 Cubit 來源匯入
                this.addImportIfNeeded(document, edit, cubitConfig.import);

                // 4. 套用修改並存檔
                await vscode.workspace.applyEdit(edit);
                await document.save();

                // 5. 刪掉檔案
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

    private addImportIfNeeded(document: vscode.TextDocument, edit: vscode.WorkspaceEdit, importPath: string) {
        const importStatement = this.normalizeImportStatement(importPath);
        if (!importStatement) return;

        const importValue = this.extractImportPath(importStatement);
        if (!importValue) return;

        const existingImportRegex = new RegExp(`import\\s+['"]${this.escapeRegExp(importValue)}['"];`, 'm');
        if (existingImportRegex.test(document.getText())) {
            return;
        }

        const insertPosition = this.findImportInsertPosition(document);
        const isFileStart = insertPosition.line === 0 && insertPosition.character === 0;
        const insertText = `${isFileStart ? '' : '\n'}${importStatement}\n`;

        edit.insert(document.uri, insertPosition, insertText);
    }

    private findImportInsertPosition(document: vscode.TextDocument): vscode.Position {
        let lastImportLine = -1;
        for (let i = 0; i < document.lineCount; i++) {
            const trimmed = document.lineAt(i).text.trim();
            if (trimmed.startsWith('import ')) {
                lastImportLine = i;
            }
        }

        if (lastImportLine >= 0) {
            return document.lineAt(lastImportLine).range.end;
        }

        return new vscode.Position(0, 0);
    }

    private normalizeImportStatement(rawImport: string): string {
        const trimmed = rawImport.trim();
        if (!trimmed) return '';

        if (trimmed.startsWith('import ')) {
            return trimmed.endsWith(';') ? trimmed : `${trimmed};`;
        }

        const cleaned = trimmed.replace(/^['"]|['"]$/g, '');
        if (!cleaned) return '';

        return `import '${cleaned}';`;
    }

    private extractImportPath(importStatement: string): string | undefined {
        const match = importStatement.match(/import\s+['"](.+)['"];$/);
        return match ? match[1] : undefined;
    }

    private escapeRegExp(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
