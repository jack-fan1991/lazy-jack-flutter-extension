
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

const command_clean_architecture = "command_generate_flutter_page"

export function registerFlutterPageGenerate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(command_clean_architecture, async (folderUri) => {

        let featureName = await vscode.window.showInputBox({
            placeHolder: 'Enter Page name',
        });
        featureName = changeCase.snakeCase(featureName!)
        if (featureName) {
            const rootPath = folderUri.path;
            try {
         
                let mainClass = `${featureName}`;
                let upperCase = toUpperCamelCase(mainClass);

                let name = changeCase.snakeCase(mainClass);
                let mainScreenPath = path.join(rootPath, `${mainClass}_screen.dart`)
                
                fs.writeFileSync(mainScreenPath, getMainTemplate(mainClass));
                let cubit = path.join(mainScreenPath, `presentation/bloc/${name}_cubit.dart`)
         //open file
                const uri = vscode.Uri.file(mainScreenPath);
                await vscode.window.showTextDocument(uri);
                reFormat();
                let endFix = 'PageWidget'
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


function getMainTemplate(mainClass: string) {
    let upperCase = toUpperCamelCase(mainClass);
    let camel = changeCase.camelCase(mainClass);
    let name = changeCase.snakeCase(mainClass);
    let endFix = 'PageWidget'
   
    let className =`${upperCase}${endFix}`
    let cubit=changeCase.camelCase(`${upperCase}Cubit` )
    return `
import 'package:flutter/material.dart';


class ${className} extends StatefulWidget {
  static const routeName = '/${camel}';
  const ${className}({super.key});

  @override
  State<${className}> createState() => _${className}State();
}

class _${className}State extends State<${className}> {

  @override
  Widget build(BuildContext context) {
    return Scaffold(
          appBar: AppBar(
            title: Text("${className}"),
          ),
          body: SafeArea(
            child: Container(),
      ),
    );
  }
}

`

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

function getWidgetsTemplate(isPages:boolean,mainClass: string, featurePath: string, dir: string) {
    let upperCase = toUpperCamelCase(mainClass);
    let cubit=changeCase.camelCase(`${upperCase}Cubit` )
    let state=changeCase.camelCase(`${upperCase}State` )
    let name = changeCase.snakeCase(mainClass);
    let bodyEndFix = 'ViewWidget'
    if(isPages){
        bodyEndFix = 'ScreenWidget'
    }    
    let className =`${upperCase}${bodyEndFix}`
    return `import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:${APP.flutterLibName}/${dir}/${featurePath}/presentation/bloc/${name}_cubit.dart';
import 'package:${APP.flutterLibName}/${dir}/${featurePath}/presentation/bloc/${name}_state.dart';

class ${className} extends StatefulWidget {
  final ${upperCase}Cubit ${cubit};
  const ${className}({super.key, required this.${cubit}});

  @override
  State<${className}> createState() => _${className}State();
}

class _${className}State extends State<${className}> {
  @override
  void initState() {
    super.initState();
    widget.${cubit}.fetchData();
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => widget.${cubit},
      child: BlocConsumer<${toUpperCamelCase(cubit)}, ${toUpperCamelCase(state)}>(
        bloc: widget.${cubit},
        listener: (context, ${state}) => {
          // show dialog
        },
        builder: (context, ${state}) {
          return Center(
            child: _LoadedWidget(),
          );
        },
      ),
    );
  }
}

class _LoadedWidget extends StatelessWidget {
  const _LoadedWidget({
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final ${state} = context.watch<${toUpperCamelCase(cubit)}>().state;
    return Text("${className} state => \${${state}.runtimeType}");
  }
}

        `

}