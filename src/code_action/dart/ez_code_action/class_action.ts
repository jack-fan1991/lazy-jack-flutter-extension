import * as vscode from 'vscode';
import { EzCodeActionProviderInterface } from '../../code_action';
import { findClassRegex, } from '../../../utils/regex_utils';
import { getActivateText } from '../../../utils/vscode_utils';
import { FlutterOpenCloseFinder } from '../../../utils/open_close_finder';
import { getCursorLineText } from '../../../utils/file_utils';
import * as fileUtils from '../../../utils/file_utils';
import * as fs from 'fs';
import path = require('path');
import { DartPartFixer, PartPair, createPartLine, insertPartLine } from '../dart_part_fixer';
import { openEditor } from '../../../utils/common';

fileUtils.getCursorLineText();
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
            return [this.createAction(fileUtils.getActivityEditor()!, classRange)]
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
        defaultUri = fileUtils.getActivateEditorFileUri()
    } else if (fileName != null) {
        let folder = fileUtils.getFolderPath(vscode.window.activeTextEditor!.document)
        let file: string = fileUtils.fileNameFormat(fileName ?? "temp")
        file += `.${fileUtils.getFileType()}`
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
            fileUtils.replaceText(activateDocument.uri.fsPath, classData, '')
        });
    }
}


