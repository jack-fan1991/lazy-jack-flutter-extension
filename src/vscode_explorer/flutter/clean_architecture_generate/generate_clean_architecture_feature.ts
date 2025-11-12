import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as changeCase from "change-case";
import { reFormat } from '../../../utils/src/vscode_utils/activate_editor_utils';
import { APP } from '../../../extension';
import { RouteConfigurationResult, route_page_args_file_name } from '../page_and_route_generate/generate_route_temp';
import { toUpperCamelCase } from '../../../utils/src/regex/regex_utils';
import { customCubitConfigProvider, CustomCubitConfig } from '../../../config/custom_cubit_config_provider';
import { replaceCubitWithCustom } from '../../../helper/dart/custom_cubit_replacer';

const command_clean_architecture = "command_clean_architecture";

export function registerCleanArchitectureGenerate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(command_clean_architecture, async (folderUri) => {
        let featureName = await vscode.window.showInputBox({
            placeHolder: '輸入功能名稱 (例如: user profile)',
            prompt: '將會自動轉換為蛇形命名 (snake_case)',
        });

        if (!featureName) {
            vscode.window.showErrorMessage('功能名稱不可為空');
            return;
        }

        featureName = changeCase.snakeCase(featureName);

        const registerRouteChoice = await vscode.window.showQuickPick(
            ['完成後註冊路由', '暫時不註冊'],
            {
                placeHolder: '是否在產生完成後自動註冊路由?',
                title: 'Clean Architecture 產生器',
            }
        );

        if (!registerRouteChoice) {
            vscode.window.showWarningMessage('已取消建立功能');
            return;
        }

        const shouldRegisterRoute = registerRouteChoice === '完成後註冊路由';

        const dataLayerChoice = await vscode.window.showQuickPick(
            ['建立 Data 層', '不建立 Data 層 (使用外部模組)'],
            {
                placeHolder: '是否建立 Data 層?',
                title: 'Clean Architecture 產生器',
            }
        );

        if (!dataLayerChoice) {
            vscode.window.showWarningMessage('已取消建立功能');
            return;
        }

        const useDataLayer = dataLayerChoice === '建立 Data 層';

        let useEntitiesLayer = true;
        if (useDataLayer) {
            const entitiesChoice = await vscode.window.showQuickPick(
                ['使用 Entities 層', '不使用 Entities 層'],
                {
                    placeHolder: '是否建立 Entities 層?',
                    title: 'Clean Architecture 產生器',
                }
            );

            if (!entitiesChoice) {
                vscode.window.showWarningMessage('已取消建立功能');
                return;
            }

            useEntitiesLayer = entitiesChoice === '使用 Entities 層';
        } else {
            vscode.window.showInformationMessage('未建立 Data 層時會自動啟用 Entities 層以保持資料流程。');
        }

        const resolver = new PathResolver(folderUri.path, featureName, useEntitiesLayer, useDataLayer);

        try {
            // 1. 創建所有資料夾
            createDirectoryStructure(resolver);

            // 2. 產生所有檔案
            createFeatureFiles(resolver);

            // 3. 完成後操作
            const uri = vscode.Uri.file(resolver.presentation.page);
            await vscode.window.showTextDocument(uri);
            await reFormat();
            await promptCustomCubitReplacement(resolver);
            if (shouldRegisterRoute) {
                await registerRoute(resolver);
            }
          

        } catch (err: any) {
            console.error(err);
            vscode.window.showErrorMessage(`創建功能失敗: ${err.message}`);
        }
    }));
}

