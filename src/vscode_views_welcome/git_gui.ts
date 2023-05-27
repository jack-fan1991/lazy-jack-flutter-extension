import exp = require('constants');
import * as vscode from 'vscode';
import { runCommand, runTerminal } from '../utils/src/terminal_utils/terminal_utils';


const command_open_github_repo = 'command_open_github_repo';
const command_open_github_actions = 'command_open_github_actions';
const command_open_github_wiki = 'command_open_github_wiki';
const command_open_sourcetree_local_repo = 'command_open_sourcetree_local_repo';


export function registerGithubGuiCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(command_open_github_repo, async () => {
        openGitHubBrowserAction(context, "repo");
    }));
    context.subscriptions.push(vscode.commands.registerCommand(command_open_github_actions, async () => {
        openGitHubBrowserAction(context, "actions");
    }));
    context.subscriptions.push(vscode.commands.registerCommand(command_open_github_wiki, async () => {
        openGitHubBrowserAction(context, "wiki");
    }));
    context.subscriptions.push(vscode.commands.registerCommand(command_open_sourcetree_local_repo, async () => {
        runTerminal("open -a SourceTree ./")
    }));
}

async function openGitHubBrowserAction(context: vscode.ExtensionContext, args: string) {
    const cwd = vscode.workspace.rootPath;
    let uri = await runCommand("cd " + cwd + " && git config --get remote.origin.url")
    uri = uri.replace("git@github.com:", "https://github.com/").split('.git')[0]
    switch (args) {
        case "repo":
            break
        case "pr":
            uri = uri + '/' + 'pulls'
            break
        case "actions":
        case "wiki":
            uri = uri + '/' + args
            break
    }
    vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(uri));

}
