import * as vscode from 'vscode';
import { EzCodeActionProviderInterface } from '../../code_action';
import { getActivateEditor, getCursorLineText, getSelectedText, openEditor, replaceSelectionText } from '../../../utils/src/vscode_utils/editor_utils';
import path = require('path');
import { getActivateText, insertToActivateEditor, reFormat } from '../../../utils/src/vscode_utils/activate_editor_utils';
import { APP } from '../../../extension';
import { getRootPath } from '../../../utils/src/vscode_utils/vscode_env_utils';
import * as fs from 'fs';
import { runTerminal } from '../../../utils/src/terminal_utils/terminal_utils';
// let counter = new OpenCloseFinder()
import * as changeCase from "change-case";

export class DartCurserDetector implements EzCodeActionProviderInterface {

    public static readonly command_to_require = 'command.param.to.require';
    public static readonly command_l10n_fix = 'command.l10n.fix';

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
        let action2 = l18nFixAction()
        if (action2 != undefined) {
            actions.push(action2)
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
        context.subscriptions.push(vscode.commands.registerCommand(DartCurserDetector.command_l10n_fix, async (range: vscode.Range) => {
            l18nFix()
        }));
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


function l18nFixAction(): vscode.CodeAction | undefined {
    if (APP.flutterLocalizations == undefined) {
        return undefined;
    }

    let text = getSelectedText();
    // let selectIsString = (text.startsWith(`'''`) || text.endsWith(`'''`)) || (text.startsWith(`"`) || text.endsWith(`"`)) || (text.startsWith(`'`) || text.endsWith(`'`));
    // if (!selectIsString) {
    //     return undefined;
    // }
    let data = "🌐 Export String to l10n resource";
    const fix = new vscode.CodeAction(data, vscode.CodeActionKind.QuickFix);
    fix.command = { command: DartCurserDetector.command_l10n_fix, title: data };
    fix.isPreferred = true;
    return fix;
}

async function l18nFix() {
    let text = getSelectedText();
    let root = getRootPath();
    let editor = getActivateEditor()
    let fileName = editor.document.fileName.split('/').pop();

    let targetPath = `${root}/lib/l10n`;
    // 讀取所有 lib/l18n/*.arb 檔案
    let files = fs.readdirSync(targetPath).filter(file => file.endsWith('.arb'));
    if (files.length === 0) {
        return undefined;
    }
    let fullText = getActivateText()
    let position = editor.document.offsetAt(editor.selection.start);

    // 向前搜尋最近的 class 名稱
    let nearestClassName = findNearestClassName(fullText, position);
    nearestClassName = nearestClassName
    let nearestClassDescription = changeCase.snakeCase(nearestClassName)
    if (nearestClassDescription.endsWith("_widget")) {
        nearestClassDescription = nearestClassDescription.replace("_widget", "")
    }
    let nearestClassNameOption = { label: `[Class] ${nearestClassName}`, description: `🔑 ${nearestClassDescription}` }

    let fileNameDescription = changeCase.snakeCase(fileName!.replace(".dart", ""))
    if (fileNameDescription.endsWith("_widget")) {
        fileNameDescription = fileNameDescription.replace("_widget", "")
    }
    let fileNameOption = { label: `[File] ${fileName!}`, description: `🔑 ${fileNameDescription}` }
    let firstKey = files[0];
    let firstFilePath = path.join(targetPath, firstKey);
    // 彈出選單或輸入框讓使用者選擇 key
    let totalContent = getActivateText()
    let classMatch = getAllClassNames(totalContent).filter(e => e !== undefined && !e.includes(nearestClassName));
    let quickPickItems: vscode.QuickPickItem[] = [
        { label: "✨ Enter custom key...", description: "Enter a custom key for l10n" },
        ...(nearestClassName ? [nearestClassNameOption] : []), // 最近 class 名稱
        ...new Set(
            classMatch.filter((key) => {
                changeCase.snakeCase(key) != changeCase.snakeCase(fileName!.replace(".dart", "")) ||
                    changeCase.snakeCase(key) != changeCase.snakeCase(nearestClassName)
            })
                .map(key => {
                    // 處理 description: 使用 snake_case 並移除 "_widget"（如果存在）
                    let description = changeCase.snakeCase(key);

                    if (description.endsWith("_widget")) {
                        description = description.replace("_widget", "");
                    }
                    return { label: `[Class] ${key}`, description: `🔑 ${description}` };
                })
        ), // 所有已存在的 key
        ...(fileName ? [fileNameOption] : [])
    ];
    let selectedKey = await vscode.window.showQuickPick(quickPickItems, { placeHolder: "Select l10n key or Custom." }); if (selectedKey == undefined) return
    let outputKey = selectedKey.label
    if(outputKey.includes("]")){
        outputKey = selectedKey.label.split("]")[1].trim()
    }
    if (selectedKey.label === "Enter custom key...") {
        outputKey = ""
    }
    outputKey = changeCase.snakeCase(outputKey)
    if (outputKey.endsWith("_dart")) {
        outputKey = outputKey.replace("_dart", "")
    }
    if (outputKey.endsWith("_widget")) {
        outputKey = outputKey.replace("_widget", "")
    }
    // 彈出輸入框讓使用者輸入 key
    let key = await vscode.window.showInputBox({ prompt: 'Enter the key for l10n', value: outputKey });
    if (!key) {
        return undefined;
    }
    key = key.replace(`"`, "")
    key = key.replace(".dart", "")
    key = changeCase.camelCase(key)
    key = changeCase.snakeCase(key)

    // 將選取的文字作為 value，並將 key-value 加入每個 .arb 檔案的末端
    files.forEach(file => {
        let filePath = path.join(targetPath, file);
        let content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        content[key as string] = text;
        let jsonString = JSON.stringify(content, null, 2);
        fs.writeFileSync(filePath, jsonString, 'utf8');
    });
    let newText = `App.l10n.${key as string}`

    // 替換選取範圍的文字為輸入的 key
    editor.edit(editBuilder => {
        editBuilder.replace(editor.selection, newText);
    });
    await editor.document.save();
    vscode.window.showInformationMessage(`View l10n file `, 'Confirm', 'Cancel').then(async (option) => {
        if (option == 'Confirm') {
            openEditor(firstFilePath)
        }
    })
    runTerminal('flutter gen-l10n');
    if(!totalContent.includes(`import 'package:${APP.flutterLibName}/main.dart';`)){
        editor.edit(editBuilder => {
            editBuilder.insert(new vscode.Position(0, 0), `import 'package:${APP.flutterLibName}/main.dart';\n`);
        });
    } 
    await editor.document.save();

    // 定義正則表達式，匹配 "ASD", 'ASD', '''ASD'''
    const regex = new RegExp(`(['"]{1,3})${newText}\\1`, 'g')
    text = getActivateText()
    let match: RegExpExecArray | null;
    const edit = new vscode.WorkspaceEdit();
    while ((match = regex.exec(text)) !== null) {
        const startPos = editor.document.positionAt(match.index);
        const endPos = editor.document.positionAt(match.index + match[0].length);

        // 定義替換的內容
        const range = new vscode.Range(startPos, endPos);
        let t = editor.document.getText(new vscode.Range(startPos, endPos))
        edit.replace(editor.document.uri, range, newText);
        t = editor.document.getText(new vscode.Range(startPos, endPos))

    }

    // Apply the edit and save
    const editSuccess = await vscode.workspace.applyEdit(edit);
    if (editSuccess) {
        await editor.document.save();
       
    } else {
        throw new Error('Failed to apply edits');
    }
    
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
    return lastMatch ? lastMatch[1] : "";
}