import * as vscode from 'vscode';
import * as path from 'path';
import { CustomCubitConfig } from '../../config/custom_cubit_config_provider';

interface ReplaceOptions {
    lineNumber?: number;
}

/**
 * 將檔案中的 Cubit 繼承改為自訂 Cubit，並移除原本 State 依賴。
 */
export async function replaceCubitWithCustom(
    document: vscode.TextDocument,
    cubitConfig: CustomCubitConfig,
    options?: ReplaceOptions,
): Promise<boolean> {
    const line = resolveCubitLine(document, options?.lineNumber);
    if (!line) {
        vscode.window.showWarningMessage('找不到可替換的 Cubit 宣告');
        return false;
    }

    const classMatch = line.text.match(/class\s+\w+\s+extends\s+Cubit<(\w+)>/);
    if (!classMatch) {
        vscode.window.showWarningMessage('目前 Cubit 宣告不符合預期格式');
        return false;
    }

    const stateName = classMatch[1];
    const uiModelName = stateName.replace(/State$/, 'UiModel');
    const stateFileName = toSnakeCase(stateName) + '.dart';

    const edit = new vscode.WorkspaceEdit();

    // 1. 更新 Cubit 繼承
    const nextClassText = line.text.replace(
        `Cubit<${stateName}>`,
        `${cubitConfig.name}<${uiModelName}>`
    );
    edit.replace(document.uri, line.range, nextClassText);

    // 2. 移除 state 檔案 import
    const stateImportPattern = stateFileName.replace('.', '\\.');
    const importRegex = new RegExp(`import\\s+['"].*${stateImportPattern}['"];`);
    for (let i = 0; i < document.lineCount; i++) {
        const currentLine = document.lineAt(i);
        if (importRegex.test(currentLine.text)) {
            edit.delete(document.uri, currentLine.rangeIncludingLineBreak);
            break;
        }
    }

    // 3. 新增自訂 Cubit 的 import
    addImportIfNeeded(document, edit, cubitConfig.import);

    // 4. 套用變更
    const applied = await vscode.workspace.applyEdit(edit);
    if (!applied) {
        vscode.window.showErrorMessage('無法套用自訂 Cubit 變更');
        return false;
    }
    await document.save();

    // 5. 刪除 state 檔案
    const stateFilePath = path.join(path.dirname(document.uri.fsPath), stateFileName);
    try {
        await vscode.workspace.fs.delete(vscode.Uri.file(stateFilePath));
    } catch (error) {
        vscode.window.showWarningMessage(`刪除 ${stateFileName} 失敗: ${(error as Error).message}`);
    }

    return true;
}

function resolveCubitLine(document: vscode.TextDocument, lineNumber?: number): vscode.TextLine | undefined {
    if (typeof lineNumber === 'number') {
        return document.lineAt(lineNumber);
    }

    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        if (line.text.includes('extends Cubit')) {
            return line;
        }
    }
    return undefined;
}

function addImportIfNeeded(document: vscode.TextDocument, edit: vscode.WorkspaceEdit, importPath: string) {
    const importStatement = normalizeImportStatement(importPath);
    if (!importStatement) return;

    const importValue = extractImportPath(importStatement);
    if (!importValue) return;

    const existingImportRegex = new RegExp(`import\\s+['"]${escapeRegExp(importValue)}['"];`, 'm');
    if (existingImportRegex.test(document.getText())) {
        return;
    }

    const insertPosition = findImportInsertPosition(document);
    const isFileStart = insertPosition.line === 0 && insertPosition.character === 0;
    const insertText = `${isFileStart ? '' : '\n'}${importStatement}\n`;

    edit.insert(document.uri, insertPosition, insertText);
}

function findImportInsertPosition(document: vscode.TextDocument): vscode.Position {
    let lastImportLine = -1;
    for (let i = 0; i < document.lineCount; i++) {
        const trimmed = document.lineAt(i).text.trim();
        if (trimmed.startsWith('import ')) {
            lastImportLine = i;
        }
    }

    if (lastImportLine >= 0) {
        return document.lineAt(lastImportLine).range.end;
    }

    return new vscode.Position(0, 0);
}

function normalizeImportStatement(rawImport: string): string {
    const trimmed = rawImport.trim();
    if (!trimmed) return '';

    if (trimmed.startsWith('import ')) {
        return trimmed.endsWith(';') ? trimmed : `${trimmed};`;
    }

    const cleaned = trimmed.replace(/^['"]|['"]$/g, '');
    if (!cleaned) return '';

    return `import '${cleaned}';`;
}

function extractImportPath(importStatement: string): string | undefined {
    const match = importStatement.match(/import\s+['"](.+)['"];$/);
    return match ? match[1] : undefined;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toSnakeCase(value: string): string {
    return value
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase();
}
