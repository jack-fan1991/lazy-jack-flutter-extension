import * as vscode from 'vscode';
import { EzCodeActionProviderInterface } from '../../code_action';
import * as fs from 'fs';
import path = require('path');
import { DartPartFixer, PartPair, createPartLine, insertPartLine } from '../dart_part_fixer';
import { FlutterOpenCloseFinder } from '../../../utils/src/regex/open_close_finder';
import { getActivateEditor, getActivateFileAsUri, getCursorLineText, getFolderPath, openEditor, replaceText } from '../../../utils/src/vscode_utils/editor_utils';
import { getActivateText } from '../../../utils/src/vscode_utils/activate_editor_utils';
import { findClassRegex, toSnakeCase } from '../../../utils/src/regex/regex_utils';

const flutterOpenCloseFinder = new FlutterOpenCloseFinder();



export class ExtractClassFixer implements EzCodeActionProviderInterface {

    getLangrageType(): vscode.DocumentSelector {
        return { scheme: 'file' }
    }

    public static readonly commandExtractClass = 'ExtractClassFixer.extract.class';
    // 編輯時對單行檢測
    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] | undefined {
        let cursorLineText = getCursorLineText()
        if (cursorLineText == undefined) return undefined
        let classRange = flutterOpenCloseFinder.findRange(document, range.start.line)
        if (classRange != undefined) {
            return [this.createAction(getActivateEditor()!, classRange)]
        }

    }

    createAction(editor: vscode.TextEditor, range: vscode.Range): vscode.CodeAction {
        let data = "Extract Class"
        const fix = new vscode.CodeAction(data, vscode.CodeActionKind.RefactorExtract);
        fix.command = { command: ExtractClassFixer.commandExtractClass, title: data, arguments: [editor, range] };
        fix.isPreferred = true;
        return fix;
    }

    // 註冊action 按下後的行為
    registerCommand(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.commands.registerCommand(ExtractClassFixer.commandExtractClass, async (editor: vscode.TextEditor, range: vscode.Range) => {
            let text = getActivateText(range)
            let match = text.match(findClassRegex)

            createFileInPicker(editor, undefined, match == null ? undefined : match[1], range)
            editor.document.save()

        })
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