|手册||
|---|---|
|`debug`|用于打印debug信息，相当于`console.log`
|`show_vscode_message`|顾名思义，是在vscode的右下角显示信息
|`get_current_select`|返回用户当前选中的内容
|`is_text`|判断目标是否为文本(数字/字母/连接符)
|`is_symbol`|判断目标是否为符号(由数字/字母/连接符组成，且首位不为数字)
|`is_function_definition`|判断目标是否为函数定义，失败时返回false，成功时返回函数的起始内容位置(`{`的位置)<br>规则一：C语言的函数定义必须顶格写，前面不能有 space tab # / enter *<br>规则二：函数名(当前选中的)后面必须是`(`，前面则至少要有一个空格<br>规则三：从选中位置向后搜索，应当先找到`{`而不是先找到`;`
|`get_child_function`|<font color=FF0000>获取子函数 未完成</font>
|`login_child_function`|<font color=FF0000>将子函数录入 未完成</font>
|`get_next_skip_comment`|获取下一个字符，会自动跳过`//`和`/**/`这样的注释，g_position也会跳转到该字符的下一个位置
|`get_next`|获取下一个字符，并且会移动`#g_position`
|`get_former`|获取上一个字符，并且会移动`#g_position`
|`get_current`|获取当前字符(就是下一个字符)，不会移动`#g_position`
|`get_former_symbol`|获取上一个符号，即连续的数字/字母/连接符，会自动跳过一些空格，并且将`#g_position`移动到符号的开头处
|`next_position`|移动到下一个位置，会自动换行，比你vscode的translate要厉害多了
|`former_position`|移动到上一个位置，会自动换行
|`get_g_position`|就是获取`#g_position`
|`load_text_file`|将一个文本文件的内容以string全部返回
|`replace_variable`|根据`variables`(一个key:value的字典)将`template`中的`${key}`替换成`value`
|`jumpto_function`|<font color=FF0000>跳转到目标函数的定义 未完成</font>