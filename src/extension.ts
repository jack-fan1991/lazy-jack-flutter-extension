import * as vscode from 'vscode'

import * as codeAction from './vscode_code_action/code_action';
import { registerEzAction } from './vscode_code_action/ez_code_action';
import { registerFileListener } from './vscode_file_listener/activate_file_listener';
import { registerCompletionItemProvider } from './vscode_completion_item_provider/completion_item_provider';
import { checkGitExtensionInYamlIfDart } from './utils/src/language_utils/dart/pubspec/analyze_dart_git_dependency';
import { registerGithubGuiCommand } from './vscode_views_welcome/git_gui';
import { registerJsonToFreezed } from './helper/dart/json_to_freezed/json_to_freezed';
import { registerGenerateAssert as registerGenerateSvg } from './vscode_explorer/flutter/generator_svg';
import { BaseTreeDataProvider } from './utils/src/vscode_feature/sidebar/sidebar_tree_provider';
import { GitDataProvider } from './vscode_sidebar/git_sidebar';
import { FlutterDataProvider } from './vscode_sidebar/flutter_sidebar';
import { ScriptsType, TreeScriptModel } from './utils/src/vscode_feature/sidebar/sidebar_model';
import { openBrowser } from './utils/src/vscode_utils/vscode_utils';
import { TypescriptDataProvider } from './vscode_sidebar/typescript_sidebar';
import { SidebarManager } from './utils/src/vscode_feature/sidebar/sidebar_manger';
import { registerDartSnippet } from './snippet/register_dart_snippet';
import { registerUpdateDependencyVersion } from './utils/src/language_utils/dart/pubspec/update_git_dependency';
let sidebarManger = new SidebarManager()


export async function activate(context: vscode.ExtensionContext) {
  console.log('your extension "Lazy-Jack" is now active!')
  checkGitExtensionInYamlIfDart(true)
  registerDartSnippet(context)
  registerGithubGuiCommand(context)
  // registerToRequireParams(context)
  registerJsonToFreezed(context)
  // registerCommandDartSelectedToFactory(context)
  registerGenerateSvg(context)
  registerUpdateDependencyVersion(context)
  codeAction.register(context)
  registerEzAction(context)
  registerFileListener(context)
  // 自動補全
  registerCompletionItemProvider(context)
  setupSideBar(context)
}


export function deactivate() { }

function setupSideBar(context: vscode.ExtensionContext) {
  sidebarManger.addSideBar(new TypescriptDataProvider())
    .addSideBar(new GitDataProvider())
    .addSideBar(new FlutterDataProvider())
    .registerSideBarCommands(context, "lazy-jack.sidebar_command_onselect")
    .registerSideBar(context)
}
