import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as changeCase from 'change-case';
import { reFormat } from '../../../utils/src/vscode_utils/activate_editor_utils';

const COMMAND_ID = 'lazyJack.modules.addMethod';

interface ReturnTypeContext {
  baseType: string;
  finalReturnType: string;
  imports: string[];
}

type RepositoryImplCandidate = {
  filePath: string;
  featureNameSnakeCase: string;
};

type RepositoryQuickPickItem = vscode.QuickPickItem & {
  candidate: RepositoryImplCandidate;
};

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

      const resolver = await ModuleMethodPathResolver.create(featureDir);
      if (!resolver) {
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
        await ensureMethodAbsent(resolver.mockRepositoryImplPath, methodName);

        const domainImports =
          baseReturnType !== 'void'
            ? buildImportList(returnContext.imports, resolver.getModelImportPath(resolver.domainRepositoryPath, returnContext.baseType))
            : [...returnContext.imports];

        const dataSourceImports =
          baseReturnType !== 'void'
            ? buildImportList(returnContext.imports, resolver.getModelImportPath(resolver.dataSourcePath, returnContext.baseType))
            : [...returnContext.imports];

        const remoteImports =
          baseReturnType !== 'void'
            ? buildImportList(returnContext.imports, resolver.getModelImportPath(resolver.remoteDataSourceImplPath, returnContext.baseType))
            : [...returnContext.imports];

        const repoImports = buildRepoImports(resolver, returnContext.imports, baseReturnType !== 'void' ? returnContext.baseType : undefined);

        await addAbstractMethod(resolver.domainRepositoryPath, returnContext.finalReturnType, methodName, domainImports);
        if (resolver.dataSourcePath) {
          await addAbstractMethod(resolver.dataSourcePath, returnContext.finalReturnType, methodName, dataSourceImports);
        }
        if (resolver.remoteDataSourceImplPath) {
          await addRemoteMethod(resolver.remoteDataSourceImplPath, returnContext.finalReturnType, methodName, remoteImports);
        }
        await addRepositoryMethod(resolver.repositoryImplPath, returnContext.finalReturnType, methodName, repoImports, resolver);

        if (resolver.mockRepositoryImplPath) {
          const mockImports =
            baseReturnType !== 'void'
              ? buildImportList(returnContext.imports, resolver.getModelImportPath(resolver.mockRepositoryImplPath, returnContext.baseType))
              : [...returnContext.imports];
          await addMockRepositoryMethod(resolver.mockRepositoryImplPath, returnContext.finalReturnType, methodName, mockImports);
        }

        vscode.window.showInformationMessage(`✅ 已於 ${resolver.featureNamePascalCase} 模組新增 ${methodName} 方法`);

        await openWorkingFiles(resolver, baseReturnType, returnContext.baseType, methodName);
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

  public readonly domainRepositoryPath: string;
  public readonly dataSourcePath?: string;
  public readonly remoteDataSourceImplPath?: string;
  public readonly repositoryImplPath: string;
  public readonly mockRepositoryImplPath?: string;
  public readonly modelsDir: string;
  public readonly dataSourceClassNames: string[];

  private constructor(params: {
    featureDir: string;
    featureNameSnakeCase: string;
    featureNamePascalCase: string;
    domainRepositoryPath: string;
    dataSourcePath?: string;
    remoteDataSourceImplPath?: string;
    repositoryImplPath: string;
    mockRepositoryImplPath?: string;
    modelsDir: string;
    dataSourceClassNames: string[];
  }) {
    this.featureDir = params.featureDir;
    this.featureNameSnakeCase = params.featureNameSnakeCase;
    this.featureNamePascalCase = params.featureNamePascalCase;

    this.domainRepositoryPath = params.domainRepositoryPath;
    this.dataSourcePath = params.dataSourcePath;
    this.remoteDataSourceImplPath = params.remoteDataSourceImplPath;
    this.repositoryImplPath = params.repositoryImplPath;
    this.mockRepositoryImplPath = params.mockRepositoryImplPath;
    this.modelsDir = params.modelsDir;
    this.dataSourceClassNames = params.dataSourceClassNames;
  }

  public static async create(featureDir: string): Promise<ModuleMethodPathResolver | undefined> {
    const dataDir = path.join(featureDir, 'data');
    const domainDir = path.join(featureDir, 'domain');

    if (!directoryExists(dataDir) || !directoryExists(domainDir)) {
      vscode.window.showErrorMessage('模組缺少 data 或 domain 目錄，無法新增方法');
      return undefined;
    }

    const repoCandidates = collectRepositoryImplCandidates(dataDir);
    if (repoCandidates.length === 0) {
      vscode.window.showErrorMessage('未找到 *_repository_impl.dart，請檢查 data/repositories 或 data/repo_impls');
      return undefined;
    }

    let selected = repoCandidates[0];
    if (repoCandidates.length > 1) {
      const pickItems: RepositoryQuickPickItem[] = repoCandidates.map((candidate) => ({
        label: path.basename(candidate.filePath),
        description: path.relative(featureDir, candidate.filePath),
        detail: `${changeCase.pascalCase(candidate.featureNameSnakeCase)}RepositoryImpl`,
        candidate,
      }));

      const pick = await vscode.window.showQuickPick(pickItems, {
        placeHolder: '選擇要更新的 Repository 實作',
      });

      if (!pick) {
        return undefined;
      }
      selected = pick.candidate;
    }

    const featureNameSnakeCase = selected.featureNameSnakeCase;
    const featureNamePascalCase = changeCase.pascalCase(featureNameSnakeCase);
    const repositoryImplPath = selected.filePath;

    const domainRepositoryPath = resolveDomainRepositoryPath(domainDir, featureNameSnakeCase);
    if (!domainRepositoryPath || !fs.existsSync(domainRepositoryPath)) {
      vscode.window.showErrorMessage(`找不到 ${featureNameSnakeCase}_repository.dart，請確認 domain 目錄`);
      return undefined;
    }

    const dataSourcePath = findFileRecursively(dataDir, `${featureNameSnakeCase}_data_source.dart`);
    const remoteDataSourceImplPath = findFileRecursively(dataDir, `${featureNameSnakeCase}_remote_data_source_impl.dart`);
    const mockRepositoryImplPath = findMockRepositoryImplPath(repositoryImplPath, featureNameSnakeCase);

    const modelsDir = path.join(dataDir, 'models');
    const dataSourceClassNames = buildDataSourceClassNames(featureNamePascalCase);

    return new ModuleMethodPathResolver({
      featureDir,
      featureNameSnakeCase,
      featureNamePascalCase,
      domainRepositoryPath,
      dataSourcePath: dataSourcePath ?? undefined,
      remoteDataSourceImplPath: remoteDataSourceImplPath ?? undefined,
      repositoryImplPath,
      mockRepositoryImplPath: mockRepositoryImplPath ?? undefined,
      modelsDir,
      dataSourceClassNames,
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
    return path.relative(importerDir, modelPath).replace(/\\/g, '/');
  }

  public getDataSourceImportPath(importerPath: string): string | undefined {
    if (!this.dataSourcePath) {
      return undefined;
    }
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

async function ensureMethodAbsent(filePath: string | undefined, methodName: string) {
  if (!filePath || !fs.existsSync(filePath)) {
    return;
  }
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
  const dataSourceIdentifier = await findDataSourceIdentifier(filePath, resolver.dataSourceClassNames);
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

async function findDataSourceIdentifier(filePath: string, classNames: string[]): Promise<string | undefined> {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const className of classNames) {
      const regex = new RegExp(`final\\s+${className}\\s+(\\w+);`);
      const match = content.match(regex);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch {
    return undefined;
  }
  return classNames.length > 0 ? 'remote' : undefined;
}

function normalizeImport(importValue: string): string {
  const trimmed = importValue.trim();
  if (trimmed.startsWith('import ')) {
    return trimmed.endsWith(';') ? trimmed : `${trimmed};`;
  }
  const cleaned = trimmed.replace(/^['"]|['"]$/g, '');
  return `import '${cleaned}';`;
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

    if (entry.name.includes('mock_')) {
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

function resolveDomainRepositoryPath(domainDir: string, featureNameSnakeCase: string): string | undefined {
  const targetFileName = `${featureNameSnakeCase}_repository.dart`;
  const defaultPath = path.join(domainDir, 'repositories', targetFileName);

  if (fs.existsSync(defaultPath)) {
    return defaultPath;
  }

  return findFileRecursively(domainDir, targetFileName);
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

function findMockRepositoryImplPath(repositoryImplPath: string, featureNameSnakeCase: string): string | undefined {
  const repoDir = path.dirname(repositoryImplPath);
  const parentDir = path.dirname(repoDir);
  const candidates = [
    path.join(repoDir, `mock_${featureNameSnakeCase}_repository_impl.dart`),
    path.join(repoDir, 'mock', `mock_${featureNameSnakeCase}_repository_impl.dart`),
    path.join(parentDir, 'mock', `mock_${featureNameSnakeCase}_repository_impl.dart`),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function buildImportList(base: string[], extra?: string): string[] {
  const imports = [...base];
  if (extra) {
    imports.push(`import '${extra}';`);
  }
  return imports;
}

function buildRepoImports(resolver: ModuleMethodPathResolver, baseImports: string[], modelType?: string): string[] {
  const imports = [...baseImports];
  if (modelType) {
    const modelImport = resolver.getModelImportPath(resolver.repositoryImplPath, modelType);
    if (modelImport) {
      imports.push(`import '${modelImport}';`);
    }
  }
  const dataSourceImport = resolver.getDataSourceImportPath(resolver.repositoryImplPath);
  if (dataSourceImport) {
    imports.push(`import '${dataSourceImport}';`);
  }
  return imports;
}

function buildDataSourceClassNames(featureNamePascalCase: string): string[] {
  return [
    `${featureNamePascalCase}DataSource`,
    `${featureNamePascalCase}RemoteDataSource`,
    `${featureNamePascalCase}LocalDataSource`,
  ];
}

async function openWorkingFiles(
  resolver: ModuleMethodPathResolver,
  baseReturnType: string,
  baseTypeName: string,
  methodName: string,
) {
  const leftUri =
    baseReturnType !== 'void'
      ? vscode.Uri.file(resolver.getModelPath(baseTypeName))
      : resolver.dataSourcePath
        ? vscode.Uri.file(resolver.dataSourcePath)
        : vscode.Uri.file(resolver.domainRepositoryPath);
  const leftDoc = await vscode.workspace.openTextDocument(leftUri);
  await vscode.window.showTextDocument(leftDoc, { viewColumn: vscode.ViewColumn.One, preview: false });

  if (!resolver.remoteDataSourceImplPath) {
    return;
  }
  const remoteUri = vscode.Uri.file(resolver.remoteDataSourceImplPath);
  const remoteDoc = await vscode.workspace.openTextDocument(remoteUri);
  const remoteEditor = await vscode.window.showTextDocument(remoteDoc, {
    viewColumn: vscode.ViewColumn.Two,
    preview: false,
  });
  highlightMethodInEditor(remoteEditor, methodName);
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
