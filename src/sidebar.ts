import * as vscode from 'vscode';
import { showInfo2OptionMessage, onFlutter, onGit, onTypeScript } from './utils/common';
import * as terminal_util from './utils/terminal_utils';
import * as github from './github/github_utils';
import * as ts from './typescript/ts_utils';
import { selectToUpdate } from './utils/dart/pubspec/analyze_dart_git_dependency';


export enum ScriptsType {
    terminal = 'terminal',
    command = 'command',
    browser = 'browser',
    customer = 'customer'

}
export const sidebar_command = "sidebar_command.onSelected";


const flutterScripts = [
    {
        scriptsType: ScriptsType.terminal,
        label: 'flutter pub get',
        script: 'flutter pub get',

    },
    {
        scriptsType: ScriptsType.terminal,
        label: 'Update git dependencies',
        script: 'Update flutter git dependencies',

    }
]

const buildRunnerScripts = [
    {
        scriptsType: ScriptsType.terminal,
        label: "build_runner build",
        script: 'flutter pub run build_runner build',
    },
    {
        scriptsType: ScriptsType.terminal,
        label: "build_runner delete build ",
        script: 'flutter pub run build_runner build --delete-conflicting-outputs',
    },
]

const npmScripts = [
    {
        scriptsType: ScriptsType.terminal,
        label: "npm run build",
        script: 'npm run build',
    },
]

const vsceScripts = [
    {
        scriptsType: ScriptsType.terminal,
        label: "vs code extension publish",
        script: 'vsce publish',
    },
]

const gitScripts = [

    {
        scriptsType: ScriptsType.terminal,
        label: "git force push",
        script: 'git push -f origin',
    },
    {
        scriptsType: ScriptsType.terminal,
        label: "git reflog",
        script: 'git reflog',
    }
]



// 树节点
/**
 * @description 重写每个节点
 */
export class SideBarEntryItem extends vscode.TreeItem {
    constructor(
        private version: string,
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState)
        this.tooltip = `${this.label}-${this.version}`
        // this.description = `${this.version}-${Math.ceil(Math.random() * 1000)}`
    }
}


export class FlutterTreeDataProvider implements vscode.TreeDataProvider<SideBarEntryItem> {

    constructor(private workspaceRoot?: string) { }
    getTreeItem(element: SideBarEntryItem): vscode.TreeItem {
        return element
    }
    getChildren(
        element?: SideBarEntryItem
    ): vscode.ProviderResult<SideBarEntryItem[]> {
        //子节点
        let childrenList: any[] = []
        let script = flutterScripts
        for (let index = 0; index < script.length; index++) {
            let item = new SideBarEntryItem(
                '1.0.0',
                script[index].label ?? script[index].script,
                vscode.TreeItemCollapsibleState.None
            )
            item.command = {
                command: sidebar_command, //命令id
                title: "run" + script[index].label + "on" + script[index].scriptsType ?? "showInformationMessage",
                arguments: [script[index]], //命令接收的参数
            }
            childrenList[index] = item
        }
        return Promise.resolve(onFlutter(() => childrenList, () => []));
    }

}


export class RunBuilderTreeDataProvider implements vscode.TreeDataProvider<SideBarEntryItem> {

    constructor(private workspaceRoot?: string) { }
    getTreeItem(element: SideBarEntryItem): vscode.TreeItem {
        return element
    }
    getChildren(
        element?: SideBarEntryItem
    ): vscode.ProviderResult<SideBarEntryItem[]> {

        //子节点
        let childrenList: any[] = []
        let script = buildRunnerScripts
        for (let index = 0; index < script.length; index++) {
            let item = new SideBarEntryItem(
                '1.0.0',
                script[index].label ?? script[index].script,
                vscode.TreeItemCollapsibleState.None
            )
            item.command = {
                command: sidebar_command, //命令id
                title: "run" + script[index].label + "on" + script[index].scriptsType ?? "showInformationMessage",
                arguments: [script[index]], //命令接收的参数
            }
            childrenList[index] = item
        }
        return Promise.resolve(onFlutter(() => childrenList, () => []));
    }

}
export class NpmTreeDataProvider implements vscode.TreeDataProvider<SideBarEntryItem> {

    constructor(private workspaceRoot?: string) { }
    getTreeItem(element: SideBarEntryItem): vscode.TreeItem {
        return element
    }
    getChildren(
        element?: SideBarEntryItem
    ): vscode.ProviderResult<SideBarEntryItem[]> {

        //子节点
        let childrenList: any[] = []
        let script = npmScripts
        for (let index = 0; index < script.length; index++) {
            let item = new SideBarEntryItem(
                '1.0.0',
                script[index].label ?? script[index].script,
                vscode.TreeItemCollapsibleState.None
            )
            item.command = {
                command: sidebar_command, //命令id
                title: "run" + script[index].label + "on" + script[index].scriptsType ?? "showInformationMessage",
                arguments: [script[index]], //命令接收的参数
            }
            childrenList[index] = item
        }
        return Promise.resolve(onTypeScript(() => childrenList, () => []));
    }

}
export class VscodeExtensionTreeDataProvider implements vscode.TreeDataProvider<SideBarEntryItem> {

