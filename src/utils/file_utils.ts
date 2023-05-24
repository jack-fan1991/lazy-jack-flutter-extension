import path = require('path');
import * as vscode from 'vscode';
import { existsSync, lstatSync, writeFile } from "fs";
import { logError, logInfo } from './icon';
import * as fs from 'fs';
import { convertPathIfWindow, getRootPath, reFormat } from './vscode_utils';
import { nameCheckerRegex, toSnakeCase } from './regex_utils';
import { openEditor } from './common';
import { DartPartFixer } from '../code_action/dart/dart_part_fixer';
import { type } from 'os';

export function getWorkspaceFolderPath(): string | undefined {
    let path = getActivateEditorFilePath()
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(path));
    if (workspaceFolder) {
        const workspaceFolderPath = workspaceFolder.uri.fsPath;
        return workspaceFolderPath
    }

}
/// 取得當前焦點編輯器文件名
export function getActivityEditorFileName(showFileType: boolean = false): string {
    let file = path.basename(getActivateEditorFilePath())
    logInfo('total file name: ' + file)
    return showFileType ? file : file.split('.')[0]
}

export function getActivateEditorFilePath(): string {
    let editor = vscode.window.activeTextEditor
    if (!editor)
        throw new Error('No active editor');
    return editor.document.fileName
}


export function getActivateEditorFileUri(): vscode.Uri {
    let editor = vscode.window.activeTextEditor
    if (!editor)
        throw new Error('No active editor');
    return editor.document.uri
}


export function getActivityEditor(): vscode.TextEditor {
    let editor = vscode.window.activeTextEditor
    if (!editor)
        throw new Error('No active editor');
    return editor
}

export function getActivityDocument(): vscode.TextDocument {
    return getActivityEditor().document;
}

export function getActivityUri(): vscode.Uri {
    return getActivityDocument().uri;
}

export function getActivityPath(fullPath: boolean = false): string {
    let path = fullPath ? getActivityUri().fsPath : getActivityUri().path;
    path = convertPathIfWindow(path)
    return path;
}

export function getActivityFileName(): string {
    return (getActivityPath().split('/').pop() ?? '').split('.')[0];
}


export function getActivityEditorFolder(): string {
    let editor = vscode.window.activeTextEditor
    if (!editor)
        throw new Error('No active editor');
    return getFolderPath(editor.document)
}

export function getAbsFilePath(uri: vscode.Uri): string {
    let path = uri.path
    let split = path.split(':')
    if (split.length > 1) {
        path = split[0].replace('/', '') + ':' + split[1]
    }
    return path
}

export function removeFolderPath(document: vscode.TextDocument) {
    let currentDir = path.dirname(document.fileName);
    return document.fileName.replace(currentDir, '')
}

export function getFolderPath(document: vscode.TextDocument): string {
    return path.dirname(convertPathIfWindow(document.fileName));
}

export function resolve(document: vscode.TextDocument): string {
    return path.dirname(convertPathIfWindow(document.fileName));
}


export async function createFile(
    targetPath: string,
    text: string,
) {
    if (existsSync(targetPath)) {
        throw Error(`$targetPath already exists`);
    }
    fs.openSync(targetPath, 'w');
    return new Promise<void>(async (resolve, reject) => {
        writeFile(
            targetPath,
            text,
            "utf8",
            (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();

            }
        );
    });
}


export function readFileToText(path: string) {
    if (!existsSync(path)) {
        throw Error(`readFileToText failed ${path} not exists`);
    }
    return fs.readFileSync(path, 'utf8')
}

export function isFileExist(filePath: string) {
    let root = getRootPath()
    if (!filePath.startsWith(root)) {
        filePath = path.join(root, filePath)
    }
    let exist = existsSync(filePath)
    return exist
}

