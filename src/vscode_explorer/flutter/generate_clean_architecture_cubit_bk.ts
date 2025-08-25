
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { toUpperCamelCase } from '../../utils/src/regex/regex_utils';
import { reFormat } from '../../utils/src/vscode_utils/activate_editor_utils';
import * as changeCase from "change-case";
import { APP } from '../../extension';

const command_add_usecase_to_feature = "command_add_clean_architecture_cubit";

export function registerCleanArchitectureCubitGenerate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(command_add_usecase_to_feature, async (folderUri) => {

        // 1. 尋找功能模組的根目錄
        const featureRoot = findFeatureRoot(folderUri.path);
        if (!featureRoot) {
            vscode.window.showErrorMessage('無法找到功能模組根目錄。請確保您在一個包含 domain, data, presentation 資料夾的功能模組內。');
            return;
        }

        // 2. 獲取 UseCase 名稱
        const useCaseNameInput = await vscode.window.showInputBox({
            placeHolder: '例如: get_user_details 或 update_password',
            prompt: '輸入新的 UseCase 名稱 (將自動轉為蛇形)',
        });

        if (!useCaseNameInput) {
            vscode.window.showErrorMessage('UseCase 名稱不可為空');
            return;
        }
        const useCaseName = changeCase.snakeCase(useCaseNameInput);

        // 3. 初始化路徑與名稱解析器
        const featureName = path.basename(featureRoot);
        const resolver = new PathResolver(path.dirname(featureRoot), featureName);
        const useCasePascal = toUpperCamelCase(useCaseName);

        try {
            // 4. 定義新檔案路徑
            const useCasePath = path.join(resolver.domain.usecasesDir, `${useCaseName}.dart`);
            const cubitPath = path.join(resolver.presentation.blocDir, `${useCaseName}_cubit.dart`);
            const statePath = path.join(resolver.presentation.blocDir, `${useCaseName}_state.dart`);

            // 5. 產生樣板檔案
            fs.writeFileSync(useCasePath, getUseCaseTemplate(resolver, useCaseName, useCasePascal));
            fs.writeFileSync(cubitPath, getCubitTemplate(resolver, useCaseName, useCasePascal));
            fs.writeFileSync(statePath, getStateTemplate(resolver, useCaseName, useCasePascal));

            // 6. 完成後操作
            const uri = vscode.Uri.file(cubitPath);
            await vscode.window.showTextDocument(uri);
            await reFormat();

            vscode.window.showInformationMessage(`✅ UseCase ${useCasePascal} 及相關檔案已成功新增至 ${featureName} 模組!`);

        } catch (err: any) {
            console.error(err);
            vscode.window.showErrorMessage(`新增 UseCase 失敗: ${err.message}`);
        }
    }));
}

/**
 * 從目前路徑向上遍歷，尋找包含 domain, data, presentation 的資料夾作為功能模組的根目錄
 */
function findFeatureRoot(currentPath: string): string | null {
    let dir = fs.lstatSync(currentPath).isDirectory() ? currentPath : path.dirname(currentPath);
    while (dir !== path.dirname(dir)) {
        const hasDomain = fs.existsSync(path.join(dir, 'domain'));
        const hasData = fs.existsSync(path.join(dir, 'data'));
        const hasPresentation = fs.existsSync(path.join(dir, 'presentation'));

        if (hasDomain && hasData && hasPresentation) {
            return dir;
        }
        dir = path.dirname(dir);
    }
    return null;
}

// #region Templates

function getUseCaseTemplate(r: PathResolver, useCaseName: string, useCasePascal: string): string {
    return `
import '${r.importPath("domain", "repository")}';
// import 'package:dartz/dartz.dart'; // 建議使用 dartz 處理錯誤

class ${useCasePascal} {
  final ${r.repositoryName} _repository;

  ${useCasePascal}(this._repository);

  // TODO: 1. 定義 UseCase 的參數與返回類型
  // TODO: 2. 前往 ${r.repositoryName} 新增對應的抽象方法
  // TODO: 3. 前往 ${r.repositoryImplName} 實作該方法
  Future<void> call(/* TODO: Add parameters */) async {
    // return await _repository.yourNewMethod(params);
  }
}
`;
}

