import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as changeCase from "change-case";
import { toUpperCamelCase } from '../../../utils/src/regex/regex_utils';
import { reFormat } from '../../../utils/src/vscode_utils/activate_editor_utils';

const COMMAND_ID = "lazyJack.cleanArch.addDataSourceMethod";

type RepositoryImplCandidate = {
    filePath: string;
    featureNameSnakeCase: string;
};

type RepositoryQuickPickItem = vscode.QuickPickItem & {
    candidate: RepositoryImplCandidate;
};

class DataPathResolver {
    public readonly featureDir: string;
    public readonly dataDir: string;
    public readonly domainDir: string;
    public readonly featureNameSnakeCase: string;
    public readonly featureNamePascalCase: string;

    public readonly domainRepoPath: string;
    public readonly remoteDatasourcePath: string | undefined;
    public readonly remoteDatasourceImplPath: string | undefined;
    public readonly repoImplPath: string;
    public readonly modelsDir: string;

    public readonly repositoryName: string;
    public readonly datasourceName: string;
    public readonly datasourceImplName: string;
    public readonly repositoryImplName: string;

    private constructor(params: {
        featureDir: string;
        dataDir: string;
        domainDir: string;
        featureNameSnakeCase: string;
        featureNamePascalCase: string;
        domainRepoPath: string;
        remoteDatasourcePath: string | undefined;
        remoteDatasourceImplPath: string | undefined;
        repoImplPath: string;
        modelsDir: string;
        repositoryName: string;
        datasourceName: string;
        datasourceImplName: string;
        repositoryImplName: string;
    }) {
        this.featureDir = params.featureDir;
        this.dataDir = params.dataDir;
        this.domainDir = params.domainDir;
        this.featureNameSnakeCase = params.featureNameSnakeCase;
        this.featureNamePascalCase = params.featureNamePascalCase;

        this.domainRepoPath = params.domainRepoPath;
        this.remoteDatasourcePath = params.remoteDatasourcePath;
        this.remoteDatasourceImplPath = params.remoteDatasourceImplPath;
        this.repoImplPath = params.repoImplPath;
        this.modelsDir = params.modelsDir;

        this.repositoryName = params.repositoryName;
        this.datasourceName = params.datasourceName;
        this.datasourceImplName = params.datasourceImplName;
        this.repositoryImplName = params.repositoryImplName;
    }

    public static async create(folderUri: vscode.Uri): Promise<DataPathResolver | undefined> {
        const featureDir = findFeatureRoot(folderUri.fsPath);
        if (!featureDir) {
            vscode.window.showErrorMessage('找不到對應的 domain/data 結構，請確認選擇的目錄。');
            return undefined;
        }

        const dataDir = path.join(featureDir, 'data');
        const domainDir = path.join(featureDir, 'domain');

        const repoCandidates = collectRepositoryImplCandidates(dataDir);
        if (repoCandidates.length === 0) {
            vscode.window.showErrorMessage('未找到 *_repository_impl.dart，請確認 data/repo_impls 或 data/repositories。');
            return undefined;
        }

        let selectedCandidate: RepositoryImplCandidate = repoCandidates[0];
        if (repoCandidates.length > 1) {
            const pickItems: RepositoryQuickPickItem[] = repoCandidates.map(candidate => ({
                label: path.basename(candidate.filePath),
                description: path.relative(featureDir, candidate.filePath),
                detail: `${toUpperCamelCase(candidate.featureNameSnakeCase)}RepositoryImpl`,
                candidate,
            }));

            const pick = await vscode.window.showQuickPick(pickItems, {
                placeHolder: '請選擇 Repository 實作檔案',
            });

            if (!pick) {
                return undefined;
            }
            selectedCandidate = pick.candidate;
        }

        const featureNameSnakeCase = selectedCandidate.featureNameSnakeCase;
        const featureNamePascalCase = toUpperCamelCase(featureNameSnakeCase);

        const domainRepoPath = resolveDomainRepositoryPath(domainDir, featureNameSnakeCase);
        const remoteDatasourcePathCandidate = path.join(dataDir, 'sources', `${featureNameSnakeCase}_data_source.dart`);
        const remoteDatasourceImplPathCandidate = path.join(dataDir, 'sources', `${featureNameSnakeCase}_remote_data_source_impl.dart`);

        const remoteDatasourcePath = fs.existsSync(remoteDatasourcePathCandidate) ? remoteDatasourcePathCandidate : undefined;
        const remoteDatasourceImplPath = fs.existsSync(remoteDatasourceImplPathCandidate) ? remoteDatasourceImplPathCandidate : undefined;
        const repoImplPath = selectedCandidate.filePath;
        const modelsDir = path.join(dataDir, 'models');

        return new DataPathResolver({
            featureDir,
            dataDir,
            domainDir,
            featureNameSnakeCase,
            featureNamePascalCase,
            domainRepoPath,
            remoteDatasourcePath,
            remoteDatasourceImplPath,
            repoImplPath,
            modelsDir,
            repositoryName: `${featureNamePascalCase}Repository`,
            datasourceName: `${featureNamePascalCase}RemoteDataSource`,
            datasourceImplName: `${featureNamePascalCase}RemoteDataSourceImpl`,
            repositoryImplName: `${featureNamePascalCase}RepositoryImpl`,
        });
    }

