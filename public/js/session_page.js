$(document).on('ready', function(){
	var headerHeight = $('.navbar').height();
	var footerHeight = $('footer').height();
	var bottomPadding = 75;
	var textareaHeight = $(window).height() - headerHeight - footerHeight - bottomPadding;
	$('#code').css('height', textareaHeight);
	$('#chat').css('height', textareaHeight);

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

	var socket = io.connect();

	$('#chat-button').on('click', function(){
		socket.emit('send-chat-message', { message: $('body') });
	})
});