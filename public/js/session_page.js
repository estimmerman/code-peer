$(document).on('ready', function(){
	var editor = CodeMirror.fromTextArea(document.getElementById("codemirror"), {
		lineNumbers: true,
		matchBrackets: true
	});
	editor.setOption("theme", user.editorTheme);
	editor.getDoc().setValue(session.code);
	editor.setOption("mode", session.language);
	$("#language").val(session.language);

	var headerHeight = $('.navbar').height();
	var footerHeight = $('footer').height();
	var bottomPadding = 95;
	var codeAreaHeight = $(window).height() - headerHeight - footerHeight - bottomPadding;
	var margin = 20;
	var chatAreaHeight = codeAreaHeight - $('#chat-box').height() - margin;
	$('.CodeMirror').css('height', codeAreaHeight);
	$('.CodeMirror-gutters').css('height', codeAreaHeight);
	$('#chat').css('height', chatAreaHeight);

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
	socket.on('update-code', function(code) {
		updateCode(code);
	});
	socket.on('update-language', function(lang) {
		updateLanguage(lang);
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

	var receivingChange = false;
	var changeMade = false;

	$('#chat-button').on('click', function(){
		var chatBox = $('#chat-box');
		if (chatBox.val().trim() == '') return;
		socket.emit('send-chat-message', chatBox.val().trim());
		// update the sender's chat box immediately, since there's
		// no need to wait for the server to respond (makes it look faster)
		updateChat('<span style="color: ' + getColorOffTheme(socketAttrs.colors) + '">' + socketAttrs.name + '</span>: ' + chatBox.val());
		chatBox.val('');
	})

	$('#save-button').on('click', function(){
		saveCodeEdits(true);
	});

	$('#language').on('change', function (e) {
		var optionSelected = $("option:selected", this);
	    var val = this.value;
	    editor.setOption("mode", val);
	    socket.emit('send-language-update', val);
		$.post('/session/language/update', { language: val, shortCode: session.shortCode, _csrf: csrf })
		.done(function(data){
			// nothing
		});
	});

	editor.on('change',function(cm){
		if (!receivingChange) {
			changeMade = true;
			socket.emit('send-code-update', cm.getValue());
		} else {
			receivingChange = false;
		}
	});

	var updateChat = function(msg) {
		chat = $('#chat');
		chat.append('<p>' + msg + '</p>');
		chat.scrollTop(chat.prop("scrollHeight"));
	}

	var updateCode = function(code) {
		receivingChange = true;
		editor.getDoc().setValue(code);
	}

	var updateLanguage = function(lang) {
		$('#language').val(lang);
		editor.setOption("mode", lang);
	}

	var showSavingSpinner = function(){
		$('#saving-spinner').removeClass('hidden');
	}

	var hideSavingSpinner = function(){
		$('#saving-spinner').addClass('hidden');
	}

	var saveCodeEdits = function(forceSave){
		forceSave = typeof forceSave !== 'undefined' ? forceSave : false;
		if (changeMade || forceSave){
			showSavingSpinner();
			setTimeout(hideSavingSpinner, 300);
			$.post('/session/code/update', { code: editor.getValue(), shortCode: session.shortCode, _csrf: csrf })
			.done(function(data){
				// nothing
			});
			changeMade = false;
		}
	};
	setInterval(saveCodeEdits, 5000);

	var getColorOffTheme = function(colors) {
		switch(user.chatTheme) {
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