const vscode = require('vscode');
module.exports = function(name) {
    return new PP(name)
}

class PP {
    #in_note_zone = 0
    #in_note = 0
    #debug = 0
    #g_position

    constructor(name) {
        if (name != undefined) {
            console.log(name.toString() + "正在加载工具包")
        }
    }

    debug_log(input) {
        if (this.#debug) {
            console.log(input)
        }
    }

    show_vscode_message(input) {
        vscode.window.showInformationMessage(input)
    }

    // 返回当前用户选中的内容
    get_current_select() {
	    return (vscode.window.activeTextEditor.document.getText(vscode.window.activeTextEditor.selection))
    }

    is_text(input) {
        if (
            (input >= '0' && input <= '9') ||
            (input >= 'a' && input <= 'z') ||
            (input >= 'A' && input <= 'Z') ||
            (input == '-' || input == '_')
        ) {
            return true
        } else {
            return false
        }
    }

    // 判断当前选中的是否为一个符号，符号需要为数字或字母或_-的组合，且首位不能是数字
    is_symbol(input) {
        var i
        var c
        if (typeof input !== 'string' && !(input instanceof String)) {
            return false
        }

        if (input.length === 0) {
            return false
        }

        if (input.charAt(0) >= '0' && input.charAt(0) <= '9') {
            return false
        }

        for (i = 0; i < input.length; i++) {
            c = input.charAt(i)
            if ( !this.is_text(c) ) {
                return false
            }
        }
        return true
    }

