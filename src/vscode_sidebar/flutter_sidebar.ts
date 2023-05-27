import { ExtensionContext, ProviderResult } from "vscode";
import { ScriptsType, SideBarEntryItem, TreeScriptModel } from "../utils/src/vscode_feature/sidebar/sidebar_model";
import { BaseTreeDataProvider } from "../utils/src/vscode_feature/sidebar/sidebar_tree_provider";
import { onDart } from "../utils/src/language_utils/language_utils";
import { selectUpdateDependency } from "../utils/src/language_utils/dart/pubspec/analyze_dart_git_dependency";

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

    },
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

export class FlutterDataProvider extends BaseTreeDataProvider {
    supportScripts(): TreeScriptModel[] {
        return [...flutterScripts];
    }
    getChildren(): ProviderResult<SideBarEntryItem[]> {
        return Promise.resolve(onDart(() => super.getChildren(), () => []));
    }
    
    dispatchEvent(context: ExtensionContext, scriptModel: TreeScriptModel): void {
        if(scriptModel.script.includes("Update flutter git dependencies") ){
            selectUpdateDependency()
        }else{
            super.dispatchEvent(context, scriptModel);
        }
    }

}
