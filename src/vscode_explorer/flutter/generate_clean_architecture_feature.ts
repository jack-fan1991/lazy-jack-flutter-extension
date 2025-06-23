
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
import { route_configuration_file_name, route_page_args_file_name } from './generate_route_temp';

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
            let dir = rootPath.split('lib/').pop()

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
                fs.writeFileSync(cubitState, getCubitStateTemplate(mainClass, featureName,dir));

                let dataModel = path.join(featurePath, `data/${name}_ui_model.dart`)
                fs.writeFileSync(dataModel, getDataModelsTemplate(mainClass));

                let useCase = getUseCaseTemplate(mainClass, featureName, dir);
                fs.writeFileSync(path.join(featurePath, `domain/${name}_useCase.dart`), useCase);

                let widgets = getWidgetsTemplate(isPages,mainClass, featureName, dir);
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
                        vscode.commands.executeCommand("command_create_routeConfiguration", mainClass, `${mainWidget}.routeName`, `import 'package:${APP.flutterLibName}${mainScreenPath.replace(getRootPath() + "/lib", "")}';`,mainWidget, toUpperCamelCase(mainClass));
                    }

                });


            } catch (err) {
                vscode.window.showErrorMessage('Failed to create feature');
            }
        }
    }));
}

function getMainTemplate(
  isPages: boolean,
  mainClass: string,
  featurePath: string,
  dir: string
) {
  const upperCase = toUpperCamelCase(mainClass);
  const camel = changeCase.camelCase(mainClass);
  const name = changeCase.snakeCase(mainClass);

  const endFix = isPages ? 'PageWidget' : 'ScreenWidget';
  const bodyEndFix = isPages ? 'ScreenWidget' : 'ViewWidget';

  const className = `${upperCase}${endFix}`;
  const bodyClassName = `${upperCase}${bodyEndFix}`;
  const cubit = changeCase.camelCase(`${upperCase}Cubit`);
  const useCase = changeCase.camelCase(`UseCase${upperCase}`);
  const argType = `Route${upperCase}Args`;

  return `
import 'package:flutter/material.dart';
import 'package:${APP.flutterLibName}/${dir}/${featurePath}/presentation/bloc/${name}_cubit.dart';
import 'package:${APP.flutterLibName}/${dir}/${featurePath}/presentation/widgets/${name}_widget.dart';
import 'package:${APP.flutterLibName}/${dir}/${featurePath}/domain/${name}_useCase.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:${APP.flutterLibName}/route/${route_page_args_file_name}';

class ${argType} extends PageArgs {
  const ${argType}() : super(
    routeName: ${className}.routeName,
  );
}

class ${className} extends StatefulWidget {
  static const routeName = '/${camel}';
  final ${argType} args;

  const ${className}({
    super.key,
    required this.args,
  });

  @override
  State<${className}> createState() => _${className}State();
}

class _${className}State extends State<${className}> {
  final ${upperCase}Cubit _${cubit} = ${upperCase}Cubit();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text("${className}"),
      ),
      body: SafeArea(
        child: ${bodyClassName}(
          ${cubit}: _${cubit},
          args: widget.args,
        ),
      ),
    );
  }
}
`;
}

function getCubitStateTemplate(mainClass: string, featurePath: string, dir: string) {
    let upperCase = toUpperCamelCase(mainClass);
    let name = changeCase.snakeCase(mainClass)
    return `import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:${APP.flutterLibName}/${dir}/${featurePath}/data/${name}_ui_model.dart';
part '${name}_state.freezed.dart';

@freezed
class ${upperCase}State with _$${upperCase}State {
  const factory ${upperCase}State.initial({required ${upperCase}UI ${name}UI}) = _Initial;
}

    
    `

}

