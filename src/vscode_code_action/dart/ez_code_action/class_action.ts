import * as vscode from 'vscode';
import { EzCodeActionProviderInterface } from '../../code_action';
import * as fs from 'fs';
import path = require('path');
import { BiggerOpenCloseFinder, FlutterOpenCloseFinder } from '../../../utils/src/regex/open_close_finder';
import { getActivateEditor, getActivateFileAsUri, getCursorLineText, getFolderPath, openEditor, replaceText } from '../../../utils/src/vscode_utils/editor_utils';
import { getActivateText } from '../../../utils/src/vscode_utils/activate_editor_utils';
import { findClassRegex, toSnakeCase } from '../../../utils/src/regex/regex_utils';
import { logInfo } from '../../../utils/src/logger/logger';
import { PartPair, createPartLine, insertPartLine } from '../../../helper/dart/part_utils';

const flutterOpenCloseFinder = new FlutterOpenCloseFinder();



export class ExtractClassFixer implements EzCodeActionProviderInterface {

    getLangrageType(): vscode.DocumentSelector {
        return { scheme: 'file' }
    }

    public static readonly commandExtractClass = 'ExtractClassFixer.extract.class';
    public static readonly commandAddHiveAdapter = 'ExtractClassFixer.hive.adapter';

    // 編輯時對單行檢測
    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] | undefined {
        let cursorLineText = getCursorLineText()
        if (cursorLineText == undefined) return undefined
        let classRange = flutterOpenCloseFinder.findRange(document, range.start.line)
        let actions: vscode.CodeAction[] = []
        let upLineText = document.lineAt(range.start.line - 1).text
        let nextLineText = document.lineAt(range.start.line + 1).text
        if (classRange != undefined) {
            if (upLineText.includes("@freezed")) {
                if(!nextLineText.includes("@HiveType")){
                    actions.push(this.convertFreezedToHiveAction(getActivateEditor()!, classRange))
                }
            }else{
                actions.push(this.createExtractClassAction(getActivateEditor()!, classRange))
            }
            return actions
        }

    }

    convertFreezedToHiveAction(editor: vscode.TextEditor, range: vscode.Range): vscode.CodeAction {
        let data = "Add Hive Adapter"
        const fix = new vscode.CodeAction(data, vscode.CodeActionKind.Refactor);
        fix.command = { command: ExtractClassFixer.commandAddHiveAdapter, title: data, arguments: [editor, range] };
        fix.isPreferred = true;
        return fix;
    }

    createExtractClassAction(editor: vscode.TextEditor, range: vscode.Range): vscode.CodeAction {
        let data = "Extract Class to file"
        const fix = new vscode.CodeAction(data, vscode.CodeActionKind.RefactorExtract);
        fix.command = { command: ExtractClassFixer.commandExtractClass, title: data, arguments: [editor, range] };
        fix.isPreferred = true;
        return fix;
    }

    // 註冊action 按下後的行為
    setOnActionCommandCallback(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.commands.registerCommand(ExtractClassFixer.commandExtractClass, async (editor: vscode.TextEditor, range: vscode.Range) => {
            let text = getActivateText(range)
            let match = text.match(findClassRegex)

            createFileInPicker(editor, undefined, match == null ? undefined : match[1], range)
            editor.document.save()

        }))


        context.subscriptions.push(vscode.commands.registerCommand(ExtractClassFixer.commandAddHiveAdapter, async (editor: vscode.TextEditor, range: vscode.Range) => {
            let text = getActivateText(range)
            let match = text.match(findClassRegex)
            let className = match![1]
            logInfo("Search Hive typeId...")
            let lasId = await searchMaxHiveIdxForText()
            let hiveAdapter = `@HiveType(typeId: ${lasId}, adapterName: '${className}Adapter')`
            let result = ''
            let start = 0
            let isParam = false
            let hiveField = 0
            let preChar = ''
            for (let i = 0; i < text.length; i++) {
                let char = text[i]
                if (i > 0) {
                    preChar = text[i - 1]
                }
                if (char === '{' && start == 0) {
                    result += ` ${char}\n`
                    result += ` \t${hiveAdapter}\n`
                    start++
                }
                else if (char === '{' || char === ',') {
                    result += char
                    isParam = true
                    if (char === ',') {
                        result += '\n'
                    }

                }
                else if (isParam&&char!='}') {
                    if (!result.includes('fromJson')&&char.trim()!='') {
                        result += `@HiveField(${hiveField})  `
                        result += char
                        hiveField++
                        isParam = false
                    }
                    else {
                        result += char

                    }

                } else if (char === '}') {
                    isParam = false
                    result += char
                }
                else {
                    result += char
                }




            }
            let line = text.split('\n')

            replaceText(editor.document.uri.fsPath, text, result)

            editor.document.save()

        }))
    }

}