    // 判断目标是否为函数定义，失败时返回false，成功时返回函数的起始内容位置'{'
    is_function_definition() {
        try {
            const file = vscode.window.activeTextEditor
            // 规则一：C语言的函数定义必须顶格写，前面不能有 space tab # / enter
            var line = file.document.lineAt(file.selection.start.line).text
            if (line.charAt(0) == ' ' || line.charAt(0) == '\t' || line.charAt(0) == '#' || line.charAt(0) == '/' || line.charAt(0) == '\r' || line.charAt(0) == '\n') {
                this.show_vscode_message("选中的目标不是一个函数定义：以非法字符开头")
                return false
            }
            // 规则二：当前选中的位置(函数名)后面是'('，前面至少有一个空格
            console.log("后方目标为" + line.charAt(file.selection.end.character))
            if (line.charAt(file.selection.end.character) != '(') {
                this.show_vscode_message("选中的目标不是一个函数定义：没有紧跟着(")
                return false
            }
            console.log("前方目标为(" + line.substring(0, file.selection.start.character) + ")")
            if (!line.substring(0, file.selection.start.character).includes(' ')) {
                this.show_vscode_message("选中的目标不是一个函数定义：前方没有返回值类型")
                return false
            }
            // 规则三：从选中位置向后搜索，应当先找到'{'而不是';'，要注意跳过注释
            var next = this.get_next_skip_comment(file.selection.end.translate(0, -1)) // 不用担心这里的-1会越界，因为`前面至少有一个空格`规则已经解决了这种情况
            while (next != ';' && next != '{') {
                next = this.get_next_skip_comment(this.#g_position)
            }
            if (next === ';') {
                return false
            }
            // OK，认可你是一个函数实现了
            return this.#g_position
        } catch (error) {
            return false
        }
    }

    // 获取子函数Array，需要position指向{位置
    // 注：识别函数的结束位置需要读取所有字符，才能跟踪到{和}的出现情况，然后还要排除注释。这可能太复杂了导致插件反应较慢，所以这里用取巧的方式，以行首的}作为函数的结束标记
    get_child_function(input) {
        try {
            if (!(input instanceof vscode.Position)) {
                console.log("输入不为position，异常退出")
                return new Array()
            }
            if (this.get_current(input) != '{') {
                console.log(input)
                console.log("指向不为{，异常退出" + this.get_current(input))
                return new Array();
            }

            const file = vscode.window.activeTextEditor.document
            var childlist = new Array()
            var position = this.next_position(input) // 跳过这个{
            var line = file.lineAt(position.line).text
            var bound = 0
            var in_big_bra = 1
            var symbol
            var current
            // 还是只能一步一步去找(吗，很想走捷径但是注释这块真是太讨厌了
            while (in_big_bra != 0) {
                current = this.get_next_skip_comment(position)
                position = this.#g_position
                if (current == '{') {in_big_bra = in_big_bra + 1}
                else if (current == '}') {in_big_bra = in_big_bra - 1}
                else if (current == '(') {
                    this.debug_log(position.line + ":" + (position.character - 1) + "处有一个(")
                    // 检查(的前方是否为一个符号，如果是就认为它是函数调用
                    symbol = this.get_former_symbol(position.translate(0, -1))
                    if (symbol.length == 0 || (symbol.charAt(0) >= '0' && symbol.charAt(0) <= '9')) {
                        continue;
                    }
                    this.#g_position = position // 在前面的get_former_symbol后，#g_position指向符号前方越过一个字符的位置，我们把他拿回原始位置，即(后方
                    this.login_child_function(symbol, childlist) // 录入子函数
                    position = this.#g_position // 上面录入子函数的时候可能更新解析位置，这里进行更新
                }
            }
            return childlist
        } catch (error) {
            console.log("get_child_function中发生异常")
            console.log(error.toString())
            return new Array();
        }
    }

    // 录入子函数。其中printf等简单函数需要过滤，if等分支函数需要单独制作，一些宏则应该做对应映射
    // 不过现在只实现了第一步，后面再说
    login_child_function(symbol, childlist) {
        const ignore_function = [
            "printf",
            "strlen",
        ]
        // 特殊函数例如if的处理复杂且收益不高，暂时推迟到后面去做，这里只无视固定的一些函数
        var special_function = [

        ]
        if (ignore_function.includes(symbol)) {
            this.debug_log(symbol + "属于可忽略函数，将不加入子函数列表")
            return
        }
        childlist.push(symbol)
    }

    // 获取下一个字符，会自动跳过 // 和 /**/ 类的注释
    // 后续再考虑跳过编译宏
    get_next_skip_comment(position) {
        try {
            var file = vscode.window.activeTextEditor.document
            var next = this.get_next(position)
            if (next === '/') {
                var next2 = this.get_next(this.#g_position)
                // console.log("识别到/，当前行的下一个字符是" + next2)
                if (next2 === '/') {
                    // console.log("识别到//模式，将向下一行跳转")
                    this.#g_position = new vscode.Position(this.#g_position.line, file.lineAt(position.line).text.length) // 两个//表示进入注释，这一行的后面都不能要了直接跳转行末(为了和get_next的表现一致，这里需要能返回回车)
                    // console.log("检测到" + position.line + ":" + position.character + "位置的后方是//，将位置移动到" + this.#g_position.line + ":" + this.#g_position.character)
                    return this.get_next_skip_comment(this.#g_position)
                } else if (next2 === '*') {
                    // console.log("检测到/*，需要向后搜寻*/模式")
                    var line = file.lineAt(this.#g_position.line).text
                    if (line.indexOf("*/", this.#g_position.character) != -1) {
                        this.#g_position = new vscode.Position(this.#g_position.line, line.indexOf("*/", this.#g_position.character) + 2)
                    } else {
                        var lineid = this.#g_position.line + 1
                        line = file.lineAt(lineid).text
                        while (line.indexOf("*/") === -1) {
                            lineid = lineid + 1
                            line = file.lineAt(lineid).text
                        }
                        this.#g_position = new vscode.Position(lineid, line.indexOf("*/") + 2)
                    }
                    // console.log("检测到" + position.line + ":" + position.character + "位置的后方是/*，将位置移动到" + this.#g_position.line + ":" + this.#g_position.character)
                    return this.get_next_skip_comment(this.#g_position)
                }
            }
            return next
        } catch (error) {
            return ""
        }
    }

    // 注意，get_next和get_current返回的都是光标后方的字符，区别是get_current不会将g_position后移一位
    get_next(position) {
        try {
            this.#g_position = this.next_position(position)
            return vscode.window.activeTextEditor.document.getText(new vscode.Range(position, this.#g_position))
        } catch (error) {
            return ""
        }
    }

    get_former(position) {
        try {
            this.#g_position = this.former_position(position)
            return vscode.window.activeTextEditor.document.getText(new vscode.Range(this.#g_position, position))
        } catch (error) {
            return ""
        }
    }

    get_current(position) {
        try {
            return vscode.window.activeTextEditor.document.getText(new vscode.Range(position, this.next_position(position)))
        } catch (error) {
            return ""
        }
    }

    // 找到目标位置前方的一个符号(会自动跳过空格)
    get_former_symbol(position) {
        try {
            var former = this.get_former(position)
            var result = ""
            while ( former === ' ') {
                former = this.get_former(this.#g_position)
            }
            while ( this.is_text(former) ) {
                result = former + result;
                former = this.get_former(this.#g_position)
            }
            console.log(result)
            return result
        } catch (error) {
            this.#g_position = position
            return ""
        }
    }

    // 获取下一个位置(比vscode的translate强在会自动换行)
    next_position(position) {
        try {
            if (position.character + 1 > vscode.window.activeTextEditor.document.lineAt(position.line).text.length) {
                return new vscode.Position(position.line + 1, 0)
            } else {
                return position.translate(0, 1)
            }
        } catch (error) {
            return position
        }
    }

    former_position(position) {
        try {
            if (position.character == 0) {
                if (position.line == 0) {
                    return position
                }
                return new vscode.Position(position.line - 1, vscode.window.activeTextEditor.document.lineAt(position.line - 1).text.length)
            } else {
                return position.translate(0, -1)
            }
        } catch (error) {
            return position
        }
    }

    get_g_position() {
        return this.#g_position
    }

    // 将一个文本文件的内容全数返回
    load_text_file(filename) {
        const fs = require('fs')
        try {
            return fs.readFileSync(filename, 'utf8')
        } catch (error) {
            console.log("load_text_file中发生故障")
            console.log(error.toString())
        }
    }


    test() {
        var position = vscode.window.activeTextEditor.selection.end
        position.translate(0, 1)
    }
}

