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

	var socket = io.connect();
	socket.on('update-chat', function(msg) {
		updateChat(msg);
	});

	$('#chat-button').on('click', function(){
		var chatBox = $('#chat-box');
		socket.emit('send-chat-message', chatBox.val());
		// update the sender's chat box immediately, since there's
		// no need to wait for the server to respond (makes it look faster)
		updateChat(chatBox.val());
		chatBox.val('');
	})

	var updateChat = function(msg) {
		$('#chat').append('<p>' + msg + '</p>');
	}
});