function createDirectoryStructure(resolver: PathResolver) {
    const dirs = [
        resolver.featureDir,
        resolver.di.dir,
        resolver.domain.dir,
        ...(resolver.useEntities ? [resolver.domain.entitiesDir] : []),
        resolver.domain.repoDir,
        resolver.domain.usecasesDir,
        ...(resolver.useDataLayer ? [
            resolver.data.dir,
            resolver.data.datasourcesDir,
            resolver.data.modelsDir,
            resolver.data.repoImplsDir,
        ] : []),
        resolver.presentation.dir,
        resolver.presentation.blocDir,
        resolver.presentation.modelsDir,
        resolver.presentation.widgetsDir,
        resolver.presentation.pagesDir,
    ];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

function createFeatureFiles(resolver: PathResolver) {
    // DI
    fs.writeFileSync(resolver.di.injection, getDiInjectionTemplate(resolver));

    // Domain
    if (resolver.useEntities) {
        fs.writeFileSync(resolver.domain.entity, getDomainEntityTemplate(resolver));
    }
    fs.writeFileSync(resolver.domain.repository, getDomainRepositoryTemplate(resolver));
    fs.writeFileSync(resolver.domain.usecase, getDomainUsecaseTemplate(resolver));

    // Data
    if (resolver.useDataLayer) {
        fs.writeFileSync(resolver.data.datasource, getDataDatasourceTemplate(resolver));
        fs.writeFileSync(resolver.data.datasourceImpl, getDataDatasourceImplTemplate(resolver));
        fs.writeFileSync(resolver.data.model, getDataModelTemplate(resolver));
        fs.writeFileSync(resolver.data.repositoryImpl, getDataRepositoryImplTemplate(resolver));
    }

    // Presentation
    fs.writeFileSync(resolver.presentation.cubit, getPresentationCubitTemplate(resolver));
    fs.writeFileSync(resolver.presentation.state, getPresentationStateTemplate(resolver));
    fs.writeFileSync(resolver.presentation.uiModel, getPresentationUiModelTemplate(resolver));
    fs.writeFileSync(resolver.presentation.widget, getPresentationWidgetTemplate(resolver));
    fs.writeFileSync(resolver.presentation.page, getPresentationPageTemplate(resolver));
}

async function registerRoute(resolver: PathResolver): Promise<void> {
    const importPathValue = path.join(
        resolver.libDir,
        `${resolver.featureNameSnakeCase}`,
        'presentation',
        'pages',
        `${resolver.featureNameSnakeCase}_page.dart`
    ).replace(/\\/g, '/');

    const importStatement = `import 'package:${APP.flutterLibName}/${importPathValue}';`;
    const argType = `Route${resolver.pageName}Args`;

    const result = await vscode.commands.executeCommand<RouteConfigurationResult>(
        "command_create_routeConfiguration",
        resolver.featureNamePascalCase,
        `${resolver.pageName}.routeName`,
        importStatement,
        resolver.pageName,
        resolver.featureNamePascalCase,
        argType,
        { openEditor: false }
    );

    if (!result) {
        return;
    }

    const viewAction = '檢視路由';
    vscode.window.showInformationMessage('路由設定已更新', viewAction).then(async (selection) => {
        if (selection === viewAction) {
            await openRoutePreview(result);
        }
    });
}

async function openRoutePreview(result: RouteConfigurationResult): Promise<void> {
    try {
        const document = await vscode.workspace.openTextDocument(vscode.Uri.file(result.routeFilePath));
        const editor = await vscode.window.showTextDocument(document, { preview: false });
        const text = document.getText();

        let target = result.handlerSnippet;
        let offset = text.indexOf(target);

        if (offset === -1) {
            target = result.routeCaseLabel;
            offset = text.indexOf(target);
        }

        if (offset === -1) {
            vscode.window.showWarningMessage('無法定位新路由，請手動檢視 route_configuration.dart');
            return;
        }

        const start = document.positionAt(offset);
        const end = document.positionAt(offset + target.length);
        const range = new vscode.Range(start, end);
        editor.selection = new vscode.Selection(range.start, range.end);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    } catch (error) {
        vscode.window.showErrorMessage(`無法開啟 RouteConfiguration: ${(error as Error).message}`);
    }
}

async function promptCustomCubitReplacement(resolver: PathResolver): Promise<void> {
    const customCubits = customCubitConfigProvider();
    if (customCubits.length === 0) {
        return;
    }

    if (!fs.existsSync(resolver.presentation.cubit)) {
        return;
    }

    const quickPickItems: CustomCubitQuickPickItem[] = [
        {
            label: '維持預設 Cubit',
            description: '不進行自訂替換',
            config: null,
        },
        ...customCubits.map(config => ({
            label: config.name,
            description: config.import,
            config,
        })),
    ];

    const picked = await vscode.window.showQuickPick(quickPickItems, {
        placeHolder: '是否改用自訂 Cubit 實作?',
    });

    if (!picked || !picked.config) {
        return;
    }

    try {
        const cubitDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(resolver.presentation.cubit));
        const success = await replaceCubitWithCustom(cubitDocument, picked.config, {
            viewFileUri: vscode.Uri.file(resolver.presentation.widget),
        });
        if (success) {
            vscode.window.showInformationMessage(`已使用 ${picked.config.name} 取代預設 Cubit`);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`自訂 Cubit 替換失敗: ${(error as Error).message}`);
    }
}

