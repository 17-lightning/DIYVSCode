const vscode = require('vscode');
module.exports = function(name) {
    return new PP(name)
}

class PP {
    #in_note_zone = 0
    #in_note = 0
    #debug_mode = 1
    #g_position
    #block_stack = {}

    constructor(name) {
        if (name != undefined) {
            console.log(name.toString() + "正在加载工具包")
        }
    }

    debug(input) {
        if (this.#debug_mode) {
            console.log(input)
        }
    }

    containsValue(obj, value) { // 暂时没有应用场景？
        return Object.values(obj).includes(value)
    }

    show_vscode_message(input) { // 在vscode窗口的右下角显示内容
        vscode.window.showInformationMessage(input)
    }
    
    get_current_select() { // 返回当前用户选中的内容
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
            if (line.charAt(0) == ' ' || line.charAt(0) == '\t' || line.charAt(0) == '#' || line.charAt(0) == '/' || line.charAt(0) == '\r' || line.charAt(0) == '\n' || line.charAt(0) == '*') {
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

    debug_get_child_function(assert, block) {
        var i
        for (i = 0; i < assert.length; i++) {
            this.debug("assert的第" + i + "位为: " + assert[i].toString())
        }
        for (i = 0; i < block.length; i++) {
            this.debug("block的第" + i + "位为: " + block[i].toString())
        }
    }

    // 该方法用于解析C语言文件，返回一个函数的所有子函数(及其分布)
    // 使用时，input_position需要位于这个函数的`{`位置
    // 将返回一个包含子函数的数组，当解析失败时，返回一个空数组
    // 遇到`if`时，会录入`if X`
    // 暂时没有制作switch的分层能力
    get_child_function(input_position) {
        try {
            if (!(input_position instanceof vscode.Position)) {
                console.log("输入不为position，异常退出")
                return new Array()
            }
            if (this.get_next_element(input_position) != '{') {
                console.log(input_position)
                console.log("指向不为{，异常退出" + this.get_current(input_position))
                return new Array();
            }

            const file = vscode.window.activeTextEditor.document    // 当前文件
            var childlist = new Array()                             // 子函数列表
            var position = input_position                           // 当前指针必定位于`{
            var last_element = ""                                   // 用于存储上一个符号
            var in_big_bra = 1                                      // 大括号{} 由于上面的get_next,已经有一个{被吃进来了，所以这里直接为1
            var in_bra = 0                                          // 小括号()
            var current                                             // 当前元素
            var temp                                                // 临时变量
            var assert = []                                         // 判断式
            var block = []                                          // 代码块
            var count = 0                                           // 用于对`if/else/for/do/while/switch`进行计数
            var do_while = 0                                        // 用于提示`while`你是不是`do`的附属
            var end_if = 0                                          // 在if刚结束的时候做标记，此时可以识别else
            var last = ""
            while (in_big_bra != 0) {
                current = this.get_next_element(this.get_g_position())
                console.log("正在处理:" + current)
                if (end_if == 1 && current != "else") {
                    end_if = 0
                }
                if (current == '{') { // 左括号可以作为block的开始
                    if (block.length != 0 && block[block.length - 1][0] == "X") {
                        block[block.length - 1][0] = "{"
                        block[block.length - 1][1] = in_big_bra
                        // this.debug("[" + block[block.length - 1][2] +"]的{}区间从" + this.print_position(this.#g_position) + "开始")
                    }
                    in_big_bra += 1
                } else if (current == '}') { // 右括号为对应block的结束，其中do-while类型此时会记录`do-while`，其他类型则结束并打印`0ut`
                    in_big_bra -= 1
                    if (block.length != 0 && block[block.length - 1][0] == '{' && block[block.length - 1][1] == in_big_bra) {
                        if (block[block.length - 1][2] == "do-while") {
                            do_while += 1
                            block.pop() // do-while的do区域结束时无需输出0ut，因为while就是她的0ut
                        } else if (block[block.length - 1][2] == "if") {
                            end_if = 1;
                            childlist.push("0ut")
                            block.pop();
                        } else {
                            childlist.push("0ut")
                            block.pop()
                        }
                        // this.debug("[" + block[block.length - 1][2] +"]的{}区间到" + this.print_position(this.#g_position) + "结束")
                    }
                } else if (current == '(') { // 左括号为assert的开始，也可以是函数
                    if (assert.length != 0 && assert[assert.length - 1][0] == 'X') {
                        assert[assert.length - 1][0] = '(';
                        assert[assert.length - 1][1] = in_bra;
                        this.debug("进入" + assert[assert.length - 1][2] + "的assert区域，当前位置为" + this.print_position(this.#g_position) + "当前括号层级为" + in_bra)
                    }
                    if (this.is_symbol(last)) {
                        if (!this.is_ignore_symbol(last)) {
                            childlist.push(last)
                        }
                    }
                    in_bra += 1
                } else if (current == ')') { // 右括号为assert的结束时，打印`then`，`do-while`和`switch`有特殊处理
                    in_bra -= 1
                    if (assert.length != 0 && assert[assert.length - 1][0] == '(' && assert[assert.length - 1][1] == in_bra) {
                        if (assert[assert.length - 1][2] == "do-while") {
                            childlist.push("0ut")
                            assert.pop()
                        } else if (assert[assert.length - 1][2] == "switch") {
                            block.push(['X', 0, "switch"])
                            childlist.push("then") // switch的后方应该是要用case来进行分类的，这样就不需要then了，但是目前还没做好
                            assert.pop()
                        } else {
                            block.push(["X", 0, assert[assert.length - 1][2]])
                            childlist.push("then")
                            assert.pop();
                        }
                    }
                } else if (current == "for" || current == "switch") {
                    this.debug("进入" + current + "领域")
                    assert.push(["X", 0, current])
                } else if (current == "if") {
                    if (block.length != 0 && block[block.length - 1][2] == "else" && block[block.length - 1][0] == "X") {
                        childlist[childlist.length - 1] = "else if"
                        block.pop()
                        assert.push(["X", 0, current])
                    } else {
                        childlist.push("if")
                        this.debug("进入" + current + "领域")
                        assert.push(["X", 0, current])
                    }
                } else if (current == "do") {
                    this.debug("进入do-while领域") 
                    block.push(["X", 0, "do-while"])
                    childlist.push("do-while")
                } else if (current == "while") {
                    if (do_while == 0) {
                        assert.push(["X", 0, "while"])
                    } else {
                        assert.push(["X", 0, "do-while"])
                    }
                } else if (current == ";") {
                    if (block.length != 0 && block[block.length - 1][0] == ';') {
                        if (block[block.length - 1][2] == "do-while") {
                            do_while += 1
                            block.pop()
                        } else if (block[block.length - 1][2] == 'if') {
                            childlist.push("0ut")
                            block.pop()
                            end_if = 1
                        } else {
                            childlist.push("0ut")
                            block.pop()
                        }
                    }
                } else if (current == "else") {
                    if (end_if) {
                        childlist[childlist.length - 1] = "else"
                        end_if = 0
                        block.push(["X", 0, "else"])
                    }
                } else {
                    if (block.length != 0) {
                        if (block[block.length - 1][0] == "X") {
                            block[block.length - 1][0] = ';'
                        }
                    }
                }
                last = current
            }
            return childlist
        } catch (error) {
            console.log("get_child_function中发生异常")
            console.log(error.toString())
            return new Array();
        }
    }

    // 录入子函数
    // ignore_function里存储了一些应当被忽略的简单子函数，例如printf/strlen这种，通常被视为普通处理逻辑
    // if/for/while/switch控制块也会被当做子函数，她们拥有一个序号来表示自己是第几个分支单元。在这些控制块结束的时候，会有一个finishX
    // 但是我靠！do {...} while (...); 面前，我这里以()前方判断
    // 不过现在只实现了第一步，后面再说
    login_child_function(symbol, childlist) {
        const ignore_function = [
            "printf",
            "strlen",
        ]
        const block_function = [
            "if",
            "for",
            "while",
            "switch"
        ]
        // 特殊函数例如if的处理复杂且收益不高，暂时推迟到后面去做，这里只无视固定的一些函数
        var special_function = [

        ]
        if (ignore_function.includes(symbol)) {
            this.debug(symbol + "属于可忽略函数，将不加入子函数列表")
            return
        }
        childlist.push(symbol)
    }

    // 获取下一个字符，会自动跳过 // 和 /**/ 类的注释
    // 后续再考虑跳过编译宏
    // 理应只返回一个字符，但在碰到CRLF文件的行末，好像就会返回"\r\n"，这个后面再处理吧 [tbd]
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

    // 获取下一个元素，符号/标点都算
    get_next_element(position) {
        var current = this.get_next_skip_comment(position)
        var result = ""
        var last = ""
        while (current == ' ' || current == '\t' || current == '\n' || current == '\r' || current == '\r\n') {
            current = this.get_next_skip_comment(this.#g_position)
        }
        // this.debug("当前符号为:" + current.charCodeAt(0))
        if (current == "\"") { // ""字符串里的所有内容认为是一个元素
            result = current
            last = current
            current = this.get_next_skip_comment(this.#g_position)
            while (current != '"' || last == '\\') {
                result = result + current
                last = current
                current = this.get_next_skip_comment(this.#g_position)
            }
            result = result + "\""
        } else if (current == '\\') { // 读到\时，它是一个转义符号，其下一个元素必被读取，且也只有下一个元素了
            result = current + this.get_next_skip_comment(this.#g_position)
        } else if (!this.is_text(current)) {
            result = current
        } else {
            while (this.is_text(current)) {
                result = result + current
                current = this.get_next_skip_comment(this.#g_position)
            }
            this.get_former(this.#g_position) // 由于这里读了下一个字符判断是不是内容发现不是，要把该字符还回去
        }
        return result
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
            while (former === ' ') {
                former = this.get_former(this.#g_position)
            }
            while ( this.is_text(former) ) {
                result = former + result;
                former = this.get_former(this.#g_position)
            }
            this.#g_position = this.next_position(this.#g_position)
            this.debug("[get_former_symbol]: " + result)
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

    // replace_variable(template: string, variables: {[key: string]: any}) {
    replace_variable(template, variables) {
        // 使用正则表达式匹配所有 ${variable} 格式的占位符
        return template.replace(/\$\{([^}]+)\}/g, (match, variableName) => {
            // 检查变量是否存在
            if (variables.hasOwnProperty(variableName)) {
                return variables[variableName];
            }
            
            // 变量未找到，返回原始占位符（或抛出错误/返回空字符串）
            console.warn(`模板变量 ${variableName} 未定义`);
            return match;
        });
    }

    jumpto_function(name) {
        console.log("即将跳转到" + name + "的定义")
    }

    print_position(position) {
        return "{" + position.line + ":" + position.character + "}"
    }

    is_ignore_symbol(symbol) {
        var list = [
            "if"
        ]
        if (list.indexOf(symbol) == -1) {
            return false
        } else {
            return true
        }
    }

    test() {
        var position = vscode.window.activeTextEditor.selection.end
        position.translate(0, 1)
    }
}