function getCubitTemplate(mainClass: string, featurePath: string, dir: string) {
    let upperCase = toUpperCamelCase(mainClass);
    let name = changeCase.snakeCase(mainClass)
    let camel = changeCase.camelCase(mainClass);
    let useCase = changeCase.camelCase(`UseCase${upperCase}`); 
    return `import 'package:bloc/bloc.dart';
import 'package:${APP.flutterLibName}/${dir}/${featurePath}/presentation/bloc/${name}_state.dart';
import 'package:${APP.flutterLibName}/${dir}/${featurePath}/domain/${name}_useCase.dart';
import 'package:${APP.flutterLibName}/${dir}/${featurePath}/data/${name}_ui_model.dart';

class ${upperCase}Cubit extends Cubit<${upperCase}State> {
  final UseCase${upperCase} ${useCase} = UseCase${upperCase}();
  ${upperCase}Cubit() : super(${upperCase}State.initial(${name}UI: ${upperCase}UI()));

  Future<void> fetchData() async {
    try {
      /// emit(loadingState);
      final ${camel}Model = await ${useCase}.call();

      /// emit success state
      emit(${upperCase}State.initial(${name}UI: ${camel}Model));
    } catch (e) {
      /// emit error state
    }
  }
}

        `

}


function getDataModelsTemplate(mainClass: string) {
  let upperCase = toUpperCamelCase(mainClass);
  return `class ${upperCase}UI {
  ${upperCase}UI();
}
      `

}

// function getDataModelsTemplate(mainClass: string) {
//     let upperCase = toUpperCamelCase(mainClass);
//     return `
// class ${upperCase}UIModel {
//     ${upperCase}UIModel();
// }


//         `

// }

function getUseCaseTemplate(mainClass: string, featurePath: string, dir: string) {
    let upperCase = toUpperCamelCase(mainClass);
    let name = changeCase.snakeCase(mainClass);
    return `import 'package:${APP.flutterLibName}/${dir}/${featurePath}/data/${name}_ui_model.dart';
 
class UseCase${upperCase} {
  UseCase${upperCase}();

  Future<${upperCase}UI> call() async {
    await Future.delayed(const Duration(seconds: 1));
    return ${upperCase}UI();
  }  
}
        `

}

function getWidgetsTemplate(
  isPages: boolean,
  mainClass: string,
  featurePath: string,
  dir: string
) {
  const upperCase = toUpperCamelCase(mainClass);
  const cubit = changeCase.camelCase(`${upperCase}Cubit`);
  const state = changeCase.camelCase(`${upperCase}State`);
  const name = changeCase.snakeCase(mainClass);
  const argType = `Route${upperCase}Args`;

  const bodyEndFix = isPages ? 'ScreenWidget' : 'ViewWidget';
  const pathEndFix = isPages ? 'page' : 'screen';
  const className = `${upperCase}${bodyEndFix}`;

  return `import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:${APP.flutterLibName}/${dir}/${featurePath}/presentation/bloc/${name}_cubit.dart';
import 'package:${APP.flutterLibName}/${dir}/${featurePath}/presentation/bloc/${name}_state.dart';
import 'package:${APP.flutterLibName}/${dir}/${featurePath}/${name}_${pathEndFix}.dart';
import 'package:${APP.flutterLibName}/route/${route_page_args_file_name}';

class ${className} extends StatefulWidget {
  final ${upperCase}Cubit ${cubit};
  final ${argType} args;

  const ${className}({
    super.key,
    required this.${cubit},
    required this.args,
  });

  @override
  State<${className}> createState() => _${className}State();
}

class _${className}State extends State<${className}> {
  @override
  void initState() {
    super.initState();
    widget.${cubit}.fetchData(); // 可根據 args 呼叫
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<${upperCase}Cubit, ${upperCase}State>(
      bloc: widget.${cubit},
      listener: (context, ${state}) {
        // show dialog or effect
      },
      builder: (context, ${state}) {
        return Center(
          child: _LoadedWidget(args: widget.args),
        );
      },
    );
  }
}

class _LoadedWidget extends StatelessWidget {
  final ${argType} args;

  const _LoadedWidget({super.key, required this.args});

  @override
  Widget build(BuildContext context) {
    final ${state} = context.watch<${upperCase}Cubit>().state;
    return Text("${className} state => \${${state}.runtimeType}");
  }
}
`;
}