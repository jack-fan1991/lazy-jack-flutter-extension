import * as vscode from 'vscode';
import * as fs from 'fs';
import { APP } from '../extension';
import { toLowerCamelCase, toUpperCamelCase } from '../utils/src/regex/regex_utils';

const command_graphql_code_gen_fragment_to_dart_type_def = "graphql_code_gen_fragment_to_dart_type_def"


export function registerToGqlFragmentToDart(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(command_graphql_code_gen_fragment_to_dart_type_def, async (folderUri) => {
        /// list files in folder
        let a = folderUri
        let folder = folderUri.fsPath.split('/').pop()
        let files = await vscode.workspace.findFiles(`lib/${folder}/*.dart`)
        let packageName = APP.pubspecYaml['name']
        let imports: string[] = [`import 'package:freezed_annotation/freezed_annotation.dart';`]
        let typeDefs: string[] = []
        let typeDefsClass: string[] = []


        /// read files content
        for (let file of files) {
            let content = fs.readFileSync(file.fsPath, 'utf8');
            const regex = /class Fragment__\w+/g;
            const fragments = content.match(regex);
            let filePath = file.fsPath.split('lib')[1]

            if (fragments == undefined) {
                continue
            }
            imports.push(`import 'package:${packageName}${filePath}';`)
            let className = fragments[0].replace('class', '').trim()
            let typeDef = className.replace('class', '').replace('__', '').replace('Fragment', '').replace('Fragment', '')
            typeDef = toUpperCamelCase(typeDef)
            typeDefs.push(
                `${typeDef} = ${className};`
            )
            typeDefsClass.push(
                `${typeDef}`
            )
            vscode.window.showInputBox({ prompt: 'typedef with prefix Gql or enter prefix', value: "Gql" }).then(value => {
                if (value != undefined) {
                    let newText = `${imports.join('\n')}\n\n${typeDefs.map((e) => `typedef ${value}${e}`).join('\n')}\n\n${typeDefsClass.map((e) => `${freezedTemplate(e,value+e)}`).join('\n')}`
                    vscode.workspace.openTextDocument({ language: 'dart', content: newText }).then(document => {
                        vscode.window.showTextDocument(document);
                    });
                }


            
            });


        }
    }));
}


function freezedTemplate(oriName:string,name:string) {
    let modelName = `UiModel${toUpperCamelCase(oriName)}`
    return `
@freezed
class ${modelName} with _$${modelName} {
    const ${modelName}._();
    const factory ${modelName}({
         required final ${name} ${toLowerCamelCase(name)},
    }) = _${modelName};
}

`}