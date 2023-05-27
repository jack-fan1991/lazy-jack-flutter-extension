import { getRelativePath } from "../../../utils/src/vscode_utils/editor_utils";

export function createPartOfLine(file1: string, file2: string, fileName: string | undefined = undefined): string {
    let relativePath = getRelativePath(file1, file2, fileName)
    if (relativePath.split('/')[0] != '..' || relativePath.split('/').length === 1) {
        relativePath = `./${relativePath}`;
    }
    return `part of '${relativePath}';`

}