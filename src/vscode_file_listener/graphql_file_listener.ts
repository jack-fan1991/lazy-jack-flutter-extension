import * as vscode from 'vscode' 
import { FileListenerBase } from './base_file_listener';
import { GraphqlToDartApiFixer } from '../vscode_code_action/qraphql/graphql_to_dart_api_fixer';
import { Document } from 'yaml';


export class GraphQlFileListener extends FileListenerBase {
    constructor() {
        super();
    }

   

    onDidSaveTextDocument(): vscode.Disposable | undefined {
        return vscode.workspace.onDidSaveTextDocument((document) => {
            // Arb save auto run flutter pub get
            if ( document.uri.path.endsWith('.graphql')) {
                shownGraphqlConvertMessage(document)
              

            }
        })
    }
}

export const graphQlFileListener = new GraphQlFileListener()
export function shownGraphqlConvertMessage(document:vscode.TextDocument ){
    let filePath = document.fileName.split('/').pop()
    vscode.window.showInformationMessage(`Convert file : ${filePath} to dart interface template`, 'Confirm', 'Not now').then(async (option) => {
        if (option == 'Confirm') {
            let text = document.getText();
            vscode.commands.executeCommand(GraphqlToDartApiFixer.command, document, undefined,text

            ) 
        } else {
            vscode.window.showInformationMessage('[ Auto Trigger ] => When Open or Save *.graphql file.')
            vscode.window.showInformationMessage('[ Manual Run ] => Select part of graphql context then use quick Fix.')

        }

    })
}