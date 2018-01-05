/**
 * 
 * @Author �S���� inshua@gmail.com
 * 
 * http://code.google.com/p/chn-js/
 */
function Token(id, type, span){
	this.id = id;	// auto inc
	this.type = type;
	this.start = span.start;
	this.length = span.length;
	this.text = span.text;
	this.toString = function(){
		return ["(", this.type , ":", this.text, "[", this.start , ":", this.length, "])"].join('');
	};
}
function SyntaxError(message, posOrToken, code){
	this.message = message;
	if(posOrToken instanceof Token){
		this.token = posOrToken;
		this.pos = this.token.start;
	} else {
		this.pos = posOrToken;
		this.token = null;
	}
	this.toString = function(){
		if(this.token != null){
			return message + ' ' + this.token;
		} else {
			return message + ' at ' + this.pos; 
		}
	};
}
function Lexer(text, ruleset){
	
	this.start = 0;	// token rule can move this, if match fail, auto rollback
	this.pos = 0;
	this.currChar = (text.length > 0 ? text.charAt(0) : '');
	this.currCharCode = (text.length > 0 ? text.charCodeAt(0) : 0);
	this.code = text;
	this.tokenId = 0;
	
	this.nextChar = function(){
		if(this.pos >= text.length){
			this.pos ++;
			return '';
		} else {
			try{
				return text.charAt(this.pos ++);
			}finally{
				this.updateCurrChar();
			}
		}
	};
	
	this.updateCurrChar = function(){
		if(this.pos >= text.length){
			this.currChar = '';
			this.currCharCode = 0;
		} else {
			this.currChar = text.charAt(this.pos);
			this.currCharCode = text.charCodeAt(this.pos);
		}
	};
	
	this.next = function(){
		if(this.pos <= text.length){ 
			this.pos ++;
			this.updateCurrChar();
		}
		return true;
	};
	
	this.peekChar = function(){
		return this.currChar;
	};
	
	this.peekCharCode = function(){
		return this.currCharCode;
	};
	
	this.reject = function(){
		if(this.pos != this.start){
			this.pos = this.start;
			this.updateCurrChar();
		}
	};
	
	this.accept = function(){
		// this.pos --;		��������ͣ���ڵ�һ�����M��Ҏ�t�ĵ��c���@�NҎ�t���m�ϽM�ϣ��� DIGIT() || DOT()�������`�� 2 ��
		var span = {start : this.start, length : this.pos - this.start, text : text.substring(this.start, this.pos)};
		this.start = this.pos;
		return span;
	};
	
	this.markPos = 0;
	this.mark = function(){
		this.markPos = this.pos;
		return this;
	};
	
	this.failback = function(b){
		if(!b) this.pos = this.markPos;
		return b;
	};
	
	this.test = function(b){
		this.pos = this.markPos;
		return b;
	};
	
	/**
	 * �z���Ƿ���� pattern�����τt��ǰ�ƣ�����Ϸ��� true�����_ ? Ҏ�t��
	 */
	this.any = function(pattern){
		if(pattern.call(this)){
			this.next();
		}
		return true;
	};
	
	/**
	 * �z���Ƿ���� pattern�������һֱǰ�ƣ�ֱ�������ϵ�λ�á����_ * Ҏ�t��
	 */ 
	this.many = function(pattern){
		while(pattern.call(this)) this.next();
		return true;
	};
	
	/**
	 * �z���Ƿ����һ������ pattern �� char������τt��ǰ��, ��δ�l�F�t���e
	 */
	this.one = function(pattern){
		if(pattern.call(this) == false) 
			throw new SyntaxError('ILLEGAL token', this.pos, text);
		else{
			this.next();
			return true;
		}
	};
	
	/**
	 * ��������b��true���t���e������� unexpect(this.EOF() || this.LETTER())�����⵽̎���e
	 */
	this.unexpect = function(b){
		if(b) 
			throw new SyntaxError('ILLEGAL token', this.pos, text);
	};
	
	/**
	 * ���ٴ���һ�� pattern���粻���ڣ����e������ڣ�һֱ��ǰ�ƣ��� many�����_ + Ҏ�t��
	 */
	this.atLeastOne = function(pattern){
		if(pattern.call(this) == false){
			throw new SyntaxError('ILLEGAL token', this.pos, text);
		} else {
			while(pattern.call(this)) this.next();
			return true;
		}
	};
	
	var rules = [];
	for(var k in ruleset){
		var r = ruleset[k];
		if(!r.inner){
			rules.push(k);
		}
		if(r.keywords){
			var keywords = {};
			if(r.keywords instanceof Array){
				for(var i = 0; i<r.keywords.length; i++){
					var w = r.keywords[i];
					if(r.ignoreCase){
						keywords[w.toUpperCase()] = w.toUpperCase();
					} else {
						keywords[w] = w.toUpperCase();
					}
				}
			} else {
				keywords = r.keywords;
			}
			this.keywords = keywords;
			this.keywordRule = k;
			this.ignoreCase = r.ignoreCase;
		}
		
		this[k] = r.rule;
	}
	
	this.nextToken = function(){
		for(var i=0;i<rules.length; i++){
			var rule = rules[i];
			var tk = this[rule]();
			if(tk == true) {
				var span = this.accept();
				if(rule == this.keywordRule){
					if(this.ignoreCase){
						if(this.keywords.hasOwnProperty(span.text.toUpperCase())){
							var s = this.keywords[this.keywords[span.text.toUpperCase()]];
							span.text = s;
							var tk = new Token(this.tokenId ++,  s, span);
							tk.isKeyword = true;
							return tk;
						}
					} else {
						if(this.keywords.hasOwnProperty(span.text)){
							var s = this.keywords[span.text];
							var tk = new Token(this.tokenId ++, s, span);
							tk.isKeyword = true;
							return tk;
						}
					}
					// keywords match failed
					return new Token(this.tokenId ++, rule, span);
				} else {
					return new Token(this.tokenId ++, rule, span);
				}
			} else {
				this.reject();
			}
		}
		this.pos = text.length;
		this.updateCurrChar();
		var span = this.accept();
		return new Token(this.tokenId ++, 'unrecognized', span);
	};
}


