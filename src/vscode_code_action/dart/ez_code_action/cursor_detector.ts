import * as vscode from 'vscode';
import { EzCodeActionProviderInterface } from '../../code_action';
import { getCursorLineText, getSelectedText } from '../../../utils/src/vscode_utils/editor_utils';
import path = require('path');
import { getActivateText, insertToActivateEditor } from '../../../utils/src/vscode_utils/activate_editor_utils';

export class DartCurserDetector implements EzCodeActionProviderInterface {

    public static readonly command_to_require = 'command.param.to.require';

    getLangrageType() { return 'dart' }

    // 編輯時對單行檢測
    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] | undefined {
        let cursorLineText = getCursorLineText()
        let actions: vscode.CodeAction[] = []
        if (cursorLineText == undefined) return undefined
        // let action = convertParamToRequireAction(document, range, cursorLineText)
        // autoSave(document,cursorLineText)
        // if (action != undefined) {
        //     return [action]
        // }
        let action = this.requiredParamFixAction()
        if (action != undefined) {
            actions.push(action)
        }
        if (actions.length == 0) {
            return undefined
        } else {
            return actions
        }
    }

    requiredParamFixAction(): vscode.CodeAction | undefined {
        let text = getSelectedText()
        const hasNumbers = /\d/.test(text);
        if (hasNumbers || text.includes("= true") || text.includes("= false")) {
            return undefined
        } else {
            let data = "✨ Required Transformer"
            const fix = new vscode.CodeAction(data, vscode.CodeActionKind.QuickFix);
            fix.command = { command: "command_dart_2_require_param", title: data };
            fix.isPreferred = true;
            return fix;
        }

    }


    setOnActionCommandCallback(context: vscode.ExtensionContext) {
        // 注册 Quick Fix 命令
        // context.subscriptions.push(vscode.commands.registerCommand(DartCurserDetector.command_to_require, async (range: vscode.Range) => {
        //     paramToRequireGenerator(range)
        // }));
        // context.subscriptions.push(vscode.commands.registerCommand(DartCurserDetector.command_l10n_fix, async (uri: vscode.Uri, range: vscode.Range) => {
        //     if (uri != undefined) {
        //         const editor = await vscode.window.showTextDocument(uri, { preview: false });
        //         editor.selection = new vscode.Selection(range.start, range.end);
        //         editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
        //     }
        // }));
    }







}

function autoImport() {
    let text = getActivateText()
    if (text.includes("StatelessWidget") || text.includes('StatefulWidget')) {
        if (text.includes("import 'package:flutter/material.dart';")) return
        if (text.includes("import 'package:flutter/widgets.dart';")) return
        if (text.includes("import 'package:flutter/widgets.dart';")) return
        if (text.includes("import 'package:flutter/cupertino.dart';")) return
        if (text.includes("part of")) return
        insertToActivateEditor("import 'package:flutter/material.dart';\n")

    }
}



// function convertParamToRequireAction(document: vscode.TextDocument, range: vscode.Range, cursorLineText: string): vscode.CodeAction | undefined {
//     if (!cursorLineText.includes('(')) return undefined
//     if (cursorLineText.includes('{')) return undefined
//     let constructorParamRange = new SmallerOpenCloseFinder().findRange(document, range.start.line)
//     if (constructorParamRange == undefined) return undefined
//     return createToRequireFixAction(constructorParamRange)
// }

// function createToRequireFixAction(range: vscode.Range): vscode.CodeAction {
//     let title = 'Convert to required'
//     const fix = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
//     fix.command = { command: DartCurserDetector.command_to_require, title: title, arguments: [range] };
//     fix.isPreferred = true;
//     return fix;
// }


function autoSave(document: vscode.TextDocument, cursorLineText: string) {
    let text = document.getText()
    if (cursorLineText.includes('@freezed')) {
        document.save()
    }
}

const findWidgetClassRegex = /class\s+([a-zA-Z_][\w]*)\s*(<[\w\s<>,]*)?\s*extends\s+(?!State\b)[\w\s<>,]*/g;

function getAllClassNames(text: string): string[] {
    let matches;
    const classNames = [];
    while ((matches = findWidgetClassRegex.exec(text)) !== null) {
        classNames.push(matches[1]);
    }
    return classNames;
}



// 添加检测字符串参数的函数
function detectParameters(text: string): string[] {
    const simpleParamRegex = /\$(\w+)/g; // 匹配 $param 形式
    const bracketParamRegex = /\$\{(\w+)\}/g; // 匹配 ${param} 形式

    const params = new Set<string>();
    let match;

    // 匹配 $param 形式
    while ((match = simpleParamRegex.exec(text)) !== null) {
        // 排除已经是 ${param} 形式的一部分
        const fullMatch = match[0];
        if (fullMatch.charAt(0) === '$' && fullMatch.charAt(1) !== '{') {
            params.add(match[1]);
        }
    }

    // 匹配 ${param} 形式
    while ((match = bracketParamRegex.exec(text)) !== null) {
        params.add(match[1]);
    }

    return Array.from(params);
}


export function findNearestClassName(text: string, position: number): string {
    let classRegex = /class\s+(\w+)/g;
    let match;
    let lastMatch;
    while ((match = findWidgetClassRegex.exec(text)) !== null) {
        if (match.index < position) {
            lastMatch = match;
        } else {
            break;
        }
    }
    while ((match = classRegex.exec(text)) !== null) {
        if (match.index < position) {
            lastMatch = match;
        } else {
            break;
        }
    }
    return lastMatch ? lastMatch[1] : "";
}