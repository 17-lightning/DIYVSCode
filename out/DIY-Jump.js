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
exports.DIY_Jump = DIY_Jump;
const vscode = require("vscode");
const Box = require("./Toolbox");
const path = require("path");
const fs = require("fs");
function DIY_Jump() {
    return __awaiter(this, void 0, void 0, function* () {
        const editor = vscode.window.activeTextEditor;
        let i = 0;
        if (editor == undefined) {
            Box.show_vscode_message("[DIY]当前没有打开文件，无法跳转");
            return;
        }
        let keyword = editor.document.getText(editor.selection);
        if (keyword == undefined || keyword.length == 0) {
            Box.show_vscode_message("[DIY]当前没有选中目标，无法跳转");
            return;
        }
        // 优先使用`DIY-config.md`里的跳转规则 `DIY-Jump`
        // 暂未实现
        // 其次使用当前工作区下的跳转规则
        const workspace = vscode.workspace.getWorkspaceFolder(editor.document.uri);
        let workpath;
        if (workspace != undefined) {
            workpath = path.join(workspace.uri.fsPath, "DIY-Jump.md");
            if (yield DIY_Jump_inner(workpath, keyword)) {
                Box.debug("使用当前工作区下的跳转规则跳转成功");
                return;
            }
        }
        // 最后使用默认跳转规则
        workpath = vscode.workspace.getConfiguration().get('diyvscode.DiyJumpRules');
        if (workpath != undefined) {
            workpath = path.join(workpath, "DIY-Jump.md");
            if (yield DIY_Jump_inner(workpath, keyword)) {
                Box.debug("使用默认跳转规则跳转成功");
                return;
            }
        }
        // 当前暂无其他跳转规则
        Box.debug("对关键字[" + keyword + "]跳转失败");
    });
}
/**
 * DIY跳转实现函数
 * @param path 跳转规则(DIY-Jump.md的路径)
 * @param key 当前关键字
 * @returns 是否完成跳转
 */
function DIY_Jump_inner(configfile, key) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!fs.existsSync(configfile)) {
            return false;
        }
        let document = yield vscode.workspace.openTextDocument(vscode.Uri.file(configfile));
        let lineid = 0;
        let line;
        let targetfile;
        let targetline = 0;
        let temp;
        for (lineid = 0; lineid < document.lineCount; lineid++) {
            line = document.lineAt(lineid).text;
            // 一行配置的格式为： 关键字|目标文件|目标位置(行号/函数)|其余约束
            if (key != line.split("|")[0]) {
                continue;
            }
            targetfile = line.split("|")[1];
            if (targetfile == undefined || targetfile.length == 0) {
                console.log("[DIY]跳转目标为空，跳转失败"); // 正常不应出现，除非配置文件有问题
                Box.show_vscode_message("[DIY]跳转目标为空，请检查配置文件[" + configfile + "]");
                return false;
            }
            if (targetfile[0] == '@') { // @开头的路径表示以当前工作区(仅支持首个工作区)为起始路径
                temp = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri);
                if (temp == undefined)
                    return false;
                targetfile = path.join(temp.uri.fsPath, targetfile.substring(1));
            }
            else if (targetfile[0] == '#') { // #开头的路径表示以环境配置diyvscode.diyjumptoppath起始的路径
                let custompath = vscode.workspace.getConfiguration().get('diyvscode.diyjumptoppath');
                if (custompath == undefined || custompath.length == 0) {
                    console.log("[DIY]#型跳转需要配置自定义跳转路径");
                    Box.show_vscode_message("[DIY]#型跳转需要配置自定义跳转路径");
                    return false;
                }
                targetfile = path.join(custompath, targetfile.substring(1));
            }
            else if (targetfile[0] == '.') {
                targetfile = path.join(vscode.window.activeTextEditor.document.uri.fsPath, "../" + targetfile.substring(1));
            }
            console.log("[DIY]对关键字[" + key + "]，正在跳转至文件[" + targetfile + "]");
            if (!fs.existsSync(targetfile)) {
                Box.show_vscode_message("跳转的目标文件[" + targetfile + "]不存在");
                return false;
            }
            let target = yield vscode.workspace.openTextDocument(targetfile);
            let targetloc = line.split('|')[2]; // 配置的第三项可以帮助你找到对应行
            if (targetloc == undefined || targetloc.length == 0) {
                lineid = 0;
            }
            else {
                lineid = parseInt(targetloc);
                if (isNaN(lineid)) { // 如果她不是一个数字，就只能是函数名，我会带你找到函数名
                    for (lineid = 0; lineid < target.lineCount; lineid++) {
                        line = target.lineAt(lineid).text;
                        if (Box.is_target_function_definition(line, targetloc)) { // 取函数实现（由于可能把函数定义误认为函数实现，取其最后一次出现的位置）
                            targetline = lineid;
                        }
                    }
                    if (targetline == 0) {
                        console.log("[DIY]没有找到[" + targetloc + "]在当前文件中的实现，将显示首行");
                        Box.show_vscode_message("[DIY]没有找到[" + targetloc + "]在当前文件中的实现，将显示首行");
                    }
                }
                else {
                    targetline = lineid - 1; // 因为你平时看见的lineid是从1开始编码的，但这里从0开始
                }
            }
            vscode.window.showTextDocument(target, { selection: new vscode.Range(new vscode.Position(targetline, 0), new vscode.Position(targetline, 0)) });
            return true;
        }
        return false;
    });
}
//# sourceMappingURL=DIY-Jump.js.map