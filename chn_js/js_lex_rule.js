/**
 * 
 * @Author 許芥信 inshua@gmail.com
 * 
 * http://code.google.com/p/chn-js/
 */
// 以下代碼可以用 replacePeekChar 加工掉字符串，生成匹配數字的匹配代碼 
function combind(a, b){
	var o = {};
	for(var attr in a){
		o[attr] = a[attr];
	}
	for(var attr in b){
		o[attr] = b[attr];
	}
	return o;
}
var jsRules = {
	EOF : {
		rule: function() {
		   return this.peekChar() == '';
	  	}
	},
    
	BLANK : {
		inner : true,
		rule : function() { var c = this.peekChar() ; return c == ' ' || c == '\t' || c == '\r' || c == '\n';}
	},
	
	DIGIT : {
		inner : true,
		rule : function(){
			var c = this.peekChar(); return c >= '0' && c <= '9';
		}
	},
	
	CHAR : {
		inner : true,
		rule : function(c){return this.peekChar() == c;}
	},

	RANGE : {
		inner : true,
		rule : function(c1, c2){var c = this.peekChar(); return c >= c1 && c <= c2;}
	},

	UPCHAR : {
		inner : true,
		rule : function(c){return this.peekChar().toUpperCase() == c;}
	},
	
	LCHAR : {
		inner : true,
		rule : function(c){return this.peekChar().toLowerCase() == c;}
	},
	
	ANYCHAR : {
		inner : true,
		rule : function(){
			for(var i=0; i<arguments.length; i++){
				if(this.peekChar() == arguemnts[i]) return true;
			}
		}
	},
	
	HEXDIGIT : {
		inner : true,
		rule : function(){var c = this.peekChar() ; return (c >= '0' && c <= '9') || (c >= 'A' && c <= 'F') || (c >= 'a' && c <= 'f');}
	},
	
	LETTER : {
		inner : true,
		rule : function(){
			var c = this.peekCharCode(); 
			return ((c >= 97 && c <= 122) 
				|| (c >= 65 && c <= 90) 
				|| (c == 95 || c == 36) 
				|| c > 255) && (
						   c != 8216  // ‘
						 && c != 8217 // ’
						 && c != 8221 // ”
						 && c != 8220 // “
						 && c != 12304 // 【
						 && c != 12305 // 】
						 && c != 65307 // ；
						 && c != 65292 // ,
						 && c != 65288 // （
						 && c != 65289 // ）
						 && c != 65311 // ？
					);
		}
	},

	///*  empty newline not allowed
	NEWLINE : {
		rule : function() {
			if(this.CHAR('\r') || this.CHAR('\n')){
				this.many(function(){return this.CHAR('\r') || this.CHAR('\n') || this.BLANK();});
				return true;
			}
		}
	},
	
	WHITESPACE : {
		rule: function() {
			if(this.BLANK()){
				 return this.many(this.BLANK);
			}
	  	}
	},
	
	NUMBER : {
		rule : function (){
			if(this.DIGIT() || this.DOT()){
				if(this.CHAR('0') && this.next()){
					if((this.CHAR('X') || this.CHAR('x')) && this.next()){
						this.atLeastOne(this.HEXDIGIT);
						this.unexpect(this.LETTER() || this.DOT());
					} else if(this.DOT() && this.next()){
						if(this.DIGIT()){
							this.many(this.DIGIT) ;
						}
						if((this.CHAR('E') || this.CHAR('e')) && this.next()){
							this.atLeastOne(this.DIGIT);
						}
						this.unexpect(this.LETTER() || this.DOT());
					} else if(this.DIGIT()){
						this.atLeastOne(function(){return this.RANGE('0', '7');});
						this.unexpect(this.RANGE('8', '9') || this.LETTER() || this.DOT());
					} else {	// just number 0
						if((this.CHAR('E') || this.CHAR('e')) && this.next()){
							this.atLeastOne(this.DIGIT);
						}
						this.unexpect(this.LETTER() || this.DOT());
					}
				} else if(this.DOT() && this.next()){
					if(!this.DIGIT()) return false;		// . 運算符
					this.atLeastOne(this.DIGIT);
					if((this.CHAR('E') || this.CHAR('e')) && this.next()){
						this.atLeastOne(this.DIGIT);
					}
					this.unexpect(this.LETTER() || this.DOT());
				} else {
					this.many(this.DIGIT);
					if(this.DOT() && this.next()){
						this.many(this.DIGIT);
						if((this.CHAR('E') || this.CHAR('e')) && this.next()){
							this.atLeastOne(this.DIGIT);
						}
						this.unexpect(this.LETTER() || this.DOT());
					} else {
						if((this.CHAR('E') || this.CHAR('e')) && this.next()){
							this.atLeastOne(this.DIGIT);
						}
						this.unexpect(this.LETTER() || this.DOT());
					}
				}
				return true;
			}
		}
	},
	
	STRING : {
		rule : function(){
			var single = false;
			if(this.CHAR('\''|| this.CHAR('’') || this.CHAR('‘'))){
				single = true;
			} else if (this.CHAR('\"') || this.CHAR('“') || this.CHAR('”')){
				single = false; 
			} else {
				return false;
			}
			do{
				this.next();
				if(this.CHAR('\\')){
					this.next();	// bypass \
					this.next();	// bypass \a
				} 
				this.unexpect(this.EOF() || this.CHAR('\r') || this.CHAR('\n'));
			} while(! (single 
					? this.CHAR('\''|| this.CHAR('’') || this.CHAR('‘')) 
					: this.CHAR('\"') || this.CHAR('“') || this.CHAR('”')));
			this.next();
			
			return true;
		}
	},
	
	COMMENT : {
		rule : function(){
			if(this.CHAR('/')){
				this.next();
				if(this.CHAR('*')){
					do{
						this.next();
						if(this.CHAR('*')){
							this.next();
							if(this.CHAR('/')) {
								this.next();
								return true;
							}
						}
					} while(! this.EOF());
				} else if(this.CHAR('/')){
					do{
						this.next();
					} while(!(this.EOF() || this.CHAR('\r') || this.CHAR('\n')));
					return true;
				}							
			}
			return false;
		}
	},
	
	IDTAIL : {
		inner : true,
		rule : function(){return this.LETTER() || this.DIGIT();}
	},
	
	ID : {
		keywords : combind(
					{'跳出' : 'BREAK', '刪除' : 'DELETE', '返回' : 'RETURN', '的類型': 'TYPEOF', 
						'為' : 'CASE', '反復' : 'LOOP', '如果' : 'IF', '元' : 'VAR', '抓錯' : 'CATCH', '否則' : 'ELSE', 
						'屬於' : 'IN', '我' : 'THIS',
			            '置空' : 'VOID', '繼續' : 'CONTINUE', '不成立': 'FALSE', '是' : 'INSTANCEOF', '拋出' : 'THROW', 
			            '調試器' :'DEBUGGER', '最終' : 'FINALLY', '新' : 'NEW', '成立' : 'TRUE', '其它' : 'DEFAULT', 
			            '令' : 'FOR', '空' : 'NULL', '執行' : 'TRY', 
			            '抽象' : 'ABSTRACT', '雙浮點' : 'DOUBLE', '轉到' : 'GOTO', '本地' : 'NATIVE', '靜態' : 'STATIC',
			            '布爾' : 'BOOLEAN', '枚舉' : 'ENUM',
			            '實現' : 'IMPLEMENTS', '私有' : 'PRIVATE', '同步化' : 'SYNCHRONIZED', '字符' : 'CHAR',
			            '衍生' : 'EXTENDS','整數' : 'INT', '族有' : 'PROTECTED',
			            '類' : 'CLASS', '末代' : 'FINAL', '接口' : 'INTERFACE', '公有' : 'PUBLIC', 
			            'transient' : 'TRANSIENT', '定元' : 'CONST',
			            '浮點' : 'FLOAT', '長整' : 'LONG', '短整' : 'SHORT', 'violatile' : 'VIOLATILE',
			            '標籤' : 'LABEL', '所有': 'FOREACH'},
		            
		            {'跳出' : 'BREAK', '删除' : 'DELETE', '返回' : 'RETURN', '的类型': 'TYPEOF', 
						'为' : 'CASE', '反复' : 'LOOP', '如果' : 'IF', '元' : 'VAR', '抓错' : 'CATCH', '否则' : 'ELSE', 
						'属于' : 'IN', '我' : 'THIS', 
			            '置空' : 'VOID', '继续' : 'CONTINUE', '不成立': 'FALSE', '是' : 'INSTANCEOF', '拋出' : 'THROW', 
			            '调试器' :'DEBUGGER', '最终' : 'FINALLY', '新' : 'NEW', '成立' : 'TRUE', '其它' : 'DEFAULT', 
			            '令' : 'FOR', '空' : 'NULL', '执行' : 'TRY', 
			            '抽象' : 'ABSTRACT', '双浮点' : 'DOUBLE', '转到' : 'GOTO', '本地' : 'NATIVE', '静态' : 'STATIC',
			            '布尔' : 'BOOLEAN', '枚举' : 'ENUM',
			            '实现' : 'IMPLEMENTS', '私有' : 'PRIVATE', '同步化' : 'SYNCHRONIZED', '字符' : 'CHAR',
			            '衍生' : 'EXTENDS','整数' : 'INT', '族有' : 'PROTECTED',
			            '类' : 'CLASS', '末代' : 'FINAL', '接口' : 'INTERFACE', '公有' : 'PUBLIC', 
			            'transient' : 'TRANSIENT', '定元' : 'CONST',
			            '浮点' : 'FLOAT', '长整' : 'LONG', '短整' : 'SHORT', 'violatile' : 'VIOLATILE',
			            '标签' : 'LABEL', '所有': 'FOREACH'}
		            ),
		rule : function(){
			if(this.LETTER()){
				return this.many(this.IDTAIL);
			}
		}
	},
	
	CHARS_AND_FORWARD : {
		inner : true,
		rule : function(){
			for(var i=0; i< arguments.length; i++){
				if(this.peekChar() != arguments[i]) return false;
				this.next();
			}
			return true;
		}
	},
	
	DOT : {
		inner : true,
		rule : function() {return this.peekChar() == '.';}
	},
	
	LBRACKET : {
		rule : function() {return (this.CHAR('(') || this.CHAR('（')) && this.next();}
	},
	
	RBRACKET : {
		rule : function() {return (this.CHAR(')') || this.CHAR('）')) && this.next();}
	},
	
	DOUBLE_L_S_BRACKET : {
		rule : function(){return this.CHARS_AND_FORWARD('[', '[') || (this.CHAR('【') && this.next());}
	},
	
	DOUBLE_R_S_BRACKET : {
		rule : function(){return this.CHARS_AND_FORWARD(']', ']') || (this.CHAR('】') && this.next());}
	},
	
	L_S_BRACKET : {
		rule : function(){return this.CHAR('[') && this.next();}
	},
	
	R_S_BRACKET : {
		rule : function(){return this.CHAR(']') && this.next();}
	},
	
	SEMICOLON : {
		rule : function() {return (this.CHAR(';') || this.CHAR('；')) && this.next();}
	},
	
	AT : {
		rule : function() {return this.CHAR('@') && this.next();}
	},
	
	DOUBLE_COLON : {
		rule : function(){return this.CHARS_AND_FORWARD(':', ':') || (this.CHARS_AND_FORWARD('：', '：'));}
	},
	
	
	COLON : {
		rule : function(){return (this.CHAR(':') || this.CHAR('：')) && this.next();}
	},
	
	COMMA : {
		rule : function() {return (this.CHAR(',') || this.CHAR('，'))&& this.next();}
	},
	
	QUESTION : {
		rule : function() { return (this.CHAR('?') || this.CHAR('？')) && this.next();}
	},
	
	ATTR_DOT : {
		rule : function() {return (this.peekChar() == '.' || this.peekChar() == '。') && this.next();}
	},
	
	SHARP : {
		rule : function() {return (this.peekChar() == '#') && this.next();}
	},
	
	AEQ : {
		rule : function(){return this.CHARS_AND_FORWARD('=', '=', '=');}
	},
	
	NOTAEQ : {
		rule : function(){return this.CHARS_AND_FORWARD('!', '=', '=');}
	},
	
	LTEQ : {
		rule : function(){return this.CHARS_AND_FORWARD('<', '=');}
	},
	
	GTEQ : {
		rule : function(){return this.CHARS_AND_FORWARD('>', '=');}
	},
	
	EQ : {
		rule : function(){return this.CHARS_AND_FORWARD('=', '=');}
	},
	
	NOTEQ : {
		rule : function(){return this.CHARS_AND_FORWARD('!', '=');}
	},
	
	MULTISET : {
		rule : function(){return this.CHARS_AND_FORWARD('*', '=');}
	},
	
	DIVSET : {
		rule : function(){return this.CHARS_AND_FORWARD('/', '=');}
	},
	
	MODSET : {
		rule : function(){return this.CHARS_AND_FORWARD('%', '=');}
	},
	
	ADDSET : {
		rule : function(){return this.CHARS_AND_FORWARD('+', '=');}
	},
	
	SUBTRACTSET : {
		rule : function(){return this.CHARS_AND_FORWARD('-', '=');}
	},
	
	BITSHLSET : {
		rule : function(){return this.CHARS_AND_FORWARD('<', '<', '=');}
	},

	BITSHRSET : {
		rule : function(){return this.CHARS_AND_FORWARD('>', '>', '=');}
	},
	
	BITSHR2SET : {
		rule : function(){return this.CHARS_AND_FORWARD('>', '>', '>', '=');}
	},
	
	BITANDSET : {
		rule : function(){return this.CHARS_AND_FORWARD('&', '=');}
	},
	
	BITXORSET : {
		rule : function(){return this.CHARS_AND_FORWARD('^', '=');}
	},
	
	BITORSET : {
		rule : function(){return this.CHARS_AND_FORWARD('|', '=');}
	},
	
	SET : {
		rule : function() {return this.CHAR('=') && this.next();}
	},
	
	INC : {
		rule : function(){return this.CHARS_AND_FORWARD('+', '+');}
	},
	
	DEC : {
		rule : function(){return this.CHARS_AND_FORWARD('-', '-');}
	},
	
	OR : {
		rule : function(){return this.CHARS_AND_FORWARD('|', '|');}
	},
	
	AND : {
		rule : function(){return this.CHARS_AND_FORWARD('&', '&');}
	},
	
	ADD : {
		rule : function() {return this.CHAR('+') && this.next();}
	},
	
	SUBTRACT : {
		rule : function() {return this.CHAR('-') && this.next();}
	},
	
	MULTI : {
		rule : function() {return this.CHAR('*') && this.next();}
	},
	
	DIV : {
		rule : function() {return this.CHAR('/') && this.next();}
	},
	
	MOD : {
		rule : function() {return this.CHAR('%') && this.next();}
	},
	
	BITOR : {
		rule : function() {return this.CHAR('|') && this.next();}
	},
	
	BITAND : {
		rule : function() {return this.CHAR('&') && this.next();}
	},
	
	BITNOT : {
		rule : function() {return this.CHAR('~') && this.next();}
	},
	
	XOR : {
		rule : function() {return this.CHAR('^') && this.next();}
	},
	
	NOT : {
		rule : function() {return this.CHAR('!') && this.next();}
	},
		
	BITSHL : {
		rule : function(){return this.CHARS_AND_FORWARD('<', '<');}
	},
	
	BITSHR2 : {
		rule : function(){return this.CHARS_AND_FORWARD('>', '>', '>');}
	},
	
	BITSHR : {
		rule : function(){return this.CHARS_AND_FORWARD('>', '>');}
	},
	
	LT : {
		rule : function() {return this.CHAR('<') && this.next();}
	},
	
	GT : {
		rule : function() {return this.CHAR('>') && this.next();}
	}
	
};

