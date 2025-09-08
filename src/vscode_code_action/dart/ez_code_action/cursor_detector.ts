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
import { sortArbKeys } from '../../../vscode_file_listener/arb_file_listener';

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
        context.subscriptions.push(vscode.commands.registerCommand(DartCurserDetector.command_l10n_fix, async (uri: vscode.Uri, range: vscode.Range) => {
            if (uri != undefined) {
                const editor = await vscode.window.showTextDocument(uri, { preview: false });
                editor.selection = new vscode.Selection(range.start, range.end);
                editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
            }
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

    let editor = getActivateEditor();
    let document = editor.document;
    let selection = editor.selection;

    // 獲取選取區域的前後位置
    const startPos = selection.start;
    const endPos = selection.end;

    // 檢查前後字元是否為引號
    const startChar = startPos.character > 0 ?
        document.getText(new vscode.Range(
            new vscode.Position(startPos.line, startPos.character - 1),
            startPos
        )) : '';

    const endChar = endPos.character < document.lineAt(endPos.line).text.length ?
        document.getText(new vscode.Range(
            endPos,
            new vscode.Position(endPos.line, endPos.character + 1)
        )) : '';

    // 確認前後字元是否匹配且為引號
    if (!((startChar === '"' && endChar === '"') || (startChar === "'" && endChar === "'"))) {
        return undefined;
    }

    let data = "🌐 Export String to l10n resource";
    const fix = new vscode.CodeAction(data, vscode.CodeActionKind.QuickFix);
    fix.command = { command: DartCurserDetector.command_l10n_fix, title: data };
    fix.isPreferred = true;
    return fix;
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


/**
 * 将带参数的字符串转换为Flutter多国语言模板
 * @param text 原始文本
 * @param key 多语言键名
 * @returns 处理后的多语言对象
 */
async function processL10nWithParams(text: string, key: string): Promise<{ [key: string]: any } | undefined> {
    // 提取所有参数
    const params = detectParameters(text);

    if (params.length === 0) {
        // 没有参数
        return {};
    }

    // 准备存储参数类型的对象
    const placeholders: { [param: string]: { type: string } } = {};
    let processedText = text;

    // 为每个参数询问类型
    for (const param of params) {
        const paramType = await vscode.window.showQuickPick(
            ['String', 'num'],
            { placeHolder: `Select "${param}" type` }
        );

        if (!paramType) {
            return undefined; // 用户取消了选择，中止处理
        }

        placeholders[param] = { type: paramType };

        // 替换文本中的参数格式为 Flutter 的 {param} 格式
        processedText = processedText.replace(new RegExp(`\\$\\{${param}\\}|\\$${param}(?!\\w)`, 'g'), `{${param}}`);
    }


    return {
        [key]: processedText,
        [`@${key}`]: {
            placeholders
        }
    };
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
    let selectText = getSelectedText()

    selectText = changeCase.snakeCase(selectText)
    let quickPickItemsResult: vscode.QuickPickItem[] = []
    for (let item in quickPickItems) {
        if (!quickPickItems[item].label.includes("✨ Enter custom key...")) {
            quickPickItemsResult.push({ label: `${quickPickItems[item].label}`, description: `${quickPickItems[item].description}_${selectText}` })
        }
        quickPickItemsResult.push(quickPickItems[item])
    }
    let selectedKey = await vscode.window.showQuickPick(quickPickItemsResult, { placeHolder: "Select l10n key or Custom." }); if (selectedKey == undefined) return
    let outputKey = selectedKey.label
    let withName = selectedKey.description?.includes(selectText)

    if (outputKey.includes("]")) {
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
    if (withName) {
        outputKey = `${outputKey}_${selectText}`
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

    let l10nObject = await processL10nWithParams(text, key as string);
    if (l10nObject == undefined) return
    let newText = ""
    if (Object.keys(l10nObject).length === 0) {
        // 將選取的文字作為 value，並將 key-value 加入每個 .arb 檔案的末端
        files.forEach(file => {
            let filePath = path.join(targetPath, file);
            let content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            content[key as string] = text;
            let jsonString = JSON.stringify(content, null, 2);
            fs.writeFileSync(filePath, jsonString, 'utf8');
        });
        newText = `App.l10n.${key as string}`
    } else {
        // 將選取的文字作為 value，並將 key-value 加入每個 .arb 檔案的末端
        files.forEach(file => {
            let filePath = path.join(targetPath, file);
            let content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            // 將所有 key-value 從 l10nObject 放進 content
            Object.entries(l10nObject!).forEach(([k, v]) => {
                content[k] = v;
            });
            let jsonString = JSON.stringify(content, null, 2);
            let params = detectParameters(text).join(",");

            fs.writeFileSync(filePath, jsonString, 'utf8');
            newText = `App.l10n.${key as string}(${params})`
        });
    }




    // 替換選取範圍的文字為輸入的 key
    editor.edit(editBuilder => {
        let replaceSelect = editor.selection
        replaceSelect = new vscode.Selection(new vscode.Position(replaceSelect.start.line, replaceSelect.start.character - 1), new vscode.Position(replaceSelect.end.line, replaceSelect.end.character + 1))
        editBuilder.replace(replaceSelect, newText);
    });
    await editor.document.save();
    vscode.window.showInformationMessage(`View l10n file `, 'Confirm', 'Cancel', 'gen-l10n').then(async (option) => {
        if (option == 'Confirm') {
            openEditor(firstFilePath)
        }
        if (option == 'gen-l10n') {
            files.forEach(async file => {
                let filePath = path.join(targetPath, file);
                let document = await vscode.workspace.openTextDocument(filePath)
                sortArbKeys(document)

            });

            runTerminal('flutter gen-l10n');
        }
    })

    if (!totalContent.includes(`import 'package:${APP.flutterLibName}/main.dart';`)) {
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
    while ((match = classRegex.exec(text)) !== null) {
        if (match.index < position) {
            lastMatch = match;
        } else {
            break;
        }
    }
    return lastMatch ? lastMatch[1] : "";
}