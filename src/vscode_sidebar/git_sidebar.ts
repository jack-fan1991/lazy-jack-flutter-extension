import { onGit } from "../utils/src/language_utils/language_utils";
import { runCommand, runTerminal } from "../utils/src/terminal_utils/terminal_utils";
import { ScriptsType, SideBarEntryItem, TreeScriptModel } from "../utils/src/vscode_feature/sidebar/sidebar_model";
import { BaseTreeDataProvider } from "../utils/src/vscode_feature/sidebar/sidebar_tree_provider";
import * as vscode from 'vscode';
import {  createReflogOptionsInput } from "./git_sidebar_action";


const gitScripts: TreeScriptModel[] = [

    {
        scriptsType: ScriptsType.terminal,
        label: "git force push",
        script: 'git push -f origin',
    },
    {
        scriptsType: ScriptsType.customer,
        label: "git reflog",
        script: 'git reflog',
        itemAction: ()=>  createReflogOptionsInput('git reflog')
    }
]

export class GitDataProvider extends BaseTreeDataProvider {
    supportScripts(): TreeScriptModel[] {
        return [...gitScripts];

    }
    getChildren(element?: SideBarEntryItem): vscode.ProviderResult<SideBarEntryItem[]> {
        return Promise.resolve(onGit(() => super.getChildren(), () => []));
    }
}



