import * as vscode from 'vscode';
import { FileListenerBase } from '../../vscode_file_listener/base_file_listener';
import { upperCase } from 'lodash';
import { toUpperCamelCase } from '../../utils/src/regex/regex_utils';
import { DartI18nCodeLensProvider, dartI18nCodeLensProvider } from './flutter_l10n_fix';



class DartFileItem extends vscode.TreeItem {
    constructor(
        public readonly uri: vscode.Uri,
        public readonly line: number,
        public readonly colStart: number,
        public readonly colEnd: number
    ) {
        super(vscode.workspace.asRelativePath(uri.fsPath), vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'dartFileItem';
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
    public ignoredFiles = new Set<string>();
    public filterDir:string = "";
    refresh(filterDir:string = "") {
        DartI18nCodeLensProvider.enable = true
        this.filterDir=filterDir
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
        this.items = []
        const pattern = this.filterDir!="" ?`${this.filterDir}/**/*.dart` : 'lib/**/*.dart';
        const files = await vscode.workspace.findFiles(pattern);
        const validFiles = files.filter(uri => {
            const name = uri.path.split('/').pop() || '';
            const dotCount = (name.match(/\./g) || []).length;
            return dotCount <= 1;
        });
        for (const uri of validFiles) {
            if (fileTreeProvider.ignoredFiles.has(uri.fsPath)) continue
            const doc = await vscode.workspace.openTextDocument(uri);
            const text = doc.getText();
            const lines = text.split('\n');

            lines.forEach((line, lineIndex) => {
                if (line.trim().startsWith('part') || line.trim().startsWith(`import`) || line.trim().startsWith(`export`) || line.trim() === "") return;
                // 移除所有空格
                let cleanLine = line.replace(/\s+/g, '');
                let isLog = cleanLine.startsWith('log') || cleanLine.startsWith('_log') || cleanLine.includes("Logger(");
                let isPrint = cleanLine.startsWith('print');
                let isComment = cleanLine.startsWith("//");
                let skip = cleanLine.startsWith("/@") || line.includes("@JsonKey(name:") || line.includes("@Default(") || line.includes("RegExp(") || cleanLine.includes("case")

                if (isLog || isPrint || isComment || skip) {
                    return
                }
                // let regex = /(["'])(?:(?!\1).)*?\1/g;
                let match: RegExpExecArray | null;
                let regex = /(["'])(?:(?!\1).)*?\1/g;
                while ((match = regex.exec(line)) !== null) {
                    const fullMatch = match[0];
                    const innerText = fullMatch.slice(1, -1);
                    let cleanInnerText = innerText.replace(/\s+/g, '');
                    const isRouteName = innerText.startsWith('/');
                    if (cleanInnerText === "" || isRouteName) return;
                    const colStart = match.index;
                    const colEnd = match.index + fullMatch.length;
                    const isPreFixOtherPattern = [`Key(`, `DateFormat(`, `fontFamily: `];
                    const isEndFixOtherPattern = [` =>`, `:`];
                    for (let pattern of isPreFixOtherPattern) {
                        let len = pattern.length
                        let contextStart = Math.max(0, colStart - len);
                        let beforeString = line.substring(contextStart, colStart);
                        if (beforeString == pattern) {
                            return
                        }
                    }
                    for (let pattern of isEndFixOtherPattern) {
                        let len = pattern.length
                        let contextEnd = Math.max(0, colEnd + len);
                        let endString = line.substring(colEnd, contextEnd);
                        if (endString == pattern) {
                            return
                        }

                    }
                    let isDuplicate = false;
                    this.items.forEach(item => {
                        if (item.uri.fsPath === uri.fsPath) {
                            isDuplicate = true;
                        }
                    });
                    if (isDuplicate) return;
                    this.items.push(
                        new DartFileItem(uri, lineIndex, colStart + 1, colEnd - 1)
                    );

                }
            });

        }
        this.items.sort((a, b) => a.uri.fsPath.localeCompare(b.uri.fsPath));
        this._onDidChangeTreeData.fire();
    }
}

const fileTreeProvider = new DartFileTreeProvider();

export function registerDartL10nStringAllFileTreeProvider(context: vscode.ExtensionContext) {
    vscode.window.registerTreeDataProvider('dartL10nFixViewAllFiles', fileTreeProvider); // ✅ 註冊新的 view

    vscode.commands.registerCommand('dartL10n.refresh', () => {
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


    vscode.commands.registerCommand('dartL10n.ignoreFile', (item: DartFileItem) => {
        fileTreeProvider.ignoredFiles.add(item.uri.fsPath);
        vscode.window.showInformationMessage(`Ignored: ${item.uri.fsPath}`);
        fileTreeProvider.refresh(fileTreeProvider.filterDir);
    });

    vscode.commands.registerCommand('dartL10n.clean', (item: DartFileItem) => {
        fileTreeProvider.ignoredFiles.clear();
        fileTreeProvider.refresh();
    });

    vscode.commands.registerCommand('dartL10n.filterDir', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return;

        const libUri = vscode.Uri.joinPath(workspaceFolders[0].uri, 'lib');
        try {
            const libStat = await vscode.workspace.fs.stat(libUri);
            if (!libStat) return;

            let currentPath = 'lib';
            let keepSelecting = true;

            while (keepSelecting) {
                const currentUri = vscode.Uri.joinPath(workspaceFolders[0].uri, currentPath);
                const dirs = await vscode.workspace.fs.readDirectory(currentUri);
                const subDirs = dirs
                    .filter(([name, type]) => type === vscode.FileType.Directory)
                    .map(([name]) => name);

                if (subDirs.length === 0) {
                    fileTreeProvider.filterDir = currentPath;
                    vscode.window.showInformationMessage(`Filter: ${currentPath}`);
                    fileTreeProvider.refresh(currentPath);
                    return;
                }

                const options = [
                    { label: '$(check) Use Current Directory', description: currentPath },
                    { label: '$(folder) Select Subdirectory...', description: 'Continue to select subdirectory' },
                    ...subDirs.map(dir => ({
                        label: dir,
                        description: `${currentPath}/${dir}`
                    }))
                ];

                const selected = await vscode.window.showQuickPick(options, {
                    placeHolder: `Select Directory (Current: ${currentPath})`,
                    canPickMany: false
                });

                if (!selected) {
                    return; // User cancelled selection
                }

                if (selected.label === '$(check) Use Current Directory') {
                    fileTreeProvider.filterDir = currentPath;
                    keepSelecting = false;
                } else if (selected.label === '$(folder) Select Subdirectory...') {
                    // Continue to next selection
                    continue;
                } else {
                    currentPath = `${currentPath}/${selected.label}`;
                }
            }

            if (fileTreeProvider.filterDir) {
                vscode.window.showInformationMessage(`Filtering directory: ${fileTreeProvider.filterDir}`);
                fileTreeProvider.refresh(fileTreeProvider.filterDir);
            }
        } catch (error) {
            vscode.window.showErrorMessage('Error accessing lib directory');
        }
    });
}