import * as vscode from 'vscode';
import { FileListenerBase } from '../../vscode_file_listener/base_file_listener';
import { upperCase } from 'lodash';
import { toUpperCamelCase } from '../../utils/src/regex/regex_utils';



class DartFileItem extends vscode.TreeItem {
    constructor(
        public readonly uri: vscode.Uri,
        public readonly line: number,
        public readonly colStart: number,
        public readonly colEnd: number
    ) {
        super(vscode.workspace.asRelativePath(uri.fsPath), vscode.TreeItemCollapsibleState.None);
        this.command = {
            command: 'dartL10n.openFileAndReveal',
            title: 'Open Dart File with Reveal',
            arguments: [this]
        };
        this.resourceUri = uri;
    }
}

export class DartFileTreeProvider implements vscode.TreeDataProvider<DartFileItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    private items: DartFileItem[] = [];

    refresh() {
        this.scanDartFiles();
        /// remove duplicate
        this.items = this.items.filter((item, index, self) => {
            return self.findIndex(t => t.uri.fsPath === item.uri.fsPath) === index;
        });
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DartFileItem): vscode.TreeItem {
        return element;
    }

    getChildren(): vscode.ProviderResult<DartFileItem[]> {
        return this.items;
    }

    private async scanDartFiles() {
        this.items =[]
        const files = await vscode.workspace.findFiles('lib/**/*.dart');
        const validFiles = files.filter(uri => {
            const name = uri.path.split('/').pop() || '';
            const dotCount = (name.match(/\./g) || []).length;
            return dotCount <= 1;
        });
        for (const uri of validFiles) {
            const doc = await vscode.workspace.openTextDocument(uri);
            const text = doc.getText();
            const lines = text.split('\n');

            lines.forEach((line, lineIndex) => {
                if (line.trim().startsWith('part') || line.trim().startsWith(`import`) || line.trim() === "" ) return;
                // 移除所有空格
                let cleanLine = line.replace(/\s+/g, '');
                let isLog = cleanLine.startsWith('log') || cleanLine.startsWith('_log') || cleanLine.includes("Logger(");
                let isPrint = cleanLine.startsWith('print');
                let isComment = cleanLine.startsWith("//");
                let skip = cleanLine.startsWith("/@")||line.includes("@JsonKey(name:")||line.includes("@Default(") || line.includes("RegExp(")|| cleanLine.includes("case") 

                if (isLog || isPrint ||isComment||skip) {
                    return
                }
                // let regex = /(["'])(?:(?!\1).)*?\1/g;
                let match: RegExpExecArray | null;
                let regex = /(["'])(?:(?!\1).)*?\1/g;
                while ((match = regex.exec(line)) !== null) {
                    const fullMatch = match[0];
                    const innerText = fullMatch.slice(1, -1);
                    if (innerText === "") continue;
                    const colStart = match.index;
                    const colEnd = match.index + fullMatch.length;
                    let contextStart = Math.max(0, colStart - 4);
                    let beforeString = line.substring(contextStart, colStart);
                    const isKey = beforeString.includes('Key(');
                    let cleanInnerText = innerText.replace(/\s+/g, '');
                    if (isKey||cleanInnerText==="") {
                        return
                    }
                    contextStart = Math.max(0, colStart - 11);
                    beforeString = line.substring(contextStart, colStart);
                    const isDateTime = beforeString.includes('DateFormat(');
                    const isRouteName = innerText.startsWith('/');
                    if (isDateTime || isRouteName) {
                        return
                    }
                    let isDuplicate = false;
                    this.items.forEach(item => {
                        if (item.uri.fsPath === uri.fsPath) {
                            isDuplicate = true;
                        }
                    });
                    if (isDuplicate) return;
                    this.items.push(
                        new DartFileItem(uri, lineIndex, colStart+1, colEnd-1)
                    );

                }
            });

        }

        this._onDidChangeTreeData.fire();
    }
}

const fileTreeProvider = new DartFileTreeProvider();

export function registerDartL10nStringAllFileTreeProvider(context: vscode.ExtensionContext) {
    vscode.window.registerTreeDataProvider('dartL10nFixViewAllFiles', fileTreeProvider); // ✅ 註冊新的 view

    vscode.commands.registerCommand('dartL10n.findAllFiles', () => {
        fileTreeProvider.refresh(); // ✅ 重新掃描檔案
    });

    vscode.commands.registerCommand('dartL10n.openFileAndReveal', async (item: DartFileItem) => {
        const doc = await vscode.workspace.openTextDocument(item.uri);
        const editor = await vscode.window.showTextDocument(doc, { preview: false });
    
        const startPos = new vscode.Position(item.line, item.colStart);
        const endPos = new vscode.Position(item.line, item.colEnd);
        editor.selection = new vscode.Selection(startPos, endPos);
        editor.revealRange(new vscode.Range(startPos, endPos), vscode.TextEditorRevealType.InCenter);
    });
}