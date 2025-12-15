import * as vscode from 'vscode';
import * as Box from './Toolbox';
import * as path from 'path';
import * as fs from 'fs';
import * as FBox from './FileBox';
import { ExecException } from 'child_process';
import { error } from 'console';

// 跳转到当前选中元素的对应文档（如果没有选中元素，将跳转到当前文件的文档）（如果没有当前文档 —— 不会执行跳转）
// 如果不存在这个文档，会跳转到[文档生成]页面
export async function DIY_book(context : vscode.ExtensionContext) {
    // [ltn] 测试用
    // try {
    //     FBox.Develop_test();
    // } catch (error) {
    //     Box.debug(error);
    // }
    try {
        const editor = vscode.window.activeTextEditor;
        let type = "unknown";
        if (editor == undefined) {
            Box.show_vscode_message("[DIY]当前没有打开文件，无法跳转");
            // [loading] 或许可以考虑一下在这种情况跳转一个welcome或者default页面
            return;
        }
        // 只能操作当前打开的文件夹1，不能处理打开多个文件夹的情况，或许是我的水平还不够吧
        let workspace = Box.get_first_workspace();
        if (workspace.length == 0) {
            return;
        }
        let file = Box.get_current_filepath();
        let keyword = Box.get_current_keyword();
        let target = "";
        // 如果没有圈选关键字，认为将针对当前文档进行跳转
        if (keyword == undefined || keyword.length == 0) {
            target = file;
            type = "file";
        } else {
            target = file + "+" + keyword;
            // 如果选中的区域后方紧跟着一个(，认为这是一个函数，否则认为这只是一个通常属性
            if (editor.document.getText(new vscode.Range(editor.selection.end, editor.selection.end.translate(0, 1))) == '(') {
                type = "function";
            } else {
                type = "attr";
            }
        }

        Box.debug("[DIY]即将打开 " + target + "对应的文档，其类型为" + type);
        // 由于文件名中不能出现/，将所有/转成-- …… 你说文件名/函数名里原本就有--怎么办……当前是没有办法，后续用网页URL那种%123的方式吧，先关注基础功能
        target = target.replace(new RegExp("\\\\", "g"), "--");
        target = target.replace(new RegExp("/", "g"), "--");
        target = target + ".md";

        if (fs.existsSync(path.join(await get_DIY_library(), target))) {
            // 目标MD存在，就会直接跳转到她
            DIY_show_function_document(context, target);
            return;
        }
        // 如果要打开的文档不存在，重复打开这个不存在的文档的操作可以自动生成该文档 [loading]后续考虑增加时间限制
        if (context.globalState.get<string>("DIY-book-last-selection") != target) {
            context.globalState.update("DIY-book-last-selection", target);
            Box.show_vscode_message("不存在目标的对应文档，重复当前操作可以自动创建");
            return;
        }
        Box.debug("即将创建[" + target + " ]("+ type + ")");
        if (type == "function") {
            DIY_create_current_function_document(context);
            DIY_show_function_document(context, target);
        } else {
            Box.show_vscode_message("当前暂不支持创建函数以外的文档");
            return;
        }
        
    } catch (error) {
        console.log(error);
    }
}

