import { onGit } from "../utils/src/language_utils/language_utils";
import { runCommand, runTerminal } from "../utils/src/terminal_utils/terminal_utils";
import { ScriptsType, SideBarEntryItem, TreeScriptModel } from "../utils/src/vscode_feature/sidebar/sidebar_model";
import { BaseTreeDataProvider } from "../utils/src/vscode_feature/sidebar/sidebar_tree_provider";
import * as vscode from 'vscode';
import {  createBranch, createCheckout, createMergeNoFFInput, createReflogOptionsInput } from "./git_sidebar_action";


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
    },
    // {
    //     scriptsType: ScriptsType.customer,
    //     label: "git merge --no-ff",
    //     script: 'git merge',
    //     itemAction: ()=>  createMergeNoFFInput('git merge')
    // },
    {
        scriptsType: ScriptsType.customer,
        label: "git checkout",
        script: 'git checkout',
        itemAction: ()=>  createCheckout('git checkout')
    },
    {
        scriptsType: ScriptsType.customer,
        label: "git create branch",
        script: 'git create branch',
        itemAction: ()=>  createBranch('git create branch')
    },
    {
        scriptsType: ScriptsType.customer,
        label: "git status",
        script: 'git status',
        itemAction: ()=>   runTerminal(
            `git status`
        )
    }
    // ,
    // {
    //     scriptsType: ScriptsType.customer,
    //     label: "git tree",
    //     script: 'git tree',
    //     itemAction: ()=>   runTerminal(
    //         `git log --graph --pretty=oneline --abbrev-commit`
    //     )
    // }
]


export class GitDataProvider extends BaseTreeDataProvider {
    supportScripts(): TreeScriptModel[] {
        return [...gitScripts];

    }
    getChildren(element?: SideBarEntryItem): vscode.ProviderResult<SideBarEntryItem[]> {
        return Promise.resolve(onGit(() => super.getChildren(), () => []));
    }
}



