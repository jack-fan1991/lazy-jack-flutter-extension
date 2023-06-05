import path = require('path');
import * as vscode from 'vscode';
import { CodeActionProviderInterface, diagnostics } from '../code_action';
import { StatusCode } from '../error_code';
import { paramToRequireGenerator } from '../../helper/dart/to_require_params';


export class ParamToRequiredFixer implements CodeActionProviderInterface<string> {

    public static readonly command = 'ParamToRequiredFixer.command';

    getCommand() { return ParamToRequiredFixer.command }
    getProvidedCodeActionKinds() { return [vscode.CodeActionKind.Refactor]; }
    getErrorCode() { return StatusCode.MissingDartPart }
    getLangrageType() { return 'dart' }




    // 編輯時對單行檢測
    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] | undefined {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return [];
        const selection = editor.selection;
        const text = editor.document.getText(selection);
        if (text === "") return [];
        if (text.split(',').length <=1) return
        let start = range.start.line
        if(!editor.document.lineAt(start).text.includes('('))return
        return [this.createAddUnitStateAction(document, range, "Convert to required")]

    }

    createAddUnitStateAction(document: vscode.TextDocument, range: vscode.Range, data: string): vscode.CodeAction {
        const fix = new vscode.CodeAction(data, vscode.CodeActionKind.Refactor);
        fix.command = { command: ParamToRequiredFixer.command, title: data, arguments: [document, range] };
        fix.diagnostics = [this.createDiagnostic(range, data)];
        fix.isPreferred = true;
        return fix;
    }


    //建立錯誤顯示文字hover
    createDiagnostic(range: vscode.Range, data: string): vscode.Diagnostic {
        const diagnostic = new vscode.Diagnostic(range, `${data}`, vscode.DiagnosticSeverity.Information);
        return diagnostic
    }
    // 註冊action 按下後的行為
    setOnActionCommandCallback(context: vscode.ExtensionContext) {
        // 注册 Quick Fix 命令
        context.subscriptions.push(vscode.commands.registerCommand(ParamToRequiredFixer.command, async (document: vscode.TextDocument, range: vscode.Range) => {
            paramToRequireGenerator()

        }));
    }

    handleAllFile(document: vscode.TextDocument): vscode.Diagnostic[] {
        return []
    }




    handleError(diagnostic: vscode.Diagnostic, document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction | undefined {
        return undefined
    }

}
