import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { error } from 'console';

/**
 * 向VSCode窗口输出一条信息（右下角的那种）
 * @param text 
 */
export function show_vscode_message(text : string): void {
    vscode.window.showInformationMessage(text);
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
 * 获取配置，优先去当前文件夹下的DIY-config.md中搜索，没有时去VSCode里搜索，再没有就自求多福了
 * @param target 
 */
export async function get_DIY_config(target : string) : Promise<string> {
    try {
        // 优先在打开的文件夹下搜索DIY-config.md
        let workFolders = vscode.workspace.workspaceFolders;
        if (workFolders != undefined) {
            let workFolder = workFolders[0];
            let configFile = path.join(workFolder.uri.fsPath, "DIY-config.md");
            if (fs.existsSync(configFile)) {
                let document = await vscode.workspace.openTextDocument(configFile);
                if (document == undefined) {
                    debug("打开配置文件失败" + configFile);
                }
                let lineid;
                let line;
                let array;
                for (lineid = 2; lineid < document.lineCount; lineid++) {
                    line = document.lineAt(lineid).text;
                    array = line.split("|");
                    if (array.length < 2) {
                        continue;
                    }
                    debug("正在检查[" + array[0] + "]");
                    if (array[0] == target) {
                        debug("成功在配置文件[" + configFile + "]中找到配置[" + target + "]为[" + array[1] + "]");
                        return array[1];
                    }
                }
                debug("在配置文件中没有找到" + target);
            } else {
                debug("当前文件夹下不存在配置文件" + configFile);
            }
        } else {
            debug("当前没有打开文件夹，无法获取配置文件");
        }
        // 其次去VSCode配置里找
        let result = vscode.workspace.getConfiguration().get<string>("diyvscode." + target);
        debug("正在寻找配置" + target);
        debug("结果为" + result)
        if (result != undefined && result.length > 0) {
            debug("成功在VSCode配置中找到配置[" + target + "]为[" + result + "]");
            return result;
        } else {
            debug("在VSCode配置中也没有找到配置[" + target + "]");
        }
    } catch (error) {
        debug("[get_DIY_config]中发生错误：" + error);
    }
    return "";
}

// 获取当前工作区，但该操作依赖打开文件，在非文件界面无法正确识别
export function get_workspace_path() : string {
    let editor = vscode.window.activeTextEditor;
    if (editor == undefined) return "";
    let workspace = vscode.workspace.getWorkspaceFolder(editor.document.uri);
    if (workspace == undefined) return "";
    return workspace.uri.fsPath;
}

// 获取首个工作区，不依赖打开的文件，请尽量使用当前函数
export function get_first_workspace() : string {
    let workFolders = vscode.workspace.workspaceFolders;
    if (workFolders == undefined) {
        return "";
    }
    return workFolders[0].uri.fsPath;
}

export function get_vscode_config(key : string) : string {
    let result = vscode.workspace.getConfiguration().get<string>(key);
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

// debug日志会记录在这里
export function debug(target : any) {
    if (is_debug()) {
        var temp = String(target);
        if (error instanceof Error) {
            temp = target.message;
        } else if (typeof target == 'string') {
            temp = target;
        }
        fs.appendFile("D:\\PP\\temp\\log.txt", temp + "\n", (err) => {
            console.log(err);
            if (err) throw err;
        });
    }
}

// debug日志加强版，有一个type，可以在这里调整那些type类型的日志会进行记录
export function debug_log(type : string, target : any) {
    var debug_list = [
        "FBox",
        "2"
    ];
    if (is_debug() && debug_list.includes(type)) {
        var temp = String(target);
        if (error instanceof Error) {
            temp = target.message;
        } else if (typeof target == "string") {
            temp = target;
        }
        fs.appendFile("D:\\PP\\temp\\log.txt", temp + "\n", (err) => {
            console.log(err);
            if (err) throw err;
        })
    }
}

export function sep_debug() {
    if (is_debug()) {
        fs.appendFile("D:\\PP\\temp\\log.txt", "==============================================\n", (err) => {
            if (err) throw err;
            console.log(err);
        });
    }
}

export function clean_debug_log() {
    if (is_debug()) {
        fs.writeFile("D:\\PP\\temp\\log.txt", "", (err) => {
            if (err) throw err;
            console.log(err);
        });
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

// debug模式开关，出厂关闭(提交到github前关闭跑一次编译，确保github上去的js是正常的)
export function is_debug()
{
    return true;
}


// 是否为函数定义
async function is_function_definition(content : string[], lineid : number, target : string) : Promise<boolean> {
    try {
        var line = content[lineid];
        // 要求函数定义必须顶格写，前面不能有 空格 制表符 #
        if (line[0] == '\t' || line[0] == '\n' || line[0] == ' ' || line[0] == '#') {
            return false;
        }
        
    } catch (error) {
        debug(error.toString());
    }
    return false;
}