export async function replaceText(filePath: string, searchValue: string, replaceValue: string): Promise<boolean> {
    // find yaml editor
    let editor = vscode.window.visibleTextEditors.find(e => e.document.fileName === filePath)
    if (!editor) {
        await vscode.workspace.openTextDocument(filePath).then(async (document) =>
            editor = await vscode.window.showTextDocument(document, vscode.ViewColumn.Beside, false).then(editor => editor))
    }
    if (!editor) {
        return false
    }
    // 修改yaml 中的 version
    const document = editor.document;
    const start = new vscode.Position(0, 0);
    const end = new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
    const textRange = new vscode.Range(start, end);
    const text = document.getText();
    const startIndex = text.indexOf(searchValue);
    if (startIndex !== -1) {
        const endIndex = startIndex + searchValue.length;
        const range = new vscode.Range(document.positionAt(startIndex), document.positionAt(endIndex));
        await editor.edit((editBuilder) => {
            editBuilder.replace(range, replaceValue);
        });

        editor.document.save()
        return true
    }
    else {
        logError(`replaceText filePath 中找不到${searchValue}`, true)
        return false

    }
}



export function replaceSelectionText(range: vscode.Range | undefined, replaceWith: (selectText: string) => string) {
    let editor = vscode.window.activeTextEditor
    if (!editor) {
        logError(`[No active editor]=> replaceSelectionText`, false)
        return
    }
    const selection = range ?? editor.selection;
    const text = editor.document.getText(selection);
    editor.edit(editBuilder => {
        let replaceText = replaceWith(text)
        editBuilder.replace(selection, replaceText)
    })
    reFormat()
}

export function getCursorLineText() {
    let editor = vscode.window.activeTextEditor
    if (!editor) {
        logError(`[No active editor]=> getCursorLineText`, false)
        return
    }
    const position = editor.selection.active;
    return editor.document.lineAt(position.line).text
}

// 找出游標所在的文字符合常用規範的文字
export function findNormalWordFormatFromCursor(): vscode.Range | undefined {
    let editor = vscode.window.activeTextEditor
    if (!editor) {
        logError(`[No active editor]=> getCursorWordText`, false)
        return
    }
    const position = editor.selection.active;
    const wordRange = getWordRangeAtPosition(editor.document, position)
    if (wordRange) {
        let word = editor.document.getText(wordRange);
        if (word.match(nameCheckerRegex)) {
            return wordRange
        }
        return undefined
    }
    return undefined
}




function getWordRangeAtPosition(document: vscode.TextDocument, position: vscode.Position): vscode.Range | undefined {
    const line = document.lineAt(position.line).text;
    let left = position.character - 1
    let right = position.character + 1
    let tryCount = 0
    while (true) {
        left--
        let leftRange = new vscode.Range(position.line, left, position.line, position.character);
        let text = document.getText(leftRange)
        // logInfo('text: ' + text, false)
        if (text.match(nameCheckerRegex) === null) {
            left++
            break
        }
        let preRange = new vscode.Range(position.line, left == 0 ? 0 : left + 1, position.line, position.character);
        if (text === document.getText(preRange)) {
            break
        }

    }
    tryCount = 0
    while (true) {
        right++
        let rightRange = new vscode.Range(position.line, left, position.line, right);
        let text = document.getText(rightRange)
        // logInfo('text: ' + text, false)
        if (text.match(nameCheckerRegex) === null) {
            right--
            break
        }
        let preRange = new vscode.Range(position.line, left, position.line, right + 1);
        if (text === document.getText(preRange)) {
            tryCount++
        }
        if (tryCount == 3) {
            break
        }
    }
    return new vscode.Range(position.line, left, position.line, right);
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



export function getRelativePath(file1: string, file2: string, fileName: string | undefined = undefined): string {
    file1 = file1.replace(/\\/g, '/')
    file2 = file2.replace(/\\/g, '/')
    const relativePath = vscode.workspace.asRelativePath(file1, true);
    const relativePath2 = vscode.workspace.asRelativePath(file2, true);
    const relate = path.relative(path.dirname(relativePath), path.dirname(relativePath2))
    if (fileName != undefined) {
        return path.join(relate, fileName).replace(/\\/g, '/')
    }
    return relate.replace(/\\/g, '/');
}


export function createPartOfLine(file1: string, file2: string, fileName: string | undefined = undefined): string {
    let relativePath = getRelativePath(file1, file2, fileName)
    if (relativePath.split('/')[0] != '..' || relativePath.split('/').length === 1) {
        relativePath = `./${relativePath}`;
    }
    return `part of '${relativePath}';`

}

