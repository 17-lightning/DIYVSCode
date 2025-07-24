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
        // 然后去列举她的子函数
        var childlist = PP.get_child_function(PP.former_position(PP.get_g_position()))
        var context = ""
        if (childlist.length == 0) {
            PP.show_vscode_message("当前函数" + symbol + "没有子函数")
        } else {
            // 为每个子函数生成可点击链接
            for (var i = 0; i < childlist.length; i++) {
                // context = context + childlist[i] + "<br>"
                context += `<a href="#" class="function-link" data-function="${childlist[i]}">${childlist[i]}</a><br>`
            }
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
        var html = PP.load_text_file("D:/PP/DIYVSCode/ST-demo/test.html")
        html = PP.replace_variable(html, {
            symbol : symbol,
            context : context
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
            context.subscriptions // 确保正确处理订阅
        );

    } catch (error) {
        console.log("ST_paint_it出现故障")
        console.log(error.toString())
    }
}

function ST_test_it() {
    try {
        var position = vscode.window.activeTextEditor.selection.end
        // console.log(PP.get_child_function(position))
        // var childlist = PP.get_child_function(position)
        // for (var i = 0; i < childlist.length; i++ ) {
        //     console.log("当前函数存在子函数: " + childlist[i].toString())
        // }
        var result = PP.get_next_element(position)
        console.log("下一个元素是:[" + result + "]")
        var result = PP.get_next_element(PP.get_g_position())
        console.log("下一个元素是:[" + result + "]")
        var result = PP.get_next_element(PP.get_g_position())
        console.log("下一个元素是:[" + result + "]")
        var result = PP.get_next_element(PP.get_g_position())
        console.log("下一个元素是:[" + result + "]")
        var result = PP.get_next_element(PP.get_g_position())
        console.log("下一个元素是:[" + result + "]")
        var result = PP.get_next_element(PP.get_g_position())
        console.log("下一个元素是:[" + result + "]")
        var result = PP.get_next_element(PP.get_g_position())
        console.log("下一个元素是:[" + result + "]")
        var result = PP.get_next_element(PP.get_g_position())
        console.log("下一个元素是:[" + result + "]")
        var result = PP.get_next_element(PP.get_g_position())
        console.log("下一个元素是:[" + result + "]")
        var result = PP.get_next_element(PP.get_g_position())
        console.log("下一个元素是:[" + result + "]")
        var result = PP.get_next_element(PP.get_g_position())
        console.log("下一个元素是:[" + result + "]")
        // console.log("跳过注释的下一个字符是" + PP.get_next_skip_comment(position))
        
        console.log(position.line + ":" + position.character)
        position = PP.get_g_position()
        console.log(position.line + ":" + position.character)
    } catch (error) {
        console.log("出现故障")
        console.log(error.toString())
    }
}