interface CustomCubitQuickPickItem extends vscode.QuickPickItem {
    config: CustomCubitConfig | null;
}

// #region Templates

function getDiInjectionTemplate(r: PathResolver): string {
    return `
// TODO: Configure dependency injection for this module
// import 'package:get_it/get_it.dart';

// final _getIt = GetIt.instance;

void setup${r.featureNamePascalCase}Dependencies() {
  // Services
  // _getIt.registerLazySingleton(() => ApiService());

  // Datasources
  // _getIt.registerLazySingleton<${r.datasourceName}>(() => ${r.datasourceImplName}(_getIt()));

  // Repositories
  // _getIt.registerLazySingleton<${r.repositoryName}>(() => ${r.repositoryImplName}(remoteDataSource: _getIt()));

  // UseCases
  // _getIt.registerLazySingleton(() => ${r.usecaseName}(_getIt());

  // Blocs
  // _getIt.registerFactory(() => ${r.cubitName}(_getIt());
}
`;
}

function getDomainEntityTemplate(r: PathResolver): string {
    return `
import 'package:equatable/equatable.dart';

class ${r.entityName} extends Equatable {
  // TODO: Define entity fields
  final String id;
  final String name;

  const ${r.entityName}({
    required this.id,
    required this.name,
  });

  @override
  List<Object?> get props => [id, name];
}
`;
}

function getDomainRepositoryTemplate(r: PathResolver): string {
    if (r.useEntities) {
        return `
import '${r.importPath("domain", "entity")}';

abstract class ${r.repositoryName} {
  Future<${r.entityName}> get${r.featureNamePascalCase}(String id);
}
`;
    }

    return `
import '${r.importPath("data", "model")}';

abstract class ${r.repositoryName} {
  Future<${r.modelName}> get${r.featureNamePascalCase}(String id);
}
`;
}

function getDomainUsecaseTemplate(r: PathResolver): string {
    if (r.useEntities) {
        return `
import '${r.importPath("domain", "entity")}';
import '${r.importPath("domain", "repository")}';

class ${r.usecaseName} {
  final ${r.repositoryName} repository;

  ${r.usecaseName}(this.repository);

  Future<${r.entityName}> call(String id) async {
    // Add parameter validation, logging, or other business rules here
    return await repository.get${r.featureNamePascalCase}(id);
  }
}
`;
    }

    return `
import '${r.importPath("data", "model")}';
import '${r.importPath("domain", "repository")}';

class ${r.usecaseName} {
  final ${r.repositoryName} repository;

  ${r.usecaseName}(this.repository);

  Future<${r.modelName}> call(String id) async {
    return await repository.get${r.featureNamePascalCase}(id);
  }
}
`;
}

function getDataDatasourceTemplate(r: PathResolver): string {
    return `
import '${r.importPath("data", "model")}';

abstract class ${r.datasourceName} {
  Future<${r.modelName}> fetch${r.featureNamePascalCase}(String id);
}
`;
}