// 注释区域是在标题行下方（从第1行开始）到第一个段落(#)之间的区域，不包含空行
function DIY_log_in_note(document : vscode.TextDocument) : string {
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
function DIY_log_in_filepath(document : vscode.TextDocument) : string {
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

// 获取函数内容，预期当前已选中了函数名称，会向后寻找{，并且认为从{到}中间的为函数内容
// 注意函数起始{这一行的后面不能有内容，函数结束}标记必须放在行首
function DIY_log_in_content() : string {
    try {
        let content = "";
        let lineid = vscode.window.activeTextEditor!.selection.end.line;
        let line = vscode.window.activeTextEditor!.document.lineAt(lineid).text;
        while (!line.includes("{")) {
            lineid = lineid + 1;
            line = vscode.window.activeTextEditor!.document.lineAt(lineid).text;
        }
        if (line.substring(line.search("{") + 1).length) {
            content = line.substring(line.search("{") + 1) + "\n";
        }
        lineid = lineid + 1;
        line = vscode.window.activeTextEditor!.document.lineAt(lineid).text;
        while (line[0] != '}') {
            content = content + line + "\n";
            lineid = lineid + 1;
            line = vscode.window.activeTextEditor!.document.lineAt(lineid).text;
        }
        // 移除最后一个\n
        content = content.substring(0, content.length - 1);
        return content;
    } catch (error) {
        console.log(error);
    }
    return "";
}

// 获取关联项，并以[ {"key":xxx, "value":xxx, "note":xxx} ]的形式返回
function DIY_log_in_relation(document : vscode.TextDocument, type : string) : Array<Record<string, string>> {
    try {
        let lineid : number = 1; // 第一行是标题，所以可以从第二行开始
        let line = document.lineAt(lineid).text;
        let key;
        let value;
        let note;
        let result : Array<Record<string, string>> = [];
        Box.sep_debug();
        Box.debug("正在查询" + document.uri.fsPath + "的子函数");
        // ... 我以为你能自动识别document.lineAt(lineid)超过document.lineCount的情况并给line赋值undefined结果你是直接抛出异常，而且没有任何回旋余地
        // 然后这里的lineid还非常不直观的要 +2
        while (line != ("## " + type) && (lineid + 2 < document.lineCount)) {
            lineid = lineid + 1;
            line = document.lineAt(lineid)?.text;
        }
        if (lineid >= document.lineCount) {
            Box.debug("未能找到[" + type + "]型关联项");
            return [];
        }
        lineid = lineid + 1;
        line = document.lineAt(lineid).text;
        while (lineid < document.lineCount - 1 && line[0] != '#') {
            // 一行正确的记录格式为 [key](value):note，即使没有note，:也不能忽略不然这里会出错的
            key = line.substring(1, line.search("]"));
            value = line.substring(line.search("]") + 4, line.search("\:") - 4); // 4是为了跳过 ](./ 4大天王 和 .md)
            // Box.debug("start:" + line.search("]") + 4 + "end: " + line.search("\:"));
            note = line.substring(line.search("\:") + 1); // 在key和value中不会出现:
            if (key == undefined || value == undefined || note == undefined) {
                continue;
            }
            let temp = {"key": key, "value": value, "note":note};
            Box.debug("找到[" + document.uri.fsPath + "]的一个[" + type + "]: key[" + key + "] value[" + value + "] note[" + note + "]");
            result.push(temp);
            lineid = lineid + 1;
            line = document.lineAt(lineid).text;
        }
        return result;
    } catch (error) {
        console.log(error);
    }
    return [];
}

// 这里输入的target是需要有.md后缀的
async function DIY_show_function_document(context : vscode.ExtensionContext, target : string) {
    try {
        let lineid : number = 0;
        let document = await vscode.workspace.openTextDocument(path.join(await get_DIY_library(), target));
        let localpath = "D:/PP/DIYVSCode/";
        // let localpath = context.extensionPath
        let html = Box.load_text_file(path.join(localpath, "asset/function_template.html"));
        let map = new Map<string, string>();
        map.set("name", document.lineAt(0).text.substring(2));  // 文档的第一行永远是`# 函数名`
        map.set("file", DIY_log_in_filepath(document));         // 目标函数所在的文件
        map.set("note", DIY_log_in_note(document));             // 注释，从# 函数名开始到第一个#行结束
        map.set("code", DIY_log_in_content());                  // 录入函数内容，待完善
        map.set("document", target);                            // 文档全名（有.md）
        map.set("fullname", target.substring(0, target.length - 3)); // 文件加函数名，文档真名（无.md）
        map.set("debug", Box.is_debug() ? "true" : "false");    // debug模式与否

        html = Box.replace_variable(html, map);
        const panel = vscode.window.createWebviewPanel(
            'testWebView',
            document.lineAt(0).text.substring(2),
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );
        Box.debug("[LTN] html is " + html);
        panel.webview.html = html;
        panel.webview.onDidReceiveMessage(message => DIY_book_html_handler(context, panel, message));
    } catch (error) {
        console.log(error);
    }
}

// 当前只能生成选中目标的文档，后续要考虑更广泛的生成
async function DIY_create_current_function_document(context : vscode.ExtensionContext) {
    try {
        const file = Box.get_current_filepath();
        const keyword = Box.get_current_keyword();
        let localpath = "";
        if (Box.is_debug()) {
            // 由于用F5进行调试时插件不是真的进入了VSCode中，所以context.extensionPath是找不到插件的，只能这样处理
            localpath = "D:/PP/DIYVSCode/";
        } else {
            localpath = context.extensionPath;
        }
        let modules_html = Box.load_text_file(path.join(localpath, "asset/function_template.md"));
        let variables = new Map<string, string>();
        variables.set("name", keyword);
        variables.set("file", file);
        modules_html = Box.replace_variable(modules_html, variables);
        let filepath = file.replace(new RegExp("\\\\", "g"), "--");
        filepath = filepath.replace(new RegExp("/", "g"), "--");
        filepath = path.join(await get_DIY_library(), filepath + "+" + keyword + ".md");
        fs.writeFile(filepath, modules_html, (err) => {
            console.log(err);
        });
    } catch (error) {
        console.log(error);
    }
}

// 查询文档库路径
// 1. 如果当前工作区下存在`DIY-config.md`，并且其中有`DIY-library`，采用之
// 2. 如果配置文件中存在`DIY-library`，采用之
// 3. 如果当前工作区下存在`DIY-library`文件夹，采用之，若没有，创建一个
async function get_DIY_library() : Promise<string> {
    let library = await Box.get_DIY_config("DIY-library");
    if (library.length != 0) {
        return library;
    }
    library = Box.get_first_workspace();
    if (library.length != 0) {
        library = path.join(library, "DIY-library");
        if (fs.existsSync(library)) { // [loading] 需要区分一下这里的library是文件夹还是文件，但是现在先不管
            return library;
        } else {
            fs.mkdirSync(library);
            if (!fs.existsSync(library)) {
                Box.show_vscode_message("创建Library[" + library + "]失败，请注意");
                Box.debug("[TOP]创建Library[" + library + "]失败，请注意");
                throw new Error("创建Libraray[" + library + "]失败");
            }
            return library;
        }
    } else {
        Box.show_vscode_message("当前没有打开文件夹，无法设置library");
        throw new Error("没有打开文件夹，无法操作library");
    }
}

// 用来辅助你创建新文档
async function DIY_book_creator(context : vscode.ExtensionContext, target : string) {
    try {
        const panel = vscode.window.createWebviewPanel(
            'testWebView',
            "创建新文档",
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );
        // let localpath = context.extensionPath
        let localpath = "D:/PP/DIYVSCode/"; // [ltn] 挺无奈的，正式提交的时候再把这里换成以上描述吧，因为我现在用F5调试，context.extensionPath是不存在的
        console.log("localpath is [" + localpath + "]")
        let type = "unknown"; // unknown
        if (target.includes("+")) { // 如果目标含+，认为这是一个函数
            DIY_function_book_creator(context, target);
        } else if (target.includes(".")) { // 如果目标含.，认为这是一个文件
            type = "file";
        } else if (target.includes(":")) { // 如果目标含#，认为它的模式有被特殊指定
            type = target.substring(0, target.search(":"));
        }

        console.log("当前目标的模式为" + type);
        let html = Box.load_text_file(path.join(localpath, "asset/library-create.html"));

        panel.webview.html = html;
        panel.webview.onDidReceiveMessage(message => DIY_book_html_handler(context, panel, message));
    } catch (error) {
        console.log(error);
    }
}

/**
 * 判断目标文件属于哪些模块
 */
async function file_belongs(file : string) : Promise<String[]> {
    try {
        let dict = await vscode.workspace.openTextDocument(vscode.Uri.file(path.join(await get_DIY_library(), "Module.md")));
        if (dict == undefined) {
            return [];
        }
        let line : string;
        let module;
        let module_md;
        let lineid, lineid2;
        let flag;
        let result = new Array<String>;
        // 前两行是表头不用管
        for (lineid = 2; lineid < dict.lineCount; lineid++) {
            line = dict.lineAt(lineid).text;
            if (line.includes("|")) {
                module = line.substring(0, line.search("|"));
            } else {
                module = line;
            }
            try {
                module_md = await vscode.workspace.openTextDocument(path.join(await get_DIY_library(), module + ".md"));
                for (flag = 0, lineid2 = 0; lineid2 < module_md.lineCount; lineid2++) {
                    line = module_md.lineAt(lineid2).text;
                    if (line.includes("子文件")) {
                        flag = 1;
                    } else if (line.includes("#")) {
                        flag = 0;
                    } else {
                        if (line.includes(file)) {
                            result.push(module);
                        }
                    }
                }
            } catch (error) {
                console.log(error);
            }
        }
        return result;
    } catch (error) {
        console.log(error);
        return [];
    }
}

async function DIY_function_book_creator(context : vscode.ExtensionContext, target : string) {
    try {
        let file = target.split("+")[0];
        let func = target.split("+")[1];
        console.log("file:" + file + ", func:" + func);

    } catch (error) {
        console.log(error);
        Box.show_vscode_message("创建函数文档[" + target + "]失败\n");
    }
}

// 替换注释，注释预期是从第一行开始到第一个段落为止的部分
async function DIY_book_update_note(filepath : string, note : string)
{
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
    })
}

