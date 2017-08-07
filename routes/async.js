module.exports = function(){
		
		var me = this; // as it is a constructor >this< is the new object. let have its refernce scoped in me to access it after construction is finished
	
		me.tasks = [];
		
		me.then= function(property, next){
			if(!next){
				me.tasks.push(property);
				return me; // fluent api
			}
			next.property = property;
			me.tasks.push(next);
			return me; // fluent api
		};
		
		
		var isFinished = function(task){
			return task.result;
		};
		
		var asObject = function(task){
			if(task.property){
				var object = {};
				object[task.property] =  task.result;
				return object;
			}else{
				return task.result;
			}
			
		};
		
		me.async = function (onFinish = function(){}) {
			me.tasks.forEach(function(task) {
				task(function (result) { 
					task.result = result;
					
					if (me.tasks.every(isFinished)) {
						var results = me.tasks.map(asObject);
						onFinish(results);
					};
	
				});
			});

		};
	
	
		return this; // return the new created object
	};