function getDataDatasourceImplTemplate(r: PathResolver): string {
    return `
import '${r.importPath("data", "datasource")}';
import '${r.importPath("data", "model")}';

// import 'package:dio/dio.dart'; // Example

class ${r.datasourceImplName} implements ${r.datasourceName} {
  // final Dio dio;
  // ${r.datasourceImplName}(this.dio);

  @override
  Future<${r.modelName}> fetch${r.featureNamePascalCase}(String id) async {
    // final response = await dio.get('/${r.featureNameSnakeCase}/$id');
    // if (response.statusCode == 200) {
    //   return ${r.modelName}.fromJson(response.data);
    // } else {
    //   throw Exception('Failed to load ${r.featureNameSnakeCase}');
    // }
    await Future.delayed(const Duration(seconds: 1));
    return ${r.modelName}(id: '1', name: 'Sample data');
  }
}
`;
}

function getDataModelTemplate(r: PathResolver): string {
    if (r.useEntities) {
        return `
import '${r.importPath("domain", "entity")}';
import 'package:freezed_annotation/freezed_annotation.dart';

part '${r.featureNameSnakeCase}_model.freezed.dart';
part '${r.featureNameSnakeCase}_model.g.dart';

@freezed
class ${r.modelName} with _$${r.modelName} {
    const ${r.modelName}._();

    const factory ${r.modelName}({
      required String id,
      required String name,
    }) = _${r.modelName};

    factory ${r.modelName}.fromJson(Map<String, dynamic> json) => _$${r.modelName}FromJson(json);

    // Convert data model to the corresponding domain entity
    ${r.entityName} toEntity() {
      return ${r.entityName}(
        id: id,
        name: name,
      );
    }
}
`;
    }

    return `
import 'package:freezed_annotation/freezed_annotation.dart';

part '${r.featureNameSnakeCase}_model.freezed.dart';
part '${r.featureNameSnakeCase}_model.g.dart';

@freezed
class ${r.modelName} with _$${r.modelName} {
    const ${r.modelName}._();

    const factory ${r.modelName}({
      required String id,
      required String name,
    }) = _${r.modelName};

    factory ${r.modelName}.fromJson(Map<String, dynamic> json) => _$${r.modelName}FromJson(json);
}
`;
}

function getDataRepositoryImplTemplate(r: PathResolver): string {
    if (r.useEntities) {
        return `
import '${r.importPath("data", "datasource")}';
import '${r.importPath("domain", "entity")}';
import '${r.importPath("domain", "repository")}';

class ${r.repositoryImplName} implements ${r.repositoryName} {
  final ${r.datasourceName} remoteDataSource;
  // final ${r.datasourceName} localDataSource;

  ${r.repositoryImplName}({
    required this.remoteDataSource,
    // required this.localDataSource,
  });

  @override
  Future<${r.entityName}> get${r.featureNamePascalCase}(String id) async {
    try {
      // final remoteData = await remoteDataSource.fetch${r.featureNamePascalCase}(id);
      // return remoteData.toEntity();
      await Future.delayed(const Duration(seconds: 1));
      return ${r.entityName}(id: '1', name: 'Sample data');
    } catch (e) {
      // Handle failures, e.g. fallback to local source or throw custom errors
      throw Exception('Failed to get data for $id');
    }
  }
}
`;
    }

    return `
import '${r.importPath("data", "datasource")}';
import '${r.importPath("data", "model")}';
import '${r.importPath("domain", "repository")}';

class ${r.repositoryImplName} implements ${r.repositoryName} {
  final ${r.datasourceName} remoteDataSource;
  // final ${r.datasourceName} localDataSource;

  ${r.repositoryImplName}({
    required this.remoteDataSource,
    // required this.localDataSource,
  });

  @override
  Future<${r.modelName}> get${r.featureNamePascalCase}(String id) async {
    try {
      final remoteData = await remoteDataSource.fetch${r.featureNamePascalCase}(id);
      return remoteData;
    } catch (e) {
      // Handle failures, e.g. fallback to local source or throw custom errors
      throw Exception('Failed to get data for $id');
    }
  }
}
`;
}

