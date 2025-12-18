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
exports.CFileParser = exports.FileParser = void 0;
exports.Develop_test = Develop_test;
exports.turnTransAddrToComplete = turnTransAddrToComplete;
exports.get_file_content = get_file_content;
exports.get_next_position = get_next_position;
exports.get_former_position = get_former_position;
exports.get_next_element = get_next_element;
exports.is_function_definition = is_function_definition;
const fs = require("fs");
const TBox = require("./Toolbox");
;
;
;
/**
 * 文件解析器
 * flush 刷新内容
 * write_back 写入文件
 * get_next_position 跳转下个位置
 * get_former_position 跳转上个位置
 * get_current 获取目标位置的值
 * is_valid_position 目标位置是否有效
 * get_former 获取上个位置的值
 * get_next 获取下个位置的值
 */
class FileParser {
    // 构造函数，创建FileParser时需要指定filepath
    constructor(filepath) {
        this.filepath = filepath;
        this.content = fs.readFileSync(filepath).toString().split("\n");
        // 给每行末尾都加入\n有助于免去`跳过空行`操作和判断symbol中是否有出现换行
        for (var i = 0; i < this.content.length; i++) {
            this.content[i] = this.content[i] + "\n";
        }
    }
    // 用这个函数来创建对象
    static create(filepath) {
        try {
            return new FileParser(filepath);
        }
        catch (error) {
            TBox.debug(error);
            return null;
        }
    }
    // 刷新内容
    flush() {
        this.content = fs.readFileSync(this.filepath).toString().split("\n");
    }
    // 写入文件
    write_back() {
        var result = this.content[0];
        var lineid = 1;
        for (lineid = 1; lineid < this.content.length; lineid++) {
            result = result + "\n" + this.content[lineid];
        }
        fs.writeFile(this.filepath, result, (err) => { TBox.debug(err); });
        TBox.sep_debug();
        TBox.debug_log("FBox", "正在写回[" + this.filepath + "]");
    }
    // 设置Position为invalid(-1, -1)
    set_position_invalid(position) {
        position.line = -1;
        position.index = -1;
    }
    // 跳转下一个位置，修改会在当前position(入参)中发生
    get_next_position(position) {
        if (this.content[position.line].length > position.index + 1) {
            position.index = position.index + 1;
        }
        else if (this.content.length > position.line + 1) {
            position.line = position.line + 1;
            position.index = 0;
        }
        else {
            this.set_position_invalid(position);
        }
    }
    // 跳转上一个位置，修改会在当前position(入参)中发生
    get_former_position(position) {
        if (position.index > 0) {
            position.index = position.index - 1;
        }
        else if (position.line > 0) {
            position.line = position.line - 1;
            position.index = this.content[position.line].length - 1;
        }
        else {
            this.set_position_invalid(position);
        }
    }
    try_get_next_position(position) {
        var pos2 = { line: position.line, index: position.index };
        this.get_next_position(pos2);
        return pos2;
    }
    try_get_former_position(position) {
        var pos2 = { line: position.line, index: position.index };
        this.get_former_position(pos2);
        return pos2;
    }
    // 获取当前位置的值，位置不正确时返回""
    get_current(position) {
        if (position.line < this.content.length) {
            if (position.index < this.content[position.line].length) {
                return this.content[position.line][position.index];
            }
        }
        return "";
    }
    // 当前位置是否有效
    is_valid_position(position) {
        if (position.line < 0 || position.index < 0) {
            return false;
        }
        if (position.line >= this.content.length) {
            return false;
        }
        if (position.index >= this.content[position.line].length) {
            return false;
        }
        return true;
    }
    // 简单版判断当前位置是否有效
    is_valid_position_simple(position) {
        if (position.line < 0 || position.index < 0) {
            return false;
        }
        return true;
    }
    // 获取上一个位置的值(会更新输入的position)
    get_former(position) {
        this.get_former_position(position);
        return this.get_current(position);
    }
    // 获取下一个位置的值(会更新输入的position)
    get_next(position) {
        this.get_next_position(position);
        return this.get_current(position);
    }
    try_get_former(position) {
        var pos2 = { line: position.line, index: position.index };
        return this.get_former(pos2);
    }
    // 获取下一个位置的值，不会更新输入的position
    try_get_next(position) {
        var pos2 = { line: position.line, index: position.index };
        return this.get_next(pos2);
    }
    get_line(position) {
        if (position.line < 0 || position.line >= this.content.length) {
            return "";
        }
        else {
            return this.content[position.line];
        }
    }
    // 判断输入是否为空，只包含\t和 和\n的被视为是空字符串
    is_blank(input) {
        for (var i = 0; i < input.length; i++) {
            if (input[i] != ' ' && input[i] != '\t' && input[i] != '\n') {
                return false;
            }
        }
        return true;
    }
    // 判断输入是否为文本，只有字母、数字、连接符被视为是文本
    is_text(input) {
        for (var i = 0; i < input.length; i++) {
            if ((input[i] >= 'a' && input[i] <= 'z') ||
                (input[i] >= 'A' && input[i] <= 'Z') ||
                (input[i] >= '0' && input[i] <= '9') ||
                (input[i] == '_')) {
                // 
            }
            else {
                return false;
            }
        }
        return true;
    }
    // [ltn]打印信息
    print(position) {
        TBox.debug("[ltn] : line[" + position.line + "] index[" + position.index + "] 's value is [" + this.get_current(position) + "]");
    }
    // 本项目专用功能，会根据排除输入的Top路径，将剩余路径进行/->--的转换后返还，异常时返还""
    get_trans_name(input) {
        if (!this.filepath.startsWith(input)) {
            return "";
        }
        var result = this.filepath.substring(input.length);
        result = result.replace(new RegExp("\\\\", "g"), "--");
        result = result.replace(new RegExp("/", "g"), "--");
        // 特殊的，如果result以--开头（也就是input不包含末尾的\）会进行删除
        while (result.startsWith("--")) {
            result = result.substring(2);
        }
        return result;
    }
}
exports.FileParser = FileParser;
;
/**
 * C源码文件解析器
 * is_symbol 判断是否为合法符号
 *
 */
