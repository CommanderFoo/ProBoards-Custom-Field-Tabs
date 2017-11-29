class Custom_Field_Tabs_Parser {


	constructor(template = ""){
		this.template = template;
	}

	append($node = null, simple_field_name = ""){
		if($node && simple_field_name){
			let html = $("<div></div>").append($node).html();
			let re = new RegExp("\\$\\[" + simple_field_name + "\\]", "gi");

			if(this.template.match(re)){
				this.template = this.template.replace(re, html);
			}
		}
	}

	content(){
		return $("<div></div>").html(this.template);
	}

}