function convert_relation(input : string) : string {
    if (input == 'childList') {
        return 'parentList';
    }
    if (input == 'parentList') {
        return 'childList';
    }
    return input;
}

async function DIY_book_add_relation(me : string, key : string, value : string, note : string, type : string, update : boolean) {
    try {
        Box.debug("[ltn] DIY_book_add_relation 开始");
        let filepath = path.join(await get_DIY_library(), me + ".md");
        // 从这里开始改用fs吧
        let contentStr = fs.readFileSync(filepath).toString();
        let line = contentStr.split("\n");
        let result = line[0];
        let target = "";
        let flag = 0;
        let this_value;
        if (type == "childList") target = "子函数";
        if (type == "parentList") target = "父函数";
        if (type == "relateList") target = "相关项";
        Box.debug("正在向[" + filepath + "的[## " + target + "]" + update ? "更新" : "追加" + "[" + key + "](./" + value + ".md):" + note);
        for (let lineid = 1; lineid < line.length; lineid++) {
            if (line[lineid].startsWith("## " + target)) {
                flag = 1;
            } else if (line[lineid][0] == "#") {
                if (flag == 1) {
                    result = result + "\n" + "[" + key + "](./" + value + ".md):" + note;
                    flag = -1;
                }
            } else if (flag == 1) {
                if (line[lineid][0] == '[') {
                    try {
                        let me = line[lineid];
                        this_value = me.substring(me.search("]") + 4, me.search("\:") - 4);
                        if (this_value == value) {
                            if (update) {
                                line[lineid] = "[" + key + "](./" + value + ".md):" + note;
                            }
                            flag = -1;
                        }
                    } catch (error) {
                        Box.debug(error.toString());
                    }
                }
            }
            result = result + "\n" + line[lineid];
        }
        Box.debug("预计向[" + filepath + "]写入:\n" + result);
        fs.writeFile(filepath, result, (err) => {console.log(err);});
    } catch (error) {
        Box.debug(error.toString());
    }
}

