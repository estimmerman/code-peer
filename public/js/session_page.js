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
		color: null
	}
	var socket = io.connect();
	socket.on('update-chat', function(name, color, msg) {
		updateChat('<span style="color: ' + color + '">' + name + '</span>: ' + msg);
	});
	socket.on('user-connected', function(name, color) {
		updateChat('<span style="color: ' + color + '">' + name + '</span> has connected to the session.');
	});
	socket.on('user-disconnected', function(name, color) {
		updateChat('<span style="color: ' + color + '">' + name + '</span> has left the session.');
	});
	socket.on('user-set', function(name, color) {
		socketAttrs.name = name;
		socketAttrs.color = color;
	});
	socket.emit('set-user', user.firstName, session.shortCode);

	$('#chat-button').on('click', function(){
		var chatBox = $('#chat-box');
		if (chatBox.val().trim() == '') return;
		socket.emit('send-chat-message', chatBox.val().trim());
		// update the sender's chat box immediately, since there's
		// no need to wait for the server to respond (makes it look faster)
		updateChat('<span style="color: ' + socketAttrs.color + '">' + socketAttrs.name + '</span>: ' + chatBox.val());
		chatBox.val('');
	})

	var updateChat = function(msg) {
		chat = $('#chat');
		chat.append('<p>' + msg + '</p>');
		chat.scrollTop(chat.prop("scrollHeight"));
	}
});