    constructor(private workspaceRoot?: string) { }
    getTreeItem(element: SideBarEntryItem): vscode.TreeItem {
        return element
    }
    getChildren(
        element?: SideBarEntryItem
    ): vscode.ProviderResult<SideBarEntryItem[]> {
        //子节点
        let childrenList: any[] = []
        let script = vsceScripts
        for (let index = 0; index < script.length; index++) {
            let item = new SideBarEntryItem(
                '1.0.0',
                script[index].label ?? script[index].script,
                vscode.TreeItemCollapsibleState.None
            )
            item.command = {
                command: sidebar_command, //命令id
                title: "run" + script[index].label + "on" + script[index].scriptsType ?? "showInformationMessage",
                arguments: [script[index]], //命令接收的参数
            }
            childrenList[index] = item
        }
        return Promise.resolve(onTypeScript(() => childrenList, () => []));
    }

}


export class GitTreeDataProvider implements vscode.TreeDataProvider<SideBarEntryItem> {

    constructor(private workspaceRoot?: string) { }
    getTreeItem(element: SideBarEntryItem): vscode.TreeItem {
        return element
    }
    getChildren(
        element?: SideBarEntryItem
    ): vscode.ProviderResult<SideBarEntryItem[]> {
        //子节点
        let childrenList: any[] = []
        let script = gitScripts
        for (let index = 0; index < script.length; index++) {
            let item = new SideBarEntryItem(
                '1.0.0',
                script[index].label ?? script[index].script,
                vscode.TreeItemCollapsibleState.None
            )
            item.command = {
                command: sidebar_command, //命令id
                title: "run" + script[index].label + "on" + script[index].scriptsType ?? "showInformationMessage",
                arguments: [script[index]], //命令接收的参数
            }
            childrenList[index] = item
        }
        return Promise.resolve(onGit(() => childrenList, () => []));
    }

}
export function onTreeItemSelect(context: vscode.ExtensionContext, args: any) {
    console.log('[flutter-lazy-cmd] 選擇:', args)
    let scriptsType = args["scriptsType"];
    let script = args["script"];
    if (scriptsType == null) {
        vscode.window.showInformationMessage("No match key 'scriptsType' Only show => " + script)
        return
    }
    switch (scriptsType) {
        case ScriptsType.terminal:
            terminalAction(context, script)
            break;
        default:
            vscode.window.showInformationMessage("Only show => " + script)
    }
}

async function terminalAction(context: vscode.ExtensionContext, command: string) {
    console.log('[terminalAction] 選擇:', command)
    if (command.includes("Update flutter git dependencies")) {
        selectToUpdate()
        // github.updateFLutterGitExtension();
        return
    }
    if (command.includes("push -f")) {
        let branch = await terminal_util.runCommand("git rev-parse --abbrev-ref HEAD")
        let gitCommand = command + " " + branch
        showInfo2OptionMessage("你確定要執行 " + gitCommand, undefined, undefined, () => (
            terminal_util.runTerminal(gitCommand))
        );
        return;
    }
    if (command.includes("reflog")) {

        let terminal = vscode.window.createTerminal("reflog");

        createReflogOptionsInput(terminal)
        // inputBox.onDidAccept(() => {
        //     terminal.sendText("q");
        //     showInfo2OptionMessage(`你確定要 reset hard to ${inputBox.value}`, undefined, undefined, () => (
        //         terminal.sendText(`git reset --hard ${inputBox.value}`)
        //     )
        //     );
        // });


        vscode.window.onDidChangeActiveTerminal((terminal: vscode.Terminal | undefined) => {
            if (terminal && terminal.name === "reflog") {
                console.log("reflog Terminal is focused");
                terminal.sendText("q");
                terminal.sendText(command)
                createReflogOptionsInput(terminal)
            }
        });
        terminal.show();
        terminal.sendText(command)
        return;

    }
    if (command === 'vsce publish') {
        await ts.publishVsCodeExtension()
        return
    }
    vscode.window.showInformationMessage("執行 " + command)
    terminal_util.runTerminal(command);

    // showInfo2OptionMessage("你確定要執行 " + command, undefined, undefined, () => (
    //     terminal_util.runTerminal(context, command))

    // );

}

async function createReflogOptionsInput(terminal: vscode.Terminal) {
    const cwd = vscode.workspace.rootPath;
    let text = await terminal_util.runCommand(` cd ${cwd} && git reflog`)
    let regex = /^(\b[0-9a-f]{7,40}\b)\s(.*)/gm
    let matches = text.match(regex);
    let items = [];
    if (matches == undefined) {
        return
    }
    for (let match of matches) {
        let m = match.match(/^(\b[0-9a-f]{7,40}\b)\s(.*)/);;
        if (m == undefined) {
            return
        }
        items.push({ label: m[1], description: m[2] })
    }

    let quickPick = vscode.window.createQuickPick();
    quickPick.items = items;
    quickPick.placeholder = 'select reset hash';
    quickPick.onDidAccept(() => {
        let hash = quickPick.selectedItems[0].label
        console.log(`Selected item: ${hash}`);
        quickPick.dispose();
        terminal.sendText("q");
        showInfo2OptionMessage(`Hard reset  to ${hash}`, undefined, undefined, () => (
            terminal.sendText(`git reset --hard ${hash}`)
        )
        );
    });
    quickPick.show();
}


function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

