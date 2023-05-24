
import * as vscode from 'vscode';
import { biggerCloseRegex, biggerOpenRegex, findClassRegex, smallCloseRegex, smallOpenRegex, } from './regex_utils';
import { run } from 'node:test';
import { is } from 'cheerio/lib/api/traversing';


class OpenCloseFinder {
    openCount: number;
    closeCount: number;
    openRegExp: RegExp;
    closeRegExp: RegExp;
    reverse: boolean;
    constructor(openRegExp: RegExp, closeRegExp: RegExp, reverse: boolean = false) {
        this.openCount = 0;
        this.closeCount = 0;
        this.reverse = reverse
        if (reverse) {
            this.openRegExp = closeRegExp;
            this.closeRegExp = openRegExp;
        } else {
            this.openRegExp = openRegExp;
            this.closeRegExp = closeRegExp;
        }
    }

    isDirty(): Boolean {
        return this.openCount != this.closeCount
    }

    incrementOpen(number: number) {
        this.openCount += number;
    }

    incrementClose(number: number) {
        this.closeCount += number;
    }
    decrementOpen(number: number) {
        this.openCount -= number;
    }

    decrementClose(number: number) {
        this.closeCount -= number;
    }

    findRange(document: vscode.TextDocument, startLine: number): vscode.Range | undefined {
        return this.reverse ? this.findReverse(document, startLine) : this.sequence(document, startLine)
    }

    private findReverse(document: vscode.TextDocument, startLine: number): vscode.Range | undefined {
        this.reset()
        let classRange: vscode.Range | undefined = undefined;
        let endLine = startLine;
        let firstLineText = document.lineAt(startLine).text
        let match = firstLineText.match(this.openRegExp)
        if (match == null) return undefined
        let allText = document.getText(new vscode.Range(0, 0, document.lineCount + 1, 0))
        const lines = allText.split('\n');
        for (let i = endLine; i > 0; i--) {
            let lineText = lines[i];
            let matchOpen = lineText.match(this.openRegExp)
            let matchClose = lineText.match(this.closeRegExp)
            this.incrementOpen(matchOpen != null ? matchOpen.length : 0)
            this.incrementClose(matchClose != null ? matchClose.length : 0)
            if (this.isDirty()) {
                startLine--
            }
            else {
                startLine--
                classRange = new vscode.Range(startLine, 0, endLine + 1, 0)
                let result = document.getText(classRange)
                break;
            }
        }
        return classRange
    }

    private sequence(document: vscode.TextDocument, startLine: number): vscode.Range | undefined {
        this.reset()
        let classRange: vscode.Range | undefined = undefined;
        let endLine = startLine;
        let firstLineText = document.lineAt(startLine).text
        let match = firstLineText.match(this.openRegExp)
        if (match == null) return undefined
        let allText = document.getText(new vscode.Range(startLine, 0, document.lineCount + 1, 0))
        const lines = allText.split('\n');
        let currentText = ''
        for (let i = 0; i < lines.length; i++) {
            let lineText = lines[i];
            currentText += lineText + '\n'
            let matchOpen = lineText.match(this.openRegExp)
            let matchClose = lineText.match(this.closeRegExp)
            this.incrementOpen(matchOpen != null ? matchOpen.length : 0)
            this.incrementClose(matchClose != null ? matchClose.length : 0)
            if (this.isDirty()) {
                endLine++
            }
            else {
                endLine++
                classRange = new vscode.Range(startLine, 0, endLine, 0)
                let result = document.getText(classRange)
                break;
            }
        }
        return classRange
    }


    reset() {
        this.openCount = 0;
        this.closeCount = 0;
    }
}

export class BiggerOpenCloseFinder extends OpenCloseFinder {
    constructor(reverse: boolean = false) {
        super(biggerOpenRegex, biggerCloseRegex, reverse)
    }
}

export class SmallerOpenCloseFinder extends OpenCloseFinder {
    constructor(reverse: boolean = false) {
        super(biggerOpenRegex, biggerCloseRegex, reverse)
    }
}

export class FlutterOpenCloseFinder extends OpenCloseFinder {
    constructor() {
        super(biggerOpenRegex, biggerCloseRegex)
    }

    findRange(document: vscode.TextDocument, startLine: number): vscode.Range | undefined {
        this.reset()
        let classRange: vscode.Range | undefined = undefined;
        let endLine = startLine;
        let firstLineText = document.lineAt(startLine).text
        let match = firstLineText.match(biggerOpenRegex)

        if (match == null) {
            let maxTry = 3
            let tryCount = 0
            while (tryCount < maxTry ) {
                match = document.lineAt(startLine + tryCount).text.match(biggerOpenRegex)
                if (match != null) break;
                tryCount++
            }
            if (match == null) return undefined
        }
        let allText = document.getText(new vscode.Range(startLine, 0, document.lineCount + 1, 0))
        const lines = allText.split('\n');
        let classMatch = firstLineText.match(findClassRegex)
        if (!classMatch) return undefined
        let className = classMatch![1]
        let currentText = ''
        for (let i = 0; i < lines.length; i++) {
            let lineText = lines[i];
            currentText += lineText + '\n'
            let matchOpen = lineText.match(this.openRegExp)
            let matchClose = lineText.match(this.closeRegExp)
            this.incrementOpen(matchOpen != null ? matchOpen.length : 0)
            this.incrementClose(matchClose != null ? matchClose.length : 0)
            if (currentText.includes('StatefulWidget') && !currentText.includes(`extends State<${className}>`)) {
                endLine++
            }
            else if (this.isDirty()) {
                endLine++
            }
            else {
                endLine++
                classRange = new vscode.Range(startLine, 0, endLine, 0)
                let result = document.getText(classRange)
                break;
            }
        }
        return classRange
    }
}