import * as vscode from 'vscode';
import * as Box from './Toolbox';
import * as path from 'path';
import * as fs from 'fs';

// 跳转到当前选中元素的对应文档（如果没有选中元素，将跳转到当前文件的文档）（如果没有当前文档 —— 不会执行跳转）
// 如果不存在这个文档，会跳转到[文档生成]页面
export async function DIY_book(context : vscode.ExtensionContext) {
    const editor = vscode.window.activeTextEditor;
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
    let keyword = editor.document.getText(editor.selection);
    // 如果没有圈选关键字，认为将针对当前文档进行跳转
    if (keyword == undefined || keyword.length == 0) {
        keyword = editor.document.uri.fsPath.substring(workspace.length + 1);
        return;
    } else {
        // 如果圈选了关键字，也要判断这个关键字是否正常，但是现在先不管 [loading]
        keyword = editor.document.uri.fsPath.substring(workspace.length + 1) + "+" + keyword;
    }
    console.log("[DIY]即将打开 " + keyword + "对应的文档");
    // 将keyword转成对应的md
    // 由于文件名中不能出现/，将所有/转成-，并且将原有的-转成-- …… 你说文件名/函数名里原本就有--怎么办……当前是没有办法，后续用网页URL那种%123的方式吧，我先把基础功能实现了
    keyword = keyword.replace(new RegExp("-", "g"), "--");
    keyword = keyword.replace(new RegExp("\\\\", "g"), "-");
    let library = await get_DIY_library();
    if (library == "") {
        library = path.join(workspace, "DIY-library");
        if (!fs.existsSync(library)) fs.mkdirSync(library);
        if (!fs.existsSync(library)) {
            Box.show_vscode_message("在当前工作区内创建Library [" + library + "]失败\n");
            return;
        }
    }
    let filepath : string = path.join(library, keyword);
    filepath = filepath + ".md";
    if (!fs.existsSync(filepath)) {
        Box.show_vscode_message("[" + filepath + "]不存在！");
        DIY_book_creator(context, filepath);
        // 提示创建
        // 如果创建的是函数，会录入函数的定义，生成注释区域，父函数区域，子函数区域
    } else {
        // 目标MD存在，就会直接跳转到她
        vscode.window.showTextDocument(await vscode.workspace.openTextDocument(filepath));
        // 然后对特定格式的MARKDOWN，将可以用本插件来进行特殊的观看和处理
    }
}

// 查询文档库路径
// 1. 如果当前工作区下存在`DIY-config.md`，并且其中有`DIY-library`，采用之
// 2. 如果当前工作区下存在`DIY-library`文件夹，采用之
// 3. 使用配置文件中的`DIY`
async function get_DIY_library() : Promise<string> {
    let library = await Box.get_DIY_config("DIY-library");
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
}

// 用来辅助你创建新文档
async function DIY_book_creator(context : vscode.ExtensionContext, filepath : string) {
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
        let html = Box.load_text_file(path.join(localpath, "asset/library-create.html"));

        panel.webview.html = html;
        panel.webview.onDidReceiveMessage(message => DIY_book_html_handler(context, message));
    } catch (error) {
        console.log(error);
    }
}

/**
 * 注意Webview端发送的是一个Map，但是抵达Vscode端时已被整合为Object
 * 你不能用遍历Map的entries去查询其内容，但可以用for (key in obj)的方式遍历其中的属性
 * 不过这个OBJ只能包含数据内容，其携带的方法信息、原型信息等均会丢失
 */
async function DIY_book_html_handler(context : vscode.ExtensionContext, message:Object) {
    for (let key in message) {
        console.log(key + ":" + message[key]);
    }
    let temp = message.cmd;
    for (let temp_key in temp) {
        console.log("cmd:" + temp_key + ":" + temp[temp_key]);
    }

}


/**
 * 创建空白MD文档
 * @param context 
 * @param filename 
 */
async function DIY_create_blank_document(context : vscode.ExtensionContext, filename : string) {
    console.log("即将创建空白文档[" + filename + "]");
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
