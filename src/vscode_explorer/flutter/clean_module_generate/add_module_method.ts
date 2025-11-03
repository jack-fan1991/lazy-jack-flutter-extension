import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as changeCase from 'change-case';
import { reFormat } from '../../../utils/src/vscode_utils/activate_editor_utils';

const COMMAND_ID = 'lazyJack.addModuleMethod';

interface ReturnTypeContext {
  baseType: string;
  finalReturnType: string;
  imports: string[];
}

export function registerAddModuleMethod(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_ID, async (folderUri: vscode.Uri) => {
      if (!folderUri || !folderUri.fsPath) {
        vscode.window.showErrorMessage('請選擇 lib/modules 底下的功能資料夾');
        return;
      }

      const featureDir = folderUri.fsPath;
      if (!isValidModuleFeatureDir(featureDir)) {
        vscode.window.showErrorMessage('僅支援 lib/modules/<feature> 目錄');
        return;
      }

      const resolver = new ModuleMethodPathResolver(featureDir);
      const structureError = validateModuleStructure(resolver);
      if (structureError) {
        vscode.window.showErrorMessage(structureError);
        return;
      }

      const methodNameInput = await vscode.window.showInputBox({
        placeHolder: '輸入方法名稱 (例如: fetch profile, update status)',
        prompt: '會自動轉為 camelCase',
      });

      if (!methodNameInput) {
        vscode.window.showErrorMessage('方法名稱不可為空');
        return;
      }

      const methodName = changeCase.camelCase(methodNameInput);
      const writeOps = ['create', 'add', 'update', 'delete', 'remove', 'send', 'post', 'put', 'patch'];
      const isWriteOperation = writeOps.some((op) => methodName.toLowerCase().startsWith(op));
      const baseReturnType = isWriteOperation ? 'void' : `${changeCase.pascalCase(methodName)}Data`;

      const returnContext = resolveReturnType(baseReturnType);

      try {
        if (baseReturnType !== 'void') {
          ensureModelFile(resolver, returnContext.baseType);
        }

        await ensureMethodAbsent(resolver.domainRepositoryPath, methodName);
        await ensureMethodAbsent(resolver.dataSourcePath, methodName);
        await ensureMethodAbsent(resolver.remoteDataSourceImplPath, methodName);
        await ensureMethodAbsent(resolver.repositoryImplPath, methodName);
        if (resolver.mockRepositoryImplPath && fs.existsSync(resolver.mockRepositoryImplPath)) {
          await ensureMethodAbsent(resolver.mockRepositoryImplPath, methodName);
        }

        const domainImports =
          baseReturnType !== 'void'
            ? [...returnContext.imports, `import '${resolver.getModelImportPath(resolver.domainRepositoryPath, returnContext.baseType)}';`]
            : returnContext.imports;

        const dataSourceImports =
          baseReturnType !== 'void'
            ? [...returnContext.imports, `import '${resolver.getModelImportPath(resolver.dataSourcePath, returnContext.baseType)}';`]
            : returnContext.imports;

        const remoteImports =
          baseReturnType !== 'void'
            ? [...returnContext.imports, `import '${resolver.getModelImportPath(resolver.remoteDataSourceImplPath, returnContext.baseType)}';`]
            : returnContext.imports;

        const repoImports =
          baseReturnType !== 'void'
            ? [
                ...returnContext.imports,
                `import '${resolver.getModelImportPath(resolver.repositoryImplPath, returnContext.baseType)}';`,
                `import '${resolver.getDataSourceImportPath(resolver.repositoryImplPath)}';`,
              ]
            : [
                ...returnContext.imports,
                `import '${resolver.getDataSourceImportPath(resolver.repositoryImplPath)}';`,
              ];

        await addAbstractMethod(resolver.domainRepositoryPath, returnContext.finalReturnType, methodName, domainImports);
        await addAbstractMethod(resolver.dataSourcePath, returnContext.finalReturnType, methodName, dataSourceImports);
        await addRemoteMethod(resolver.remoteDataSourceImplPath, returnContext.finalReturnType, methodName, remoteImports);
        await addRepositoryMethod(resolver.repositoryImplPath, returnContext.finalReturnType, methodName, repoImports, resolver);

        if (resolver.mockRepositoryImplPath && fs.existsSync(resolver.mockRepositoryImplPath)) {
          const mockImports =
            baseReturnType !== 'void'
              ? [...returnContext.imports, `import '${resolver.getModelImportPath(resolver.mockRepositoryImplPath, returnContext.baseType)}';`]
              : returnContext.imports;
          await addMockRepositoryMethod(resolver.mockRepositoryImplPath, returnContext.finalReturnType, methodName, mockImports);
        }

        vscode.window.showInformationMessage(`✅ 已於 ${resolver.featureNamePascalCase} 模組新增 ${methodName} 方法`);

        if (baseReturnType !== 'void') {
          const modelUri = vscode.Uri.file(resolver.getModelPath(returnContext.baseType));
          await vscode.window.showTextDocument(modelUri);
        } else {
          const repoUri = vscode.Uri.file(resolver.domainRepositoryPath);
          await vscode.window.showTextDocument(repoUri);
        }
        await reFormat();
      } catch (error: any) {
        console.error(error);
        vscode.window.showErrorMessage(`新增方法失敗: ${error.message}`);
      }
    }),
  );
}

