import { ExtensionContext, ProviderResult } from "vscode";
import { ScriptsType, SideBarEntryItem, TreeScriptModel } from "../utils/src/vscode_feature/sidebar/sidebar_model";
import { BaseTreeDataProvider } from "../utils/src/vscode_feature/sidebar/sidebar_tree_provider";
import { onDart, onTypeScript } from "../utils/src/language_utils/language_utils";
import { selectUpdateDependency } from "../utils/src/language_utils/dart/pubspec/analyze_dart_git_dependency";
import { publishVsCodeExtension } from "../helper/typescript/ts_utils";

const typeScriptScripts = [
    {
        scriptsType: ScriptsType.terminal,
        label: "npm run build",
        script: 'npm run build',
    },
    {
        scriptsType: ScriptsType.terminal,
        label: "vscode extension publish",
        script: 'vsce publish',
    }
]

export class TypescriptDataProvider extends BaseTreeDataProvider {
    supportScripts(): TreeScriptModel[] {
        return [...typeScriptScripts];
    }
    getChildren(element?: SideBarEntryItem): ProviderResult<SideBarEntryItem[]> {
        return Promise.resolve(onTypeScript(() =>super.getChildren(), () => []));
    }
    handleCommand(context: ExtensionContext, scriptModel: TreeScriptModel): void {
        if(scriptModel.script.includes("vsce publish") ){
            publishVsCodeExtension()
        }else{
            super.handleCommand(context, scriptModel);
        }
    }
}