function getPresentationCubitTemplate(r: PathResolver): string {
    if (r.useEntities) {
        return `
import 'package:bloc/bloc.dart';
import '${r.importPath("presentation", "state")}';
import '${r.importPath("domain", "usecase")}';
import '${r.importPath("presentation", "uiModel")}';

class ${r.cubitName} extends Cubit<${r.stateName}> {
  final ${r.usecaseName} _get${r.featureNamePascalCase};

  ${r.cubitName}(this._get${r.featureNamePascalCase}) : super(const ${r.stateName}.initial());

  Future<void> fetch(String id) async {
    emit(const ${r.stateName}.loading());
    try {
      final entity = await _get${r.featureNamePascalCase}.call(id);
      final uiModel = ${r.uiModelName}.fromEntity(entity);
      emit(${r.stateName}.success(uiModel));
    } catch (e) {
      emit(${r.stateName}.failure(e.toString()));
    }
  }
}
`;
    }

    return `
import 'package:bloc/bloc.dart';
import '${r.importPath("presentation", "state")}';
import '${r.importPath("domain", "usecase")}';
import '${r.importPath("presentation", "uiModel")}';

class ${r.cubitName} extends Cubit<${r.stateName}> {
  final ${r.usecaseName} _get${r.featureNamePascalCase};

  ${r.cubitName}(this._get${r.featureNamePascalCase}) : super(const ${r.stateName}.initial());

  Future<void> fetch(String id) async {
    emit(const ${r.stateName}.loading());
    try {
      final model = await _get${r.featureNamePascalCase}.call(id);
      final uiModel = ${r.uiModelName}.fromModel(model);
      emit(${r.stateName}.success(uiModel));
    } catch (e) {
      emit(${r.stateName}.failure(e.toString()));
    }
  }
}
`;
}

function getPresentationStateTemplate(r: PathResolver): string {
    return `
import 'package:freezed_annotation/freezed_annotation.dart';
import '${r.importPath("presentation", "uiModel")}';

part '${r.featureNameSnakeCase}_state.freezed.dart';

@freezed
class ${r.stateName} with _$${r.stateName} {
  const factory ${r.stateName}.initial() = _Initial;
  const factory ${r.stateName}.loading() = _Loading;
  const factory ${r.stateName}.success(final ${r.uiModelName} uiModel) = _Success;
  const factory ${r.stateName}.failure(final String message) = _Failure;
}
`;
}

function getPresentationUiModelTemplate(r: PathResolver): string {
    if (r.useEntities) {
        return `
import 'package:freezed_annotation/freezed_annotation.dart';
import '${r.importPath("domain", "entity")}';

part '${r.featureNameSnakeCase}_ui_model.freezed.dart';

@freezed
class ${r.uiModelName} with _$${r.uiModelName} {
  const factory ${r.uiModelName}({
    required String title,
    required String subtitle,
  }) = _${r.uiModelName};

  factory ${r.uiModelName}.fromEntity(${r.entityName} entity) {
    return ${r.uiModelName}(
      title: 'ID: \${entity.id}',
      subtitle: 'Name: \${entity.name}',
    );
  }
}
`;
    }

    return `
import 'package:freezed_annotation/freezed_annotation.dart';
import '${r.importPath("data", "model")}';

part '${r.featureNameSnakeCase}_ui_model.freezed.dart';

@freezed
class ${r.uiModelName} with _$${r.uiModelName} {
  const factory ${r.uiModelName}({
    required String title,
    required String subtitle,
  }) = _${r.uiModelName};

  factory ${r.uiModelName}.fromModel(${r.modelName} model) {
    return ${r.uiModelName}(
      title: 'ID: \${model.id}',
      subtitle: 'Name: \${model.name}',
    );
  }
}
`;
}