// 判决目标是否为列表操作
async function DIY_book_relation_edit(panel : vscode.WebviewPanel, message : {cmd:string, key:string, value:string, note:string, id:number, me:string}) : Promise<boolean> {
    try {
        let array = message.cmd.split("-");
        let target = "";
        if (array.length != 2) {
            return false;
        }
        if (array[0] == 'childList') {
            target = "子函数";
        } else if (array[0] == 'parentList') {
            target = "父函数";
        } else if (array[0] == "relateList") {
            target = "关联项"
        } else {
            return false;
        }
        if (array[1] != "add" && array[1] != "edit" && array[1] != "del") {
            return false;
        }
        let filepath = path.join(await get_DIY_library(), message.me + ".md");
        let document = await vscode.workspace.openTextDocument(filepath);
        let lineid = 1;
        let line;
        let content = document.lineAt(0).text;
        let flag = 0;
        let value;
        while (lineid < document.lineCount) {
            line = document.lineAt(lineid).text;
            if (line == "## " + target) {
                Box.debug("第" + lineid + "行为目标元素");
                flag = 1;
                content = content + "\n" + line;
            } else if (line.charAt(0) == "#") {
                if (flag == 1) {
                    if (array[1] == "add") {
                        // 检查value是否有效
                        if (fs.existsSync(path.join(await get_DIY_library(), message.value + ".md"))) {
                            content = content + "\n" + "[" + message.key + "](./" + message.value + ".md):" + message.note;
                            panel.webview.postMessage({"cmd":message.cmd, "id":message.id, "res":"PASS"});
                            // 增加子函数/父函数/关联函数时，还需要向对方文档也刷新联系
                            DIY_book_add_relation(message.value, message.me.substring(message.me.indexOf("+") + 1), message.me, "", convert_relation(array[0]), false);
                        } else {
                            panel.webview.postMessage({"cmd":message.cmd, "id":message.id, "res":"FAIL"});
                        }
                    } else {
                        // 有问题
                        panel.webview.postMessage({"cmd":message.cmd, "id":message.id, "res":"FAIL"});
                    }
                    flag = 0;
                }
                content = content + "\n" + line;
            } else if (flag == 1) {
                value = line.substring(line.search("]") + 4, line.search("\:") - 4); // 4是为了跳过 ](./ 4大天王 和 .md)
                if (value == message.value) {
                    if (array[1] == "edit") {
                        content = content + "\n" + "[" + message.key + "](./" + message.value + "):" + message.note;
                    } else if (array[1] == "add") {
                        panel.webview.postMessage({"cmd":message.cmd, "id":message.id, "res":"FAIL"});
                        Box.debug("你想加入的[" + message.value + "]已在[" + target + "]");
                        return true;
                    }
                    panel.webview.postMessage({"cmd":message.cmd, "id":message.id, "res":"PASS"});
                } else {
                    content = content + "\n" + line;
                }
            } else {
                content = content + "\n" + line;
            }
            lineid = lineid + 1;
        }
        Box.debug("预期写入" + content);
        fs.writeFile(filepath, content, (err) => {
            Box.debug(err);
        });
        return true;
    } catch (error) {
        Box.debug(error);
    }
    return false;
}

