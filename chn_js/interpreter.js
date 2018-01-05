/**
 * 
 * @Author ‘SΩÊ–≈ inshua@gmail.com
 * 
 * http://code.google.com/p/chn-js/
 */
function JsInterpreter(globalObject){
	
	var compiler = new Compiler();
	var machine = new JsMachine(globalObject, compiler);
	var self = this;
	
	machine.onbreak = function(context, currAst, funStack){
		self.onbreak(context, currAst, funStack);
	};
	
	machine.onresume = function(){
		self.onresume();
	};
	
	machine.oncomplete = function(result){
		self.oncomplete(result);
	};
	
	this.onerror = function(e, ast) {};
	
	this.run = function(code){
		try{
			this.lexer = new JsLexer(code, jsRules);
			this.parser = new Parser(this.lexer);
			this.tree = this.parser.parse(this.parser);
			
			this.onparsecomplete(new JsLexer(code, jsRules), this.tree);
			
			var il = compiler.compile(this.tree);
			
			return machine.run(il);
		} catch(e){
			this.onerror(e, machine.getCurrAst());
		}
	};
	
	this.eval = function(code){
		return machine.eval(code);
	};
	
	this.onbreak = function(context, currAst, funStack){
		
	};
	
	this.onresume = function(){};
	this.oncomplete = function(result){};
	
	this.stepNext = function(code){
		machine.setNextBreakpoint('step next');
		if(machine.running) machine.resume(); else this.run(code);
	};
	
	this.resume = function(){
		machine.setNextBreakpoint('none');
		if(machine.running) machine.resume(); else this.run(code);
	};
	
	this.stepOver = function(code){
		machine.setNextBreakpoint('step over');
		if(machine.running) machine.resume(); else this.run(code);
	};
	
	this.stepReturn = function(code){
		machine.setNextBreakpoint('step return');
		if(machine.running) machine.resume(); else this.run(code);
	};
}