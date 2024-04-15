import * as vscode from 'vscode';
import { FileListenerBase } from './base_file_listener';
import { getActivateTextEditor } from '../utils/src/vscode_utils/activate_editor_utils';
import { isFlutterProject } from '../utils/src/language_utils/dart/pubspec/pubspec_utils';
import { logError } from '../utils/src/logger/logger';
import { runFlutterPubGet } from '../utils/src/common/lazy_common';
import { runTerminal } from '../utils/src/terminal_utils/terminal_utils';


class ArbFileListener extends FileListenerBase {
    constructor() {
        super();
    }
    onDidSaveTextDocument(): vscode.Disposable | undefined {
        return vscode.workspace.onDidSaveTextDocument((document) => {
            // Arb save auto run flutter pub get
            if (isFlutterProject()&&document.uri.path.endsWith('.arb')) {
                /// validate document text is json 
                try {
                    JSON.parse(document.getText())
                    runTerminal('flutter gen-l10n');
                } catch (e) {
                    let fileName = document.uri.path.split('/').pop()
                    let message = `File ${fileName} has error Json format`
                    logError(message, true)
                }
            }
        })
    }
}

export const arbFileListener = new ArbFileListener()