    public getModelPath(baseTypeName: string): string {
        const fileName = `${changeCase.snakeCase(baseTypeName)}.dart`;
        return path.join(this.modelsDir, fileName);
    }

    public getModelImportPath(importerPath: string | undefined, modelTypeName: string): string | undefined {
        if (!importerPath) {
            return undefined;
        }
        const modelPath = this.getModelPath(modelTypeName);
        const importerDir = path.dirname(importerPath);
        const relativePath = path.relative(importerDir, modelPath).replace(/\\/g, '/');
        return relativePath;
    }
}

function findFeatureRoot(startPath: string): string | undefined {
    let current = startPath;
    try {
        const stat = fs.statSync(current);
        if (!stat.isDirectory()) {
            current = path.dirname(current);
        }
    } catch {
        return undefined;
    }

    while (true) {
        const dataCandidate = path.join(current, 'data');
        const domainCandidate = path.join(current, 'domain');
        if (directoryExists(dataCandidate) && directoryExists(domainCandidate)) {
            return current;
        }

        const parent = path.dirname(current);
        if (parent === current) {
            break;
        }
        current = parent;
    }
    return undefined;
}

function collectRepositoryImplCandidates(dataDir: string): RepositoryImplCandidate[] {
    const candidateRoots = [
        path.join(dataDir, 'repo_impls'),
        path.join(dataDir, 'repositories'),
        path.join(dataDir, 'data_repo_impls'),
    ];

    const results: RepositoryImplCandidate[] = [];
    const visited = new Set<string>();

    for (const root of candidateRoots) {
        collectRepositoryImplFromDir(root, results, visited);
    }

    return results;
}

function collectRepositoryImplFromDir(dirPath: string, bucket: RepositoryImplCandidate[], visited: Set<string>) {
    if (!directoryExists(dirPath)) {
        return;
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            collectRepositoryImplFromDir(fullPath, bucket, visited);
            continue;
        }

        if (!entry.isFile() || !entry.name.endsWith('.dart')) {
            continue;
        }

        const match = entry.name.match(/^(.+)_repository_impl\.dart$/);
        if (!match) {
            continue;
        }

        const normalized = path.normalize(fullPath);
        if (visited.has(normalized)) {
            continue;
        }
        visited.add(normalized);

        bucket.push({
            filePath: normalized,
            featureNameSnakeCase: match[1],
        });
    }
}

function resolveDomainRepositoryPath(domainDir: string, featureNameSnakeCase: string): string {
    const targetFileName = `${featureNameSnakeCase}_repository.dart`;
    const defaultPath = path.join(domainDir, 'repositories', targetFileName);

    if (fs.existsSync(defaultPath)) {
        return defaultPath;
    }

    const fallback = findFileRecursively(domainDir, targetFileName);
    return fallback ?? defaultPath;
}

function findFileRecursively(dirPath: string, targetFileName: string): string | undefined {
    if (!directoryExists(dirPath)) {
        return undefined;
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            const nested = findFileRecursively(fullPath, targetFileName);
            if (nested) {
                return nested;
            }
        } else if (entry.isFile() && entry.name === targetFileName) {
            return fullPath;
        }
    }
    return undefined;
}

function directoryExists(dirPath: string): boolean {
    try {
        return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    } catch {
        return false;
    }
}

function buildImports(baseImports: string[], modelImportPath?: string): string[] {
    if (!modelImportPath) {
        return [...baseImports];
    }
    return [...baseImports, `import '${modelImportPath}';`];
}