async function DIY_goto_target(filepath : string, target : string)
{
    let document = await vscode.workspace.openTextDocument(filepath);
    let lineid = 0;
    let line;
    let targetline = 0;
    for (lineid = 0; lineid < document.lineCount; lineid++) {
        line = document.lineAt(lineid).text;
        if (Box.is_target_function_definition(line, target)) {
            targetline = lineid;
            break;
        }
    }
    vscode.window.showTextDocument(document, {
        viewColumn: vscode.ViewColumn.One,
        selection: new vscode.Range(new vscode.Position(targetline, 0), new vscode.Position(targetline, 0))
    });
}

// 自动搜索子函数
async function DIY_search_child(panel : vscode.WebviewPanel, me : string) {
    try {
        var filepath = me.split("+")[0];
        var funcname = me.split("+")[1];
        var CFile = FBox.CFileParser.create(FBox.turnTransAddrToComplete(filepath));
        if (CFile == null) {
            throw "读取[" + Box.get_first_workspace() + "\\" + filepath + "]失败";
        }
        var result = CFile.getChildFunction(funcname, undefined);
        Box.debug(filepath + "里的" + funcname + "有[" + result.length + "]个子函数");
        for (var i = 0; i < result.length; i++) {
            Box.debug("[" + i + "] : key[" + result[i].key + "] value[" + result[i].value + "] note[" + result[i].note + "]");
        }
        let document = path.join(await get_DIY_library(), me + ".md");
        let msg = DIY_log_in_relation(await vscode.workspace.openTextDocument(document), "子函数");
        for (var i = 0; i < result.length; i++) {
            msg.push({key:result[i].key, value:result[i].value, note:result[i].note, tbd:"1"})
        }
        panel.webview.postMessage({"cmd":"flush-child", "data":msg});
    } catch (error) {
        Box.debug(error);
    }
}

