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

class Custom_Field_Tabs {

	static init(){
		this.PLUGIN_ID = "pd_custom_field_tabs";
		this.route = pb.data("route").name;
		this.existing_ui_event_added = false;
		this.settings = Object.create(null);

		this.setup();

		$(this.ready.bind(this));
	}

	static ready(){
		if(this.edit_profile() || this.view_profile()){
			let $the_form = $("form.form_user_edit_personal");

			this.settings.tabs.forEach(elem => {
				let fields = elem.fields_to_move.split("\n");

				if(fields.length == 0 || (fields.length == 1 && fields[0] == "")){
					return;
				}

				let $html;
				let custom = false;

				if(elem.custom_layout.length > 0){
					$html = new Custom_Field_Tabs_Parser(elem.custom_layout);
					custom = true;
				} else {
					$html = $("<div></div>");
				}

				let table_fragment = document.createDocumentFragment();

				fields.forEach(field => {

					let simple_field_name = this.simple_field_name(field);
					let $the_field_node = $the_form.find("div.custom-field-" + simple_field_name);

					if($the_field_node.length == 1){
						let $cloned_field = $the_field_node.clone(true);

						$cloned_field.attr("data-custom-field-clone", simple_field_name);

						$the_field_node.hide();

						$html.append($cloned_field.show(), ((custom)? simple_field_name : null));
					} else if(this.profile_home()){
						let $tr_node = $("td#center-column").find("tr[class^=custom-field-" + simple_field_name + "]");

						if($tr_node.length == 1){
							table_fragment.appendChild($tr_node.clone().get(0));
							$tr_node.hide();
						}
					}

				});

				this.create_profile_tab({

					text: elem.tab_text,

					render: ($content, data_page, viewing) => {
						if(!viewing){
							$content.append((custom)? $html.content() : $html);

							let $button = $("<button>Save Settings</button>");

							$button.on("click", this.save_fields.bind(this, fields));

							$content.append($button);

							$content.append("<span class='the-save-status' style='display: none'></span>");
						}
					},

					view: ($content, data_page) => {

						if(table_fragment.childNodes.length == 0){
							$content.html("<em>No information</em>");
						} else {
							let table = document.createElement("table");

							table.appendChild(table_fragment);

							$content.append(table);
						}

						$content.addClass("content-box");

						$content.css("padding", "10px");

					}

				});

			});

			this.set_active_click_event();

			if(this.edit_profile()){
				this.setup_observer();
			}
		}
	}

	static setup(){
		let plugin = pb.plugin.get(this.PLUGIN_ID);

		if(plugin && plugin.settings){
			this.settings.tabs = plugin.settings.tabs;

			this.settings.profile_view_tabs = (plugin.settings.profile_view_tabs == 1)? true : false;
			this.settings.profile_edit_tabs = (plugin.settings.profile_edit_tabs == 1)? true : false;
		}
	}

	static setup_observer(){
		let $the_form = $("form.form_user_edit_personal");

		let observer = new MutationObserver((mutations) => {

			let $li = $("div.edit-user div.ui-tabMenu:first ul").find("li.ui-active");

			if($li.length == 1 && $li.find("a.js-tab").length == 1){
				return;
			}

			mutations.forEach(mutation => {

				if(mutation.addedNodes.length){
					for(let i = 0; i < mutation.addedNodes.length; ++ i){
						let the_node = mutation.addedNodes[i];

						if(the_node.className.match("status-box")){
							$("span.the-save-status").html(the_node.textContent).fadeIn(900, () => {

								$("span.the-save-status").fadeOut(900, () => {

									setTimeout(() => $("span.the-save-status").hide(), 1700);
									the_node.style.display = "none";

								});

							});

							break;
						}
					}
				}

			});
		});

		observer.observe($the_form.get(0), {

			attributes: false,
			childList: true,
			characterData: false

		});
	}

	static simple_data_page(text = ""){
		return text.replace(/[^\w-]+/g, "_");
	}

	static simple_field_name(text = ""){
		return text.replace(/[^a-z0-9]+/gi, "").toLowerCase();
	}

