
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { get, template } from 'lodash';
import { toUpperCamelCase } from '../../utils/src/regex/regex_utils';
import { reFormat } from '../../utils/src/vscode_utils/activate_editor_utils';
import * as changeCase from "change-case";
import { APP } from '../../extension';
import { getRootPath } from '../../utils/src/vscode_utils/vscode_env_utils';


const command_clean_architecture = "command_add_clean_architecture_cubit"


function createIfDoesNotExist(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

export function registerCleanArchitectureCubitGenerate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(command_clean_architecture, async (folderUri) => {

        let featureName = await vscode.window.showInputBox({
            placeHolder: 'Enter bloc name',
        });
        featureName = changeCase.snakeCase(featureName!)
        if (featureName) {
            const rootPath = folderUri.path;
            let currentDir = rootPath.split('lib/').pop() //"presentation"
          
            const featurePath = path.dirname(rootPath) ;
            const isFolderPages = path.dirname(rootPath).endsWith('pages')
            try {
                await createIfDoesNotExist(featurePath);
                createIfDoesNotExist(path.join(featurePath, 'data'));
                createIfDoesNotExist(path.join(featurePath, 'domain'));
                createIfDoesNotExist(path.join(featurePath, 'presentation', 'bloc'));
                createIfDoesNotExist(path.join(featurePath, 'presentation', 'widgets'));
                let mainClass = `${featureName}`;
                let upperCase = toUpperCamelCase(mainClass);

                let name = changeCase.snakeCase(mainClass)
                // let mainScreenPath = path.join(featurePath, `${mainClass}_screen.dart`)
                // fs.writeFileSync(mainScreenPath, getMainTemplate(mainClass, featureName,dir));

                let mainScreenPath =path.join(featurePath, `presentation/widgets/${name}_widget.dart`)
                let replacePath = path.join(getRootPath(),"lib/")
                let libPath =featurePath.replace(replacePath,"")

                let widgets = getWidgetsTemplate(isFolderPages,mainClass, libPath,currentDir);
                fs.writeFileSync(mainScreenPath,widgets)
            

                let cubit = path.join(featurePath, `presentation/bloc/${name}_cubit.dart`)

                fs.writeFileSync(cubit, getCubitTemplate(mainClass, libPath,currentDir));
                
                let cubitState = path.join(featurePath, `presentation/bloc/${name}_state.dart`)
                fs.writeFileSync(cubitState, getCubitStateTemplate(mainClass,libPath));
                
                let dataModel = path.join(featurePath, `data/${name}_ui_model.dart`)
                fs.writeFileSync(dataModel, getDataModelsTemplate(mainClass));
                
                let useCase = getUseCaseTemplate(mainClass, libPath);
                fs.writeFileSync(path.join(featurePath, `domain/${name}_useCase.dart`), useCase);
                    //open file
                const uri = vscode.Uri.file(mainScreenPath);
                await vscode.window.showTextDocument(uri);
                reFormat();
              
            } catch (err) {
                vscode.window.showErrorMessage('Failed to create feature');
            }
        }
    }));
}


// function getMainTemplate(mainClass: string, featurePath: string,dir:string) {
//     let upperCase = toUpperCamelCase(mainClass);
//     let name = changeCase.dotCase(mainClass).replace(".", "-");

//     return `
// import 'package:flutter/material.dart';
// import 'package:flutter_bloc/flutter_bloc.dart';
// import 'package:${APP.flutterLibName}/${dir}/${featurePath}/presentation/bloc/${name}_cubit.dart';
// import 'package:${APP.flutterLibName}/${dir}/${featurePath}/presentation/widgets/${name}_widget.dart';

// class ${upperCase}Screen extends StatelessWidget {
//   static const routeName = '/${upperCase}';
//   const ${upperCase}Screen({super.key});

//   @override
//   Widget build(BuildContext context) {
//     final state = context.watch<${upperCase}Cubit>().state;
//     return Scaffold(
//       appBar: AppBar(
//         title: Text('${upperCase}'),
//       ),
//       body: ${upperCase}BodyWidget()
//     );
//   }
// }

// `

// }

function getCubitStateTemplate(mainClass: string,libPath: string) {
    let upperCase = toUpperCamelCase(mainClass);
    let name = changeCase.snakeCase(mainClass)
    return `
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:${APP.flutterLibName}/${libPath}/data/${name}_ui_model.dart';
part '${name}_state.freezed.dart';

@freezed
class ${upperCase}State with _$${upperCase}State {
    const factory ${upperCase}State.initial({required ${upperCase}UI ${name}UI}) = _Initial;

}

    
    `

}

function getCubitTemplate(mainClass: string, libPath: string,dir :string) {
    let upperCase = toUpperCamelCase(mainClass);
    let name = changeCase.snakeCase(mainClass);
    let camel = changeCase.camelCase(mainClass);
    return `import 'package:bloc/bloc.dart';
import 'package:${APP.flutterLibName}/${libPath}/presentation/bloc/${name}_state.dart';
import 'package:${APP.flutterLibName}/${libPath}/domain/${name}_useCase.dart';
import 'package:${APP.flutterLibName}/${libPath}/data/${name}_ui_model.dart';

class ${upperCase}Cubit extends Cubit<${upperCase}State> {
  final UseCase${upperCase} ${camel}UseCase = UseCase${upperCase}();
  ${upperCase}Cubit() 
      : super(
          ${upperCase}State.initial(${name}UI: ${upperCase}UI()),
        );

  Future<void> fetch${upperCase}Data() async {
    try {
      /// emit(loadingState);
      final ${camel}Model = await ${camel}UseCase.call();

      /// emit success state
      emit(${upperCase}State.initial(${name}UI: ${camel}Model));
    } catch (e) {
      // emit error state
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

function getUseCaseTemplate(mainClass: string, libPath: string) {
    let upperCase = toUpperCamelCase(mainClass);
    let name = changeCase.snakeCase(mainClass);
    return `import 'package:${APP.flutterLibName}/${libPath}/data/${name}_ui_model.dart';
 
class UseCase${upperCase} {
  UseCase${upperCase}();

  Future<${upperCase}UI> call() async {
    await Future.delayed(const Duration(seconds: 1));
    return ${upperCase}UI();
  }  
}
        `

}

function getWidgetsTemplate(isFolderPages:boolean, mainClass: string, libPath: string,dir :string) {
    let upperCase = toUpperCamelCase(mainClass);
    let name = changeCase.snakeCase(mainClass)
    let bodyEndFix = 'ViewWidget'
    if(isFolderPages){
        bodyEndFix = 'ScreenWidget'
    }
    let widgetName = `${upperCase}${bodyEndFix}`
    return `import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:${APP.flutterLibName}/${libPath}/presentation/bloc/${name}_cubit.dart';


class ${widgetName} extends StatelessWidget {
  const ${widgetName}({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<${upperCase}Cubit>().state;
    return const Center(
      child: Text('${widgetName}'),
    );
  }
}
        `

}