function getPresentationWidgetTemplate(r: PathResolver): string {
    return `
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '${r.importPath("presentation", "cubit")}';
import '${r.importPath("presentation", "state")}';
import '${r.importPath("presentation", "uiModel")}';

class ${r.widgetName} extends StatelessWidget {
  const ${r.widgetName}({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<${r.cubitName}, ${r.stateName}>(
      builder: (context, state) {
        return state.when(
          initial: () => const Center(child: Text('Please click the button to load data')),
          loading: () => const Center(child: CircularProgressIndicator()),
          success: (uiModel) => Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(uiModel.title),
                Text(uiModel.subtitle),
              ],
            ),
          ),
          failure: (message) => Center(child: Text('Error: \$message')),
        );
      },
    );
  }
}
`;
}

function getPresentationPageTemplate(r: PathResolver): string {
  const argType = `Route${r.pageName}Args`;
  const webPath = changeCase.paramCase(r.featureNameSnakeCase);
  const featurePath = `${r.libDir}/${r.featureNameSnakeCase}`;
  const repoImplImport = `package:${APP.flutterLibName}/${featurePath}/data/repo_impls/${r.featureNameSnakeCase}_repository_impl.dart`;
  const datasourceImplImport = `package:${APP.flutterLibName}/${featurePath}/data/sources/${r.featureNameSnakeCase}_remote_data_source_impl.dart`;
  const dataImports = r.useDataLayer
    ? `
import '${r.importPath("domain", "repository")}';
import '${repoImplImport}';
import '${datasourceImplImport}';
`
    : `
import '${r.importPath("domain", "repository")}';
`;
  const manualTip = r.useDataLayer
    ? "// Prefer DI tools (e.g., get_it) over manual instantiation."
    : "// TODO: Provide concrete Repository and Cubit implementations via external modules or DI.";
  const cubitInitBlock = r.useDataLayer
    ? `
    final remoteDataSource = ${r.datasourceImplName}();
    final repository = ${r.repositoryImplName}(remoteDataSource: remoteDataSource);
    final usecase = ${r.usecaseName}(repository);
    _cubit = ${r.cubitName}(usecase);
    _cubit.fetch(widget.args.exampleId ?? '1'); // Initial data fetch
`
    : `
    _cubit = throw UnimplementedError('Inject ${r.cubitName} via your module here');
    // Example: _cubit = GetIt.instance<${r.cubitName}>();
    _cubit.fetch(widget.args.exampleId ?? '1');
`;

  return `
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:${APP.flutterLibName}/route/${route_page_args_file_name}';
import '${r.importPath("presentation", "cubit")}';
import '${r.importPath("presentation", "view")}';
import '${r.importPath("domain", "usecase")}';
${dataImports}

${manualTip}

class ${argType} extends RouteArgs {
  // TODO: Define the parameters required for this page here
  final String? exampleId;

  const ${argType}({this.exampleId})
      : super(routeName: ${r.pageName}.routeName);

  factory ${argType}.fromMap(Map<String, dynamic> map) {
    return ${argType}(
      exampleId: map['exampleId'] as String?,
    );
  }
}

class ${r.pageName} extends StatefulWidget {
  static const routeName = '${webPath}';
  final ${argType} args;

  const ${r.pageName}({
    super.key,
    required this.args,
  });

  @override
  State<${r.pageName}> createState() => _${r.pageName}State();
}

class _${r.pageName}State extends State<${r.pageName}> {
  // In a real project, you would use a dependency injection tool like get_it to get the cubit instance.
  // final ${r.cubitName} _cubit = GetIt.instance<${r.cubitName}>();
  late final ${r.cubitName} _cubit;

  @override
  void initState() {
    super.initState();
    // Manual injection for demonstration only.
    // Use DI frameworks such as get_it in production code.
${cubitInitBlock}
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => _cubit,
      child: Scaffold(
        appBar: AppBar(
          title: Text('${r.featureNamePascalCase} Page'),
        ),
        body: SafeArea(
          child: const ${r.widgetName}(),
        ),
        floatingActionButton: FloatingActionButton(
          onPressed: () {
            _cubit.fetch(widget.args.exampleId ?? '1');
          },
          child: const Icon(Icons.refresh),
        ),
      ),
    );
  }
}
`;
}

