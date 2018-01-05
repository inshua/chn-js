/**
 * 
 * @Author 許芥信 inshua@gmail.com
 * 
 * http://code.google.com/p/chn-js/
 */
function Node(type, token){
	this.token = token;
	this.type = type;
	this.children = [];
	
	this.addChild = function(node){
		this.children.push(node);
	};
	
	this.toString = function(){
		return ['(node ', this.type, this.token, ')'].join(' ');
	};
	
	this.valueTested = false;		// 編譯器可以確定的值就確定
	this.hasValue = function(){
		return this.hasOwnProperty('value');
	};
	
	this.toLispExpr = function(lv){
		if(lv == null) lv = 0;
		if(this.children == null || this.children.length == 0){
			return '    '.repeat(lv) + this.toString();
		} else {
			var s = '    '.repeat(lv) + '(node ' + this.type + this.token + '\r\n';
			for(var i=0; i<this.children.length; i++){
				s += this.children[i].toLispExpr(lv +1) + '\r\n';
			}
			s += '    '.repeat(lv) + ')';
			return s;
		}
	};
	
	this.toLispExpr = function(lv){
		if(lv == null) lv = 0;
		debugger;
		if(this.children == null || this.children.length == 0){
			return '    '.repeat(lv) + (this.token ? this.token.text : this.type);
		} else {
			var s = '    '.repeat(lv) + '(' + (this.token ? this.token.text : this.type) + '\r\n';
			for(var i=0; i<this.children.length; i++){
				s += this.children[i].toLispExpr(lv +1) + '\r\n';
			}
			s += '    '.repeat(lv) + ')';
			return s;
		}
	};
	
	this.traceLispExpr = function(lv){
		if(lv == null) lv = 0;
		if(this.children == null || this.children.length == 0){
			console.log('    '.repeat(lv) + (this.token ? this.token.text : this.type));
		} else {
			console.log('    '.repeat(lv) + '(' + (this.token ? this.token.text : this.type));
			for(var i=0; i<this.children.length; i++){
					this.children[i].traceLispExpr(lv +1);
			}
			console.log('    '.repeat(lv) + ')');
		}
	};
}