class CFileParser extends FileParser {
    constructor(filepath) {
        super(filepath);
        this.function_list = [];
        this.ignore_list = [];
    }
    static create(filepath) {
        try {
            return new CFileParser(filepath);
        }
        catch (error) {
            TBox.debug(error);
            return null;
        }
    }
    // 判断目标是不是一个可用的符号，C语言中符号只能由字母和数字和连接符组成，且不能以数字开头
    static is_symbol(target) {
        if (target.length == 0) {
            return false;
        }
        if (target[0] >= '0' && target[0] <= '9') {
            return false;
        }
        var index = 0;
        for (index = 0; index < target.length; index++) {
            if ((target[index] >= 'a' && target[index] <= 'z') ||
                (target[index] >= 'A' && target[index] <= 'Z') ||
                (target[index] >= '0' && target[index] <= '9') ||
                (target[index] == '_')) {
                continue;
            }
            else {
                return false;
            }
        }
        return true;
    }
    // 获取后方的一个符号，会读取符号或连续的文本字符，会更新position
    get_next_symbol(position) {
        var result = "";
        var current = this.get_next(position);
        while (this.is_blank(current) && this.is_valid_position_simple(position)) {
            current = this.get_next(position);
        }
        if (!this.is_valid_position_simple(position)) {
            return "";
        }
        // 跳过注释内容
        if (current == '/') {
            if (this.try_get_next(position) == '/') {
                // 跳过当前行
                position.line = position.line + 1;
                position.index = -1;
                return this.get_next_symbol(position);
            }
            else if (this.try_get_next(position) == '*') {
                this.get_next(position); // 跳过/*中的*
                while (this.get_next(position) != '*' || this.try_get_next(position) != '/') {
                    // 跳过直到下一个*/为止的内容
                }
                this.get_next(position); // 跳过*/中的/
                return this.get_next_symbol(position);
            }
        }
        if (!this.is_text(current)) {
            // 特殊的，-> && || >> << 被视为一个符号
            if (current == '-' && this.try_get_next(position) == '>' && this.try_get_next_position(position).line == position.line) {
                this.get_next(position); // 跳过>
                return "->";
            }
            if (current == '&' && this.try_get_next(position) == '&' && this.try_get_next_position(position).line == position.line) {
                this.get_next(position);
                return "&&";
            }
            if (current == '|' && this.try_get_next(position) == '|' && this.try_get_next_position(position).line == position.line) {
                this.get_next(position);
                return "||";
            }
            if (current == '>' && this.try_get_next(position) == '>' && this.try_get_next_position(position).line == position.line) {
                this.get_next(position);
                return ">>";
            }
            if (current == '<' && this.try_get_next(position) == '<' && this.try_get_next_position(position).line == position.line) {
                this.get_next(position);
                return "<<";
            }
            // 反斜杠有三种用法 \n 跟一个特殊符号 \123 跟3位八进制 \x12 跟2位16禁止。 另外还有 \ 放在行最末时表示承接下一行，无实际意义
            // 不考虑反斜杠后方不好好写的情况
            if (current == '\\') {
                current = this.get_next(position);
                if (current == '\n') {
                    return this.get_next_symbol(position);
                }
                else if (current == 'x') {
                    result = "\\x" + this.get_next(position);
                    result = result + this.get_next(position);
                    return result;
                }
                else if (current >= '0' && current <= '7') {
                    result = "\\" + current + this.get_next(position);
                    result = result + this.get_next(position);
                    return result;
                }
                else {
                    return '\\' + current;
                }
            }
            // 一整个字符串被视为一个symbol
            if (current == '"') {
                result = '"';
                current = this.get_next(position);
                while (current != '"') {
                    result = result + current;
                    // 当\转义符号出现时，其后方的"不能用作判据。除非\的后方直接是\n，那么不计入这个\
                    if (current == '\\') {
                        if (this.try_get_next(position) == '\n') {
                            this.get_next(position);
                            result = result.substring(0, result.length - 1);
                        }
                        else {
                            result = result + this.get_next(position);
                        }
                    }
                    current = this.get_next(position);
                }
                result = result + '"';
                return result;
            }
            return current;
        }
        else {
            result = current;
            current = this.get_next(position);
            while (this.is_text(current)) {
                result = result + current;
                current = this.get_next(position);
            }
            this.get_former(position); // 归还多读的一个不属于符号的字符
            return result;
        }
    }
    // 获取当前行的所有符号，如果有跨行的符号会吃下来
    get_symbol_of_line(line) {
        if (line < 0 || line > this.content.length) {
            return [];
        }
        var position = { line: line, index: -1 };
        var result = [this.get_next_symbol(position)];
        // 已经走入下一行，或者走到了当前行的\n前，或者录入了一个空项，停止继续搜索
        while (position.line == line && (position.index != this.content[position.line].length - 2) && result[result.length - 1] != "") {
            result.push(this.get_next_symbol(position));
        }
        return result;
    }
    // 刷新参数列表。不好好写的函数解析不到是活该
    flushFunctionList() {
        var lineid = 0;
        var line = "";
        var symbol_list;
        var index;
        var position;
        var next;
        this.function_list = [];
        try {
            for (lineid = 0; lineid < this.content.length; lineid++) {
                line = this.content[lineid];
                // 1. 函数必须顶格写
                if (line[0] == ' ' || line[0] == '\t' || line[0] == '#' || line[0] == '(' || line[0] == "\r" || line[0] == "\n") {
                    continue;
                }
                // 2. 函数定义行肯定要有一个(，(前方是函数名，且函数名前方有返回值声明，因此(至少是第三个元素
                if (!line.includes('(')) {
                    continue;
                }
                symbol_list = this.get_symbol_of_line(lineid);
                index = symbol_list.indexOf('(', 2);
                while (index != -1) {
                    if (CFileParser.is_symbol(symbol_list[index - 1])) {
                        // 3. 从函数名向后搜索，可以先搜索到{而不是;
                        position = { line: lineid, index: -1 };
                        // 走到(的位置
                        for (var i = 0; i <= index; i++) {
                            this.get_next_symbol(position);
                        }
                        next = this.get_next_symbol(position);
                        while (next != "" && next != ";" && next != "{") {
                            next = this.get_next_symbol(position);
                        }
                        if (next == '{') {
                            this.function_list.push({ lineid: lineid, name: symbol_list[index - 1] });
                            break;
                        }
                    }
                    index = symbol_list.indexOf('(', index + 1);
                }
            }
        }
        catch (error) {
            TBox.debug(error);
            TBox.debug("lineid is " + lineid);
        }
    }
    // 打印当前文件包含的函数列表，需要事先调用过flushFunctionList才行
    printFunctionList() {
        TBox.sep_debug();
        TBox.debug("正在打印[" + this.filepath + "]的函数列表");
        for (var i = 0; i < this.function_list.length; i++) {
            TBox.debug("[" + this.function_list[i].name + "] : [" + this.function_list[i].lineid + "]");
        }
    }
    // 获取当前函数在哪一行
    get_function_line(target) {
        if (this.function_list.length == 0) {
            this.flushFunctionList();
        }
        for (var i = 0; i < this.function_list.length; i++) {
            if (this.function_list[i].name == target) {
                return this.function_list[i].lineid;
            }
        }
        return -1;
    }
    // 获取子函数，如果传入搜索范围，将会在范围内进行搜索，否则只会搜索当前文件
    getChildFunction(target, searchPath) {
        var temp;
        var result = [];
        // 先刷一把函数列表
        if (this.function_list.length == 0) {
            this.flushFunctionList();
        }
        var lineid = this.get_function_line(target);
        if (lineid == -1) {
            return [];
        }
        var position = { line: lineid, index: -1 };
        var big_bra_layer = 1; // 大括号层级
        // 首先找到函数的开始位置也就是 {
        while (this.get_next_symbol(position) != '{') { }
        // 然后阅读函数内容
        var last_symbol = "";
        var current;
        while (big_bra_layer > 0) {
            current = this.get_next_symbol(position);
            if (current == '{') {
                big_bra_layer = big_bra_layer + 1;
            }
            else if (current == '}') {
                big_bra_layer = big_bra_layer - 1;
            }
            else if (current == '(') {
                if (CFileParser.is_symbol(last_symbol) && !this.isIgnoreFunction(last_symbol)) {
                    if (searchPath != undefined) {
                        // 有指定搜索路径时，要去目标路径下寻找内容
                        throw "暂未实现在目标路径下自动搜索子函数的功能";
                    }
                    else {
                        // 没有指定搜索路径时，只需要看看当前文件内有没有这个函数名就可以了
                        if (this.get_function_line(last_symbol) > 0) {
                            temp = this.get_trans_name(TBox.get_first_workspace());
                            if (temp != "") {
                                temp = temp + "+" + last_symbol;
                            }
                            result.push({ key: last_symbol, value: temp, note: "" });
                        }
                        else {
                            result.push({ key: last_symbol, value: "", note: "" });
                        }
                    }
                }
            }
            last_symbol = current;
        }
        return result;
    }
    // 设置默认的无视函数
    static setDefaultIgnoreFunction(ignore_list) {
        ignore_list.push("if");
        ignore_list.push("for");
        ignore_list.push("while");
        ignore_list.push("printf");
        ignore_list.push("strlen");
        ignore_list.push("strcmp");
        ignore_list.push("strcat");
        ignore_list.push("memcpy");
        ignore_list.push("memcpy_s");
        ignore_list.push("memset");
        ignore_list.push("memset_s");
    }
    // 判断是否为需要无视的函数
    isIgnoreFunction(input) {
        return this.ignore_list.includes(input);
    }
}
exports.CFileParser = CFileParser;
// 开发者测试 [DT]
function Develop_test() {
    TBox.sep_debug();
    TBox.debug("=====正在进行FBox的测试=====");
    try {
        var CFile = CFileParser.create("d:\\linux\\linux-6.15.2\\drivers\\net\\ethernet\\hisilicon\\hns3\\hnae3.c");
        if (CFile == null) {
            throw "FBox DT失败，无法打开目标文件";
        }
        var position = { line: 149, index: 0 };
        var value = CFile.get_next_symbol(position);
        if (value == "mutex_lock") {
            TBox.debug("[get_next] PASS");
        }
        else {
            TBox.debug("[get_next] FAIL " + value);
        }
        // get_former
        position = { line: 151, index: 0 };
        value = CFile.get_former(position);
        if (value == '\n') {
            TBox.debug("[get_former] PASS");
        }
        else {
            TBox.debug("[get_former] FAIL " + value);
        }
        // flushFunctionList
        CFile.flushFunctionList();
        CFile.printFunctionList();
        if (CFile.function_list[1].name != "hnae3_acquire_unload_lock") {
            TBox.debug("[flushFunctionList] PASS");
        }
        else {
            TBox.debug("[flushFunctionList] FAIL " + CFile.function_list[1].name);
        }
        // getChildFunction
        var childFunction = CFile.getChildFunction("hnae3_init_client_instance", undefined);
        TBox.debug("hnae3_init_client_instance有[" + childFunction.length + "]个子函数");
        for (var i = 0; i < childFunction.length; i++) {
            TBox.debug("[" + i + "] : key[" + childFunction[i].key + "] value[" + childFunction[i].value + "] note[" + childFunction[i].note + "]");
        }
    }
    catch (error) {
        TBox.debug(error);
    }
}
function turnTransAddrToComplete(input) {
    var result = input.replace(new RegExp("--", "g"), "\\");
    result = TBox.get_first_workspace() + "\\" + result;
    return result;
}
// 读取文件内容
function get_file_content(filepath) {
    return fs.readFileSync(filepath).toString().split("\n");
}
// 寻找下一个位置，如果没有下一个位置，会返回{-1, -1}
function get_next_position(content, position) {
    if (content[position.line].length > position.index + 1) {
        return { line: position.line, index: position.index + 1 };
    }
    else if (content.length > position.line + 1) {
        return { line: position.line + 1, index: 0 };
    }
    else {
        return { line: -1, index: -1 };
    }
}
// 寻找上一个位置，如果没有上一个位置，会返回{-1, -1}
function get_former_position(content, position) {
    if (position.index > 0) {
        return { line: position.line, index: position.index - 1 };
    }
    else if (position.line > 0) {
        return { line: position.line - 1, index: content[position.line - 1].length - 1 };
    }
    else {
        return { line: -1, index: -1 };
    }
}
// 获取下一个元素，因为是常调用的小函数，不在这里做try catch确保性能
function get_next_element(content, position) {
    var result = "";
    var current = content[position.line][position.index + 1];
}
// 反馈这一行是否为函数定义，需要输入文件
function is_function_definition() {
}
// 在目标文件中查找函数
function find_function_definition(filepath, funcname) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const content = get_file_content(filepath);
            let lineid = 0;
            for (lineid = 0; lineid < content.length; lineid++) {
            }
        }
        catch (error) {
            TBox.debug(error.toString());
        }
    });
}
//# sourceMappingURL=FileBox.js.map