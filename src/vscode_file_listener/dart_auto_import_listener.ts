import * as vscode from 'vscode';
import { FileListenerBase } from './base_file_listener';
import { isFlutterProject } from '../utils/src/language_utils/dart/pubspec/pubspec_utils';
import { getActivateEditor, getActivateEditorFileName } from '../utils/src/vscode_utils/editor_utils';
import { insertPartLine } from '../helper/dart/part_utils';
import path = require('path');
export class DartAutoImportFileListener extends FileListenerBase {
    constructor() {
        super();
    }
    onDidChangeTextDocument(): vscode.Disposable | undefined {
        return vscode.workspace.onDidSaveTextDocument((document) => {
            // Arb save auto run flutter pub get
            if (!document.fileName.endsWith('.dart')) return
            let activateFile=   getActivateEditorFileName(true)
            if (!document.fileName.endsWith( activateFile) )return
            let text = document.getText()
            if (!isFlutterProject()) return
           
            if (attentionOnWidget(text)) {
                insertPartLine(getActivateEditor(), "import 'package:flutter/material.dart';\n")
            }
        })
    }
}



function attentionOnWidget(text: string): boolean {
    let attention = text.includes('StatelessWidget') || text.includes('StatefulWidget')
    if (text.includes("import 'package:flutter/material.dart';")) return false
    if (text.includes("import 'package:flutter/widgets.dart';")) return false
    if (text.includes("import 'package:flutter/widgets.dart';")) return false
    if (text.includes("import 'package:flutter/cupertino.dart';")) return false
    if (text.includes("part of")) return false
    return attention
}

