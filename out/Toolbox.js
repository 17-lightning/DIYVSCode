"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.show_vscode_message = show_vscode_message;
exports.is_target_function_definition = is_target_function_definition;
exports.get_DIY_config = get_DIY_config;
exports.get_workspace_path = get_workspace_path;
exports.get_first_workspace = get_first_workspace;
exports.get_vscode_config = get_vscode_config;
exports.load_text_file = load_text_file;
exports.debug = debug;
exports.sep_debug = sep_debug;
exports.clean_debug_log = clean_debug_log;
exports.get_current_filepath = get_current_filepath;
exports.get_current_keyword = get_current_keyword;
exports.replace_variable = replace_variable;
exports.is_debug = is_debug;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
/**
 * 向VSCode窗口输出一条信息（右下角的那种）
 * @param text
 */
function show_vscode_message(text) {
    vscode.window.showInformationMessage(text);
}
/**
 * 用于判断当前行是否为目标函数定义（由于只有一行输入，当前判断是不全面的）
 * @param line
 */
function is_target_function_definition(line, target) {
    if (line.length < 3)
        return false;
    if (!line.includes(" " + target + "(") && !line.includes(" *" + target + "("))
        return false;
    if (line[0] == ' ' || line[0] == '\t' || line[0] == '\n' || line[0] == '\r' || line[0] == '#' || line[0] == '\\' || line[0] == '*')
        return false;
    if (line.includes(";"))
        return false;
    return true;
}
/**
 * 获取配置，优先去当前文件夹下的DIY-config.md中搜索，没有时去VSCode里搜索，再没有就自求多福了
 * @param target
 */
function get_DIY_config(target) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // 优先在打开的文件夹下搜索DIY-config.md
            let workFolders = vscode.workspace.workspaceFolders;
            if (workFolders != undefined) {
                let workFolder = workFolders[0];
                let configFile = path.join(workFolder.uri.fsPath, "DIY-config.md");
                if (fs.existsSync(configFile)) {
                    let document = yield vscode.workspace.openTextDocument(configFile);
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
                }
                else {
                    debug("当前文件夹下不存在配置文件" + configFile);
                }
            }
            else {
                debug("当前没有打开文件夹，无法获取配置文件");
            }
            // 其次去VSCode配置里找
            let result = vscode.workspace.getConfiguration().get("diyvscode." + target);
            debug("正在寻找配置" + target);
            debug("结果为" + result);
            if (result != undefined && result.length > 0) {
                debug("成功在VSCode配置中找到配置[" + target + "]为[" + result + "]");
                return result;
            }
            else {
                debug("在VSCode配置中也没有找到配置[" + target + "]");
            }
        }
        catch (error) {
            debug("[get_DIY_config]中发生错误：" + error);
        }
        return "";
    });
}
// 获取当前工作区，但该操作依赖打开文件，在非文件界面无法正确识别
function get_workspace_path() {
    let editor = vscode.window.activeTextEditor;
    if (editor == undefined)
        return "";
    let workspace = vscode.workspace.getWorkspaceFolder(editor.document.uri);
    if (workspace == undefined)
        return "";
    return workspace.uri.fsPath;
}
// 获取首个工作区，不依赖打开的文件，请尽量使用当前函数
function get_first_workspace() {
    let workFolders = vscode.workspace.workspaceFolders;
    if (workFolders == undefined) {
        return "";
    }
    return workFolders[0].uri.fsPath;
}
function get_vscode_config(key) {
    let result = vscode.workspace.getConfiguration().get(key);
    if (result == undefined) {
        return "";
    }
    return result;
}
/**
 * 将一个文件的内容以字符串形式全数读回
 * @param filepath
 */
function load_text_file(filepath) {
    try {
        return fs.readFileSync(filepath, 'utf8');
    }
    catch (error) {
        console.log("加载[" + filepath + "]文件内容时发生故障");
        return "";
    }
}
// debug日志会记录在这里
function debug(target) {
    if (is_debug()) {
        fs.appendFile("D:\\PP\\temp\\log.txt", target + "\n", (err) => {
            if (err)
                throw err;
            console.log(err);
        });
    }
}
function sep_debug() {
    if (is_debug()) {
        fs.appendFile("D:\\PP\\temp\\log.txt", "==============================================\n", (err) => {
            if (err)
                throw err;
            console.log(err);
        });
    }
}
function clean_debug_log() {
    if (is_debug()) {
        fs.writeFile("D:\\PP\\temp\\log.txt", "", (err) => {
            if (err)
                throw err;
            console.log(err);
        });
    }
}
/**
 * 获取当前文件的相对路径
 */
function get_current_filepath() {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor)
        return "";
    const documentUri = activeEditor.document.uri;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri);
    if (!workspaceFolder)
        return "";
    return path.relative(workspaceFolder.uri.fsPath, documentUri.fsPath);
}
/**
 * 获取当前选中的内容
 */
function get_current_keyword() {
    try {
        return vscode.window.activeTextEditor.document.getText(vscode.window.activeTextEditor.selection);
    }
    catch (error) {
        return "";
    }
}
function replace_variable(input, variables) {
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
    }
    catch (error) {
        console.log(error);
        return "";
    }
}
// debug模式开关，出厂关闭(提交到github前关闭跑一次编译，确保github上去的js是正常的)
function is_debug() {
    return true;
}
//# sourceMappingURL=Toolbox.js.map