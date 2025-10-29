"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = require("vscode");
const DIY_Jump_1 = require("./DIY-Jump");
const DIY_Book_1 = require("./DIY-Book");
function activate(context) {
    console.log('DIYVSCode插件已激活');
    let disposable = vscode.commands.registerCommand('DIYVSCode.diyJump', DIY_Jump_1.DIY_Jump); // 注册DIY跳转命令
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand('DIYVSCode.diybook', () => (0, DIY_Book_1.DIY_book)(context));
    context.subscriptions.push(disposable);
    (0, DIY_Book_1.book_test)(context);
    return;
}
//# sourceMappingURL=DIY-Top.js.map