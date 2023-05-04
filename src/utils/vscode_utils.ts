import path = require("path");
import vscode = require("vscode");

export function isWindows(): boolean {
    return process.platform.startsWith('win');
}

export function convertPathIfWindow(path: string): string {
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

export function getActivateText() {
    let editor = vscode.window.activeTextEditor
    if (!editor)
        throw new Error('No active editor');
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
