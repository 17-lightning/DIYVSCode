import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 向VSCode窗口输出一条信息（右下角的那种）
 * @param text 
 */
export function show_vscode_message(text : string): void {
    vscode.window.showInformationMessage(text);
}

/**
 * 调试内容都会用该函数打印，但正式发布版本里这个函数的内容是被注释掉的，如要使用烦请打开
 * @param text 
 */
export function debug(text: string): void { 
    console.log(text);
}

/**
 * 用于判断当前行是否为目标函数定义（由于只有一行输入，当前判断是不全面的）  
 * @param line 
 */
export function is_target_function_definition(line: string, target: string): boolean {
    if (line.length < 3) return false;
    if (!line.includes(" " + target + "(") && !line.includes(" *" + target + "(")) return false;
    if (line[0] == ' ' || line[0] == '\t' || line[0] == '\n' || line[0] == '\r' || line[0] == '#' || line[0] == '\\' || line[0] == '*') return false;
    if (line.includes(";")) return false;
    return true;
}

/**
 * 获取当前路径下，DIY-config.md中的指定属性，没有获取到时返回空字符串
 * @param target 
 */
export async function get_DIY_config(target : string) : Promise<string> {
    try {
        const editor = vscode.window.activeTextEditor;
        if (editor == undefined) {
            return "";
        }
        const workspace = vscode.workspace.getWorkspaceFolder(editor.document.uri);
        if (workspace == undefined) {
            return "";
        }
        let config = path.join(workspace.uri.fsPath, "DIY-config.md");
        if (!fs.existsSync(config)) {
            return "";
        }
        let document = await vscode.workspace.openTextDocument(vscode.Uri.file(config));
        let line : string
        let lineid = 0
        let array : string[]
        // DIY-config.md的前两行是表头，可以忽略
        for (lineid = 2; lineid < document.lineCount; lineid++) {
            line = document.lineAt(lineid).text;
            array = line.split("|");
            if (array.length < 2) {
                continue;
            }
            if (array[0] == target) {
                return array[1];
            }
        }
    } catch (error) {
        console.log("[get_DIY_config]中发生错误：" + error);
    }
    return "";
}

export function get_workspace_path() : string {
    let editor = vscode.window.activeTextEditor;
    if (editor == undefined) return "";
    let workspace = vscode.workspace.getWorkspaceFolder(editor.document.uri);
    if (workspace == undefined) return "";
    return workspace.uri.fsPath;
}

export function get_vscode_config(key : string) : string {
    let result = vscode.workspace.getConfiguration().get<string>('diyvscode.DiyLibrary');
    if (result == undefined) {
        return "";
    }
    return result;
}

/**
 * 将一个文件的内容以字符串形式全数读回
 * @param filepath
 */
export function load_text_file(filepath : string) : string {
    try {
        return fs.readFileSync(filepath, 'utf8');
    } catch (error) {
        console.log("加载[" + filepath + "]文件内容时发生故障");
        return "";
    }
}

/**
 * 获取当前文件的相对路径
 */
export function get_current_filepath() : string {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) return "";
    
    const documentUri = activeEditor.document.uri;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri);
    if (!workspaceFolder) return "";
    
    return path.relative(workspaceFolder.uri.fsPath, documentUri.fsPath);
}

/**
 * 获取当前选中的内容
 */
export function get_current_keyword() : string {
    try {
        return vscode.window.activeTextEditor!.document.getText(vscode.window.activeTextEditor!.selection);
    } catch (error) {
        return "";
    }
}

export function replace_variable(input: string, variables: Map<string, string>): string {
    try {
        // 修正1：移除正则表达式的引号
        return input.replace(/\$\{([^}]+)\}/g, (match, variableName) => {
            // 修正2：使用 Map 的正确方法
            if (variables.has(variableName)) {
                return variables.get(variableName) || "";
            }
            // // 变量未找到时返回空
            // return "";
            // 变量未找到时不进行处理
            return match;
        });
    } catch (error) {
        console.log(error);
        return "";
    }
}