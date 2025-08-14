const vscode = require('vscode');
const PP = require('../common/PP.js')("ST");

module.exports = function(context) {
    // 注册paint_it命令
	context.subscriptions.push(vscode.commands.registerCommand('DIYVSCode.paint_it', ST_paint_it))
	context.subscriptions.push(vscode.commands.registerCommand('DIYVSCode.test_it', ST_test_it))
}

// 绘制当前函数的调用关系图
function ST_paint_it() {
    try {
        // 首先要判断你是否选中了一个函数的定义
        var symbol = PP.get_current_select()
        if (!PP.is_symbol(symbol)) {
            PP.show_vscode_message(symbol + "不是一个符号")
            return
        }
        if (PP.is_function_definition() === false) {
            console.log("当前行(" + vscode.window.activeTextEditor.document.uri.fsPath + ":" + vscode.window.activeTextEditor.selection.start.line + ")不是函数定义")
            return
        }
        // 如果这是一个已被录入的子函数，直接去取她的信息
        // 但是目前还没实现
        // 如果这是一个新的子函数，那么将注册她
        // 1. 录入函数原型
        var prototype = ""
        var position = vscode.window.activeTextEditor.selection.start
        var current = ""
        var content = ""
        position = new vscode.Position(position.line, 0)
        current = PP.get_next_element(position)
        while (current != "{") {
            prototype = prototype + current
            position = PP.get_g_position()
            current = PP.get_next_skip_comment(position)
        }
        // 2. 分析子函数
        var childlist = PP.get_child_function(PP.former_position(PP.get_g_position()))
        var struct = ""
        if (childlist.length == 0) {
            struct = "当前函数" + symbol + "没有子函数"
        } else {
            // 绘制
            struct += '<div class="tree" id="tree">\n<details>\n<summary class="tree-item">' + symbol + "</summary>\n"
            for (var i = 0; i < childlist.length; i++) {
                // context = context + childlist[i] + "<br>"
                if (childlist[i] != '0ut') {
                    struct += '<details> <summary class="tree-item">' + childlist[i] + "</summary>"
                }
                if (childlist[i] == "if" || childlist[i] == "while" || childlist[i] == "do-while" || childlist[i] == "switch" || childlist[i] == "for") {
                    struct += "\n"
                } else if (childlist[i] == "0ut") {
                    struct += '</details>\n</details>'
                } else {
                    struct += '</details>\n'
                }
                // struct += `<a href="#" class="function-link" data-function="${childlist[i]}">${childlist[i]}</a><br>`
            }
            struct += "</details>\n</div>"
        }
        // 3. 录入函数内容 (以行首的}作为函数结束的标记，不遵守这种写法的自求多福吧)
        var path = vscode.window.activeTextEditor.document.uri.fsPath
        while (vscode.window.activeTextEditor.document.lineAt(position.line).text[0] != '{') {
            content += vscode.window.activeTextEditor.document.lineAt(position.line).text;
            position = position.translate(1, 0)
        }
        // 创建WebView
        const panel = vscode.window.createWebviewPanel(
            'testWebView', // viewType
            symbol + "分解", // 视图标题
            vscode.ViewColumn.Beside, // 显示在右侧编辑器
            {
                enableScripts: true, // 启用JS，默认是禁用的
                retainContextWhenHidden: true, // webview被隐藏时保持状态，避免被重置
            }
        )
        // 
        var html = PP.load_text_file("D:/PP/DIYVSCode/ST-demo/function.html")
        html = PP.replace_variable(html, {
            symbol : symbol,
            struct : struct,
            prototype : prototype,
            content : content,
            path : path
        })
        console.log("正在绘制webview: " + html)
        panel.webview.html = html

        // 处理来自webView的消息
        panel.webview.onDidReceiveMessage(
            message => {
                console.log("识别到消息" + message.toString())
                switch (message.command) {
                    case 'jumpToFunction':
                        // 调用插件内部方法跳转到函数定义
                        PP.jumpto_function(message.functionName);
                        return;
                    default:
                        console.log("识别到未知消息" + message.command)
                }
            },
            undefined,
            content.subscriptions // 确保正确处理订阅
        );

    } catch (error) {
        console.log("ST_paint_it出现故障")
        console.log(error.toString())
    }
}

function ST_test_it() {
    try {
        
    } catch (error) {
        console.log("出现故障")
        console.log(error.toString())
    }
}