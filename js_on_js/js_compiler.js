/**
 * 
 * @Author 許芥信 inshua@gmail.com
 * 
 * http://code.google.com/p/chn-js/
 */
/*
 * 將 parser 理解得到的 ast 翻譯為 js_machine 定義的指令集 
 */
function Compiler(preCompileSimpleOp){

	var compiledCode = [];
	
	this.getCompiledCode = function(){return compiledCode; } ;
	
	this.preCompileSimpleOp = (preCompileSimpleOp == null ? true : preCompileSimpleOp);
	
	function code(){
		var arr = [];
		for(var i=0; i<arguments.length; i++){
			arr.push(arguments[i]);
		}
		compiledCode.push(arr);
	}
	
	this.compile = function(ast){
		compiledCode = [];
		compiledCode.traceOut = function(){
			var sb = '';
			for(var i=0; i< this.length; i++){
				sb += i + '\t: ' + this[i].join(', ') + '\r\n';
			}
			console.log(sb);
		};
		this.compile_inner(ast);
		return compiledCode;
	};
	
	this.compileFunction = function(ast){		// 編譯函數，最後加上一句 return，確保函數可以從 return 結束
		this.compile(ast);
		code('return');		//(void 0)
		return compiledCode;
	};
	
	this.compile_inner = function (ast){
		this.prepareValue(ast);		// 固定量表達式編譯階段完成求值
		if(ast.hasValue()) {
			code('reg1', ast.value);
		} else {			
			var fun = this[ast.type];
			if(fun){
				fun.call(this, ast);
			} else {
				throw new Error(ast.type + ' cannot be compile');
			}
		}
	};
	
	this.block_stmt = this.stmts = function(ast){
		//code('ast', ast);
		for(var i=0; i<ast.children.length; i++){
			this.compile_inner(ast.children[i]);
		}
	};	
	
	this.empty_stmt = function(ast){
		code('ast', ast);
		code('nop');
	};
	
	this.expr_stmt = function(ast){
		//code('ast', ast.children[0]);
		code('ast', ast);
		this.compile_inner(ast.children[0]);
	};
	
	this.var_decl = function(ast){
		code('ast', ast);
		if(ast.initExpr){
			this.prepareValue(ast.initExpr);
			if(ast.initExpr.hasValue()){
				code('var', ast.varname, ast.initExpr.value);
			} else {
				code('ast', ast.initExpr);
				this.compile_inner(ast.initExpr);
				code('var1', ast.varname);
			}
		} else {
			code('var', ast.varname);
		}
	};
	
	this.id = function(ast){
		code('vget', ast.text);
	};
	
	this.attrib_access = function(target, setObjAsThis){
		this.prepareValue(target.attrib);
		this.prepareValue(target.object);
		
		var directAttrib = null, b=false;
		if(target.mode == 'dot'){
			if(target.attrib.type == 'id'){
				directAttrib = target.attrib.text;
				b = true;
			} 
		} else { // []
			if(target.attrib.hasValue()){
				directAttrib = target.attrib.value;
				b = true;
			}
		}
		if(b){	// sometime directAttrib == 0 or null 
			this.compile_inner(target.object);
			if(setObjAsThis) {		// 為函數調用準備 this
				code('push1');
			}
			code('get', directAttrib);
		} else{
			this.compile_inner(target.object);
			code('push1');
			
			if(setObjAsThis) {		// 為函數調用準備 this
				code('push1');
			}
			
			this.compile_inner(target.attrib);
			code('1to2');
			code('pop1');
			code('get2');
		}
	};
	
	this['set'] = function(ast){
		code('ast', ast);
		
		this.prepareValue(ast.children[0]);
		this.prepareValue(ast.children[1]);
		var target = ast.children[0];
		var value = ast.children[1];
		
		if(target.type == 'id'){
			if(value.hasValue()){
				code('vset', target.text, value.value);
			} else {
				this.compile_inner(value);
				code('vset1', target.text);
			}
		} else if(target.type == 'attrib_access'){
			// object[attrib]
			var directAttrib = null, b = false;
			if(target.mode == 'dot'){
				if(target.attrib.type == 'id'){
					directAttrib = target.attrib.text;
					b = true;
				} 
			} else { // []
				if(target.attrib.hasValue()){
					directAttrib = target.attrib.value;
					b = true;
				}
			}
			if(b){
				this.compile_inner(target.object);
				if(value.hasValue()){
					code('set', directAttrib, value.value);
				} else {
					code('push1');
					this.compile_inner(value);
					code('1to2');
					code('pop1');
					code('set2', directAttrib);
				}
			} else{
				this.compile_inner(target.object);
				if(value.hasValue()){
					code('push1');
					this.compile_inner(target.attrib);
					code('1to2');
					code('pop1');
					code('reg3', value.value);
					code('set3');
				} else {
					code('push1');
					this.compile_inner(target.attrib);
					code('push1');
					this.compile_inner(value);
					code('1to3');
					code('pop2');
					code('pop1');
					code('set3');
				}
			}
		} else {
			// bad setvalue
			
		}
	};
	
	this.var_decls = function(ast){
		code('ast', ast);
		for(var i=0; i<ast.children.length; i++){
			this.var_decl(ast.children[i]);
		}
	};
	
	this.function_call = function(ast, inNewProc){
		//if(!inNewProc) code('ast', ast);
		
		this.prepareValue(ast.fun);
		var attribCall = false;
		if(ast.fun.type == 'id'){
			code('reg1');	// void, 通知沒有找到 this_ 對象
			code('loadfun', ast.fun.text);	// 如果它找到了全局對象是該函數的主體，便會將它設到 reg1
			code('push1');  // 存起 this
		} else if(ast.fun.hasValue()){		
			throw new Error(ast.fun.value + " is not a function");
		} else {
			if(ast.fun.type == 'attrib_access'){
				attribCall = true;
				this.attrib_access(ast.fun, true);
			} else {
				this.compile_inner(ast.fun);
				code('push');	// void		由其它方式搞出來的函數必然無 this 指針
			}
			code('loadfun1');
		}
		
		// new 指令此時需要加入一些操作
		if(inNewProc) {
			// code('push1'); fun 已經 load，無需再記憶
			code('new');
			code('pop2');	// 放棄原來記憶的 this_ 
			code('push1');	// 使用該新建對象作為 this_ (後面會 pop1)
		}
		
		for(var i=0; i< ast.args.children.length; i++){
			var arg = ast.args.children[i];
			this.prepareValue(arg);
			if(arg.hasValue()){
				code('arg', arg.value);
			} else {
				this.compile_inner(arg);
				code('arg1');
			}
		}

		code('pop1');  // put this_ in reg1, so invoke procedure can get it
		if(!inNewProc){
			code('invoke');
		} else {
			code('push1');
			code('invoke');
			code('pop1');
		}
	};
	
	this.return_stmt = function(ast){
		code('ast', ast);
		if(ast.expression) {
			this.prepareValue(ast.expression);
			if(ast.expression.hasValue()){
				if(returnStmtInTry){
					code('setr', ast.expression.value);
					code('uncatch');
					code('jumpToFinal');
				} else {
					code('return', ast.expression.value);
				}
			}else{
				this.compile_inner(ast.expression);
				
				if(returnStmtInTry){
					code('setr1');
					code('uncatch');
					code('jumpToFinal');
				} else {
					code('return1');
				}
			}
		} else {
			if(returnStmtInTry){
				code('setr');	// (void)
				code('uncatch');
				code('jumpToFinal');
			} else {
				code('return');	// void
			}
		}
	};
	
	this.debugger_stmt = function(ast){
		code('ast', ast);
		code('debugger');
	};
	
	this.if_stmt = function(ast){
		code('ast', ast.cond);
		this.prepareValue(ast.cond);
		if(ast.cond.hasValue()){		// 一般不可能。。。
			if(ast.cond.value){		// direct call true part
				this.compile_inner(ast.tstmt);
			} else {
				if(ast.fstmt) this.compile_inner(ast.fstmt);
			}
		} else {
			this.compile_inner(ast.cond);
			code('test1');
			
			var pCond = compiledCode.length;
			code('if_false', 'todo');
			
			this.compile_inner(ast.tstmt);
			if(ast.fstmt){
				var pLeave = compiledCode.length;
				code('jump', 'todo');
			}
			
			compiledCode[pCond] = ['if_false', compiledCode.length];  // 補上行號
			
			if(ast.fstmt) {
				this.compile_inner(ast.fstmt);
				compiledCode[pLeave][1] = compiledCode.length;
			}
		}
	};
	
	this.while_stmt = function(ast){
		this.prepareValue(ast.cond);
		
		// 不用再檢查表達式了，誰會寫死循環。。。
		var pStart = compiledCode.length;
		
		code('ast', ast.cond);
		this.compile_inner(ast.cond);
		code('test1');
		
		var pCond = compiledCode.length;
		code('todo');
		
		this.compile_inner(ast.loop);
		
		code('jump', pStart);
		
		compiledCode[pCond] = ['if_false', compiledCode.length];  // 補上行號
		
		this.updateBreakAndContinue(pStart, pStart);
	};
	
	this.dowhile_stmt = function(ast){
		this.prepareValue(ast.cond);
		
		// 不用再檢查表達式了，誰會寫死循環。。。
		var pStart = compiledCode.length;
		
		this.compile_inner(ast.loop);

		code('ast', ast.cond);
		this.compile_inner(ast.cond);
		code('test1');
		
		code('if_true', pStart);
		
		this.updateBreakAndContinue(pStart, pStart);
	};
	
	this.for_stmt =function(ast){

		if(ast.init.type != 'void'){
			code('ast', ast.init);
			this.compile_inner(ast.init);
		}
		var pCond = compiledCode.length;
		if(ast.condition.type != 'void'){
			code('ast', ast.condition);
			this.compile_inner(ast.condition);
			code('test1');
			var pTest = compiledCode.length;
			code('todo');
		} 
		this.compile_inner(ast.loop);
		var pContinue = compiledCode.length;
		code('ast', ast.increase);
		this.compile_inner(ast.increase);
		code('jump', pCond);

		compiledCode[pTest] = ['if_false', compiledCode.length];
		
		this.updateBreakAndContinue(pCond, pContinue);
	};
	
	this.for_in_stmt = function(ast){
		var vardecl = ast.inPart.vardecl;
		var vname = vardecl.varname;
		var enumObj = ast.inPart.children[1];
		
		code('ast', ast.inPart);
		this.prepareValue(enumObj);
		if(enumObj.hasValue()){
			code('for_in', enumObj);
		} else {
			this.compile_inner(enumObj);
			code('for_in1');
		}
		code('var', vname, (void 0));

		code('for_in_next', vname, compiledCode.length + 1, 'jump out');

		var pStart = compiledCode.length;
		this.compile_inner(ast.loop);

		code('for_in_next', vname, pStart, compiledCode.length + 1);
		
		this.updateBreakAndContinue(pStart, compiledCode.length + 1);		
		
		compiledCode[pStart-1][3] = compiledCode.length;
		
		code('for_in_over');
	};
	
	// 有兩種switch，一種每個分支都是常量，這個可以通過構造一個跳轉數組來調整，一種則有分支不是常量，這種只能挨個判斷
	this.switch_stmt = function(ast){
		this.prepareValue(ast.cond);
		
		var allDeterminated = true, caseValues = [];
		for(var i=0;i<ast.body.children.length; i++){
			var c = ast.body.children[i];
			if(c.type == 'case_stmt'){
				this.prepareValue(c.children[0]);
				if(! c.children[0].hasValue()){
					allDeterminated = false;
					break;
				} else {
					caseValues.push(c.children[0].value);
				}
			}
		}
		if(allDeterminated){
			code('ast', ast.cond);
			this.compile_inner(ast.cond);
			code('1to2');
			var exists = {};		// 選擇值-出口關聯數組
			for(var i=0; i<caseValues.length; i++){
				exists[caseValues[i]] = 'todo';
			}
			code('reg1', exists);
			code('get2');
			code('test1');
			code('if_false', 'default_exit');
			code('jump1');
			var pStart = compiledCode.length;
			
			var defaultExit;
			for(var i=0; i<ast.body.children.length; i++){
				var c= ast.body.children[i];
				if(c.type == 'case_stmt'){
					exists[caseValues.shift()] = compiledCode.length;
				} else if(c.type == 'default_stmt'){
					defaultExit = compiledCode.length;
				} else {
					code('ast', c);
					this.compile_inner(c);
				}
			}
			
			this.updateBreakAndContinue(pStart, compiledCode.length);
			// default exit
			compiledCode[pStart -2][1] = defaultExit || compiledCode.length;
		} else {
			code('ast', ast.cond);
			this.compile_inner(ast.cond);
			code('push1');
			
			for(var i=1, prevCase = null; i<ast.body.children.length; i++){
				var c = ast.body.children[i];
				if(c.type == 'case_stmt' && ast.body.children[i-1].type != 'break'){
					// case 前如無 breakment，則上一個 case 應該貫穿到本行
					if(prevCase) c.appendJumpToCaseBody = true;
					prevCase = c;
				}
			}
			
			var pStart = compiledCode.length;
			var defaultExit = 0;
			var casePoints = [];		// case statemnt points (just the condition statement)
			for(var i=0; i<ast.body.children.length; i++){
				var c = ast.body.children[i];
				if(c.type == 'case_stmt'){
					// 為上一個 case 的最後一句生成一個跳轉到本輪最後一句的代碼
					if(c.appendJumpToCaseBody){
						var pAppendJumpNextBody = compiledCode.length;
						code('nextCaseBody');
					}

					casePoints.push(compiledCode.length);
					if(c.children[0].hasValue()){
						code('reg2', c.children[0].value);
						code('eq2');
						code('test1');
						code('next_start', casePoints.length);		// if_false jump to next case start
					} else {
						code('ast', c.children[0]);
						this.compile_inner(c.children[0]);
						code('1to2');
						code('peek1');
						code('eq2');
						code('test1');
						code('next_start', casePoints.length);
					}
					if(c.appendJumpToCaseBody){
						compiledCode[pAppendJumpNextBody] = ['jump', compiledCode.length];
					}
				} else if(c.type == 'default_stmt'){
					defaultExit = compiledCode.length;
					casePoints.push(compiledCode.length);
				} else {
					code('ast', c);
					this.compile_inner(c);
				}
			}
			
			code('pop2');
			
			defaultExit = defaultExit || compiledCode.length;
			for(var i=pStart; i<compiledCode.length; i++){
				if(compiledCode[i][0] == 'next_start'){
					compiledCode[i][0] = 'if_false';
					compiledCode[i][1] = casePoints[compiledCode[i][1]] || compiledCode.length;
				}
			}
			
			this.updateBreakAndContinue(pStart, compiledCode.length);
		}
	};
	
	// 在 while, dowhile, for, forin 結束後，執行該代碼替換 break 和 continue 語句，替換成 jump，
	// 由於對標籤的理解還不夠清楚，犀牛書說的也不相信，現在不支持標籤
	this.updateBreakAndContinue =function(stmtStart, continuePoint){
		for(var i= stmtStart; i<compiledCode.length; i++){
			var c = compiledCode[i];
			if(c[0] == 'break'){
				c[0] = 'jump'; c[1] = compiledCode.length;
			} else if(c[0] == 'continue'){
				c[0] = 'jump'; c[1] = continuePoint;
			}
		}
	};
	
	// continue 和 break 的標籤、代碼行位置在 loop 全部生成後才能確定，此處的 continue break 僅用來占位，見 updateBreakAndContinue
	this.continue_stmt = function(ast){
		code('ast', ast);
		if(ast.label){
			code('continue', ast.label.text);
		} else {
			code('continue');
		}
	};
	
	this.break_stmt = function(ast){
		code('ast', ast);
		if(ast.label){
			code('break', ast.label.text);
		} else {
			code('break');
		}
	};
	
	
	this.number = this['null'] = this['boolean'] = this['string'] =
		function(ast){ code('reg1', ast.value); };
		
	this.this_literal = function(ast){code('this');};
	
	this.object_literal = function(ast){
		code('object');
		code('push1');
		for(var i=0; i<ast.children.length; i++){
			var attr = ast.children[i];

			if(attr.attributeValue.hasValue()){
				code('set', attr.attributeName, attr.attributeValue.value);
			} else {
				this.compile_inner(attr.attributeValue);
				code('1to2');
				code('peek1');
				code('set2', attr.attributeName);
			}
		}
		code('pop1');
	};
	
	this.array_literal = function(ast){
		code('array');
		code('push1');
		for(var i=0; i<ast.children.length; i++){
			var ele = ast.children[i];

			if(ele.hasValue()){
				code('arg', ele.value);
			} else {
				this.compile_inner(ele);
				code('arg1');
			}
		}
		code('pop1');
		code('array_over');
	};
	
	this.function_expr = function(ast){
		var args = [];
		for(var i=0;i<ast.args.children.length;i++){
			args.push(ast.args.children[i].token.text);
		}
		
		var fun = {name : (ast.name.type == 'name' ? ast.name.token.text : (void '')), 
				type : 'function',
				args : args, length : args.length, 
				arguments : null, // 這個屬性可以在 invoke 實現，但是官方已經建議不實現，就不實現了。它的問題是把參數掛在函數上，遇到 f(f(f(1,2))) 時，結果恐怕會很迷惑，更別說多線程了，caller 也有這樣的問題，後來的版本改到了 arguments 是可取的。
				ast : ast};		// lazy compile，will compile code when first run it
		
		code('lambda', fun);
	};
	
	this.function_decl = function(ast){
		var args = [];
		for(var i=0;i<ast.args.children.length;i++){
			args.push(ast.args.children[i].token.text);
		}
		
		var fun = {name : ast.name.token.text, 
				type : 'function',
				args : args, length : args.length, 
				arguments : null, 
				ast : ast};
		
		code('def_fun', fun);
	};
	
	// 這個函數是一個占位置的函數，當用戶對我的 fun 設置了 prototype，而我無法準確的知道該怎麼使用這個 prototype 初始化對象，
	// 在chrome是設置對象的 __proto__ 屬性，但這是非規格定義的，在其它瀏覽器就不一定了，
	// 我先把這個 js 函數的 prototype 設為 用戶所給 prototype，用它來 new 對象，之後調用我的函數初始化各個字段
	function ProtoTypeFun(){
		
	}
	
	
	var returnStmtInTry = 0, returnStmtInFinal = 0, tryCatchDepth = 0;
	this.try_stmt = function(ast){
		// body catchPart , finallyPart;
		// debugger;
		if(!ast.finallyPart){
			var ln = compiledCode.length;
			code('install_catch');
			this.compile_inner(ast.body);
			code('uncatch');
			var lnExit = compiledCode.length;
			code('exit');
			var lnCatch = compiledCode.length;
			
			if(ast.catchPart.id) code('var1', ast.catchPart.id.text);	// 命名錯誤
			this.compile_inner(ast.catchPart.body);
			
			compiledCode[ln] = ['catch', lnCatch];
			compiledCode[lnExit] = ['jump', compiledCode.length];
			
		} else {
			tryCatchDepth ++;
			returnStmtInTry ++;
			
			if(tryCatchDepth == 1) code('resetr');	// 最外層，先置位 r
			
			var lnJumpToCatch = compiledCode.length;
			code('install catch');
			
			this.compile_inner(ast.body);
			code('uncatch');
			
			code('jumpToFinal');
			
			compiledCode[lnJumpToCatch] = ['catch', compiledCode.length];

			if(ast.catchPart){
				var lnErrorInCatch = compiledCode.length;
				code('install_final_error');		// when error jump to final
				if(ast.catchPart.id) code('var1', ast.catchPart.id.text);	// 命名錯誤
				this.compile_inner(ast.catchPart.body);
				code('uncatch');
				code('jumpToFinal');
				
				compiledCode[lnErrorInCatch] = ['catch' , compiledCode.length];
				code('error_r');				
			} else {	// catch the error in try
				compiledCode[lnErrorInCatch] = ['catch' , compiledCode.length];
				code('error_r');
			}
			
			returnStmtInTry --;
			
			for(var i=compiledCode.length -1 ; i>=lnJumpToCatch; i--){
				if(compiledCode[i][0] == 'jumpToFinal'){
					compiledCode[i] = ['jump', compiledCode.length];
				}
			}
			
			this.compile_inner(ast.finallyPart);

			code('throwr');
			if(tryCatchDepth == 1) code('returnr');
			
			tryCatchDepth  --;
		}
	};
	
	this.throw_stmt = function(ast){
		this.compile_inner(ast.expression);
		code('throw1');
	};
	
	this['new'] = function(ast){
		if(ast.children[0].type != 'function_call'){
			throw new Error('function call statement expected');
		}
		this.function_call(ast.children[0], true);
		
	};
	
	this.bracket_expr = function(ast){
		this.compile_inner(ast.children[0]);
	};
	
	this.negative = function(ast){
		this.compile_inner(ast.children[0]);
		code('neg1');
	};
	
	this.positive = function(ast){		
		this.compile_inner(ast.children[0]);
		code('pos1');
	};
	
	this.twoside_expr = function(ast, literalOp, regOp){
		if(ast.children[0].hasValue()){
			this.compile_inner(ast.children[1]);
			code('1to2');
			code('reg1', ast.children[0].value);
			code(regOp);
		} else if(ast.children[1].hasValue()){
			this.compile_inner(ast.children[0]);
			code(literalOp, ast.children[1].value);
		} else {
			this.compile_inner(ast.children[0]);
			code('push1');
			this.compile_inner(ast.children[1]);
			code('1to2');
			code('pop1');
			code(regOp);
		}
	};
	
	this.multi = function(ast){ this.twoside_expr(ast, 'multi', 'multi2');};
	this.div = function(ast){ this.twoside_expr(ast, 'div', 'div2'); };
	this.mod = function(ast){ this.twoside_expr(ast, 'mod', 'mod2'); };
	this.add = function(ast){ this.twoside_expr(ast, 'add', 'add2'); };
	this.subtract = function(ast){ this.twoside_expr(ast, 'subtract', 'subtract2');};
	
	this.eq = function(ast){ this.twoside_expr(ast, 'eq', 'eq2'); };
	this.noteq = function(ast){ this.twoside_expr(ast, 'noteq', 'noteq2'); };
	this.lt = function(ast){this.twoside_expr(ast, 'lt', 'lt2'); };
	this.lteq = function(ast){ this.twoside_expr(ast, 'lteq', 'lteq2'); };
	this.gt = function(ast){this.twoside_expr(ast, 'gt', 'gt2'); };
	this.gteq = function(ast){ this.twoside_expr(ast, 'gteq', 'gteq2'); };
	this.aeq = function(ast){ this.twoside_expr(ast, 'aeq', 'aeq2'); };
	this.notaeq = function(ast){ this.twoside_expr(ast, 'notaeq', 'notaeq2'); };
	
	this['instanceof'] = function(ast){
		this.compile_inner(ast.children[0]);
		code('push1');
		this.compile_inner(ast.children[1]);
		code('1to2');
		code('pop1');
		code('instanceof');
	};
	this['in'] = function(ast){this.twoside_expr(ast, 'in', 'in2');};
	this['multiset'] = function(ast){ this.selfOp(ast, 'multi', 'multi2');};
	this['divset'] = function(ast){this.selfOp(ast, 'div', 'div2');};
	this['modset'] = function(ast){this.selfOp(ast, 'mod', 'mod2');};
	this['multiset'] = function(ast){ this.selfOp(ast, 'multi', 'multi2');};
	this['addset'] = function(ast){this.selfOp(ast, 'add', 'add2');};
	this['subtractset'] = function(ast){ this.selfOp(ast, 'subtract', 'subtract2');};
	this['bitshlset'] = function(ast){this.selfOp(ast, 'bitshl', 'bitshl');};
	this['bitshrset'] = function(ast){this.selfOp(ast, 'bitshr', 'bitshr2');};
	this['bitshr2set'] = function(ast){ this.selfOp(ast, 'bitshrb', 'bitshrb');};
	this['bitandset'] = function(ast){this.selfOp(ast, 'bitand', 'bitand');};
	this['bitxorset'] = function(ast){this.selfOp(ast, 'bitxor', 'bitxor');};
	this['bitorset'] = function(ast){this.selfOp(ast, 'bitor', 'bitor');};
	
	this['bitand'] = function(ast){ this.twoside_expr(ast, 'bitand', 'bitand2'); };
	this['bitor'] = function(ast){ this.twoside_expr(ast, 'bitor', 'bitor2'); };
	this['xor']= function(ast){ this.twoside_expr(ast, 'bitxor', 'bitxor2'); };
	
	// 多值表達式
	this['comma']= function(ast){ 
		if(ast.children[0].hasValue()){
			this.compile_inner(ast.children[1]);
		} else if(ast.children[1].hasValue()){
			this.compile_inner(ast.children[0]);
			code('reg1', ast.children[1].value);
		} else {
			this.compile_inner(ast.children[0]);
			this.compile_inner(ast.children[1]);
		}
	};
	
	this.not = function(ast){
		this.compile_inner(ast.children[0]);
		code('not1');
	};
	
	this.bitnot = function(ast){
		this.compile_inner(ast.children[0]);
		code('bitnot1');
	};
	
//	this['delete'] = function(ast){
//		this.compile_inner(ast.children[0]);
//		code('bitnot1');
//	};
	
	this['typeof'] = function(ast){
		this.compile_inner(ast.children[0]);
		code('typeof1');
	};
	
	this['void'] = function(ast){
		this.compile_inner(ast.children[0]);
		code('reg1');	// (void)
	};
	
	this['bitshl'] = function(ast){ this.twoside_expr(ast, 'bitshl', 'bitshl2'); };
	this['bitshr'] = function(ast){ this.twoside_expr(ast, 'bitshr', 'bitshr2'); };
	this['bitshr2']= function(ast){ this.twoside_expr(ast, 'bitshrb', 'bitshrb2'); };
	
	this['and'] = function(ast){		// 短路運算符
		this.prepareValue(ast);
		if(ast.children[0].hasValue()){
			if(!ast.children[0].value){
				code('reg1', false);
			} else {
				this.compile_inner(ast.children[1]);
				code('bool1');
			}
		} else if(ast.children[1].hasValue()){
			if(!ast.children[1].value){
				code('reg1', false);
			} else {
				this.compile_inner(ast.children[0]);
				code('bool1');
			}
		} else {
			this.compile_inner(ast.children[0]);
			code('test1');
			var p = compiledCode.length;
			code('if_false','todo');
			this.compile_inner(ast.children[1]);
			compiledCode[p][1] = compiledCode.length;
			code('bool1');
		}
	};
	
	this['or'] = function(ast){		// 短路運算符 or
		this.prepareValue(ast);
		if(ast.children[0].hasValue()){
			if(ast.children[0].value){
				code('reg1', true);
			} else {
				this.compile_inner(ast.children[1]);
			}
		} else if(ast.children[1].hasValue()){
			if(ast.children[1].value){
				code('reg1', true);
			} else {
				this.compile_inner(ast.children[0]);
			}
		} else {
			this.compile_inner(ast.children[0]);
			code('test1');
			var p = compiledCode.length;
			code('if_true','todo');
			this.compile_inner(ast.children[1]);
			compiledCode[p][1] = compiledCode.length;
		}
	};
	
	this['iif'] = function(ast){
		this.prepareValue(ast.testStmt);
		this.prepareValue(ast.trueHandler);
		this.prepareValue(ast.falseHandler);
		
		code('ast', ast.cond);
		
		if(ast.testStmt.hasValue()){		// 一般不可能。。。
			if(ast.cond.value){		// direct call true part
				this.compile_inner(ast.trueHandler);
			} else {
				this.compile_inner(ast.falseHandler);
			}
		} else {
			this.compile_inner(ast.testStmt);
			code('test1');
			
			var pCond = compiledCode.length;
			code('if_false', 'todo');
			
			this.compile_inner(ast.trueHandler);
			var pLeave = compiledCode.length;
			code('jump');
			
			compiledCode[pCond] = ['if_false', compiledCode.length];  // 補上行號
			this.compile_inner(ast.falseHandler);

			compiledCode[pLeave][1] = compiledCode.length;
		}
	};
	
	this['inc'] = function(ast){this.incAndDec(ast, 'incv', 'inc', 'inc2');};
	this['dec'] = function(ast){this.incAndDec(ast, 'decv', 'dec', 'dec2');};
	this['post_inc'] = function(ast){this.incAndDec(ast, 'incvp', 'incp', 'inc2p');};
	this['post_dec'] = function(ast){this.incAndDec(ast, 'decvp', 'decp', 'dec2p');};
		
	this.incAndDec = function(ast, incv, inc, inc2){
		this.prepareValue(ast.children[0]);
		var target = ast.children[0];
		
		if(target.type == 'id'){
			code(incv, target.text);
		} else if(target.type == 'attrib_access'){
			// object[attrib]
			var directAttrib = null, b = false;
			if(target.mode == 'dot'){
				if(target.attrib.type == 'id'){
					directAttrib = target.attrib.text;
					b = true;
				} 
			} else { // []
				if(target.attrib.hasValue()){
					directAttrib = target.attrib.value;
					b = true;
				}
			}
			if(b){
				this.compile_inner(target.object);
				code(inc, directAttrib);
			} else{
				this.compile_inner(target.object);
				code('push1');
				this.compile_inner(target.attrib);
				code('1to2');
				code('pop1');
				code(inc2);
			}
		} else {
			// bad setvalue
			
		}
	};
	
	// 由於沒有指針，這些返身運算符寫起來太費事，都沒有實際映射到 += *= 等運算符，不過 ++ -- 還是做了處理
	this.selfOp = function(ast, literalOp, regOp){
		this.prepareValue(ast.children[0]);
		this.prepareValue(ast.children[1]);
		var target = ast.children[0];
		var value = ast.children[1];
		
		if(target.type == 'id'){
			if(value.hasValue()){
				code('vget', target.text);
				code(literalOp, value.value);
				code('vset1', target.text);
			} else {
				this.compile_inner(value);
				code('1to2');
				code('vget', target.text);
				code(regOp);
				code('vset1', target.text);
			}
		} else if(target.type == 'attrib_access'){
			// object[attrib]
			var directAttrib = null, b = false;
			if(target.mode == 'dot'){
				if(target.attrib.type == 'id'){
					directAttrib = target.attrib.text;
					b = true;
				} 
			} else { // []
				if(target.attrib.hasValue()){
					directAttrib = target.attrib.value;
					b = true;
				}
			}
			if(b){
				this.compile_inner(target.object);
				if(value.hasValue()){
					code('1to2');
					code('get', directAttrib);
					code(literalOp, value.value);
					code('swap12');
					code('set2', directAttrib);
				} else {
					code('push1');
					code('get', target.attrib.text);
					code('push1');
					this.compile_inner(value);
					code('1to2');
					code('pop1');
					code(regOp);
					code('1to2');
					code('pop1');
					code('set2', target.attrib.text);
				}
			} else{
				this.compile_inner(target.object);
				if(value.hasValue()){
					code('push1');
					this.compile_inner(target.attrib);
					code('1to2');
					code('peek1');
					code('get2');
					code('push2');
					code('reg2', value.value);
					code(regOp);
					code('1to3');
					code('pop2');
					code('pop1');
					code('set3');
				} else {
					code('push1');
					this.compile_inner(target.attrib);
					code('1to2');
					code('peek1');
					code('get2');
					code('push2');
					this.compile_inner(value);
					code('1to2');
					code(regOp);
					code('1to3');
					code('pop2');
					code('pop1');
					code('set3');
				}
			}
		} else {
			// bad setvalue
			
		}
	};
	
	if (this.preCompileSimpleOp){
		this.prepareValue = function(ast){		// 對於一些直接可以得到值的表達式，直接求它的值
			if(!ast.valueTested){
				ast.valueTested = true;
				switch(ast.type){
				case 'number' : ast.value = eval(ast.token.text); break; // 不另外寫數字解析程序
				case 'null' : ast.value = null; break;
				case 'string' : 
					var s = ast.token.text;
					//s = s.replace(/’/g, '\'').replace(/‘/g, '\'').replace(/“/g, '\"').replace(/”/g, '\"');
					ast.value = eval(s); 
					break;	// 不另外寫字符串轉意符處理等
				case 'boolean' : ast.value = (ast.token.text == 'true'); break;		// js 無字符串轉 boolean 的函數
				case 'void' : ast.value = (void 1); break;
				
				case 'bracket_expr' : this.prepareLeftOpExpr(ast, function(a){ return a;}); break;
				
				// 數組,對象是複合實體, 可以修改, 所以不應該常量化,否則會造成很多數組指向的是同一個實體
				/*case 'object_literal' :
					var possible = true;
					for(var i=0; i<ast.children.length; i++){
						var attr = ast.children[i];
						this.prepareValue(attr.attributeValue);
						if(!attr.attributeValue.hasValue()){
							possible = false;
						}
					}
					if(possible){
						var obj = {};
						for(var i=0; i<ast.children.length; i++){
							var attr = ast.children[i];	
							obj[ attr.attributeName] =  attr.attributeValue.value;
						}
						ast.value = obj;
					}
					break;
				case 'array_literal' :
					var possible = true;
					for(var i=0; i<ast.children.length; i++){
						var ele = ast.children[i];
						this.prepareValue(ele);
						if(!ele.hasValue()){
							possible = false;
						}
					}
					if(possible){
						var arr = [];
						for(var i=0; i<ast.children.length; i++){
							var ele = ast.children[i];	
							arr.push(ele.value);
						}
						ast.value = arr;
					}
					break;*/		 
				case 'add': this.prepareTwoSideExpr(ast, function(a, b){return a+b;}); break;
				case 'subtract': this.prepareTwoSideExpr(ast, function(a, b){return a-b;}); break;
				case 'negative': this.prepareLeftOpExpr(ast, function(a){return - a;}); break;
				case 'multi': this.prepareTwoSideExpr(ast, function(a, b){return a*b;}); break;
				case 'div': this.prepareTwoSideExpr(ast, function(a, b){return a/b;}); break;
				case 'mod': this.prepareTwoSideExpr(ast, function(a, b){return a%b;}); break;
				case 'positive': this.prepareLeftOpExpr(ast, function(a){return + a;}); break;
				
				case 'and': this.prepareTwoSideExpr(ast, function(a, b){return a && b;}); break;
				case 'or': this.prepareTwoSideExpr(ast, function(a, b){return a || b;}); break;
				case 'not': this.prepareLeftOpExpr(ast, function(a){return ! a;}); break;
				
				case 'bitshl': this.prepareTwoSideExpr(ast, function(a, b){return a<<b;}); break;
				case 'bitshr': this.prepareTwoSideExpr(ast, function(a, b){return a>>b;}); break;
				case 'bitshrb': this.prepareTwoSideExpr(ast, function(a, b){return a>>>b;}); break;
				case 'bitand': this.prepareTwoSideExpr(ast, function(a, b){return a&b;}); break;
				case 'bitxor': this.prepareTwoSideExpr(ast, function(a, b){return a^b;}); break;
				case 'bitor': this.prepareTwoSideExpr(ast, function(a, b){return a|b;}); break;
	
				case 'bitnot': this.prepareLeftOpExpr(ast, function(a){return ~ a;}); break;
				
				case 'eq': this.prepareTwoSideExpr(ast, function(a, b){return a==b;}); break;
				case 'aeq': this.prepareTwoSideExpr(ast, function(a, b){return a===b;}); break;
				case 'noteq': this.prepareTwoSideExpr(ast, function(a, b){return a!=b;}); break;
				case 'notaeq': this.prepareTwoSideExpr(ast, function(a, b){return a!==b;}); break;
				case 'lt': this.prepareTwoSideExpr(ast, function(a, b){return a<b;}); break;
				case 'gt': this.prepareTwoSideExpr(ast, function(a, b){return a>b;}); break;
				case 'lteq': this.prepareTwoSideExpr(ast, function(a, b){return a<=b;}); break;
				case 'gteq': this.prepareTwoSideExpr(ast, function(a, b){return a>=b;}); break;
				
				// 多值表達式
				case 'comma': this.prepareTwoSideExpr(ast, function(a, b){return b;}); break;
				}
			}
		};
	} else {
		this.prepareValue = function(ast){		// 對於一些直接可以得到值的表達式，直接求它的值
			if(!ast.valueTested){
				ast.valueTested = true;
				switch(ast.type){
				case 'number' : ast.value = eval(ast.token.text); break; // 不另外寫數字解析程序
				case 'null' : ast.value = null; break;
				case 'string' : ast.value = eval(ast.token.text); break;	// 不另外寫字符串轉意符處理等
				case 'boolean' : ast.value = (ast.token.text == 'true'); break;		// js 無字符串轉 boolean 的函數
				case 'void' : ast.value = (void 1); break;
				}
			}
		};
	}
	
	this.prepareTwoSideExpr = function(ast, fun){
		this.prepareValue(ast.children[0]);
		this.prepareValue(ast.children[1]);
		if(ast.children[0].hasValue() && ast.children[1].hasValue()){
			ast.value = fun(ast.children[0].value, ast.children[1].value);
		}
	};
	
	this.prepareLeftOpExpr = function(ast, fun){
		this.prepareValue(ast.children[0]);
		if(ast.children[0].hasValue()){
			ast.value = fun(ast.children[0].value);
		}
	};
}