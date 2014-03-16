$(function() {
	var socket = io.connect("");

	$.each([
		"NETWORKS",
		"CHANNELS",
		"MESSAGES",
		"USERS"
	], function(i, type) {
		socket.on(type, function(data) {
			render(type, data);
		});
	});

	var chat = $("#chat");
	var sidebar = $("#sidebar");

	// Templates
	var networks = $("#networks").html();
	var channels = $("#channels").html();
	var messages = $("#messages").html();
	var users = $("#users").html()

	function render(type, data) {
		var target;
		if (typeof data.target !== "undefined") {
			target = $(".window[data-id='" + data.target + "']");
		}

		switch (type) {
		case "NETWORKS":
			var partials = {
				users: users,
				messages: messages
			};
			chat.html("");
			data.forEach(function(network) {
				chat.append(Mustache.render(channels, network, partials));
			});
			sidebar.find("#list").html(
				Mustache.render(networks, {
					networks: data
				})
			).find(".channel")
				.last()
				.addClass("active");

			chat.find(".messages").sticky().scrollToBottom();
			chat.find(".window")
				// Sort windows by `data-id` value.
				.sort(function(a, b) { return ($(a).data("id") - $(b).data("id")); })
				.last()
				.bringToTop();
			break;

		case "USERS":
			target = target.find(".users");
			target.html(Mustache.render(users, {users: data.data}));
			break;

		case "MESSAGES":
			var message = data.data;
			if (message.type == "error" || message.type == "notice") {
				target = target.parent().find(".active");
			}
			target = target.find(".messages");
			target.append(Mustache.render(messages, {messages: message}));
			break;
		}
	}

	sidebar.on("click", ".channel", function(e) {
		e.preventDefault();
		sidebar.find("#list .active").removeClass("active");
		var item = $(this)
			.addClass("active")
			.find(".badge")
			.html("")
			.end();
		var id = item.data("id");
		chat.find(".window[data-id='" + id + "']")
			.bringToTop();
	});

	sidebar.find("input[type=checkbox]").each(function() {
		var input = $(this);
		var value = input.val();
		input.prop("checked", true).wrap("<label>").parent().append(value);
		input.on("change", function() {
			chat.toggleClass(
				"hide-" + value,
				!input.prop("checked")
			);
		});
	});

	chat.on("submit", "form", function() {
		var input = $(this).find(".input");
		var text = input.val();
		if (text != "") {
			input.val("");
			socket.emit("input", {
				id: input.data("target"),
				text: text
			});
		}
	});

	chat.on("click", ".close", function() {
		var btn = $(this);
		btn.prop("disabled", true);
		socket.emit("input", {
			id: btn.closest(".window").data("id"),
			text: "/LEAVE"
		});
	});

	chat.on("append", ".window", function() {
		var id = $(this).data("id");
		var badge = sidebar.find(".channel[data-id='" + id + "']:not(.active) .badge");
		badge.html((parseInt(badge.html()) + 1) || "1");
	});

	chat.on("click", ".user", function(e) {
		e.preventDefault();
	});

	chat.on("dblclick", ".user", function() {
		var user = $(this);
		var id = user.closest(".window").data("id");
		var name = user.attr("href");
		
		var channel = sidebar
			.find(".channel[data-id='" + id + "']")
			.siblings(".channel[data-name='" + name + "']");
		if (channel.size() != 0) {
			channel.trigger("click");
			return;
		}

		socket.emit("input", {
			id: id,
			text: "/QUERY " + name
		});
	});
});

(function($) {
	var highest = 1;
	$.fn.bringToTop = function() {
		return this.css('z-index', highest++)
			.addClass("active")
			.find(".input")
			.focus()
			.end()
			.siblings()
			.removeClass("active")
			.end();
	};
})(jQuery);

// Sticky plugin
// https://github.com/erming/sticky

(function($) {
	var append = $.fn.append;
	$.fn.append = function() {
		return append.apply(this, arguments).trigger("append");
	};

	$.fn.sticky = function() {
		var self = this;
		if (self.size() > 1) {
			return self.each(function() {
				$(this).sticky();
			});
		}

		var timer;
		var resizing = false;
		$(window).on("resize", function() {
			// This will prevent the scroll event from triggering
			// while resizing the window.
			resizing = true;

			clearTimeout(timer);
			timer = setTimeout(function() {
				resizing = false;
			}, 100);

			if (sticky) {
				self.scrollToBottom();
			}
		});

		var sticky = false;
		self.on("scroll", function() {
			if (!resizing) {
				sticky = self.isScrollAtBottom();
			}
		});
		self.trigger("scroll");
		self.on("append", function() {
			if (sticky) {
				self.scrollToBottom();
			}
		});

		return this;
	};

	$.fn.scrollToBottom = function() {
		return this.each(function() {
			this.scrollTop = this.scrollHeight;
		});
	};

	$.fn.isScrollAtBottom = function() {
		if ((this.scrollTop() + this.outerHeight() + 1) >= this.prop("scrollHeight")) {
			return true;
		}
	};
})(jQuery);