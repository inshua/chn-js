/**
 * 
 * @Author �S���� inshua@gmail.com
 * 
 * http://code.google.com/p/chn-js/
 */
function JsMachine(globalObject, compiler){
	
	var context = {
			vars : {__parent__ : null}, 
			catchStack : [],		// error jump line
			currAst : null
	};
	
	// �� globalObject��ʼ��
	context.vars = globalObject;
	context.this_ = globalObject; 	// this��ָ
	
	var reg1, reg2, reg3, reg4;
	var test;		// register for test
	var stack = [];
	var codes, pcode, pstatck = [];		// pcode

	var result; 	// ��� try catch���� try catch finally �Юa���� return�����ڴ�̎��������return

	var nextFuns = [], nextArgs = [];		// will callFun and its arguments, both stack, when a callFun push element, a start symbol will put in stack nextArgs
	function StartArgSymbol(){}
	
	var funStack = [];
	
	var currAst = null;		// ��ǰ�\�еĴ��a���c
	var breaking = false;	// �Ƿ���c������
	var nextBreakpoint = 'none';	// ��һ�����c��step next, step return, step over
	var stepOverStack = [];
	
	this.running = false;
	
	function saveFunContext(){
		var frame = {
				// reg1 : reg1,  �Á��ŽY�����������ͻ֏�
				reg2 : reg2, reg3 : reg3, reg4 : reg4,
				test : test, // statck : statck, 
				codes : codes, pcode : pcode, //, pstack : pstack
				context : context, r : result, 
				breaking : breaking, currAst : currAst
		};
		funStack.push(frame);
	}
	
	function UncaughtedError(error){
		this.error = error;
		this.toString = function() {return error.toString()};
	}
	
	function restoreFunContext() {
		var frame = funStack.pop();
		// reg1 = frame.reg1;
		reg2 = reg2;
		reg3 = frame.reg3;
		reg4 = frame.reg4;
		test = frame.test;
		//statck = frame.statck; 
		codes = frame.codes;
		pcode = frame.pcode;
		
		context = frame.context;
	
		result = frame.r;
		
		breaking = frame.breaking;
		
		currAst = frame.currAst;
		
		if(nextBreakpoint != 'none'){
			breaking = true;
			nextBreakpoint = 'none';
		}
		// context = context.__parent__; �e�`���]����context�ɲ��Ǯ�ǰ context ��ֱ�� context
		
		//pstack = frame.pstack;
	}
	
	this.act = function(op, arg1, arg2){
		switch(op){
		case 'reg1' : reg1 = arg1; break;
		case 'reg2' : reg2 = arg1; break;
		case 'reg3' : reg3 = arg1; break;
		case 'reg4' : reg4 = arg1; break;
		case '1to2' : reg2 = reg1; break;
		case '2to1' : reg1 = reg2; break;
		case 'swap12' : var t = reg1; reg1 = reg2; reg2 = t; break;
		case '1to3' : reg3 = reg1; break;
		
		case 'push' : stack.push(arg1); break;
		case 'push1' :stack.push(reg1); break;
		case 'push2' : stack.push(reg2); break;
		case 'pushp' : pstack.push(pcode); break;
		
		case 'pop1' : reg1 = stack.pop(); break;
		case 'pop2' : reg2 = stack.pop(); break;
		case 'popp' : pcode = pstack.pop(); return;
		
		case 'peek1' : reg1 = stack[stack.length -1]; break;
		case 'peek2' : reg2 = stack[stack.length -1]; break;
		case 'peekp' : pcode = pstack[stack.length -1]; return;
		
		case 'resetr' : result = null; break;
		case 'setr' : result = {type : 1, value : arg1}; break;
		case 'setr1' : result= {type : 1, value : reg1}; break;
		case 'error_r' : result = {type : 2, value : reg1}; break;

		case 'returnr' :
			if(result && result.type == 1) {
				reg1 = result.value; 
				if(funStack.length) {
					restoreFunContext();
				} else pcode = codes.length;
			}
			if(nextBreakpoint == 'step return') breaking = true; 
			nextBreakpoint = stepOverStack.pop() || 'none';
			break;
		case 'return2' : 
			reg1 = reg2;
			if(funStack.length) restoreFunContext(); else pcode = codes.length;
			if(nextBreakpoint == 'step return') breaking = true;
			nextBreakpoint = stepOverStack.pop() || 'none';
			break;
		case 'return' : 	// ؞��
			reg1 = arg1;
		case 'return1':
			if(funStack.length) restoreFunContext(); else pcode = codes.length;
			if(nextBreakpoint == 'step return') breaking = true;
			nextBreakpoint = stepOverStack.pop() || 'none';
			break;
		
		case 'throwr' : 
			if(result && result.type == 2){
				reg1 = result.value;		// ����؞��
			} else {
				break;
			}
		case 'throw1' :
			while(true){
				if(context.catchStack && context.catchStack.length){
					reg2 = 2;
					pcode = context.catchStack.pop();
					break;
				} else {
					if(funStack.length && funStack[funStack.length -1] != EvalSymbol){
						restoreFunContext();
					} else {
						uncaughtError(reg1);
						return;
					}
				}
			}
			return;
		case 'catch' :
			if(context.catchStack) context.catchStack.push(arg1); else context.catchStack = [arg1];
			if(context.catchStack.length == 1){
				result = null;
			}
			break;
		case 'uncatch' :
			if(context.catchStack && context.catchStack.length) context.catchStack.pop();
			break;
			
		case 'debugger' : breaking = true; break;

		//  ======================= �\�㰡�\�� ==============================================
		case 'add' : reg1 += arg1; break;
		case 'add2' : reg1 += reg2; break;
		case 'subtract' : reg1 -= arg1; break;
		case 'subtract2' : reg1 -= reg2; break;
		case 'multi' : reg1 *= arg1; break;
		case 'multi2' : reg1 *= reg2; break;
		case 'div' : reg1 /= arg1; break;
		case 'div2' : reg1 /= reg2; break;
		case 'mod' : reg1 %= arg1; break;
		case 'mod2' : reg1 %= reg2; break;
		case 'bitshl' : reg1 <<= arg1; break;
		case 'bitshr': reg1 >>= arg1; break;
		case 'bitshrb': reg1 >>>= arg1; break;
		case 'bitand' : reg1 &= arg1; break;
		case 'bitxor' : reg1 ^= arg1; break;
		case 'bitor' : reg1 |= arg1; break;
		case 'bitshl2' : reg1 <<= reg2; break;
		case 'bitshr2': reg1 >>= reg2; break;
		case 'bitshrb2': reg1 >>>= reg2; break;
		case 'bitand2' : reg1 &= reg2; break;
		case 'bitxor2' : reg1 ^= reg2; break;
		case 'bitor2' : reg1 |= reg2; break;
		
		case 'incp' : reg1 =(reg1[arg1]++);  break;
		case 'inc2p' : reg1 = (reg1[reg2]++); break;
		case 'incvp' : reg1 = ((findContext(arg1)[arg1]) ++); break;
		
		case 'decp' : reg1 = (reg1[arg1] --); break;
		case 'dec2p' : reg1 = (reg1[reg2]--); break;
		case 'decvp' : reg1 = ((findContext(arg1)[arg1]) --); break;
		
		case 'inc' : reg1 =(++reg1[arg1]);  break;
		case 'inc2' : reg1 = (++reg1[reg2]); break;
		case 'incv' : reg1 = (++(findContext(arg1)[arg1])); break;
		
		case 'dec' : reg1 = (-- reg1[arg1]); break;
		case 'dec2' : reg1 = (-- reg1[reg2]); break;
		case 'decv' : reg1 = (-- (findContext(arg1)[arg1])); break;
		
		case 'neg1' : reg1 = - reg1; break;		// ������ֱ�������� ֵؓ�����Ѿ��g�^�V����ͬ��
		case 'pos1' : reg1 = + reg1; break;
		
		case 'bool1' : reg1 = (reg1 ? true : false); break; 	// �� reg1 �D�� boolean ���
		
		case 'not1' : reg1 = ! reg1; break;
		case 'bitnot1' : reg1 = ~reg1; break;
		
		case 'typeof1' : 
			if(reg1 && reg1.type == 'function') 
				reg1 = 'function'; 
			else
				reg1 = typeof reg1; 
			break;
		
		case 'lt': reg1 = (reg1 < arg1); break;
		case 'lt2' : reg1 = (reg1 < reg2); break;
		case 'eq': reg1 = (reg1 == arg1); break;
		case 'eq2' : reg1 = (reg1 == reg2); break;
		case 'gt': reg1 = (reg1 > arg1); break;
		case 'gt2' : reg1 = (reg1 > reg2); break;
		
		case 'lteq': reg1 = (reg1 <= arg1); break;
		case 'lteq2' : reg1 = (reg1 <= reg2); break;
		case 'noteq': reg1 = (reg1 != arg1); break;
		case 'noteq2' : reg1 = (reg1 != reg2); break;
		case 'gteq': reg1 = (reg1 >= arg1); break;
		case 'gteq2' : reg1 = (reg1 >= reg2); break;
		
		case 'aeq': reg1 = (reg1 === arg1); break;
		case 'aeq2' : reg1 = (reg1 === reg2); break;
		case 'notaeq': reg1 = (reg1 !== arg1); break;
		case 'notaeq2' : reg1 = (reg1 !== reg2); break;
		
		case 'in': reg1 = (reg1 in arg1); break;
		case 'in2' : reg1 = (reg1 in reg2); break;
		
		case 'for_in' :		// ��춛]��ָ�,for in �Č��F�^�鷱�� 
			var a = [];
			for(var k in arg1){
				a.push(k);
			}
			stack.push(a);
			break;
		case 'for_in1' :
			var a = [];
			for(var k in reg1){
				a.push(k);
			}
			stack.push(a);
			break;
		case 'for_in_next' :
			var a = stack.pop();
			if(a.length){
				findContext(arg1)[arg1] = a.shift();
				pcode = arg2;
			} else {
				pcode = arguments[3];
			}
			stack.push(a);
			return;
		case 'for_in_over' :
			stack.pop();
			break;
		
		// =========================== ���涼���\�� =====================================
		
		case 'test1' :  test = reg1; break;
		case 'test2' : test = reg2; break;
		
		case 'jump' : pcode = arg1; return;
		case 'jump1' : pcode = reg1; return;
		case 'jump2' : pcode = reg2;return;
		case 'jump3' : pcode = reg3;return;
		case 'jump4' : pcode = reg4;return;
		
		case 'if' : if(test === arg1) {pcode = reg3; return;}  else break;
		case 'if1' :  if(test === reg1) {pcode = reg3; return;} else break;
		case 'if2' :  if(test === reg2) {pcode = reg3; return;} else break;
		case 'if_false' : if(!test) {pcode = arg1; return;} else break;
		case 'if_true' : if(test) {pcode = arg1; return;} else break;
		
		case 'branch' :
			if(test) pcode = arg1; else pcode = arg2; return;		
		
		case 'var' : context.vars[arg1] = arg2; break;	// declare variable
		case 'var1' : context.vars[arg1] = reg1; break;
		case 'vget' : // get variable, load it's value to reg1, scan from this context to parent and parent...
			reg1 = findContext(arg1)[arg1];
			break;		
		case 'get' : if(reg1 == null) debugger; reg1 = reg1[arg1]; break;		// get attribute of variable
		case 'get2' : if(reg1 == null) debugger; reg1 = reg1[reg2]; break;
		
		case 'vset' : 	// vname, value
			findContext(arg1)[arg1] = reg1 = arg2;
			break;
		
		case 'vset1' : 
			findContext(arg1)[arg1] = reg1;
			break;
			
		case 'set' : reg1 = reg1[arg1] = arg2; break;
		case 'set2' : reg1 = reg1[arg1] = reg2; break;		// call 1to2 first
		case 'set3' : reg1 = reg1[reg2] = reg3; break;
		
		case 'this' : reg1 = context.this_  || globalObject.vars; break;	// load this to reg1
		case 'setthis' : context.this_ = arg1; break;
		case 'setthis1' : context.this_ = reg1; break;
		
		case 'object' : reg1 = new Object() ; break;	// new object
		case 'array' : reg1 = []; nextArgs.push(StartArgSymbol); break;	// ���� nextArgs ���ʼ�����M
		case 'array_over' :
			for(var e = nextArgs.pop(); e != StartArgSymbol; e=nextArgs.pop()){
				reg1.push(e);
			}
			reg1.reverse();
			break;
		case 'def_fun' : context.vars[arg1.name] = initFunction(arg1); break;
		case 'def_fun1' :  context.vars[reg1.name] = initFunction(reg1); break;
		case 'lambda' : reg1 = initFunction(arg1); break;
		
		case 'new' : 		// ԓָ����յ� loadfun �ᣬ�� arg ǰ�յ����˕r����Փ��������߀�� js��������ȡ�� prototype�����쌦��
			var a =  new Object();
			for(var k in reg1.prototype){		// constructor , and others custom member
				a[k] = reg1.prototype[k];
			}
			a.__type__ = reg1; 
			reg1 = a;
			break;
			
		case 'instanceof' :
			var i = reg1, c = reg2; 
			reg1 = false;
			while(c){
				if(c.type == 'function'){
					if(i.__type__ == c){
						reg1 = true;
						break;
					}
				} else if(typeof c == 'function'){
					reg1 = (i instanceof c);
					break;
				}
				i = i.__type__ ? i.__type__.prototype : i.constructor.prototype;
				if(i == null) break;
			}
			break;
		
		// arg1 function name, arg2 arguments, array
		case 'invokejs' : reg1 = eval(arg1).apply(this, arg2); break;	// this ����J����һ�����}
		// arg1 function name, reg1 arguments prepared
		case 'invokejs1' : reg1 = eval(arg1)(reg1); break;	
		
		case 'loadfun1' :
			var fun = reg1;
			if(fun == null || (fun.type != 'function' && typeof fun !='function')){
				throw new Error(reg1  + ' not a function');		//  throw ??
			}
			nextFuns.push(fun);
			nextArgs.push(StartArgSymbol);
			break;
		case 'loadfun' : 	// ���������������b�� nextFuns
			var fun = findContext(arg1)[arg1];
			if(fun == null || (fun.type != 'function' && typeof fun != 'function')){
				throw new Error(arg1  + ' not defined');		//  throw ??
			}
			reg1 = fun;
			nextFuns.push(fun);
			nextArgs.push(StartArgSymbol);
			break;
		case 'fun.apply' :			// Fun.apply(This, [args]) -> set this(Fun) as fun, arg0(This) to this, arg1 to arguments, then invoke
			nextFuns.push(context.this_);
			nextArgs.push(StartArgSymbol);
			var args = context.args['arguments'];
			reg1 = args[0];		// this
			for(var i=0;i<args[1].length; i++){
				nextArgs.push(args[1][i]);
			}
			break;
		case 'fun.call' :
			nextFuns.push(context.this_);
			nextArgs.push(StartArgSymbol);
			var args = context.vars['arguments'];
			reg1 = args[0];		// this
			for(var i=1;i<args.length; i++){
				nextArgs.push(args[i]);
			}
			break;
		case 'arg' : nextArgs.push(arg1); break;	// �O�Å���
		case 'arg1' : nextArgs.push(reg1); break;	
		case 'invoke' :		// �{�ú���������ї��ͭh����Ϣ���ГQ���­h�����x���´��a
			var nextFun = nextFuns.pop();
			var args = [];
			for(var t= nextArgs.pop(); t != StartArgSymbol; t = nextArgs.pop()){
				args.push(t);
			}
			args.reverse();
			if(typeof(nextFun) == 'function'){	// js fun
				reg1 = nextFun.apply(reg1, args);		// this_ has put at reg1 when loadfun
				break;
			} else if(nextFun && nextFun.type == 'function'){
				saveFunContext();
				
				var vars = {};
				for(var k in nextFun.context.vars){
					vars[k] = nextFun.context.vars[k];
				}
				vars['arguments'] = args;
				for(var i=0; i<nextFun.length; i++){
					vars[nextFun.args[i]] = args[i];
				}
				
				context = nextFun.context;
				context.vars = vars;
				context.this_ = reg1;
				
				if(nextFun.compiledCode == null){
					nextFun.compiledCode = compiler.compileFunction(nextFun.ast.body);
				}
				codes = nextFun.compiledCode;
				pcode = 0;
				if(nextBreakpoint == 'step over'){
					stepOverStack.push('step over');
				} else {
					stepOverStack.push('none');
				}
				if(nextBreakpoint != 'step next'){
					nextBreakpoint = 'none';
				}
				return;
			} else {
				uncaughtError(new Error('cannot treat ' + nextFun + ' as function'));
			}
			
		case 'ast' : 
			currAst = arg1; 
			// currAst.type.lastIndexOf('_stmt') != -1 && 
			if(currAst && nextBreakpoint != 'none' && currAst.type != 'debugger_stmt'){
				breaking = true;
				nextBreakpoint = 'none';
			}
			break;
			
		case 'nop' : break;		// nothing to do
		default :
			uncaughtError(Error('unknown op ' + op));
		}
		
		if(breaking){
			stepOverStack.length = 0;
			this.breakDown(); 
		} else {
			pcode ++;
		}
	};
	
	function findContext(objectName){
		if(objectName in context.vars){
			return context.vars;
		} else {
			var c = context.vars;
			do{
				c = c.__parent__;
				if(c == null) break;
				if(objectName in c){
					return c;
				} 
			} while(c.__parent__ != null);
			
			// js�Ԅӄ���ȫ��׃�����������Ծ����@�Ӂ�ģ���Ӌ������һ������ findContext������o�ɷ��ؕr����피�Context���䌍���؂����Context������, �қQ���ĳɄ����ֲ�׃��
			return context.vars;
		}

	};
	
	function initFunction(funDef){		// ����ǆξ��̵ĳ���һ������ֻ��һ�����\�еČ����������ں������r����һ�� context���������x�_�r�������]�������ˣ�������Ƕྀ�̣��@�Ӿͺ�Σ�U�ˡ����ԣ���C#��Ǉ���^�� lambda ��һ�㺯���ġ�
	
		var fun = {};
		for(var k in funDef) fun[k] = funDef[k];
		
		var c = newContext();
		if(fun.name) c.vars[fun.name] = fun;
		fun.context = c;
		
		fun.apply = {name : 'apply', type : 'function', 
			length : 2, args : [], context : c,
			ast : fun.ast, __native : true,
			compiledCode : 
			[['fun.apply'], ['invoke'], ['return1']]
		};
		
		fun.call = {name : 'call', type : 'function', 
				length : 2, args : [], context : c,
				ast : fun.ast, __native : true,
				compiledCode : 
				[['fun.call'], ['invoke'], ['return1']]
			};
		
		fun.prototype = {constructor : fun};
		
		return fun;
	}
	
	
	function uncaughtError(e){
		throw new UncaughtedError(e);
	}
	
	this.run = function(compiledCodes){
		codes = compiledCodes;
		pcode = 0;
		if(!codes.length) return;

		this.running = true;
		return this.process();
	};
	
	this.process = function(){
		while(pcode < codes.length && ! breaking){
			var code = codes[pcode];
			try{
				if(code.length == 2){
					this.act(code[0], code[1]);
				} else if(code.length == 3){
					this.act(code[0], code[1], code[2]);
				} else if(code.length == 1){
					this.act(code[0]);
				} else {
					this.act.apply(this, code);
				}
			} catch(e){
				if(!(e instanceof UncaughtedError)){
					reg1 = e;
					this.act('throw1');
				}
			}
		}
		if(funStack.length == 0 && pcode == codes.length){
			this.running = false;
			this.oncomplete(reg1);
		}
		return reg1;
	};
	
	function newContext(){
		return {this_ : context.this_, vars : {__parent__ : context.vars}};
	};
	
	function EvalSymbol(){}
	var evalVars = {};		// �� eval �h�����x��׃��
	
	this.eval = function(js){
		var lexer = new JsLexer(js, jsRules);
		var parser = new Parser(lexer);
		var tree = parser.parse(lexer);
		var c = compiler.compile(tree);
		breaking = false;
		saveFunContext();
		stack.push(reg1);
		context = newContext();		// �R�r context
		context = newContext();
		evalVars.__parent__ = context.vars;
		context.vars = evalVars;
		funStack.push(EvalSymbol);		// ����, ��ֹ�e�`̎��r���������\�еĴ��a���e�`̎��
		try{
			var r = this.run(c);
		} catch(e){
			throw e;
		} finally{
			reg1 = stack.pop();
			funStack.pop();
			restoreFunContext();
		}
		return r;
	};
	
	this.breakDown = function(){
		breaking = true;
		this.onbreak(context, currAst, funStack);
	};
	
	// ���c���{�����wԓ�������F inspector
	this.onbreak = function(context, currAst, funStack){
	
	};
	
	this.oncomplete = function(result){};
	
	this.resume = function(){
		breaking = false;
		this.onresume();
		pcode ++;
		return this.process();
	};
	
	this.setNextBreakpoint = function(n){
		nextBreakpoint = n;
	};
	
	this.getCurrAst = function(){return currAst;}
}

var machine = new JsMachine(this, null);
debugger;
machine.run([['reg1', 3]]);