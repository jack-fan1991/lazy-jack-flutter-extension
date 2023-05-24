import path = require("path");
import vscode = require("vscode");
import { logError } from "./icon";

export function isWindows(): boolean {
    return process.platform.startsWith('win');
}

export function convertPathIfWindow(path: string): string {
    try {
        if (isWindows()) {
            if (path.startsWith('\\')) {
                path = path.substring(1)
            }
            return path.replace(/\\/g, '/')
        }
        else {
            return path
        }
    }

    catch (e) {
        logError(e, false)
        return ''

    }
}

export function getRootPath() {
    let path = getWorkspacePath('')
    return convertPathIfWindow(path!);
}

export function getWorkspacePath(fileName: string): string | undefined {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        let filePath = path.join(
            `${vscode.workspace.workspaceFolders[0].uri.path}`,
            fileName
        );
        return convertPathIfWindow(filePath);
    }
}

export function getSelectedText() {
    let editor = vscode.window.activeTextEditor
    if (!editor)
        throw new Error('No active editor');
    let selection = editor.selection
    let text = editor.document.getText(selection)
    return text
}

export function getActivateText(range: vscode.Range | undefined = undefined) {
    let editor = vscode.window.activeTextEditor
    if (!editor)
        throw new Error('No active editor');
    if (range != null) {
        return editor.document.getText(range)
    }
    let text = editor.document.getText()
    return text
}

export function getActivateTextEditor() {
    let editor = vscode.window.activeTextEditor
    if (!editor)
        throw new Error('No active editor');
    return editor
}

export async function reFormat() {
    await vscode.commands.executeCommand('editor.action.formatDocument')
}


export function saveActivateEditor() {
    let editor = vscode.window.activeTextEditor
    if (!editor)
        throw new Error('No active editor');
    return editor.document.save()
}


export async function insertToActivateEditor(text: string, range: vscode.Position | undefined = undefined, msg: string | undefined = undefined) {
    await getActivateTextEditor().edit((editBuilder) => {
        if (msg) {
            vscode.window.showInformationMessage(msg)
        }
        editBuilder.insert(range ?? new vscode.Position(0, 0), text);
    })
}

export async function insertToEditor(editor: vscode.TextEditor, text: string, range: vscode.Position | undefined = undefined, msg: string | undefined = undefined) {
    await getActivateTextEditor().edit((editBuilder) => {
        if (msg) {
            vscode.window.showInformationMessage(msg)
        }
        editBuilder.insert(range ?? new vscode.Position(0, 0), text);

    })
    if (editor.document.isDirty) {
        await editor.document.save()
    }
}

export function openBrowser(url: string) {
    vscode.env.openExternal(vscode.Uri.parse(url));
}