	static save_fields(fields = []){
		let $the_form = $("form.form_user_edit_personal");

		fields.forEach(field => {
			let simple_field_name = this.simple_field_name(field);
			let $the_original = $("div[class*=custom-field-" + simple_field_name + "]:not([data-custom-field-clone])")
			let $the_clone = $("div[class*=custom-field-" + simple_field_name + "][data-custom-field-clone]")

			let $form_field = $the_original.find("input, select, textarea");
			let $cloned_form_field = $the_clone.find("input, select, textarea");

			if($form_field.length > 0){
				let elem = $form_field.get(0);

				switch(elem.nodeName.toLowerCase()){

					case "select" :
						elem.selectedIndex = $cloned_form_field.get(0).selectedIndex;

						break;

					case "textarea" :
						elem.value = $cloned_form_field.get(0).value;

					case "input" :
						let type = elem.type;

						switch(type){

							case "text" :
								elem.value = $cloned_form_field.get(0).value;

								break;

							case "radio" :
							case "checkbox" :
								for(let i = 0; i < $form_field.length; ++ i){
									if($cloned_form_field.get(i).checked){
										$form_field.get(i).checked = true;
									} else {
										$form_field.get(i).checked = false;
									}
								}

								break;

						}

						break;

				}
			}
		});

		$the_form.submit();
	}

	static create_profile_tab({text = "", render = null, edit = null, view = null} = {}){
		let $user = $("div.show-user, div.edit-user");
		let $ul = $user.find("div.ui-tabMenu:first ul");

		if($ul.length){
			let member = pb.data("page").member;

			if(member && parseInt(member.id, 10)){
				let viewing = (this.view_profile())? true : false;
				let data_page = this.simple_data_page(text);
				let $li = $("<li></li>")
				let $link = $("<a data-page='" + data_page + "' href='#'>" + text + "</a>");
				let $content = $("<div></div>");

				$content.addClass(data_page);

				if(viewing){
					$link.attr("href", "/user/" + parseInt(member.id) + "/?tab-" + data_page);

					if(location.search.match(/\?tab-(\w+)$/i) && RegExp.$1 == data_page){
						$li.addClass("ui-active");
						$content.removeClass("hide");

						let $last_pad_all = $("div.content").find("div.pad-all-double:last");

						$last_pad_all.children().hide();
						$last_pad_all.append($content);
					}

					view($content, data_page);
				} else {
					$content.addClass("js-edit content-box hide");

					$("div.clear.js-enabled").append($content);

					$link.on("click", e => e.preventDefault()); // Bubble bubble
				}

				render($content, data_page, viewing);

				$li.append($link);
				$ul.append($li);

			}
		}
	}

	static set_active_click_event(){
		let $user = $("div.show-user, div.edit-user");
		let $ul = $user.find("div.ui-tabMenu:first ul");

		if($ul.length){
			let what = this;

			$ul.children().on("click", function(){

				what.hide_and_show($(this));

				$ul.children().removeClass("ui-active");
				$(this).addClass("ui-active");

			});
		}
	}

	static hide_and_show($li = null){
		if($li){
			$("div.js-edit[class*=-edit]").addClass("hide");

			let data_page = $li.find("a:first").attr("data-page");

			$("div.js-edit[class*=" + data_page + "]").removeClass("hide");
		}
	}

	static edit_profile(){
		if(!this.settings.profile_edit_tabs){
			return false;
		}

		return (this.profile_edit_admin() || this.profile_edit_avatar() || this.profile_edit_badges() || this.profile_edit_notifications() || this.profile_edit_personal() || this.profile_edit_privacy() || this.profile_edit_settings() || this.profile_edit_social());
	}

	static view_profile(){
		if(!this.settings.profile_view_tabs){
			return false;
		}

		return (this.profile_activity() || this.profile_following() || this.profile_friends() || this.profile_gift() || this.profile_groups() || this.profile_home() || this.profile_notifications());
	}

	static __is_page(id){
		return this.route == id;
	}

	static profile_activity(){
		return this.__is_page("show_user_activity");
	}

	static profile_following(){
		return this.__is_page("show_user_following");
	}

	static profile_friends(){
		return this.__is_page("show_user_friends");
	}

	static profile_gift(){
		return this.__is_page("show_user_gift");
	}

	static profile_groups(){
		return this.__is_page("show_user_groups");
	}

	static profile_home(){
		return this.__is_page("user") || this.__is_page("current_user");;
	}

	static profile_notifications(){
		return this.__is_page("show_user_notifications") || this.__is_page("show_more_notifications");
	}

	static profile_edit_admin(){
		return this.__is_page("edit_user_admin");
	}

	static profile_edit_avatar(){
		return this.__is_page("edit_user_avatar");
	}

	static profile_edit_badges(){
		return this.__is_page("edit_user_badges");
	}

	static profile_edit_notifications(){
		return this.__is_page("edit_user_notifications");
	}

	static profile_edit_personal(){
		return this.__is_page("edit_user_personal");
	}

	static profile_edit_privacy(){
		return this.__is_page("edit_user_privacy");
	}

	static profile_edit_settings(){
		return this.__is_page("edit_user_settings");
	}

	static profile_edit_social(){
		return this.__is_page("edit_user_social");
	}

}

Custom_Field_Tabs.init();