function isValidModuleFeatureDir(dirPath: string): boolean {
  const parent = path.basename(path.dirname(dirPath));
  if (parent !== 'modules') {
    return false;
  }
  return dirPath.includes(`${path.sep}lib${path.sep}`);
}

function validateModuleStructure(resolver: ModuleMethodPathResolver): string | undefined {
  const requiredPaths = [
    resolver.domainRepositoryPath,
    resolver.dataSourcePath,
    resolver.remoteDataSourceImplPath,
    resolver.repositoryImplPath,
  ];

  const missing = requiredPaths.filter((p) => !fs.existsSync(p));
  if (missing.length > 0) {
    return `模組結構不完整，缺少: ${missing.map((m) => path.basename(m)).join(', ')}`;
  }
  return undefined;
}

function resolveReturnType(baseType: string): ReturnTypeContext {
  const config = vscode.workspace.getConfiguration('lazy-jack-flutter-extension');
  const wrapperConfig =
    config.get<{ name: string; import: string }>('resultWrapper') ??
    config.get<{ name: string; import: string }>('dataReturnWrapper');

  const imports: string[] = [];

  if (wrapperConfig && wrapperConfig.name && wrapperConfig.import) {
    imports.push(normalizeImport(wrapperConfig.import));
    if (baseType === 'void') {
      return {
        baseType,
        finalReturnType: `Future<${wrapperConfig.name}<void>>`,
        imports,
      };
    }
    return {
      baseType,
      finalReturnType: `Future<${wrapperConfig.name}<${baseType}>>`,
      imports,
    };
  }

  if (baseType === 'void') {
    return {
      baseType,
      finalReturnType: 'Future<void>',
      imports,
    };
  }

  return {
    baseType,
    finalReturnType: `Future<${baseType}?>`,
    imports,
  };
}

class ModuleMethodPathResolver {
  public readonly featureDir: string;
  public readonly featureNameSnakeCase: string;
  public readonly featureNamePascalCase: string;

  public readonly dataDir: string;
  public readonly dataSourcesDir: string;
  public readonly dataRepositoriesDir: string;
  public readonly domainRepositoryPath: string;
  public readonly dataSourcePath: string;
  public readonly remoteDataSourceImplPath: string;
  public readonly repositoryImplPath: string;
  public readonly mockRepositoryImplPath?: string;
  public readonly modelsDir: string;

  public readonly dataSourceClassName: string;

  constructor(featureDir: string) {
    this.featureDir = featureDir;
    this.featureNameSnakeCase = path.basename(featureDir);
    this.featureNamePascalCase = changeCase.pascalCase(this.featureNameSnakeCase);

    this.dataDir = path.join(featureDir, 'data');
    this.dataSourcesDir = this.resolveExistingDir(this.dataDir, ['sources', 'sources']);
    this.dataRepositoriesDir = this.resolveExistingDir(this.dataDir, ['repositories', 'repo_impls']);

    this.domainRepositoryPath = path.join(featureDir, 'domain', 'repositories', `${this.featureNameSnakeCase}_repository.dart`);
    this.dataSourcePath = path.join(this.dataSourcesDir, `${this.featureNameSnakeCase}_data_source.dart`);
    this.remoteDataSourceImplPath = path.join(this.dataSourcesDir, `${this.featureNameSnakeCase}_remote_data_source_impl.dart`);
    this.repositoryImplPath = path.join(this.dataRepositoriesDir, `${this.featureNameSnakeCase}_repository_impl.dart`);
    const mockPath = path.join(this.dataRepositoriesDir, 'mock', `mock_${this.featureNameSnakeCase}_repository_impl.dart`);
    if (fs.existsSync(mockPath)) {
      this.mockRepositoryImplPath = mockPath;
    }
    this.modelsDir = path.join(this.dataDir, 'models');

    this.dataSourceClassName = `${this.featureNamePascalCase}DataSource`;
  }

  private resolveExistingDir(baseDir: string, candidates: string[]): string {
    for (const candidate of candidates) {
      const dir = path.join(baseDir, candidate);
      if (fs.existsSync(dir)) {
        return dir;
      }
    }
    return path.join(baseDir, candidates[0]);
  }

