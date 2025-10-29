import * as vscode from 'vscode';
import * as Toolbox from './Toolbox';
import { DIY_Jump } from './DIY-Jump';
import { DIY_book, book_test } from './DIY-Book';

export function activate(context : vscode.ExtensionContext) {
    console.log('DIYVSCode插件已激活');
    let disposable = vscode.commands.registerCommand('DIYVSCode.diyJump', DIY_Jump); // 注册DIY跳转命令
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('DIYVSCode.diybook', () => DIY_book(context));
    context.subscriptions.push(disposable);

    book_test(context);
    return;
}