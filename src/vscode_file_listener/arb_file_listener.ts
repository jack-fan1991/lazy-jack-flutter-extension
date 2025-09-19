import * as vscode from 'vscode';
import { FileListenerBase } from './base_file_listener';
import { getActivateTextEditor } from '../utils/src/vscode_utils/activate_editor_utils';
import { isFlutterProject } from '../utils/src/language_utils/dart/pubspec/pubspec_utils';
import { logError } from '../utils/src/logger/logger';
import { runFlutterPubGet } from '../utils/src/common/lazy_common';
import { runTerminal } from '../utils/src/terminal_utils/terminal_utils';


class ArbFileListener extends FileListenerBase {
    constructor() {
        super();
    }
    onDidSaveTextDocument(): vscode.Disposable | undefined {
        return vscode.workspace.onDidSaveTextDocument(async (document) => {
            // Arb save auto run flutter pub get
            if (isFlutterProject()&&document.uri.path.endsWith('.arb')) {
                /// validate document text is json 
                try {
                    JSON.parse(document.getText())
                    sortArbKeys(document)
                    runTerminal('flutter gen-l10n');

                } catch (e) {
                    let fileName = document.uri.path.split('/').pop()
                    let message = `File ${fileName} has error Json format`
                    logError(message, true)
                }
            }
        })
    }
}

export const arbFileListener = new ArbFileListener()

export function sortArbKeysObject(
  arbObject: Record<string, any>
): Record<string, any> {
  // 所有 key
  const keys = Object.keys(arbObject);

  // 分類
  const atKeys = keys.filter(k => k.startsWith('@'));
  const normalKeys = keys.filter(k => !k.startsWith('@') && k !== 'appName');

  // 準備最終排序的 key 陣列
  const sortedKeys: string[] = [];

  // 先放 appName
  if (keys.includes('appName')) {
    sortedKeys.push('appName');
  }

  // 找出有對應 @key 的 normal key
  const matchedNormalKeys = new Set(atKeys.map(atKey => atKey.slice(1)));

  // 先加入沒有對應 @key 的 normal key（字母排序）
  const unmatchedNormalKeys = normalKeys
    .filter(key => !matchedNormalKeys.has(key))
    .sort((a, b) => a.localeCompare(b));
  sortedKeys.push(...unmatchedNormalKeys);

  // 最後處理 @key 與其對應的 normal key
  atKeys.sort((a, b) => a.localeCompare(b)).forEach(atKey => {
    const matchingKey = atKey.slice(1);
    if (normalKeys.includes(matchingKey)) {
      sortedKeys.push(matchingKey, atKey);
    } else {
      sortedKeys.push(atKey);
    }
  });

  // 依排序結果建立新物件
  const sortedObject: Record<string, any> = {};
  sortedKeys.forEach(key => {
    sortedObject[key] = arbObject[key];
  });

  return sortedObject;
}


export async function sortArbKeys(document: vscode.TextDocument): Promise<void> {
    try {
        const text = document.getText();
        const arbObject = JSON.parse(text);

        // 將keys分組：@開頭的、一般的、和appName
        const keys = Object.keys(arbObject);
        const atKeys = keys.filter(k => k.startsWith('@'));
        const normalKeys = keys.filter(k => !k.startsWith('@') && k !== 'appName');

        // 準備最終排序的key數組
        const sortedKeys: string[] = [];

        // 首先加入appName（如果存在）
        if (keys.includes('appName')) {
            sortedKeys.push('appName');
        }

        // 查找所有有對應@key的normal keys
        const matchedNormalKeys = new Set(atKeys.map(atKey => atKey.slice(1)));

        // 加入所有沒有對應@key的normal keys（按字母順序）
        const unmatchedNormalKeys = normalKeys
            .filter(key => !matchedNormalKeys.has(key))
            .sort((a, b) => a.localeCompare(b));
        sortedKeys.push(...unmatchedNormalKeys);

        // 最後加入@key組（@key和其對應的key）
        atKeys.sort((a, b) => a.localeCompare(b)).forEach(atKey => {
            const matchingKey = atKey.slice(1);
            if (normalKeys.includes(matchingKey)) {
                sortedKeys.push(matchingKey, atKey);
            } else {
                sortedKeys.push(atKey);
            }
        });

        // 創建排序後的對象
        const sortedObject: { [key: string]: any } = {};
        sortedKeys.forEach((key) => {
            sortedObject[key] = arbObject[key];
        });

        const sortedText = JSON.stringify(sortedObject, null, 2);
        if (text === sortedText) return;

        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(text.length)
        );

        edit.replace(document.uri, fullRange, sortedText);
        await vscode.workspace.applyEdit(edit);
    } catch (error) {
        console.error('Error sorting ARB keys:', error);
    }
}
