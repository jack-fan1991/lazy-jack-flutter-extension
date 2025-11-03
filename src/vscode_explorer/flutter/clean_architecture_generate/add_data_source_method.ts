import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as changeCase from "change-case";
import { toUpperCamelCase } from '../../../utils/src/regex/regex_utils';
import { reFormat } from '../../../utils/src/vscode_utils/activate_editor_utils';


const COMMAND_ID = "lazyJack.addDataSourceMethod";

class DataPathResolver {
    public readonly dataDir: string;
    public readonly featureDir: string;
    public readonly featureNameSnakeCase: string;
    public readonly featureNamePascalCase: string;

    public readonly domainRepoPath: string;
    public readonly remoteDatasourcePath: string;
    public readonly remoteDatasourceImplPath: string;
    public readonly repoImplPath: string;
    public readonly modelsDir: string;

    public readonly repositoryName: string;
    public readonly datasourceName: string;
    public readonly datasourceImplName: string;
    public readonly repositoryImplName: string;

    constructor(dataFolderPath: string) {
        this.dataDir = dataFolderPath;
        this.featureDir = path.dirname(dataFolderPath);
        const featureName = path.basename(this.featureDir);
        this.featureNameSnakeCase = featureName;
        this.featureNamePascalCase = toUpperCamelCase(featureName);

        const rootFeatureDir = path.dirname(this.featureDir)
        const domainDir = path.join(rootFeatureDir, this.featureNameSnakeCase, 'domain');
        const dataDir = path.join(rootFeatureDir, this.featureNameSnakeCase, 'data');

        this.domainRepoPath = path.join(domainDir, 'repositories', `${this.featureNameSnakeCase}_repository.dart`);
        this.remoteDatasourcePath = path.join(dataDir, 'sources', `${this.featureNameSnakeCase}_data_source.dart`);
        this.remoteDatasourceImplPath = path.join(dataDir, 'sources', `${this.featureNameSnakeCase}_remote_data_source_impl.dart`);
        this.repoImplPath = path.join(dataDir, 'repo_impls', `${this.featureNameSnakeCase}_repository_impl.dart`);
        this.modelsDir = path.join(dataDir, 'models');

        this.repositoryName = `${this.featureNamePascalCase}Repository`;
        this.datasourceName = `${this.featureNamePascalCase}RemoteDataSource`;
        this.datasourceImplName = `${this.featureNamePascalCase}RemoteDataSourceImpl`;
        this.repositoryImplName = `${this.featureNamePascalCase}RepositoryImpl`;
    }

    public getModelPath(baseTypeName: string): string {
        const fileName = `${changeCase.snakeCase(baseTypeName)}.dart`;
        return path.join(this.modelsDir, fileName);
    }

    public getModelImportPath(importerPath: string, modelTypeName: string): string {
        const modelPath = this.getModelPath(modelTypeName);
        const importerDir = path.dirname(importerPath);
        const relativePath = path.relative(importerDir, modelPath).replace(/\\/g, '/');
        return relativePath;
    }
}

export function registerAddDataSourceMethod(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(COMMAND_ID, async (folderUri: vscode.Uri) => {
        
        const resolver = new DataPathResolver(folderUri.path);

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
        const wrapperConfig = config.get<{ name: string; import: string }>('dataReturnWrapper');

        let finalReturnType: string;
        const imports: string[] = [];

        if (wrapperConfig && wrapperConfig.name && wrapperConfig.import) {
            if (baseReturnType === 'void') {
                finalReturnType = `Future<${wrapperConfig.name}<void>>`;
            } else {
                finalReturnType = `Future<${wrapperConfig.name}<${baseReturnType}>>`;
            }
            imports.push(wrapperConfig.import);
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

            const domainRepoImports = baseReturnType !== 'void' ? [...imports, `import '${resolver.getModelImportPath(resolver.domainRepoPath, baseReturnType)}';`] : imports;
            const remoteDsImports = baseReturnType !== 'void' ? [...imports, `import '${resolver.getModelImportPath(resolver.remoteDatasourcePath, baseReturnType)}';`] : imports;
            const remoteDsImplImports = baseReturnType !== 'void' ? [...imports, `import '${resolver.getModelImportPath(resolver.remoteDatasourceImplPath, baseReturnType)}';`] : imports;
            const repoImplImports = baseReturnType !== 'void' ? [...imports, `import '${resolver.getModelImportPath(resolver.repoImplPath, baseReturnType)}';`] : imports;

            await addAbstractMethod(resolver.domainRepoPath, finalReturnType, methodName, domainRepoImports);
            await addAbstractMethod(resolver.remoteDatasourcePath, finalReturnType, methodName, remoteDsImports);
            await addConcreteMethod(resolver.remoteDatasourceImplPath, finalReturnType, methodName, remoteDsImplImports);
            await addRepoImplMethod(resolver.repoImplPath, finalReturnType, methodName, repoImplImports, resolver);

            vscode.window.showInformationMessage(`✅ Method '${methodName}' added to data layer.`);
            
            if (baseReturnType !== 'void') {
                const modelUri = vscode.Uri.file(resolver.getModelPath(baseReturnType));
                await vscode.window.showTextDocument(modelUri);
            } else {
                const uri = vscode.Uri.file(resolver.domainRepoPath);
                await vscode.window.showTextDocument(uri);
            }
            await reFormat();

        } catch (err: any) {
            console.error(err);
            vscode.window.showErrorMessage(`Failed to add method: ${err.message}`);
        }
    }));
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
    await modifyFile(filePath, imports, methodSignature);
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
