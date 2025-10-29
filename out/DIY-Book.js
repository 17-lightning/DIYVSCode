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
exports.DIY_book = DIY_book;
exports.book_test = book_test;
const vscode = require("vscode");
const Box = require("./Toolbox");
const path = require("path");
const fs = require("fs");
// 跳转到当前选中元素的对应文档（如果没有选中元素，将跳转到当前文件的文档）（如果没有当前文档 —— 不会执行跳转）
// 如果不存在这个文档，会跳转到[文档生成]页面
function DIY_book(context) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const editor = vscode.window.activeTextEditor;
            let type = "unknown";
            if (editor == undefined) {
                Box.show_vscode_message("[DIY]当前没有打开文件，无法跳转");
                // [loading] 或许可以考虑一下在这种情况跳转一个welcome或者default页面
                return;
            }
            // 当前打开的文件必须属于工作区内，打开一个野生文件是无法跳转的
            let workspace = Box.get_workspace_path();
            if (workspace.length == 0) {
                return;
            }
            let file = Box.get_current_filepath();
            let keyword = Box.get_current_keyword();
            let target = "";
            // 如果没有圈选关键字，认为将针对当前文档进行跳转
            if (keyword == undefined || keyword.length == 0) {
                target = "";
                type = "file";
            }
            else {
                target = file + "+" + keyword;
                // 如果选中的区域后方紧跟着一个(，认为这是一个函数，否则认为这只是一个通常属性
                if (editor.document.getText(new vscode.Range(editor.selection.end, editor.selection.end.translate(0, 1))) == '(') {
                    type = "function";
                }
                else {
                    type = "attr";
                }
            }
            console.log("[DIY]即将打开 " + target + "对应的文档");
            // 由于文件名中不能出现/，将所有/转成-- …… 你说文件名/函数名里原本就有--怎么办……当前是没有办法，后续用网页URL那种%123的方式吧，我先把基础功能实现了
            target = target.replace(new RegExp("\\\\", "g"), "--");
            target = target.replace(new RegExp("/", "g"), "--");
            let library = yield get_DIY_library();
            if (library == "") {
                library = path.join(workspace, "DIY-library");
                if (!fs.existsSync(library))
                    fs.mkdirSync(library);
                if (!fs.existsSync(library)) {
                    Box.show_vscode_message("在当前工作区内创建Library [" + library + "]失败\n");
                    return;
                }
            }
            target = path.join(library, target);
            target = target + ".md";
            console.log("[DIY]真正需要打开的文档其实是[" + target + "]");
            if (fs.existsSync(target)) {
                // 目标MD存在，就会直接跳转到她
                // vscode.window.showTextDocument(await vscode.workspace.openTextDocument(target));
                DIY_show_function_document(context, target);
                // 然后对特定格式的MARKDOWN，将可以用本插件来进行特殊的观看和处理
                return;
            }
            if (context.globalState.get("DIY-book-last-selection") != target) {
                context.globalState.update("DIY-book-last-selection", target);
                Box.show_vscode_message("不存在目标的对应文档，重复当前操作可以自动创建");
                return;
            }
            console.log("即将创建[" + target + "]");
            if (type == "function") {
                DIY_create_function_document(context);
                DIY_show_function_document(context, target);
            }
            else {
                Box.show_vscode_message("当前暂不支持创建函数以外的文档");
                return;
            }
        }
        catch (error) {
            console.log(error);
        }
    });
}
// 注释区域是在标题行下方（从第1行开始）到第一个段落(#)之间的区域，不包含空行
function DIY_log_in_note(document) {
    let note = "";
    let lineid = 1;
    let line = "";
    for (lineid = 1; lineid < document.lineCount; lineid++) {
        line = document.lineAt(lineid).text;
        if (line.charAt(0) == '#'.charAt(0)) {
            return note;
        }
        if (line == "") {
            continue;
        }
        note = note + line + "\n";
    }
    return note;
}
// 文件是 # 所属文件 下方的一行
function DIY_log_in_filepath(document) {
    let lineid;
    let line;
    for (lineid = 1; lineid < document.lineCount; lineid++) {
        line = document.lineAt(lineid).text;
        if (line.includes("## 所属文件")) {
            return document.lineAt(lineid + 1).text.substring(2);
        }
    }
    return "unknown";
}
function DIY_show_function_document(context, target) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let lineid = 0;
            let document = yield vscode.workspace.openTextDocument(target);
            let localpath = "D:/PP/DIYVSCode/";
            // let localpath = context.extensionPath
            let html = Box.load_text_file(path.join(localpath, "asset/function_template.html"));
            let map = new Map();
            map.set("name", document.lineAt(0).text.substring(2));
            map.set("file", DIY_log_in_filepath(document));
            map.set("note", DIY_log_in_note(document));
            let filepath = map.get("file");
            filepath = filepath.replace(new RegExp("\\\\", "g"), "--");
            filepath = filepath.replace(new RegExp("/", "g"), "--");
            filepath = path.join(yield get_DIY_library(), filepath) + "+" + map.get("name") + ".md";
            filepath = filepath.replace(new RegExp("\\\\", "g"), "\\\\\\\\");
            map.set("document", filepath);
            console.log("document is " + map.get("document"));
            html = Box.replace_variable(html, map);
            const panel = vscode.window.createWebviewPanel('testWebView', document.lineAt(0).text.substring(2), vscode.ViewColumn.Active, {
                enableScripts: true,
                retainContextWhenHidden: true,
            });
            panel.webview.html = html;
            panel.webview.onDidReceiveMessage(message => DIY_book_html_handler(context, message));
            // console.log(html);
        }
        catch (error) {
            console.log(error);
        }
    });
}
function DIY_create_function_document(context) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const file = Box.get_current_filepath();
            const keyword = Box.get_current_keyword();
            // let localpath = context.extensionPath
            let localpath = "D:/PP/DIYVSCode/"; // [ltn] 挺无奈的，正式提交的时候再把这里换成以上描述吧，因为我现在用F5调试，context.extensionPath是不存在的
            let modules_html = Box.load_text_file(path.join(localpath, "asset/function_template.md"));
            // console.log("[DIY] 函数");
            let variables = new Map();
            variables.set("name", keyword);
            variables.set("file", file);
            modules_html = Box.replace_variable(modules_html, variables);
            let filepath = file.replace(new RegExp("\\\\", "g"), "--");
            filepath = filepath.replace(new RegExp("/", "g"), "--");
            filepath = path.join(yield get_DIY_library(), filepath + "+" + keyword + ".md");
            console.log("[DIY]即将向[" + filepath + "写入内容(" + modules_html.length + ")");
            fs.writeFile(filepath, modules_html, (err) => {
                console.log(err);
            });
        }
        catch (error) {
            console.log(error);
        }
    });
}
// 查询文档库路径
// 1. 如果当前工作区下存在`DIY-config.md`，并且其中有`DIY-library`，采用之
// 2. 如果当前工作区下存在`DIY-library`文件夹，采用之
// 3. 使用配置文件中的`DIY`
function get_DIY_library() {
    return __awaiter(this, void 0, void 0, function* () {
        let library = yield Box.get_DIY_config("DIY-library");
        if (library.length != 0) {
            return library;
        }
        library = Box.get_workspace_path();
        if (library.length != 0) {
            library = path.join(library, "DIY-library");
            if (fs.existsSync(library)) { // [loading] 需要区分一下这里的library是文件夹还是文件，但是现在先不管
                return library;
            }
        }
        library = Box.get_vscode_config("DiyLibrary");
        return library;
    });
}
// 用来辅助你创建新文档
function DIY_book_creator(context, target) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const panel = vscode.window.createWebviewPanel('testWebView', "创建新文档", vscode.ViewColumn.One, {
                enableScripts: true,
                retainContextWhenHidden: true,
            });
            // let localpath = context.extensionPath
            let localpath = "D:/PP/DIYVSCode/"; // [ltn] 挺无奈的，正式提交的时候再把这里换成以上描述吧，因为我现在用F5调试，context.extensionPath是不存在的
            console.log("localpath is [" + localpath + "]");
            let type = "unknown"; // unknown
            if (target.includes("+")) { // 如果目标含+，认为这是一个函数
                DIY_function_book_creator(context, target);
            }
            else if (target.includes(".")) { // 如果目标含.，认为这是一个文件
                type = "file";
            }
            else if (target.includes(":")) { // 如果目标含#，认为它的模式有被特殊指定
                type = target.substring(0, target.search(":"));
            }
            console.log("当前目标的模式为" + type);
            let html = Box.load_text_file(path.join(localpath, "asset/library-create.html"));
            panel.webview.html = html;
            panel.webview.onDidReceiveMessage(message => DIY_book_html_handler(context, message));
        }
        catch (error) {
            console.log(error);
        }
    });
}
/**
 * 判断目标文件属于哪些模块
 */
