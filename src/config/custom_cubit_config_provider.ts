import * as vscode from 'vscode';

const EXTENSION_NAMESPACE = 'lazy-jack-flutter-extension';
const CUSTOM_CUBIT_KEY = 'customCubit';

export interface CustomCubitConfig {
    name: string;
    import: string;
}

/**
 * 集中讀取 customCubit 設定並驗證內容。
 */
export function customCubitConfigProvider(): CustomCubitConfig[] {
    const config = vscode.workspace.getConfiguration(EXTENSION_NAMESPACE);
    const rawList = config.get<CustomCubitConfig[]>(CUSTOM_CUBIT_KEY) ?? [];

    return rawList
        .map(item => ({
            name: (item?.name ?? '').trim(),
            import: (item?.import ?? '').trim(),
        }))
        .filter(item => item.name.length > 0);
}
