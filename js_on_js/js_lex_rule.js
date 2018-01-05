/**
 * 
 * @Author 許芥信 inshua@gmail.com
 * 
 * http://code.google.com/p/chn-js/
 */
// 以下代碼可以用 replacePeekChar 加工掉字符串，生成匹配數字的匹配代碼 
var jsRules = {
	EOF : {
		rule: function() {
		   return this.peekChar() == '';
	  	}
	},
    
	BLANK : {
		inner : true,
		rule : function() { var c = this.peekChar() ; return c == ' ' || c == '\t';}
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
			return (c >= 97 && c <= 122) || (c >= 65 && c <= 90) || (c == 95 || c == 36) || c > 255;
		}
	},
	
	WHITESPACE : {
		rule: function() {
			if(this.BLANK()){
				 return this.many(this.BLANK);
			}
	  	}
	},
	
	NEWLINE : {
		rule : function() {
			if(this.CHAR('\r') || this.CHAR('\n')){
				this.many(function(){return this.CHAR('\r') || this.CHAR('\n') || this.BLANK();});
				return true;
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
			var c = '\'';
			if(this.CHAR('\'')){
				
			} else if (this.CHAR('\"')){
				 c= '\"';
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
			} while(this.CHAR(c) == false);
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
		keywords : ['break', 'delete', 'function', 'return', 'typeof', 'case', 'do', 'if', 'switch', 'var', 'catch', 'else', 'in', 'this', 'void', 'continue', 'false', 'instanceof', 'throw', 'while', 'debugger', 'finally', 'new', 'true', 'with', 'default', 'for', 'null', 'try', 
		            'abstract', 'double', 'goto', 'native', 'static', 'boolean', 'enum',
		            'implements', 'private', 'synchronized', 'char','extends','int', 'protected',
		            'throws', 'class', 'final', 'interface', 'public', 'transient', 'const',
		            'float', 'long', 'short', 'violatile'],
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
		rule : function() {return this.CHAR('(') && this.next();}
	},
	
	RBRACKET : {
		rule : function() {return this.CHAR(')') && this.next();}
	},
	
	LCURVE : {
		rule : function() {return this.CHAR('{') && this.next();}
	},
	
	RCURVE : {
		rule : function() {return this.CHAR('}') && this.next();}
	},
	
	L_S_BRACKET : {
		rule : function() {return this.CHAR('[') && this.next();}
	},
	
	R_S_BRACKET : {
		rule : function() {return this.CHAR(']') && this.next();}
	},
	
	SEMICOLON : {
		rule : function() {return this.CHAR(';') && this.next();}
	},
	
	COLON : {
		rule : function(){return this.CHAR(':') && this.next();}
	},
	
	COMMA : {
		rule : function() {return this.CHAR(',') && this.next();}
	},
	
	QUESTION : {
		rule : function() { return this.CHAR('?') && this.next();}
	},
	
	ATTR_DOT : {
		rule : function() {return this.peekChar() == '.' && this.next();}
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