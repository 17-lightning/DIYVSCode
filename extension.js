// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('"DIYVSCode" plugin activating...');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('DIYVSCode.helloWorld', function () {
		vscode.window.showInformationMessage('Hello World from DIYVScode!');
	});

	context.subscriptions.push(disposable);

	context.subscriptions.push(vscode.commands.registerCommand('DIYVSCode.diyJump', () => {
		const editor = vscode.window.activeTextEditor
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
		// 读取DIY Jump的配置文件
		var workpath = vscode.workspace.getConfiguration().get('diyvscode.diyjumpconfig');
		if (workpath == undefined || workpath.length == 0) {
			workpath = vscode.workspace.workspaceFolders[0].uri.path + "/DIY-jump.md"; // 不太清楚vscode的工作区是个什么概念，但是仅对第一个工作区生效啊
		} else {
			workpath = workpath + "/DIY-jump.md";
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
				if (targetfile[0] == '.') {
					targetfile = vscode.workspace.workspaceFolders[0].uri.path + "/" + targetfile.substring(1);
				}
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
							console.log("找到你了美味的小孩: " + line)
							break
						}
					} else {
						lineid = lineid - 1 // 因为你平时看见的lineid是从1开始计数的
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