async function createFileInPicker(editor: vscode.TextEditor, uriPath: string | undefined, fileName: string | undefined, classRange: vscode.Range) {
    let activateDocument = editor.document
    let classData = activateDocument.getText(classRange)
    let defaultUri;
    if (uriPath != null) {
        defaultUri = vscode.Uri.file(uriPath)
    }
    else if (uriPath == null && fileName == null) {
        defaultUri = getActivateFileAsUri()
    } else if (fileName != null) {
        let folder = getFolderPath(vscode.window.activeTextEditor!.document)
        let file: string = fileNameFormat(fileName ?? "temp")
        file += `.${getFileType()}`
        defaultUri = vscode.Uri.file(path.join(folder, file))
    }
    let options: vscode.SaveDialogOptions = {
        defaultUri: defaultUri,
        filters: {

            'All Files': ['*']
        }
    };

    const needPartOfUri = await vscode.window.showSaveDialog(options);
    if (needPartOfUri) {
        let partPair: PartPair = createPartLine(activateDocument.uri.fsPath, needPartOfUri.fsPath)
        // let newPath = needPartOfUri.fsPath.replace(getWorkspaceFolderPath() ?? "", '')

        let newClassData = `${partPair.partOfLine}\n\n${classData}`
        fs.writeFile(needPartOfUri.fsPath, newClassData, async (err) => {
            if (err) {
                vscode.window.showErrorMessage(`Failed to create file: ${err.message}`);
            }
            await insertPartLine(editor, partPair.partLine)
            openEditor(needPartOfUri.fsPath)
            replaceText(activateDocument.uri.fsPath, classData, '')
        });
    }
}




export function fileNameFormat(fileName: string): string {
    let language = vscode.window.activeTextEditor?.document.languageId
    let fileType = 'txt'
    switch (language) {
        case `dart`:
            fileName = toSnakeCase(fileName)
        default:
            break;
    }
    return fileName
}




export function getFileType(): string {
    let language = vscode.window.activeTextEditor?.document.languageId
    let fileType = 'txt'
    switch (language) {
        case 'yaml':
            fileType = 'yaml'
            break;
        case 'json':
            fileType = 'json'
            break;
        case 'xml':
            fileType = 'xml'
            break;
        case 'html':
            fileType = 'html'
            break;
        case 'css':
            fileType = 'css'
            break;
        case 'javascript':
            fileType = 'js'
            break;
        case 'typescript':
            fileType = 'ts'
            break;
        case 'markdown':
            fileType = 'md'
            break;
        case 'python':
            fileType = 'py'
            break;
        case 'java':
            fileType = 'java'
            break;
        case 'c':
            fileType = 'c'
            break;
        case `dart`:
            fileType = 'dart'
        default:
            break;
    }
    return fileType
}


async function searchMaxHiveIdxForText(): Promise<number> {
    const files = await vscode.workspace.findFiles('**/lib/**/*.dart');
    let maxId: number = 0;

    for (const file of files) {
        const document = await vscode.workspace.openTextDocument(file);
        const fileContent = document.getText();

        if (fileContent.includes('@HiveType(typeId:')) {
            const idMatch = fileContent.match(/@HiveType\(typeId: (\d+)/);
            if (!idMatch) {
                continue;
            }
            const typeId = parseInt(idMatch[1]);
            if (typeId > maxId) {
                maxId = typeId;
            }
        }
    }
    return maxId
}