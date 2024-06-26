
import * as vscode from 'vscode';
import { FileListenerBase } from './base_file_listener';
import {  arbFileListener } from './arb_file_listener';
import { logInfo } from '../utils/src/logger/logger';
import { DartAutoImportFileListener } from './dart_auto_import_listener';
import {  graphQlFileListener, shownGraphqlConvertMessage } from './graphql_file_listener';

const commonStartFileListener = "common.jack.tools.startFileListener"
const commonStopFileListener = "common.jack.tools.stopFileListener"



export function registerFileListener(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(commonStartFileListener, (fileListener: FileListenerBase) => {
        fileListener.start(context)
    }
    )
    );
    context.subscriptions.push(vscode.commands.registerCommand(commonStopFileListener, (fileListener: FileListenerBase) => {
        fileListener.stop(context)
    }
    )
    );
    
    startFileListener(new FileListenerManger())
    startFileListener(new DartAutoImportFileListener())
    startFileListener(graphQlFileListener)
}

export function startFileListener(fileListener: FileListenerBase) {
    vscode.commands.executeCommand(commonStartFileListener, fileListener)
    
}

export function stopFileListener(fileListener: FileListenerBase) {
    vscode.commands.executeCommand(commonStopFileListener, fileListener)
}

export class FileListenerManger extends FileListenerBase {
    constructor() {
        super();
    }
    onDidChangeActiveTextEditor(): vscode.Disposable | undefined {
        return vscode.window.onDidChangeActiveTextEditor(editor => {
            if ( editor?.document.uri.path.endsWith('.arb')) {
                startFileListener(arbFileListener)
            }
            // if ( editor?.document.uri.path.endsWith('.graphql')) {
            //     shownGraphqlConvertMessage( editor.document)
            // }
          
        })
    }
    onDidCloseTextDocument(): vscode.Disposable | undefined {
        return vscode.workspace.onDidCloseTextDocument(doc => {
            if ( doc.uri.path.endsWith('.arb')) {
                stopFileListener (arbFileListener)
            }
          
        })
    }

}