// #endregion

class PathResolver {
    // Base Paths
    public readonly rootPath: string;
    public readonly libDir: string;
    public readonly featureDir: string;
    public readonly useEntities: boolean;
    public readonly useDataLayer: boolean;

    // Feature Names
    public readonly featureNameSnakeCase: string;
    public readonly featureNamePascalCase: string;

    // Layer Directories
    public readonly di: { dir: string; injection: string };
    public readonly domain: { dir: string; entitiesDir: string; repoDir: string; usecasesDir: string; entity: string; repository: string; usecase: string; };
    public readonly data: { dir: string; datasourcesDir: string; modelsDir: string; repoImplsDir: string; datasource: string; datasourceImpl: string; model: string; repositoryImpl: string; };
    public readonly presentation: { dir: string; blocDir: string; modelsDir: string; widgetsDir: string; pagesDir: string; cubit: string; state: string; uiModel: string; widget: string; page: string; };

    // Class Names
    public readonly entityName: string;
    public readonly repositoryName: string;
    public readonly usecaseName: string;
    public readonly datasourceName: string;
    public readonly datasourceImplName: string;
    public readonly modelName: string;
    public readonly repositoryImplName: string;
    public readonly cubitName: string;
    public readonly stateName: string;
    public readonly uiModelName: string;
    public readonly widgetName: string;
    public readonly pageName: string;

    constructor(currentPath: string, featureName: string, useEntities: boolean, useDataLayer: boolean) {
        this.rootPath = currentPath;
        this.featureNameSnakeCase = featureName;
        this.featureNamePascalCase = toUpperCamelCase(featureName);
        this.useEntities = useEntities;
        this.useDataLayer = useDataLayer;

        this.libDir = this.rootPath.split('lib/')[1];
        this.featureDir = path.join(this.rootPath, `${this.featureNameSnakeCase}`);

        // DI Paths
        this.di = {
            dir: path.join(this.featureDir, 'di'),
            injection: path.join(this.featureDir, 'di', 'injection.dart'),
        };

        // Domain Paths
        this.domain = {
            dir: path.join(this.featureDir, 'domain'),
            entitiesDir: path.join(this.featureDir, 'domain', 'entities'),
            repoDir: path.join(this.featureDir, 'domain', 'repo'),
            usecasesDir: path.join(this.featureDir, 'domain', 'usecases'),
            entity: path.join(this.featureDir, 'domain', 'entities', `${this.featureNameSnakeCase}_entity.dart`),
            repository: path.join(this.featureDir, 'domain', 'repo', `${this.featureNameSnakeCase}_repository.dart`),
            usecase: path.join(this.featureDir, 'domain', 'usecases', `get_${this.featureNameSnakeCase}.dart`),
        };

        // Data Paths
        this.data = {
            dir: path.join(this.featureDir, 'data'),
            datasourcesDir: path.join(this.featureDir, 'data', 'sources'),
            modelsDir: path.join(this.featureDir, 'data', 'models'),
            repoImplsDir: path.join(this.featureDir, 'data', 'repo_impls'),
            datasource: path.join(this.featureDir, 'data', 'sources', `${this.featureNameSnakeCase}_data_source.dart`),
            datasourceImpl: path.join(this.featureDir, 'data', 'sources', `${this.featureNameSnakeCase}_remote_data_source_impl.dart`),
            model: path.join(this.featureDir, 'data', 'models', `${this.featureNameSnakeCase}_model.dart`),
            repositoryImpl: path.join(this.featureDir, 'data', 'repo_impls', `${this.featureNameSnakeCase}_repository_impl.dart`),
        };
        // Presentation Paths
        this.presentation = {
            dir: path.join(this.featureDir, 'presentation'),
            blocDir: path.join(this.featureDir, 'presentation', 'bloc'),
            modelsDir: path.join(this.featureDir, 'presentation', 'models'),
            widgetsDir: path.join(this.featureDir, 'presentation', 'widgets'),
            pagesDir: path.join(this.featureDir, 'presentation', 'pages'),
            cubit: path.join(this.featureDir, 'presentation', 'bloc', `${this.featureNameSnakeCase}_cubit.dart`),
            state: path.join(this.featureDir, 'presentation', 'bloc', `${this.featureNameSnakeCase}_state.dart`),
            uiModel: path.join(this.featureDir, 'presentation', 'models', `${this.featureNameSnakeCase}_ui_model.dart`),
            widget: path.join(this.featureDir, 'presentation', 'widgets', `${this.featureNameSnakeCase}_view.dart`),
            page: path.join(this.featureDir, 'presentation', 'pages', `${this.featureNameSnakeCase}_page.dart`),
        };

        // Class Names
        this.entityName = `${this.featureNamePascalCase}Entity`;
        this.repositoryName = `${this.featureNamePascalCase}Repository`;
        this.usecaseName = `Get${this.featureNamePascalCase}`;
        this.datasourceName = `${this.featureNamePascalCase}RemoteDataSource`;
        this.datasourceImplName = `${this.featureNamePascalCase}RemoteDataSourceImpl`;
        this.modelName = `${this.featureNamePascalCase}Model`;
        this.repositoryImplName = `${this.featureNamePascalCase}RepositoryImpl`;
        this.cubitName = `${this.featureNamePascalCase}Cubit`;
        this.stateName = `${this.featureNamePascalCase}State`;
        this.uiModelName = `${this.featureNamePascalCase}UiModel`;
        this.widgetName = `${this.featureNamePascalCase}View`;
        this.pageName = `${this.featureNamePascalCase}Page`;
    }