Lexer.prototype.replacePeekChar = function(){
	var r = '';
	do{
		var tk = this.nextToken();
		if(tk.type == 'ID'){
			if(tk.text == 'peekChar') {
				r += 'peekCharCode';
				continue;
			}
		} else if(tk.type == 'STRING'){
			var s = eval(tk.text);
			if(s.length == 1){
				r += s.charCodeAt(0);
				continue;
			} else if(s.length == 0){
				r += 0;
				continue;
			}
		}
		r += tk.text;
	} while(tk.type != 'EOF');
	return r;
};

function JsLexer(code){
	Lexer.call(this, code, jsRules);
	var ruleset = jsRules;
	
	this.tokenTypes = {};		// string token type -> number
	
	var rules = [];
	var tokenTypeId = 0;
	for(var k in ruleset){
		var r = ruleset[k];
		if(!r.inner){
			this.tokenTypes[k] = tokenTypeId ++;
		}
		if(r.keywords){
			var keywords = {};
			if(r.keywords instanceof Array){
				for(var i = 0; i<r.keywords.length; i++){
					var w = r.keywords[i];
					if(r.ignoreCase){
						keywords[w.toUpperCase()] = w.toUpperCase();
					} else {
						keywords[w] = w.toUpperCase();
					}
				}
			} else {
				keywords = r.keywords;
			}
			for(var k2 in keywords){
				this.tokenTypes[k2.toUpperCase()] = tokenTypeId ++;
			}
		}		
	}
	
	/*
	var prevNextToken = this.nextToken;
	this.nextToken = function(){
		var tk = prevNextToken.call(this);
		tk.type = this.tokenTypes[tk.type];
		return tk;
	};*/
	
	this.replaceTokenType = function(){
		var r = '';
		var stringType = this.tokenTypes['STRING'];
		var eofType = this.tokenTypes['EOF'];
		do{
			var tk = this.nextToken();
			if(tk.type == stringType){
				var s = eval(tk.text);
				var t = this.tokenTypes[s];
				if(t != null){
					r += t;
					continue;
				}
			}
			r += tk.text;
		} while(tk.type != eofType);
		return r;
	};
}
