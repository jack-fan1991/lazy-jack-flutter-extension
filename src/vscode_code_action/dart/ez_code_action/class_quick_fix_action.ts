import * as vscode from 'vscode';
import { EzCodeActionProviderInterface } from '../../code_action';
import * as fs from 'fs';
import path = require('path');
import { BiggerOpenCloseFinder, FlutterOpenCloseFinder } from '../../../utils/src/regex/open_close_finder';
import { getActivateEditor, getActivateFileAsUri, getCursorLineText, getFolderPath, openEditor, replaceText } from '../../../utils/src/vscode_utils/editor_utils';
import { getActivateText, insertToActivateEditor, reFormat } from '../../../utils/src/vscode_utils/activate_editor_utils';
import { findClassRegex, toSnakeCase } from '../../../utils/src/regex/regex_utils';
import { logError, logInfo } from '../../../utils/src/logger/logger';
import { PartPair, createPartLine, insertPartLine } from '../../../helper/dart/part_utils';
import { APP } from '../../../extension';
import { find } from 'lodash';
import { sleep } from '../../../utils/src/vscode_utils/vscode_utils';

const flutterOpenCloseFinder = new FlutterOpenCloseFinder();



export class ClassQuickFix implements EzCodeActionProviderInterface {

    getLangrageType(): vscode.DocumentSelector {
        return { scheme: 'file' }
    }

    public static readonly commandExtractClass = 'ExtractClassFixer.jack.tools.extract.class';

    // 編輯時對單行檢測
    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] | undefined {
        let cursorLineText = getCursorLineText()
        if (cursorLineText == undefined) return undefined
        let classRange = flutterOpenCloseFinder.findRange(document, range.start.line)
        let actions: vscode.CodeAction[] = []
        let upLineText = document.lineAt(range.start.line - 1).text
        let nextLineText = document.lineAt(range.start.line + 1).text
        if (classRange != undefined) {
            cursorLineText =cursorLineText.replace("class _", "class ")
            let className = cursorLineText.match(findClassRegex)![1]
            actions.push(this.createExtractClassAction(getActivateEditor()!, classRange,className))
            return actions
        }

    }

    createExtractClassAction(editor: vscode.TextEditor, range: vscode.Range,className:string): vscode.CodeAction {
        let data = `Make "Class ${className}" as part of file`
        const fix = new vscode.CodeAction(data, vscode.CodeActionKind.RefactorMove);
        fix.command = { command: ClassQuickFix.commandExtractClass, title: data, arguments: [editor, range] };
        fix.isPreferred = true;
        return fix;
    }

    // 註冊action 按下後的行為
    setOnActionCommandCallback(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.commands.registerCommand(ClassQuickFix.commandExtractClass, async (editor: vscode.TextEditor, range: vscode.Range) => {
            let text = getActivateText(range)
            text =text.replace("class _", "class ")
            let match = text.match(findClassRegex)

            createFileInPicker(editor, undefined, match == null ? undefined : match[1], range)
            editor.document.save()

        }
        )
        )
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