function file_belongs(file) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let dict = yield vscode.workspace.openTextDocument(vscode.Uri.file(path.join(yield get_DIY_library(), "Module.md")));
            if (dict == undefined) {
                return [];
            }
            let line;
            let module;
            let module_md;
            let lineid, lineid2;
            let flag;
            let result = new Array;
            // 前两行是表头不用管
            for (lineid = 2; lineid < dict.lineCount; lineid++) {
                line = dict.lineAt(lineid).text;
                if (line.includes("|")) {
                    module = line.substring(0, line.search("|"));
                }
                else {
                    module = line;
                }
                try {
                    module_md = yield vscode.workspace.openTextDocument(path.join(yield get_DIY_library(), module + ".md"));
                    for (flag = 0, lineid2 = 0; lineid2 < module_md.lineCount; lineid2++) {
                        line = module_md.lineAt(lineid2).text;
                        if (line.includes("子文件")) {
                            flag = 1;
                        }
                        else if (line.includes("#")) {
                            flag = 0;
                        }
                        else {
                            if (line.includes(file)) {
                                result.push(module);
                            }
                        }
                    }
                }
                catch (error) {
                    console.log(error);
                }
            }
            return result;
        }
        catch (error) {
            console.log(error);
            return [];
        }
    });
}
function DIY_function_book_creator(context, target) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let file = target.split("+")[0];
            let func = target.split("+")[1];
            console.log("file:" + file + ", func:" + func);
        }
        catch (error) {
            console.log(error);
            Box.show_vscode_message("创建函数文档[" + target + "]失败\n");
        }
    });
}
// 替换注释，注释预期是从第一行开始到第一个段落为止的部分
function DIY_book_update_note(filepath, note) {
    return __awaiter(this, void 0, void 0, function* () {
        let file = Box.load_text_file(filepath);
        let array = file.split("\n");
        let lineid;
        let result = array[0] + "\n" + note;
        console.log("正在尝试替换" + filepath + "的注释为" + note);
        for (lineid = 1; lineid < array.length; lineid++) {
            if (array[lineid][0] == '#') {
                break;
            }
        }
        for (; lineid < array.length; lineid++) {
            result = result + "\n" + array[lineid];
        }
        console.log("正在向" + filepath + "写入" + result);
        fs.writeFile(filepath, result, (err) => {
            console.log(err);
        });
    });
}
/**
 * 注意Webview端发送的是一个Map，但是抵达Vscode端时已被整合为Object
 * 你不能用遍历Map的entries去查询其内容，但可以用for (key in obj)的方式遍历其中的属性
 * 不过这个OBJ只能包含数据内容，其携带的方法信息、原型信息等均会丢失
 */
