$(document).on('ready', function(){
	var headerHeight = $('.navbar').height();
	var footerHeight = $('footer').height();
	var bottomPadding = 75;
	var codeAreaHeight = $(window).height() - headerHeight - footerHeight - bottomPadding;
	var margin = 20;
	var chatAreaHeight = codeAreaHeight - $('#chat-box').height() - margin;
	$('#code').css('height', codeAreaHeight);
	$('#chat').css('height', chatAreaHeight);

	// allow tab character in the code textarea
	$(document).delegate('#code', 'keydown', function(e){
		var keyCode = e.keyCode || e.which;
		if (keyCode == 9) {
			e.preventDefault();
			var start = $(this).get(0).selectionStart;
			var end = $(this).get(0).selectionEnd;
			$(this).val($(this).val().substring(0, start) + '\t' + $(this).val().substring(end));
			$(this).get(0).selectionStart = $(this).get(0).selectionEnd = start + 1;
		}
	});

	// have enter key submit chat message
	$(document).delegate('#chat-box', 'keydown', function(e){
		var keyCode = e.keyCode || e.which;
		if (keyCode == 13) {
			e.preventDefault();
			$('#chat-button').click();
		}
	});

	var socketAttrs = {
		name: null,
		colors: {}
	}
	var socket = io.connect();
	socket.on('update-chat', function(name, colors, msg) {
		updateChat('<span style="color: ' + getColorOffTheme(colors) + '">' + name + '</span>: ' + msg);
	});
	socket.on('user-connected', function(name, colors) {
		updateChat('<span style="color: ' + getColorOffTheme(colors) + '">' + name + '</span> has connected to the session.');
	});
	socket.on('user-disconnected', function(name, colors) {
		updateChat('<span style="color: ' + getColorOffTheme(colors) + '">' + name + '</span> has left the session.');
	});
	socket.on('owner-disconnected', function() {
		$('#force-leave-button').click();
	});
	socket.on('user-set', function(name, colors) {
		socketAttrs.name = name;
		socketAttrs.colors = colors;

		// activate session and add active users
		$.post('/session/connect', { shortCode: session.shortCode, _csrf: csrf })
		.done(function(result){
			// nothing
		});
	});
	socket.emit('set-user', user._id.toString(), user.firstName, session.shortCode, session.user.toString());

	$('#chat-button').on('click', function(){
		var chatBox = $('#chat-box');
		if (chatBox.val().trim() == '') return;
		socket.emit('send-chat-message', chatBox.val().trim());
		// update the sender's chat box immediately, since there's
		// no need to wait for the server to respond (makes it look faster)
		updateChat('<span style="color: ' + getColorOffTheme(socketAttrs.colors) + '">' + socketAttrs.name + '</span>: ' + chatBox.val());
		chatBox.val('');
	})

	var updateChat = function(msg) {
		chat = $('#chat');
		chat.append('<p>' + msg + '</p>');
		chat.scrollTop(chat.prop("scrollHeight"));
	}

	var getColorOffTheme = function(colors) {
		switch(user.theme) {
			case 'default':
				return colors.default;
			case 'terminal':
				return colors.terminal;
			case 'blue':
				return colors.blue;
			default:
				return colors.default;
		}
	}
});