function getCubitTemplate(r: PathResolver, useCaseName: string, useCasePascal: string): string {
    const stateName = `${useCasePascal}State`;
    return `
import 'package:bloc.dart';
import 'package:${APP.flutterLibName}/${r.libDir}/${r.featureNameSnakeCase}/domain/usecases/${useCaseName}.dart';
import 'package:${APP.flutterLibName}/${r.libDir}/${r.featureNameSnakeCase}/presentation/bloc/${useCaseName}_state.dart';

// TODO: 前往 di/injection.dart 註冊此 Cubit 和 UseCase

class ${useCasePascal}Cubit extends Cubit<${stateName}> {
  final ${useCasePascal} _useCase;

  ${useCasePascal}Cubit(this._useCase) : super(const ${stateName}.initial());

  Future<void> run() async {
    emit(const ${stateName}.loading());
    try {
      // final result = await _useCase.call(/* pass params */);
      // emit(${stateName}.success(result));
    } catch (e) {
      emit(${stateName}.failure(e.toString()));
    }
  }
}
`;
}

function getStateTemplate(r: PathResolver, useCaseName: string, useCasePascal: string): string {
    return `
import 'package:freezed_annotation.dart';

part '${useCaseName}_state.freezed.dart';

@freezed
class ${useCasePascal}State with _$${useCasePascal}State {
  const factory ${useCasePascal}State.initial() = _Initial;
  const factory ${useCasePascal}State.loading() = _Loading;
  // TODO: 定義 success 狀態需要的資料
  const factory ${useCasePascal}State.success() = _Success;
  const factory ${useCasePascal}State.failure(final String message) = _Failure;
}
`;
}

// #endregion

class PathResolver {
    public readonly rootPath: string;
    public readonly libDir: string;
    public readonly featureDir: string;
    public readonly featureNameSnakeCase: string;
    public readonly featureNamePascalCase: string;
    public readonly domain: { dir: string; entitiesDir: string; repositoriesDir: string; usecasesDir: string; repository: string; };
    public readonly data: { repositoryImpl: string; };
    public readonly presentation: { blocDir: string; };
    public readonly repositoryName: string;
    public readonly repositoryImplName: string;

    constructor(currentPath: string, featureName: string) {
        this.rootPath = currentPath;
        this.featureNameSnakeCase = featureName;
        this.featureNamePascalCase = toUpperCamelCase(featureName);

        const featureDirName = this.featureNameSnakeCase;
        this.libDir = this.rootPath.includes('lib') ? this.rootPath.split('lib/')[1] : '';
        this.featureDir = path.join(this.rootPath, featureDirName);

        this.domain = {
            dir: path.join(this.featureDir, 'domain'),
            entitiesDir: path.join(this.featureDir, 'domain', 'entities'),
            repositoriesDir: path.join(this.featureDir, 'domain', 'repositories'),
            usecasesDir: path.join(this.featureDir, 'domain', 'usecases'),
            repository: path.join(this.featureDir, 'domain', 'repositories', `${this.featureNameSnakeCase}_repository.dart`),
        };

        this.data = {
            repositoryImpl: path.join(this.featureDir, 'data', 'repository_impls', `${this.featureNameSnakeCase}_repository_impl.dart`),
        };

        this.presentation = {
            blocDir: path.join(this.featureDir, 'presentation', 'bloc'),
        };

        this.repositoryName = `${this.featureNamePascalCase}Repository`;
        this.repositoryImplName = `${this.featureNamePascalCase}RepositoryImpl`;
    }

    public importPath(layer: 'domain', file: 'repository'): string {
        const featurePath = path.join(this.libDir, this.featureNameSnakeCase).replace(/\\/g, '/');
        if (layer === 'domain' && file === 'repository') {
            return `package:${APP.flutterLibName}/${featurePath}/domain/repositories/${this.featureNameSnakeCase}_repository.dart`;
        }
        throw new Error(`Invalid import path combination: ${layer}/${file}`);
    }
}
