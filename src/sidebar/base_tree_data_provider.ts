import { ScriptsType, SideBarEntryItem } from "../sidebar";
import * as vscode from 'vscode';
import { runCommand, runTerminal } from "../utils/terminal_utils";
export const sidebar_command_onselect = 'lazyjack.sidebar.command.onselect';

export type Script = {
    scriptsType: ScriptsType;
    label: string;
    script: string;

};

 
export function parseScripts(scripts: Script[]): SideBarEntryItem[] {
    let childrenList: SideBarEntryItem[] = []
    for (let index = 0; index < scripts.length; index++) {
        let item = new SideBarEntryItem(
            '1.0.0',
            scripts[index].label ?? scripts[index].script,
            vscode.TreeItemCollapsibleState.None
        )
        item.command = {
            command: sidebar_command_onselect, //命令id
            title: "run" + scripts[index].label + "on" + scripts[index].scriptsType,
            arguments: [scripts[index]], //命令接收的参数
        }
        childrenList[index] = item
    }
    return childrenList
}

export class BaseTreeDataProvider implements vscode.TreeDataProvider<SideBarEntryItem> {
    readonly supportScripts: Script[] = []
    readonly providerLabel: string=''
    constructor(private workspaceRoot?: string) { }
    register(context : vscode.ExtensionContext){
        vscode.window.registerTreeDataProvider(this.providerLabel, this);
  
    }
    getTreeItem(element: SideBarEntryItem): vscode.TreeItem {
        return element
    }
    getChildren(): vscode.ProviderResult<SideBarEntryItem[]> {
        return []
    }
    handleCommand(context: vscode.ExtensionContext, script: Script) {
        let allScripts = this.supportScripts.map((item) => { return item.script })
        if (allScripts.includes(script.script)) {
            if (script.scriptsType == ScriptsType.terminal) {
                runTerminal(script.script)
            }
            else{
                runCommand(script.script)
            }
        }
    }
}