export function registerAddDataSourceMethod(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(COMMAND_ID, async (folderUri: vscode.Uri) => {
        if (!folderUri) {
            vscode.window.showErrorMessage('請於資料層目錄執行此指令。');
            return;
        }

        const resolver = await DataPathResolver.create(folderUri);
        if (!resolver) {
            return;
        }

        const methodNameInput = await vscode.window.showInputBox({
            placeHolder: 'Enter method name (e.g., fetchUser, deleteItem)',
            prompt: 'This will be converted to camelCase.',
        });
        if (!methodNameInput) {
            vscode.window.showErrorMessage('Method name cannot be empty.');
            return;
        }
        const methodName = changeCase.camelCase(methodNameInput);

        const writeOps = ['create', 'add', 'update', 'delete', 'remove', 'send', 'post', 'put', 'patch'];
        const isWriteOperation = writeOps.some(op => methodName.toLowerCase().startsWith(op));
        const baseReturnType = isWriteOperation ? 'void' : `${changeCase.pascalCase(methodName)}Data`;

        const config = vscode.workspace.getConfiguration('lazy-jack-flutter-extension');
        const wrapperConfig =
            config.get<{ name: string; import: string }>('resultWrapper')
            ?? config.get<{ name: string; import: string }>('dataReturnWrapper');

        let finalReturnType: string;
        const imports: string[] = [];

        if (wrapperConfig && wrapperConfig.name && wrapperConfig.import) {
            if (baseReturnType === 'void') {
                finalReturnType = `Future<${wrapperConfig.name}<void>>`;
            } else {
                finalReturnType = `Future<${wrapperConfig.name}<${baseReturnType}>>`;
            }
            imports.push(normalizeImport(wrapperConfig.import));
        } else {
            if (baseReturnType === 'void') {
                finalReturnType = `Future<void>`;
            } else {
                finalReturnType = `Future<${baseReturnType}?>`;
            }
        }

        try {
            if (baseReturnType !== 'void') {
                const modelPath = resolver.getModelPath(baseReturnType);
                if (!fs.existsSync(modelPath)) {
                    const modelContent = `class ${baseReturnType} {}`;
                    if (!fs.existsSync(resolver.modelsDir)) {
                        fs.mkdirSync(resolver.modelsDir, { recursive: true });
                    }
                    fs.writeFileSync(modelPath, modelContent);
                }
            }

            const domainRepoImports = buildImports(
                imports,
                baseReturnType !== 'void'
                    ? resolver.getModelImportPath(resolver.domainRepoPath, baseReturnType)
                    : undefined,
            );
            const remoteDsImports = buildImports(
                imports,
                baseReturnType !== 'void'
                    ? resolver.getModelImportPath(resolver.remoteDatasourcePath, baseReturnType)
                    : undefined,
            );
            const remoteDsImplImports = buildImports(
                imports,
                baseReturnType !== 'void'
                    ? resolver.getModelImportPath(resolver.remoteDatasourceImplPath, baseReturnType)
                    : undefined,
            );
            const repoImplImports = buildImports(
                imports,
                baseReturnType !== 'void'
                    ? resolver.getModelImportPath(resolver.repoImplPath, baseReturnType)
                    : undefined,
            );

            await addAbstractMethod(resolver.domainRepoPath, finalReturnType, methodName, domainRepoImports);
            if (resolver.remoteDatasourcePath) {
                await addAbstractMethod(resolver.remoteDatasourcePath, finalReturnType, methodName, remoteDsImports);
            }
            if (resolver.remoteDatasourceImplPath) {
                await addConcreteMethod(resolver.remoteDatasourceImplPath, finalReturnType, methodName, remoteDsImplImports);
            }
            await addRepoImplMethod(resolver.repoImplPath, finalReturnType, methodName, repoImplImports, resolver);

            vscode.window.showInformationMessage(`✅ Method '${methodName}' added to data layer.`);

            await openWorkingFiles(resolver, baseReturnType, methodName);
            await reFormat();

        } catch (err: any) {
            console.error(err);
            vscode.window.showErrorMessage(`Failed to add method: ${err.message}`);
        }
    }));
}

async function openWorkingFiles(resolver: DataPathResolver, baseReturnType: string, methodName: string) {
    const leftUri =
        baseReturnType !== 'void'
            ? vscode.Uri.file(resolver.getModelPath(baseReturnType))
            : vscode.Uri.file(resolver.domainRepoPath);
    const leftDocument = await vscode.workspace.openTextDocument(leftUri);
    await vscode.window.showTextDocument(leftDocument, { viewColumn: vscode.ViewColumn.One, preview: false });

    if (!resolver.remoteDatasourceImplPath) {
        return;
    }

    const implUri = vscode.Uri.file(resolver.remoteDatasourceImplPath);
    const implDocument = await vscode.workspace.openTextDocument(implUri);
    const implEditor = await vscode.window.showTextDocument(implDocument, {
        viewColumn: vscode.ViewColumn.Two,
        preview: false,
    });
    highlightMethodInEditor(implEditor, methodName);
}