function Parser(lexer){
	this.lexer = lexer;
	
	this.currToken = lexer.nextToken();
	this.tokenQueue = [];
	this.peekToken = function(){
		return this.currToken;
	};
	
	this.next = function(bypassNewline){
		if(bypassNewline){
			do{
				var n = this.next();
			} while((n.type != 'EOF') && (n.type == 'NEWLINE'));
			return n;
		}
		
		if(this.tokenQueue.length){
			return this.currToken = this.tokenQueue.shift();
		}
		
		if(this.currToken.type != 'EOF'){
			do{
				this.currToken = lexer.nextToken();
			} while(this.currToken.type == 'WHITESPACE' || this.currToken.type == 'COMMENT');
		}
		return this.currToken;
	};
	if(this.currToken.type == 'WHITESPACE' || this.currToken.type == 'NEWLINE' || this.currToken.type == 'COMMENT'){
		this.next(true);
	}
	
	/**
	 * 由於匹配不成功，要試驗另一種可能的匹配，可以將token送回
	 */
	this.back = function(token){
		this.tokenQueue.push(this.currToken);
		this.currToken = token;
	};
	
	this.LA = this.lookAhead = function(n, bypassNewline){
		if(bypassNewline){
			for(var i=0, j=1; i<n;){
				var tk = this.LA(j++);
				if(tk == 'EOF') return tk;
				if(tk != 'NEWLINE'){
					i++;
				}
			}
			return tk;
		}
		
		if(n == 0 || this.currToken.type == 'EOF') 
			return this.currToken.type;
		
		n--;
		if(n < this.tokenQueue.length){
			return this.tokenQueue[n].type;
		} else if(this.tokenQueue.length && this.tokenQueue[this.tokenQueue.length -1].type == 'EOF'){
			return 'EOF';
		} else {
			do{
				var token = lexer.nextToken();
				if(token.type != 'WHITESPACE' && token.type != 'COMMENT'){
					this.tokenQueue.push(token);
					if(token.type == 'EOF') return token.type;
				}
			} while(n >= this.tokenQueue.length);
			
			if(n < this.tokenQueue.length){
				return this.tokenQueue[n].type;
			}
		}
	};
	
	/**
	 * 已經通過 LA 找到匹配的 token，清空 token 棧中的多餘元素。用於跳過 NEWLINE 後提交。
	 */
	this.found = function(){
		if(this.tokenQueue.length){
			this.currToken = this.tokenQueue.pop();
			this.tokenQueue = [];
		}
	};
	
	this.skip = function(n){
		for(var i=0; i<n; i++) this.next();
		return this;
	};
	
	this.bypassNewLine = function(){
		if(this.currToken.type == 'NEWLINE') this.next();
	};
	
	this.createNode = function(type){
		return new Node(type, this.currToken);
	};
	
	/**
	 * 測試當前token類型是否為所給類型。
	 * 第二個參數可以用 LA(1) 跳過換行符（根據LEXER的設置，多個換行會合併為一個換行），如LA(1)匹配，則自動推過換行符到匹配位置。
	 * 如需要強制為某 token，可以結合 expect 形成 this.expect(this.match()) 使用。
	 */
	this.match = function(tokenType, bypassNewLine){
		if(tokenType instanceof Array){
			for(var i=0; i<tokenType.length; i++){
				if(this.currToken.type == tokenType[i]) return true;
			}
			
		} else if(this.currToken.type == tokenType){
			return true;
		}
		
		if(bypassNewLine){
			if(this.currToken.type == 'NEWLINE'){
				if(tokenType instanceof Array){
					for(var i=0; i<tokenType.length; i++){
						if(this.LA(i + 1, true) == tokenType[i]) {
							// nothing to do 
						} else {
							return false;
						}
					}
					this.next(true);
					return true;
				} else {
					if(this.LA(1, true) == tokenType) {
						this.next(true);
						return true;
					}
				}
			} 
		}
		
		return false;
	};
	
	/**
	 * 可傳入語法規則的分析結果(節點、或是否成功匹配boolean值)，也可傳入規則函數，傳入函數會自動濾除 NEWLINE
	 */
	this.expect = function(node, expected){
		if(typeof(node) == 'function'){
			while(this.match('NEWLINE')) this.next(); 		// bypass pure empty statement
			node = node.call(this);
		}
		if(! node){
			if(expected){
				throw new SyntaxError('expect ' + expected + ' but found token', this.currToken, this.lexer.code);
			} else {
				throw new SyntaxError('unexpected token', this.currToken, this.lexer.code);
			}
		}
		return node;
	};
	
	this.parse = function(){
		var n = this.stmts();
		return n;
	};
};

String.prototype.repeat = function(n){
	if(n == 0) return '';
	if(n == 1) return this;
	var s = [];
	for(var i=0; i< n; i++){
		s.push(this);
	}
	return s.join('');
};

function Extend(type, def){
	for(var k in def){
		if(def[k].rule){
			type.prototype[k] = def[k].rule.call(type.prototype);
		} else 
			type.prototype[k] = def[k];
	}
}

