import * as vscode from 'vscode'

import * as codeAction from './vscode_code_action/code_action';
import { registerEzAction } from './vscode_code_action/ez_code_action';
import { registerFileListener } from './vscode_file_listener/activate_file_listener';
import { registerCompletionItemProvider } from './vscode_completion_item_provider/completion_item_provider';
import { checkGitExtensionInYamlIfDart } from './utils/src/language_utils/dart/pubspec/analyze_dart_git_dependency';
import { registerGithubGuiCommand } from './vscode_views_welcome/git_gui';
import { registerGenerateAssert as registerGenerateSvg } from './vscode_explorer/flutter/generator_svg';
import { BaseTreeDataProvider } from './utils/src/vscode_feature/sidebar/sidebar_tree_provider';
import { GitDataProvider } from './vscode_sidebar/git_sidebar';
import { FlutterDataProvider } from './vscode_sidebar/flutter_sidebar';
import { ScriptsType, TreeScriptModel } from './utils/src/vscode_feature/sidebar/sidebar_model';
import { openBrowser } from './utils/src/vscode_utils/vscode_utils';
import { TypescriptDataProvider } from './vscode_sidebar/typescript_sidebar';
import { VscodeDataProvider } from './vscode_sidebar/vscode_sidebar';
import { SidebarManager } from './utils/src/vscode_feature/sidebar/sidebar_manger';
import { registerDartSnippet } from './snippet/register_dart_snippet';
import { registerUpdateDependencyVersion } from './utils/src/language_utils/dart/pubspec/update_git_dependency';
import { registerToRequireParams } from './helper/dart/to_require_params';
import { log } from 'console';
import { updateGitSubModule } from './utils/src/language_utils/dart/pubspec/update_git_submodule';
import { registerCleanArchitectureGenerate } from './vscode_explorer/flutter/generate_clean_architecture_feature';
import { registerQuickFix } from './vscode_code_action/code_action';
import { getPubspecLockAsMap } from './utils/src/language_utils/dart/pubspec/pubspec_utils';
import { registerToGqlFragmentToDart } from './vscode_explore_menu/graphql_fragment_to_typedef';
import { registerCreateRouteConfiguration } from './vscode_explorer/flutter/generate_route_temp';
import { registerCleanArchitectureCubitGenerate } from './vscode_explorer/flutter/generate_clean_architecture_cubit';
import { registerFlutterPageGenerate } from './vscode_explorer/flutter/generate_flutter_page';
import { runCommand } from './utils/src/terminal_utils/terminal_utils';
import { registerDartL10nStringFix } from './vscode_code_len_provider/l10n/flutter_l10n_fix';
import { registerDartL10nStringTreeProvider } from './vscode_code_len_provider/l10n/dart_i10n_fix_listener';
let sidebarManger = new SidebarManager()
export class APP {
  public static pubspecYaml: any | undefined = undefined;
  public static pubspecLockYaml: any | undefined = undefined;
  public static depOnBloc: any | undefined = undefined;
  public static depOhive: any | undefined = undefined;
  public static flutterLibName: any | undefined = undefined;
  public static flutterLocalizations: any | undefined = undefined;
  public static myName = "";
  public static depOnLogging: any | undefined = undefined;

}

export async function activate(context: vscode.ExtensionContext) {
  registerToGqlFragmentToDart(context)

  console.log('your extension "Lazy-Jack" is now active!')
  updateGitSubModule(context)
  await checkGitExtensionInYamlIfDart(true).then(async (yaml) => {
    APP.pubspecYaml = yaml
    APP.myName = await runCommand("whoami")
    APP.myName = APP.myName.replace("\n", "")
    if (yaml != undefined) {
      APP.pubspecLockYaml = await getPubspecLockAsMap()
      APP.depOnBloc = APP.pubspecYaml["dependencies"]["flutter_bloc"] != undefined
      APP.depOhive = APP.pubspecYaml["dependencies"]["hive"] != undefined
      APP.flutterLibName = APP.pubspecYaml["name"]
      APP.flutterLocalizations = APP.pubspecYaml["dependencies"]["flutter_localizations"]
      APP.depOnLogging = APP.pubspecYaml["dependencies"]["color_logging"]

      log(APP.pubspecYaml)
      registerCreateRouteConfiguration(context)
      registerDartSnippet(context)
      registerToRequireParams(context)

    }

  })
  registerGithubGuiCommand(context)

  // registerCommandDartSelectedToFactory(context)
  registerUpdateDependencyVersion(context)
  // codeAction.register(context)
  registerEzAction(context)
  registerFileListener(context)
  registerQuickFix(context)
  // 自動補全
  registerCompletionItemProvider(context)
  setupSideBar(context)

  //側邊欄擴展
  registerGenerateSvg(context)
  registerCleanArchitectureGenerate(context)
  registerCleanArchitectureCubitGenerate(context)
  registerFlutterPageGenerate(context)
  // 列出為多國的字串
  registerDartL10nStringFix(context)
  registerDartL10nStringTreeProvider(context)
  
}


export function deactivate() { }

function setupSideBar(context: vscode.ExtensionContext) {
  sidebarManger.addSideBar(new TypescriptDataProvider())
    .addSideBar(new GitDataProvider())
    .addSideBar(new FlutterDataProvider())
    .addSideBar(new VscodeDataProvider())
    .registerSideBarCommands(context, "lazy-jack.sidebar_command_onselect")
    .registerSideBar(context)
}