function highlightMethodInEditor(editor: vscode.TextEditor, methodName: string) {
    const document = editor.document;
    const content = document.getText();
    const methodIndex = content.indexOf(`${methodName}(`);
    if (methodIndex === -1) {
        return;
    }

    let startIndex = content.lastIndexOf('@override', methodIndex);
    if (startIndex === -1) {
        startIndex = methodIndex;
    }

    const braceStart = content.indexOf('{', methodIndex);
    if (braceStart === -1) {
        const fallbackRange = new vscode.Range(
            document.positionAt(startIndex),
            document.positionAt(methodIndex + methodName.length + 2),
        );
        editor.selection = new vscode.Selection(fallbackRange.start, fallbackRange.end);
        editor.revealRange(fallbackRange, vscode.TextEditorRevealType.InCenter);
        return;
    }

    let braceDepth = 0;
    let endIndex = braceStart;
    for (let i = braceStart; i < content.length; i++) {
        if (content[i] === '{') {
            braceDepth++;
        } else if (content[i] === '}') {
            braceDepth--;
            if (braceDepth === 0) {
                endIndex = i + 1;
                break;
            }
        }
    }

    const range = new vscode.Range(document.positionAt(startIndex), document.positionAt(endIndex));
    editor.selection = new vscode.Selection(range.start, range.end);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
}

async function modifyFile(filePath: string, imports: string[], methodString: string) {
    const uri = vscode.Uri.file(filePath);
    const document = await vscode.workspace.openTextDocument(uri);
    let originalContent = document.getText();
    let newContent = originalContent;

    const lines = newContent.split('\n');
    let lastImportLine = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
            lastImportLine = i;
        }
    }

    const importsToAdd = imports.filter(imp => imp && !originalContent.includes(imp));

    if (importsToAdd.length > 0) {
        if (lastImportLine !== -1) {
            lines.splice(lastImportLine + 1, 0, ...importsToAdd);
        } else {
            lines.unshift(...importsToAdd, '');
        }
        newContent = lines.join('\n');
    }
    
    const lastBraceIndex = newContent.lastIndexOf('}');
    if (lastBraceIndex === -1) throw new Error(`Could not find closing brace in ${filePath}`);
    
    newContent = newContent.slice(0, lastBraceIndex) + methodString + newContent.slice(lastBraceIndex);

    const edit = new vscode.WorkspaceEdit();
    const wholeFileRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(originalContent.length)
    );
    edit.replace(uri, wholeFileRange, newContent);
    await vscode.workspace.applyEdit(edit);
}


async function addAbstractMethod(filePath: string, returnType: string, methodName: string, imports: string[]) {
    const methodSignature = `\n  ${returnType} ${methodName}();\n`;
    try {
        await modifyFile(filePath, imports, methodSignature);
    } catch (err) {
        console.error(`Error adding abstract method to ${filePath}:`, err);
        throw err;
    }
}

async function addConcreteMethod(filePath: string, returnType: string, methodName: string, imports: string[]) {
    const methodImplementation = `
  @override
  ${returnType} ${methodName}() async {
    // TODO: Implement ${methodName}
    throw UnimplementedError('${methodName} has not been implemented.');
  }
`;
    await modifyFile(filePath, imports, methodImplementation);
}

async function addRepoImplMethod(filePath: string, returnType: string, methodName: string, imports: string[], resolver: DataPathResolver) {
    const methodImplementation = `
  @override
  ${returnType} ${methodName}() {
    // TODO: Implement ${methodName} by calling datasource
    // Example: return remoteDataSource.${methodName}();
    throw UnimplementedError('${methodName} has not been implemented.');
  }
`;
    await modifyFile(filePath, imports, methodImplementation);
}

function normalizeImport(importValue: string): string {
    const trimmed = importValue.trim();
    if (trimmed.startsWith('import ')) {
        return trimmed.endsWith(';') ? trimmed : `${trimmed};`;
    }
    const cleaned = trimmed.replace(/^['"]|['"]$/g, '');
    return `import '${cleaned}';`;
}