Extend(Parser, {
	expr : function(){
		//return this.multi_value_expr(); TODO
		debugger;
		return this.aexpr();
	},
		
	literal : function(){
		return this.number() || this.string() || this.id()
				|| this.null_literal()
				|| this.boolean_literal()
				|| this.this_literal()
				|| this.object_literal() 
				|| this.array_literal()
				|| this.function_literal();
	},
	
	number : function(){
		if(this.match('NUMBER')){
			try{
				return this.createNode('number');
			} finally{
				this.next();
			}
		}
	},
	
	null_literal : function(){
		if(this.match('NULL')){
			try{
				return this.createNode('null');
			} finally{
				this.next();
			}
		}
	},
	
	this_literal : function(){
		if(this.match('THIS')){
			try{
				return this.createNode('this_literal');
			} finally{
				this.next();
			}
		}
	},
	
	boolean_literal : function(){
		if(this.match('TRUE') || this.match('FALSE')){
			try{
				return this.createNode('boolean');
			} finally{
				this.next();
			}
		}
	},
	
	string : function(){
		if(this.match('STRING')){
			try{
				return this.createNode('string');
			} finally{
				this.next();
			}
		}
	},
	
	object_literal : function(){
		var n = new Node('object_literal');
		
		if(this.match('LCURVE')){
			var t = this.LA(1, true);
			if( t == 'ID' || t == 'STRING'){
				if(this.LA(2, true) == 'COLON'){
					this.next(true);	// to attrname
					do{
						if(this.match('RCURVE')) break;  // 最後一項多寫了一個逗號  {name : 'tome', age : 12, }
						
						this.expect(this.match('ID') || this.match('STRING'), 'attribute name');
						
						var attr = this.createNode('attribute');
						attr.attributeName = this.currToken.text;
						this.next(true);
						
						this.expect(this.match('COLON', true));
						this.next();
						
						var v = this.expect(this.setvalue_expr, true);
						attr.attributeValue = v;
						attr.addChild(v);
						
						n.addChild(attr);
					} while(this.match('COMMA', true) && this.next(true));
					
					this.expect(this.match('RCURVE', true), '}');
					this.next();
					
					return n;
				}
			} else if( t == 'RCURVE'){
				this.found();
				this.next();
				return n;
			}
		}
	},
	
	array_literal : function(){
		if(this.match('L_S_BRACKET') && this.next()){
			var m = new Node('array_literal');
			while(!this.match('R_S_BRACKET', true)){
				
				if(this.match('COMMA', true) && this.next(true)){
					m.addChild(new Node('void'));		// [1,,2]
				} else {
					var arg = this.expect(this.setvalue_expr, 'value');	// 不直接用 , 表達式
					m.addChild(arg);
					
					if(this.match('R_S_BRACKET', true)) break;
					
					this.expect(this.match('COMMA', true), ',');
					this.next(true);
					
					if(this.match('R_S_BRACKET', true)) {	// [1,2,]
						m.addChild(new Node('void'));
						break;
					}
				}
			}
			this.expect(this.match('R_S_BRACKET', true));
			this.next();
			
			return m;
		}
	},
	
	function_literal : function(){
		if(this.match('FUNCTION')){
			var f = new Node('function_expr');
			this.next();
			if(this.match('ID', true)){
				f.addChild(f.name = this.createNode('name'));
				this.next();
			} else {
				f.addChild(f.name = this.createNode('void'));
			}
			this.expect(this.match('LBRACKET', true), '('); this.next();
			var args = this.arg_defs();
			f.addChild(f.args = args);
			this.expect(this.match('RBRACKET', true), ')'); this.next();
			var body = this.expect(this.block_stmt, 'function body');
			f.addChild(f.body = body);
			return f;
		}
	},
	
	arg_defs : function(){
		var args = new Node('arg_defs');
		while(!this.match('RBRACKET', true)){
			var arg = this.expect(this.id, 'argument declaration');	// 不用 expr 是要避開多值表達式
			args.addChild(arg);
			
			if(this.match('RBRACKET', true)) break;
			
			this.expect(this.match('COMMA', true), ',');
			this.next(true);
		}
		return args;
	},
	
	id : function(){
		if(this.match('ID')) {
			try{
				var n = this.createNode('id');
				n.text = n.token.text;
				return n;
			}finally{
				this.next();
			}
		}
	},

	// 雙目運算符。從左到右建樹，左邊成為右邊的節點，左邊先求值。
	twoside_ltr : function(higherExpr, condition, expectRightDesc){
		if(higherExpr == null) debugger;
		return function(){
			var n1 = higherExpr.call(this);
			if(n1 && condition.call(this)){
				do{
					var m = this.createNode(this.currToken.type.toLowerCase());
					debugger;
					m.addChild(n1);
					n1 = m;
					this.next(true);
					var n2 = this.expect(higherExpr, expectRightDesc);
					m.addChild(n2);
				} while(condition.call(this));	
				return m;
			} else {
				return n1;
			}
		};
	},
	
	// 雙目運算符。從右到左建樹，右邊成為左邊的節點，右邊先求值。
	twoside_rtl : function(higherExpr, condition, expectRightDesc){
		if(higherExpr == null) debugger;
		return function thisexpr(){
			var n1 = higherExpr.call(this);
			if(n1 && condition.call(this)){
				var m = this.createNode(this.currToken.type.toLowerCase());
				m.addChild(n1);
				this.next(true);
				m.addChild(this.expect(thisexpr.call(this), expectRightDesc));
				return m;
			} else {
				return n1;
			}
		};
	},
	
	// -------------------------- 按運算符優先級從高到低的各種表達式  -------------------------
	bracket_expr : function(){
		if(this.match('LBRACKET') && this.next()){
			var bn = new Node('bracket_expr');		// 爲了將 for((s in t)) ; 判為錯誤語句，括號也要成為表達式 
			
			var n = this.expect(this.expr);
			bn.addChild(n);
			
			this.expect(this.match('RBRACKET',true), 'right bracket');
			this.next();
			
			return bn;
		} else {
			return this.literal();
		}
	},
	// 點，訪問屬性、方法
	call_expr : function(prev){		
		var n1 = prev || this.bracket_expr();
		if(n1){
			var m = this.attrib_access_expr(n1)
					|| this.fun_call_expr(n1)
					|| this.attrib_sq_expr(n1);
			
			if(m) return m;
		}
		return n1;
	},

	// 訪問 . 置於 call_expr 內
	attrib_access_expr : function(n1){		
		if(n1){
			if(this.match('ATTR_DOT', true) && this.next()){
				var m = new Node('attrib_access');
				m.mode = 'dot';
				m.addChild(m.object = n1);
				m.addChild(m.attrib = this.expect(this.id, 'identifier'));
				return this.call_expr(m);
			} 
		}
	},
	
	// 訪問 [], 置於 call_expr 內，也可能在 delete 後
	attrib_sq_expr : function(n1){		
		if(n1){
			if(this.match('L_S_BRACKET') && this.next(true)){
				var m = new Node('attrib_access');
				m.mode = 'bracket';
				m.addChild(m.object = n1);
				m.addChild(m.attrib = this.expect(this.expr, 'attribute'));
				this.expect(this.match('R_S_BRACKET'));
				this.next();
				return this.call_expr(m);
			}
		}
	},
	
	// 函數調用，置於 call_expr 內
	fun_call_expr : function(n1){		
		if(n1){
			if (this.match('LBRACKET') && this.next(true)){
				var m = new Node('function_call');
				var args = this.call_args();
				this.expect(this.match('RBRACKET', true));
				this.next();
				
				m.addChild(m.fun = n1);
				m.addChild(m.args = args);
				return this.call_expr(m);
			}
		}
	},
	
	call_args : function(){
		var args = new Node('args');
		while(!this.match('RBRACKET', true)){
			var arg = this.expect(this.setvalue_expr, 'argument');	// 不用 expr 是要避開多值表達式
			args.addChild(arg);
			
			if(this.match('RBRACKET', true)) break;
			
			this.expect(this.match('COMMA', true), ',');
			this.next(true);
		}
		return args;
	},

	// 負號表達式, 自加自減、~ delete new typeof void
	neg_expr : function(){
		return this.number();
	},
	// 乘除取模
	mexpr : {rule:function(){return this.twoside_ltr(this.neg_expr, function(){return this.match(['MULTI', 'DIV', 'MOD'],true);}, 'right value');}},
	// 加減
	aexpr : {rule:function(){return this.twoside_ltr(this.mexpr, function(){return this.match(['ADD', 'SUBTRACT'],true);}, 'right value');}},
	// ================== 以上所有表達式 ======================================
	
	eof : function(){
		if(this.match('EOF')){
			return this.createNode('eof');
		}
	},
	
	empty_stmt : function(){
		if(this.match('SEMICOLON')){
			try{
				return this.createNode('empty_stmt');
			} finally{
				this.next(true);
			}
		}
	},
	
	block_stmt : function(){
		if(this.match('LCURVE')){
			
			var t = this.LA(1, true);
			if( t == 'ID' || t == 'STRING'){
				if(this.LA(2, true) == 'COLON'){
					return this.expr_stmt();
				}
			}
		
			this.next(true);
			
			var m = new Node('block_stmt', null);
			while(this.match('EOF', true) == false && this.match('RCURVE', true) == false){
				var n = this.expect(this.stmt);
				if(n instanceof Array){
					for(var i=0; i<n.length; i++){
						m.addChild(n[i]);
					}
				} else {
					m.addChild(n);
				}
			}
			this.expect(this.match('RCURVE', true), '}');
			this.next();
			return m;
		}
	},
	
	stmt_end : function(){
		if((this.match('SEMICOLON', true) && this.next()) 
				|| (this.match('RCURVE', true))
				|| (this.match('LCURVE', true))		// another block
				|| (this.match('NEWLINE') && this.next())
				|| this.match('EOF')){
			
			this.bypassNewLine();
			
			return true;
		}
	},
	
	expr_stmt : function(){
		var exp = this.expr();
		if(exp){
			var nd = new Node('expr_stmt');
			nd.addChild(exp);
			this.expect(this.stmt_end(), 'end of statement');
			return nd;
		}
	},
	
	var_decl_stmt : function(withoutEndOfStatement){
		if(this.match('VAR') && this.next(true)){
			var vars = [];
			do{
				var vname = this.expect(this.id, 'identifier');
				
				var decl = new Node('var_decl');
				decl.varname = vname.token.text;
				decl.addChild(vname);
				
				if(this.match('SET', true)){
					var set = this.createNode('set');
					this.next();
					var expr = this.expect(this.setvalue_expr, 'right-hand value'); 	// 必須是級別低於,表達式的表達式，也就是賦值表達式
					set.addChild(expr);
					
					decl.addChild(set);
					decl.initExpr = expr;	// 變量初始化語句
				}
				
				vars.push(decl);
			} while(this.match('COMMA', true) && this.next());

			if(!withoutEndOfStatement){		// 對於for循環的第一個語句，不要吃掉它的分號
				this.expect(this.stmt_end(), 'end of statement');
			}
						
			if(vars.length){
				if(vars.length == 1){
					return vars[0];
			 	} else {
			 		var vs = new Node('var_decls');
			 		for(var i=0; i<vars.length; i++) vs.addChild(vars[i]);
			 		return vs;
			 	}
			}
		}
	},
	
	function_decl_stmt : function(){
		if(this.match('FUNCTION')){
			var f = new Node('function_decl');
			this.next();
			
			this.expect(this.match('ID', true), 'function name');
			f.addChild(f.name = this.createNode('name'));
			this.next();
			
			this.expect(this.match('LBRACKET', true), '('); this.next();
			var args = this.arg_defs();
			f.addChild(f.args = args);			
			this.expect(this.match('RBRACKET', true), ')'); this.next();
			
			var body = this.expect(this.block_stmt, 'function body');
			f.addChild(f.body = body);
			return f;
		}
	},
	
	if_stmt : function(){
		if(this.match('IF')){
			var ifn = this.createNode('if_stmt');
			this.next(true);
			
			this.expect(this.match('LBRACKET',true), '('); this.next();
			var cond = this.expect(this.expr, 'condition');
			ifn.addChild(ifn.cond = cond);
			this.expect(this.match('RBRACKET',true), ')'); this.next();
			
			var tstmt = this.expect(this.stmt, 'true statemnt');
			ifn.addChild(ifn.tstmt = tstmt);
			
			if(this.match('ELSE', true)){	// else if 並不是新鮮什麽語法，只是在 else 後面接了一個單行 if 語句
				this.next(true);
				var fstmt = this.expect(this.stmt, 'false statement');
				ifn.addChild(ifn.fstmt = fstmt);
			}
			return ifn;
		}
	},
	
	while_stmt : function(){
		if(this.match('WHILE', true)){
			var wn = this.createNode('while_stmt');
			this.next(true);
			
			this.expect(this.match('LBRACKET',true), '('); this.next();
			var cond = this.expect(this.expr, 'condition');
			wn.addChild(wn.cond = cond);
			this.expect(this.match('RBRACKET',true), ')'); this.next();
			
			var loop = this.expect(this.stmt, 'loop');
			wn.addChild(wn.loop = loop);
			
			return wn;
		}
	},
	
	do_while_stmt : function(){
		if(this.match('DO', true)){
			var wn = this.createNode('dowhile_stmt');
			this.next(true);

			var loop = this.expect(this.stmt, 'loop');
			wn.addChild(wn.loop = loop);

			this.expect(this.match('WHILE', true), 'while'); this.next(true);
			
			this.expect(this.match('LBRACKET',true), '('); this.next();
			var cond = this.expect(this.expr, 'condition');
			wn.addChild(wn.cond = cond);
			this.expect(this.match('RBRACKET',true), ')'); this.next();
			
			// this.expect(this.stmt_end(), 'end of statement');
			
			return wn;
		}
	},
	
	// for in 和 for
	for_stmt : function(){
		if(this.match('FOR')){
			var forstmt = this.createNode('for_stmt');
			this.next(true);

			this.expect(this.match('LBRACKET',true), '('); this.next(true);

			var forIn = false;
			if(this.match('SEMICOLON', true)){
				forstmt.addChild(forstmt.init = new Node('void')); this.next(true);
			} else {
				var inOfForIn = this.for_in_var_part();
				if(inOfForIn) {
					forIn = true;
				} else {
					if(this.match('VAR', true)){
						var decl = this.expect(this.var_decl_stmt(true), 'var declare');
						forstmt.addChild(forstmt.init = decl);
					} else {
						var expr = this.expect(this.setvalue_expr, 'expression');
						if(expr.type == 'in'){
							forIn = true;
							inOfForIn = expr;
						} else {
							forstmt.addChild(forstmt.init = expr);
						}
					}
					if(!forIn){
						this.expect(this.match('SEMICOLON', true), ';'); this.next();
					}
				}
			}
			
			if(! forIn){
				if(this.match('SEMICOLON', true)){
					forstmt.addChild(forstmt.condition = new Node('void')); this.next();
				} else {
					var expr = this.expect(this.setvalue_expr, 'expression');
					forstmt.addChild(forstmt.condition = expr);
					
					this.expect(this.match('SEMICOLON', true), ';'); this.next();
				}
				
				if(this.match('RBRACKET', true)){
					forstmt.addChild(forstmt.increase = new Node('void'));
				} else {
					var expr = this.expect(this.setvalue_expr, 'expression');
					forstmt.addChild(forstmt.increase = expr);
				}
			} else {
				forstmt.addChild(forstmt.inPart = inOfForIn);
				forstmt.type = 'for_in_stmt';
			}
			
			this.expect(this.match('RBRACKET',true), ')'); this.next();
			
			var loop = this.expect(this.stmt, 'loop');
			forstmt.addChild(forstmt.loop = loop);
			
			return forstmt;
		}
	},
	
	for_in_var_part : function(){
		if(this.match('VAR')){
			if(this.LA(1, true) == 'ID' && this.LA(2,true) == 'IN'){
				var decl = this.createNode('var_decl'); this.next(true);
				var tk = this.currToken;
				var vname = this.id();
				decl.addChild(vname); decl.varname = vname.text;
				this.back(tk);
				
				var instmt = this.expect(this.neq_expr, 'in-statement');
				this.expect(instmt.type == 'in');
				
				instmt.type = 'in_of_for_in';
				instmt.vardecl = decl;
				
				return instmt;
			}
		}
	},
	
	with_stmt : function(){
		if(this.match('WITH')){
			var wn = this.createNode('with_stmt');
			this.next(true);
			
			this.expect(this.match('LBRACKET',true), '('); this.next();
			var obj = this.expect(this.expr, 'condition');
			wn.addChild(wn.withObject = obj);
			this.expect(this.match('RBRACKET',true), ')'); this.next();
			
			var body = this.expect(this.stmt, 'body');
			wn.addChild(wn.body = body);
			
			return wn;
		}
	},
	
	break_stmt : function(){
		if(this.match('BREAK')){
			var n = this.createNode('break_stmt');
			this.next();
			if(this.match('ID', true)){
				n.addChild(n.label = this.id());
			}
			this.expect(this.stmt_end(), 'end of statement');
			return n;
		}
	},
	
	case_stmt : function(){
		if(this.match('CASE')){
			var n = this.createNode('case_stmt');
			this.next();
			n.addChild(n.expression = this.expect(this.expr, 'expression'));
			this.expect(this.match('COLON'), ':'); this.next();
			return n;
		}
	},
	
	continue_stmt : function(){
		if(this.match('CONTINUE')){
			var n = this.createNode('continue_stmt');
			this.next();
			if(this.match('ID', true)){
				n.addChild(n.label = this.id());
			}
			this.expect(this.stmt_end(), 'end of statement');
			return n;
		}
	},
	
	default_stmt : function(){
		if(this.match('DEFAULT')){
			var n = this.createNode('default_stmt');
			this.next();
			this.expect(this.match('COLON'), ':'); this.next();
			return n;
		}
	},
	
	return_stmt : function(){
		if(this.match('RETURN')){
			var n = this.createNode('return_stmt');
			this.next();
			if(this.match('NEWLINE') || this.match('SEMICOLON')){
				// return;
			} else {
				n.addChild(n.expression = this.expect(this.expr, 'expression'));
			}
			this.expect(this.stmt_end(), 'end of statement');
			return n;
		}
	},
	
	debugger_stmt : function(){
		if(this.match('DEBUGGER')){
			var n = this.createNode('debugger_stmt');
			this.next();
			this.expect(this.stmt_end(), 'end of statement');
			return n;
		}
	},
	
	throw_stmt : function(){
		if(this.match('THROW')){
			var n = this.createNode('throw_stmt');
			this.next();
			n.addChild(n.expression = this.expect(this.expr, 'expression'));
			this.expect(this.stmt_end(), 'end of statement');
			return n;
		}
	},
	
	label_stmt : function(){
		if(this.match('ID') && this.LA(1) == 'COLON'){
			var n = this.createNode('label_stmt');
			this.next(); this.next();
			return n;
		}
	},
	
	switch_stmt : function(){
		if(this.match('SWITCH')){
			var wn = this.createNode('switch_stmt');
			this.next(true);
			
			this.expect(this.match('LBRACKET',true), '('); this.next();
			var cond = this.expect(this.expr, 'condition');
			wn.addChild(wn.cond = cond);
			this.expect(this.match('RBRACKET',true), ')'); this.next();
			
			var body = this.expect(this.stmt, 'body');
			wn.addChild(wn.body = body);
			
			return wn;
		}
	},
	
	try_stmt : function(){
		if(this.match('TRY')){
			var wn = this.createNode('try_stmt');
			this.next(true);

			var body = this.expect(this.stmt, 'body');
			wn.addChild(wn.body = body);
			
			this.expect(this.match(['CATCH','FINALLY'], true), 'catch or finally');
			if(this.match('CATCH')){
				var catchstmt = this.createNode('catch_stmt');
				this.next();
				if(this.match('LBRACKET',true) && this.next()){
					var id = this.expect(this.id(), 'condition');
					catchstmt.addChild(catchstmt.id = id);
					this.expect(this.match('RBRACKET',true), ')'); this.next();
				}
				
				var body = this.expect(this.stmt, 'catch statement');
				catchstmt.addChild(catchstmt.body = body);
				
				wn.addChild(wn.catchPart = catchstmt);
			}
			if(this.match('FINALLY') && this.next()){
				var body = this.expect(this.stmt, 'finally statement');
				wn.addChild(wn.finallyPart = body);
			}
			
			return wn;
		}
	},
	
	stmt : function(){
		/*return this.empty_stmt() || TODO
			   this.var_decl_stmt() ||
			   this.block_stmt() ||
			   this.function_decl_stmt() ||
			   this.if_stmt() || 
			   this.for_stmt() ||
			   this.while_stmt() ||
			   this.do_while_stmt() ||
			   this.try_stmt() ||
			   this.throw_stmt() ||
			   this.switch_stmt() ||
			   this.return_stmt() ||
			   this.break_stmt() ||
			   this.continue_stmt() ||
			   this.case_stmt() ||
			   this.default_stmt() ||
			   this.debugger_stmt() ||
			   this.label_stmt() || */
		return this.expr_stmt();
	},
	
	stmts : function(){
		var m = new Node('stmts', null);
		while(this.match('EOF', true) == false){
			var n = this.expect(this.stmt);
			if(n instanceof Array){
				for(var i=0; i<n.length; i++){
					m.addChild(n[i]);
				}
			} else {
				m.addChild(n);
			}
		}
		return m;
	},
	
});

//TODO
var lexer = new JsLexer('1+2', jsRules);
var parser = new Parser(lexer);
var tree = parser.parse(lexer);
log(tree.toLispExpr());
var compiler = new Compiler();
var il = compiler.compile(tree);
function traceOutIl(il){

    function join(arr){
         var s = '';
         for(var i=0; i<arr.length; i++){
             if(typeof(arr[i]) == 'object') 
                 s += arr[i].toString(); 
             else 
                 s += arr[i];
             s += ', '
         }
         return s;
    }

    var sb = '';
	for(var i=0; i< il.length; i++){
	                   var c = join(il[i]);
	                    log(c);
		sb += i + '\t: ' + c + '\r\n';
	}
	console.log(sb);
}
traceOutIl(il);
var machine = new JsMachine(this, new Compiler());
machine.run([['reg1', 3]]);

var interpreter = new JsInterpreter(this);
interpreter.eval('1+2');