    public importPath(layer: 'domain' | 'data' | 'presentation', file: 'entity' | 'repository' | 'usecase' | 'datasource' | 'model' | 'repositoryImpl' | 'cubit' | 'state' | 'uiModel' | 'view' | 'page'): string {
        const featurePath = `${this.libDir}/${this.featureNameSnakeCase}`;
        switch (layer) {
            case 'domain':
                if (file === 'entity') return `package:${APP.flutterLibName}/${featurePath}/domain/entities/${this.featureNameSnakeCase}_entity.dart`;
                if (file === 'repository') return `package:${APP.flutterLibName}/${featurePath}/domain/repo/${this.featureNameSnakeCase}_repository.dart`;
                if (file === 'usecase') return `package:${APP.flutterLibName}/${featurePath}/domain/usecases/get_${this.featureNameSnakeCase}.dart`;
                break;
            case 'data':
                 if (file === 'datasource') return `package:${APP.flutterLibName}/${featurePath}/data/sources/${this.featureNameSnakeCase}_data_source.dart`;
                 if (file === 'model') return `package:${APP.flutterLibName}/${featurePath}/data/models/${this.featureNameSnakeCase}_model.dart`;
                 break;
            case 'presentation':
                if (file === 'cubit') return `package:${APP.flutterLibName}/${featurePath}/presentation/bloc/${this.featureNameSnakeCase}_cubit.dart`;
                if (file === 'state') return `package:${APP.flutterLibName}/${featurePath}/presentation/bloc/${this.featureNameSnakeCase}_state.dart`;
                if (file === 'view') return `package:${APP.flutterLibName}/${featurePath}/presentation/widgets/${this.featureNameSnakeCase}_view.dart`;
                if (file === 'uiModel') return `package:${APP.flutterLibName}/${featurePath}/presentation/models/${this.featureNameSnakeCase}_ui_model.dart`;
                break;
        }
        throw new Error(`Invalid import path combination: ${layer}/${file}`);
    }
}
