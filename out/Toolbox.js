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
exports.debug = debug;
exports.is_target_function_definition = is_target_function_definition;
exports.get_DIY_config = get_DIY_config;
exports.get_workspace_path = get_workspace_path;
exports.get_vscode_config = get_vscode_config;
exports.load_text_file = load_text_file;
exports.get_current_filepath = get_current_filepath;
exports.get_current_keyword = get_current_keyword;
exports.replace_variable = replace_variable;
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
 * 调试内容都会用该函数打印，但正式发布版本里这个函数的内容是被注释掉的，如要使用烦请打开
 * @param text
 */
function debug(text) {
    console.log(text);
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
 * 获取当前路径下，DIY-config.md中的指定属性，没有获取到时返回空字符串
 * @param target
 */
function get_DIY_config(target) {
    return __awaiter(this, void 0, void 0, function* () {
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
            let document = yield vscode.workspace.openTextDocument(vscode.Uri.file(config));
            let line;
            let lineid = 0;
            let array;
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
        }
        catch (error) {
            console.log("[get_DIY_config]中发生错误：" + error);
        }
        return "";
    });
}
function get_workspace_path() {
    let editor = vscode.window.activeTextEditor;
    if (editor == undefined)
        return "";
    let workspace = vscode.workspace.getWorkspaceFolder(editor.document.uri);
    if (workspace == undefined)
        return "";
    return workspace.uri.fsPath;
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
//# sourceMappingURL=Toolbox.js.map