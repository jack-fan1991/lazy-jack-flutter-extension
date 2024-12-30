
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { get, template } from 'lodash';
import { toUpperCamelCase } from '../../utils/src/regex/regex_utils';
import { reFormat } from '../../utils/src/vscode_utils/activate_editor_utils';
import * as changeCase from "change-case";
import { APP } from '../../extension';
import { getRootPath } from '../../utils/src/vscode_utils/vscode_env_utils';
import { showInfo } from '../../utils/src/logger/logger';

const command_clean_architecture = "command_clean_architecture"

export function registerCleanArchitectureGenerate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(command_clean_architecture, async (folderUri) => {

        let featureName = await vscode.window.showInputBox({
            placeHolder: 'Enter feature name',
        });
        featureName = changeCase.snakeCase(featureName!)
        if (featureName) {
            const rootPath = folderUri.path;
            let isPages = rootPath.endsWith('pages');
            let dir = rootPath.split('/').pop()

            const featurePath = path.join(rootPath, featureName);
            try {
                await fs.mkdirSync(featurePath);
                fs.mkdirSync(path.join(featurePath, 'data'));
                fs.mkdirSync(path.join(featurePath, 'domain'));
                fs.mkdirSync(path.join(featurePath, 'presentation'));
                fs.mkdirSync(path.join(featurePath, 'presentation', 'bloc'));
                fs.mkdirSync(path.join(featurePath, 'presentation', 'widgets'));
                let mainClass = `${featureName}`;
                let upperCase = toUpperCamelCase(mainClass);

                let name = changeCase.snakeCase(mainClass);
                let mainScreenPath = path.join(featurePath, `${mainClass}_screen.dart`)
                if(isPages){
                    mainScreenPath = path.join(featurePath, `${mainClass}_page.dart`)
                }
                fs.writeFileSync(mainScreenPath, getMainTemplate(isPages,mainClass, featureName, dir));
                let cubit = path.join(featurePath, `presentation/bloc/${name}_cubit.dart`)

                fs.writeFileSync(cubit, getCubitTemplate(mainClass, featureName, dir));

                let cubitState = path.join(featurePath, `presentation/bloc/${name}_state.dart`)
                fs.writeFileSync(cubitState, getCubitStateTemplate(mainClass, featureName));

                let dataModel = path.join(featurePath, `data/${name}_model.dart`)
                fs.writeFileSync(dataModel, getDataModelsTemplate(mainClass));

                let useCase = getUseCaseTemplate(mainClass, featureName, dir);
                fs.writeFileSync(path.join(featurePath, `domain/${name}_useCase.dart`), useCase);

                let widgets = getWidgetsTemplate(isPages,mainClass);
                fs.writeFileSync(path.join(featurePath, `presentation/widgets/${name}_widget.dart`), widgets)
                //open file
                const uri = vscode.Uri.file(mainScreenPath);
                await vscode.window.showTextDocument(uri);
                reFormat();
                let endFix = 'ScreenWidget'
                if(isPages){
                    endFix = 'PageWidget'
                }
                let mainWidget =`${upperCase}${endFix}`
                vscode.window.showInformationMessage(`💡 Register ${upperCase}Screen as route ?`, 'Yes', 'No').then((value) => {
                    if (value === 'Yes') {
                        vscode.commands.executeCommand("command_create_routeConfiguration", mainClass, `${mainWidget}.routeName`, `import 'package:${APP.flutterLibName}${mainScreenPath.replace(getRootPath() + "/lib", "")}';`, `${mainWidget}`);
                    }

                });


            } catch (err) {
                vscode.window.showErrorMessage('Failed to create feature');
            }
        }
    }));
}


function getMainTemplate(isPages:boolean,mainClass: string, featurePath: string, dir: string) {
    let upperCase = toUpperCamelCase(mainClass);
    let camel = changeCase.camelCase(mainClass);
    let name = changeCase.snakeCase(mainClass);
    let endFix = 'ScreenWidget'
    if(isPages){
        endFix = 'PageWidget'
    }
    let bodyEndFix = 'ViewWidget'
    if(isPages){
        bodyEndFix = 'ScreenWidget'
    }
    return `
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:${APP.flutterLibName}/${dir}/${featurePath}/presentation/bloc/${name}_cubit.dart';
import 'package:${APP.flutterLibName}/${dir}/${featurePath}/presentation/widgets/${name}_widget.dart';

class ${upperCase}${endFix} extends StatelessWidget {
  static const routeName = '/${camel}';
  const ${upperCase}${endFix}({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<${upperCase}Cubit>().state;
    return Scaffold(
      appBar: AppBar(
        title: Text('${upperCase}'),
      ),
      body: ${upperCase}${bodyEndFix}()
    );
  }
}

`

}

function getCubitStateTemplate(mainClass: string, featurePath: string) {
    let upperCase = toUpperCamelCase(mainClass);
    let name = changeCase.snakeCase(mainClass)
    return `
import 'package:freezed_annotation/freezed_annotation.dart';
part '${name}_state.freezed.dart';

@freezed
class ${upperCase}State with _$${upperCase}State {
    const factory ${upperCase}State.initial() = _Initial;
}

    
    `

}

function getCubitTemplate(mainClass: string, featurePath: string, dir: string) {
    let upperCase = toUpperCamelCase(mainClass);
    let name = changeCase.snakeCase(mainClass)
    let camel = changeCase.camelCase(mainClass);
    return `
import 'package:bloc/bloc.dart';
import 'package:${APP.flutterLibName}/${dir}/${featurePath}/presentation/bloc/${name}_state.dart';
import 'package:${APP.flutterLibName}/${dir}/${featurePath}/domain/${name}_useCase.dart';
 

class ${upperCase}Cubit extends Cubit<${upperCase}State> {
    final UseCase${upperCase} ${camel}UseCase;
    ${upperCase}Cubit(this.${camel}UseCase) : super(const ${upperCase}State.initial());

    Future<void> fetch${upperCase}Data() async {
        try {
            /// emit(loadingState);
            final ${camel}Model = await ${camel}UseCase.call();
            /// emit success state
        } catch (e) {
            /// emit error state
        }
    }
}

        `

}




function getDataModelsTemplate(mainClass: string) {
    let upperCase = toUpperCamelCase(mainClass);
    return `
class ${upperCase}UIModel {
    ${upperCase}UIModel();
}


        `

}

function getUseCaseTemplate(mainClass: string, featurePath: string, dir: string) {
    let upperCase = toUpperCamelCase(mainClass);
    let name = changeCase.snakeCase(mainClass);
    return `
import 'package:${APP.flutterLibName}/${dir}/${featurePath}/data/${name}_model.dart';
 
class UseCase${upperCase} {
    UseCase${upperCase}();

    Future<${upperCase}UIModel> call() async {
        return ${upperCase}UIModel();
    }
    
}


        `

}

function getWidgetsTemplate(isPages:boolean,mainClass: string) {
    let upperCase = toUpperCamelCase(mainClass);
    let bodyEndFix = 'ViewWidget'
    if(isPages){
        bodyEndFix = 'ScreenWidget'
    }    return `
import 'package:flutter/material.dart';

class ${upperCase}${bodyEndFix} extends StatelessWidget {
  const ${upperCase}${bodyEndFix}({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Text('${upperCase}${bodyEndFix}'),
    );
  }
}


        `

}