/**
 * 注意Webview端发送的是一个Map，但是抵达Vscode端时已被整合为Object
 * 你不能用遍历Map的entries去查询其内容，但可以用for (key in obj)的方式遍历其中的属性
 * 不过这个OBJ只能包含数据内容，其携带的方法信息、原型信息等均会丢失
 */
async function DIY_book_html_handler(context : vscode.ExtensionContext, panel : vscode.WebviewPanel, message:Object) {
    try {
        Box.sep_debug();
        Box.debug(panel.title + "接收到一条消息:");
        for (let key in message) {
            Box.debug(key + ":" + message[key]);
        }
        // 执行消息内容
        if (message.cmd == undefined) {
            Box.sep_debug();
            Box.debug("未知消息，不带cmd没法解析");
            return;
        }
        if (message.cmd == "change-note") { // 变更note
            DIY_book_update_note(path.join(await get_DIY_library(), message.name), message.note);
        } else if (message.cmd == "query-child") { // 查询子函数列表
            let document = path.join(await get_DIY_library(), message.msg + ".md");
            document = await vscode.workspace.openTextDocument(document);
            if (document == undefined) {
                Box.debug("打开[" + path.join(await get_DIY_library(), message.msg) + "] 失败");
            }
            panel.webview.postMessage({"cmd":"flush-child", "data":DIY_log_in_relation(document, "子函数")});
        } else if (message.cmd == "jump-to") {
            let document = await vscode.workspace.openTextDocument(path.join(await get_DIY_library(), message.target + ".md"));
            let filepath = DIY_log_in_filepath(document);
            let target = document.lineAt(0).text.substring(2);  // 文档的第一行永远是`# 函数名`
            Box.debug("预计跳转" + filepath + " + " + target);
            DIY_goto_target(path.join(await Box.get_first_workspace(), filepath), target);
        } else if (message.cmd == "goto-doc") {
            let document = await vscode.workspace.openTextDocument(path.join(await get_DIY_library(), message.target + ".md"));
            vscode.window.showTextDocument(document);
        } else if (message.cmd == "goto-html") {
            DIY_show_function_document(context, message.target + ".md");
        } else if (message.cmd == "search-child") {
            // 自动搜寻子函数
            DIY_search_child(panel, message.target);
        } else if (await DIY_book_relation_edit(panel, message)) { // 判别这是不是一个 child/parent/relateList - add/del/edit
            console.log("完成列表处理");
        } else {
            console.log("未知消息");
        }
    } catch (error) {
        console.log(error);
    }
}

export function book_test(context: vscode.ExtensionContext) {
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
class TestTreeDataProvider implements vscode.TreeDataProvider<any> {
    // 事件 onDidChangeTreeData是什么东西？
    // 查询树的子节点
    getChildren(element?: any): vscode.ProviderResult<any[]> {
        return [1, 2, 3];
    }
    // 将子节点转换成可见的TreeItem
    getTreeItem(element: any): vscode.TreeItem | Thenable<vscode.TreeItem> { // 获取元素的表现形式(元素名)
        return {
            label: `测试${element}`
        }
    }
}
