// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 * DIYVscode插件总入口
 */
function activate(context) {
	console.log('"DIYVSCode" plugin activating...');

	// 这里是示范代码，用于展示如何向一个vscode命令注册其对应处理方法，先不删
	const disposable = vscode.commands.registerCommand('DIYVSCode.helloWorld', function () {
		vscode.window.showInformationMessage('Hello World from DIYVScode!');
	});
	context.subscriptions.push(disposable); // disposable需要存入subscriptions，这样她们能得到正确的清理

	require('./ST-demo/ST.js')(context); // 引入外部Js文件，会立即调用其构造方法
	require('./Dictionary/Book.js')(context);

	context.subscriptions.push(vscode.commands.registerCommand('DIYVSCode.diyJump', () => { // DIYVSCODE插件的首个功能：DIYJUMP
		const editor = vscode.window.activeTextEditor
		const path = require('path')
		const fs = require('fs') // 库来
		var keyword
		var lineid = 0
		var line
		var targetfile
		var targetlocation
		if (editor == undefined) {
			vscode.window.showInformationMessage("[diy]当前没有打开文件，无法跳转");
			return;
		}
		keyword = editor.document.getText(editor.selection);
		if (keyword == undefined || keyword.length == 0) {
			vscode.window.showInformationMessage("[diy]当前没有选中目标，无法跳转");
			return;
		}
		// 读取DIY Jump的配置文件，优先读取当前工作区的DIY-jump.md，其次去diyjumpconfig里找DIY-jump.md
		var workpath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, "DIY-jump.md")
		if (fs.existsSync(workpath) == false) {
			workpath = vscode.workspace.getConfiguration().get('diyvscode.diyjumpconfig');
			if (workpath == undefined || workpath.length == 0) {
				vscode.window.showInformationMessage("[diy]没有可用跳转配置，无法跳转")
				return;
			}
			workpath = path.join(workpath, "DIY-jump.md")
			if (fs.existsSync(workpath) == false) {
				vscode.window.showInformationMessage("[diy]没有可用跳转配置，无法跳转")
				return;
			}
		}
		console.log("[diy]正在打开DIY跳转的配置文件: " + workpath)
		// vscode api喜欢返回thenable，这是一种异步操作，try catch对异步不生效
		vscode.workspace.openTextDocument(vscode.Uri.file(workpath))
		.then(config => {
			console.log("[diy]已打开DIY跳转的配置文件: " + config.uri.path)
			for (lineid = 0; lineid < config.lineCount; lineid++) {
				if (keyword != config.lineAt(lineid).text.split("|")[0]) {
					continue
				}
				targetfile = config.lineAt(lineid).text.split("|")[1];
				if (targetfile == undefined || targetfile.length == 0) {
					vscode.window.showInformationMessage("[diy]跳转目标为空，跳转失败");
					return
				}
				if (targetfile[0] == '@') {
					targetfile = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, targetfile.substring(1));
				}
				if (targetfile[0] == '#') {
					workpath = vscode.workspace.getConfiguration().get('diyvscode.diyjumptoppath')
					if (workpath == undefined || workpath.length == 0) {
						vscode.window.showInformationMessage("[diy]#型跳转需要配置对应路径，跳转失败")
						return
					}
					targetfile = path.join(vscode.workspace.getConfiguration().get('diyvscode.diyjumptoppath'), targetfile.substring(1));
				}
				if (targetfile[0] == '.') {
					targetfile = path.join(editor.document.uri.fsPath, "../" + targetfile);
				}
				console.log("[diy]正在打开文件:" + targetfile)
				vscode.workspace.openTextDocument(targetfile).then(file => {
					// 然后还要寻找说去显示哪一行
					targetlocation = config.lineAt(lineid).text.split("|")[2]
					lineid = parseInt(targetlocation)
					if (isNaN(lineid)) {
						for (lineid = 0; lineid < file.lineCount; lineid++) {
							line = file.lineAt(lineid).text
							if ((!line.includes(" " + targetlocation + "(")) && (!line.includes(" *" + targetlocation + "("))) {
								continue
							}
							if (line[0] == ' ' || line[0] == '\t' || line[0] == '\n' || line[0] == '\r' || line[0] == '/' || line[0] == '*' || line[0] == '#') {
								continue
							}
							if (line.includes(";")) {
								continue
							}
							console.log("[diy]找到你了美味的小孩: " + line)
							break
						}
					} else {
						lineid = lineid - 1 // 因为你平时看见的lineid是从1开始计数的
					}
					if (lineid == file.lineCount) {
						console.log("[diy]没有找到目标函数的定义，将显示首行: " + targetlocation)
						lineid = 0
					}
					vscode.window.showTextDocument(file, {selection: new vscode.Range(
						new vscode.Position(lineid, 0),
						new vscode.Position(lineid, 0)
					)});
				})
				return
			}
			vscode.window.showInformationMessage("[diy]" + keyword + "不支持跳转");
		})
		.catch(error => {
			vscode.window.showInformationMessage("[diy]打开配置文件" + workpath + "失败，无法跳转")
		});

	}));
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