  public getModelPath(baseTypeName: string): string {
    const fileName = `${changeCase.snakeCase(baseTypeName)}.dart`;
    return path.join(this.modelsDir, fileName);
  }

  public getModelImportPath(importerPath: string, modelTypeName: string): string {
    const modelPath = this.getModelPath(modelTypeName);
    const importerDir = path.dirname(importerPath);
    return path.relative(importerDir, modelPath).replace(/\\/g, '/');
  }

  public getDataSourceImportPath(importerPath: string): string {
    const importerDir = path.dirname(importerPath);
    return path.relative(importerDir, this.dataSourcePath).replace(/\\/g, '/');
  }
}

function ensureModelFile(resolver: ModuleMethodPathResolver, typeName: string) {
  const modelPath = resolver.getModelPath(typeName);
  if (fs.existsSync(modelPath)) {
    return;
  }
  if (!fs.existsSync(resolver.modelsDir)) {
    fs.mkdirSync(resolver.modelsDir, { recursive: true });
  }
  const content = `class ${typeName} {\n  const ${typeName}();\n}\n`;
  fs.writeFileSync(modelPath, content);
}

async function ensureMethodAbsent(filePath: string, methodName: string) {
  const uri = vscode.Uri.file(filePath);
  const document = await vscode.workspace.openTextDocument(uri);
  const originalContent = document.getText();
  if (originalContent.includes(`${methodName}(`)) {
    throw new Error(`${path.basename(filePath)} 已存在 ${methodName} 方法`);
  }
}

async function modifyFile(filePath: string, imports: string[], methodString: string) {
  const uri = vscode.Uri.file(filePath);
  const document = await vscode.workspace.openTextDocument(uri);
  const originalContent = document.getText();
  let newContent = originalContent;

  const lines = newContent.split('\n');
  let lastImportIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }

  const importsToAdd = imports.filter((item) => item && !originalContent.includes(item));
  if (importsToAdd.length > 0) {
    if (lastImportIndex !== -1) {
      lines.splice(lastImportIndex + 1, 0, ...importsToAdd);
    } else {
      lines.unshift(...importsToAdd, '');
    }
    newContent = lines.join('\n');
  }

  const lastBraceIndex = newContent.lastIndexOf('}');
  if (lastBraceIndex === -1) {
    throw new Error(`找不到結束括號: ${filePath}`);
  }

  newContent = newContent.slice(0, lastBraceIndex) + methodString + newContent.slice(lastBraceIndex);

  const edit = new vscode.WorkspaceEdit();
  const wholeRange = new vscode.Range(document.positionAt(0), document.positionAt(originalContent.length));
  edit.replace(uri, wholeRange, newContent);
  await vscode.workspace.applyEdit(edit);
}

async function addAbstractMethod(filePath: string, returnType: string, methodName: string, imports: string[]) {
  const method = `\n  ${returnType} ${methodName}();\n`;
  await modifyFile(filePath, imports, method);
}

async function addRemoteMethod(filePath: string, returnType: string, methodName: string, imports: string[]) {
  const method = `
  @override
  ${returnType} ${methodName}() async {
    // TODO: 實作 ${methodName}
    throw UnimplementedError('${methodName} 尚未實作');
  }
`;
  await modifyFile(filePath, imports, method);
}

async function addRepositoryMethod(
  filePath: string,
  returnType: string,
  methodName: string,
  imports: string[],
  resolver: ModuleMethodPathResolver,
) {
  const dataSourceIdentifier = await findDataSourceIdentifier(filePath, resolver.dataSourceClassName);
  const callStatement = dataSourceIdentifier
    ? `    return ${dataSourceIdentifier}.${methodName}();\n`
    : `    // TODO: 呼叫資料來源\n    throw UnimplementedError('${methodName} 尚未實作');\n`;

  const method = `
  @override
  ${returnType} ${methodName}() {
${callStatement}  }
`;
  await modifyFile(filePath, imports, method);
}

async function addMockRepositoryMethod(filePath: string, returnType: string, methodName: string, imports: string[]) {
  const method = `
  @override
  ${returnType} ${methodName}() {
    // TODO: 提供模擬資料
    throw UnimplementedError('${methodName} 尚未實作');
  }
`;
  await modifyFile(filePath, imports, method);
}

async function findDataSourceIdentifier(filePath: string, className: string): Promise<string | undefined> {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const regex = new RegExp(`final\\s+${className}\\s+(\\w+);`);
    const match = content.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  } catch {
    return undefined;
  }
  return 'remote';
}

function normalizeImport(importValue: string): string {
  const trimmed = importValue.trim();
  if (trimmed.startsWith('import ')) {
    return trimmed.endsWith(';') ? trimmed : `${trimmed};`;
  }
  const cleaned = trimmed.replace(/^['"]|['"]$/g, '');
  return `import '${cleaned}';`;
}