function DIY_book_html_handler(context, message) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("接收到一条消息");
            for (let key in message) {
                console.log(key + ":" + message[key]);
            }
            // 执行消息内容
            if (message.cmd == "change-note") { // 变更note
                DIY_book_update_note(path.join(yield get_DIY_library(), message.name), message.note);
            }
            else {
                console.log("未知消息");
            }
        }
        catch (error) {
            console.log(error);
        }
    });
}
/**
 * 创建空白MD文档
 * @param context
 * @param filename
 */
function DIY_create_blank_document(context, filename) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("即将创建空白文档[" + filename + "]");
    });
}
function book_test(context) {
    // 创建树视图
    const tree = vscode.window.createTreeView("part1", {
        treeDataProvider: new TestTreeDataProvider()
    });
    context.subscriptions.push(tree);
    const tree2 = vscode.window.createTreeView("part2", {
        treeDataProvider: new TestTreeDataProvider(),
        canSelectMany: true
    });
    context.subscriptions.push(tree2);
}
// 树形结构的数据提供者，可以用Window.registerTreeDataProvider将数据提供者注册到TreeView中
class TestTreeDataProvider {
    // 事件 onDidChangeTreeData是什么东西？
    // 查询树的子节点
    getChildren(element) {
        return [1, 2, 3];
    }
    // 将子节点转换成可见的TreeItem
    getTreeItem(element) {
        return {
            label: `测试${element}`
        };
    }
}
//# sourceMappingURL=DIY-Book.js.map