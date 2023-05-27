import path = require("path");
import { reFormat } from "../../utils/src/vscode_utils/activate_editor_utils";
import { getRelativePath, insertToEditor } from "../../utils/src/vscode_utils/editor_utils";
import * as vscode from 'vscode';

export function createPartOfLine(file1: string, file2: string, fileName: string | undefined = undefined): string {
    let relativePath = getRelativePath(file1, file2, fileName)
    if (relativePath.split('/')[0] != '..' || relativePath.split('/').length === 1) {
        relativePath = `./${relativePath}`;
    }
    return `part of '${relativePath}';`

}


export function findLastPartIdx(document: vscode.TextDocument) {
    let lines = document.getText().split(/\r?\n/)
    let lastPartLine = ''
    let insertIdx = 0
    for (let l of lines) {
        if (l.includes('import')) continue
        if (l.includes('part')) continue
        if (l.includes('as')) continue
        if (l === '') continue
        insertIdx = lines.indexOf(l) - 1;
        break
    }
    return insertIdx <0 ? 0 : insertIdx
}


export async function insertPartLine(editor: vscode.TextEditor, partLine: string) {
    let text = editor.document.getText()
    if (!text.includes(partLine)) {
        let insertIdx = await findLastPartIdx(editor.document)
        await insertToEditor( editor,partLine + '\n',new vscode.Position(insertIdx, 0))
    }
    reFormat()
}


export type PartPair = {
    partLine: string,
    partOfLine: string
}


export function createPartLine(file1: string, file2: string): PartPair {
    let relativePath = getRelativePath(file1, file2, path.basename(file1))
    if (relativePath.split('/')[0] != '..' || relativePath.split('/').length === 1) {
        relativePath = `./${relativePath}`;
    }
    let partOfLine = `part of '${relativePath}';`
    let partRelativePath = getRelativePath(file2, file1, path.basename(file2))
    if (partRelativePath.split('/')[0] != '..' || partRelativePath.split('/').length === 1) {
        partRelativePath = `./${partRelativePath}`;
    }
    let partLine = `part '${partRelativePath}';`
    return { partLine, partOfLine }

}