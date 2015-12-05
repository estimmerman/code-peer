$(document).on('ready', function(){
	// initialize CodeMirror object - CodeMirror is a plugin used for the code editor
	// which handles syntax highlighting given the set language
	// it also supports themes
	var editor = CodeMirror.fromTextArea(document.getElementById("codemirror"), {
		lineNumbers: true,
		matchBrackets: true
	});
	// sets the theme of the editor to the user's chosen theme
	editor.setOption("theme", user.editorTheme);
	// sets the initial code in the editor to the saved session code
	editor.getDoc().setValue(session.code);
	// sets the coding language of the editor to the saved session language
	editor.setOption("mode", session.language);
	// shows the correct option from the language dropdown as selected
	$("#language").val(session.language);

	// calculations to make the editor and chat areas the full height of the window
	var headerHeight = $('.navbar').height();
	var footerHeight = $('footer').height();
	var bottomPadding = 95;
	var codeAreaHeight = $(window).height() - headerHeight - footerHeight - bottomPadding;
	var margin = 20;
	var chatAreaHeight = codeAreaHeight - $('#chat-box').height() - margin;
	// sets the editor and chat areas (elements) to the calculated heights
	$('.CodeMirror').css('height', codeAreaHeight);
	$('.CodeMirror-gutters').css('height', codeAreaHeight);
	$('#chat').css('height', chatAreaHeight);

	// have enter key submit chat message if focused on chat-box
	$(document).delegate('#chat-box', 'keydown', function(e){
		var keyCode = e.keyCode || e.which;
		if (keyCode == 13) {
			e.preventDefault();
			$('#chat-button').click();
		}
	});

	// attrs for the socket to persist for convenience
	var socketAttrs = {
		name: null,
		colors: {}
	}
	// connects this client to the socket.io server
	// this will add this socket to the session's room
	// for future communication with other sockets in this session
	var socket = io.connect();
	// the following are event handlers for broadcasts sent to this specific client socket
	// socket.broadcast will only send to sockets other than the original sender socket
	// thus updating other sockets/sessions (such as for code changes or chat changes to appear in the other sessions)
	// 
	// socket.emit will send an event only to the original caller
	// thus used to communicate between server and socket (such as when setting the socket's locals, and getting the initialized socket back)

	// event handler for updates to the chat, and appends the message to the chat area
	socket.on('update-chat', function(name, colors, msg) {
		updateChat('<span style="color: ' + getColorOffTheme(colors) + '">' + name + '</span>: ' + msg);
	});
	// event handler for updates to the editor, sets code of the editor given the new code
	socket.on('update-code', function(code) {
		updateCode(code);
	});
	// event handler for updates to the editor language
	socket.on('update-language', function(lang) {
		updateLanguage(lang);
	});
	// event handler for a user joining the session, prints message to chat area
	socket.on('user-connected', function(name, colors) {
		updateChat('<span style="color: ' + getColorOffTheme(colors) + '">' + name + '</span> has connected to the session.');
	});
	// event handler for a user leaving the sesion, prints message to chat area
	socket.on('user-disconnected', function(name, colors) {
		updateChat('<span style="color: ' + getColorOffTheme(colors) + '">' + name + '</span> has left the session.');
	});
	// event handler for the owner of a session leaving, to force other users in the session to leave
	socket.on('owner-disconnected', function() {
		// there is a hidden form in session.jade which is submitted, calling
		// a POST to forceLeave
		$('#force-leave-button').click();
	});
	// this is an event handler for the original socket to receive back when initializing
	// the socket originally
	// is only received once upon initialization
	socket.on('user-set', function(name, colors) {
		// sets the socket attributes for user in other functions
		socketAttrs.name = name;
		socketAttrs.colors = colors;

		// activate session and add active users to the session
		// instead of doing this when going to the session page (during the GET), it only
		// adds users to the session if the socket successfully connects to the socket.io server
		// so if there are connection issues, user will not be considered to have joined the server
		$.post('/session/connect', { shortCode: session.shortCode, _csrf: csrf })
		.done(function(result){
			// nothing to do here
		});
	});
	// initializes socket and it's locals regarding the user and the session
	socket.emit('set-user', user._id.toString(), user.firstName, session.shortCode, session.user.toString());

	// bools to check if a code change was made in this client or was received through the socket
	var receivingChange = false;
	var changeMade = false;

	// event listener for the owner of a session ending it, to kick other users out
	$('#end-session-button').on('click', function(){
		// emit event saying owner is disconnecting
		socket.emit('owner-disconnecting');
		// submit the end session form
		$('#end-session-form-button').click();
	});

	// event listener for the chat button
	$('#chat-button').on('click', function(){
		var chatBox = $('#chat-box');
		if (chatBox.val().trim() == '') return;
		// emits event to the socket.io server saying that there was a chat message sent
		// the server will broadcast to the other connection sockets about this change
		socket.emit('send-chat-message', chatBox.val().trim());
		// update the sender's (this client) chat box immediately, since there's
		// no need to wait for the server to respond (makes it look faster)
		updateChat('<span style="color: ' + getColorOffTheme(socketAttrs.colors) + '">' + socketAttrs.name + '</span>: ' + chatBox.val());
		chatBox.val('');
	})

	// event listener for the click of the save button
	// forces the save of the current editor state
	$('#save-button').on('click', function(){
		saveCodeEdits(true);
	});

	// event listener for a change of the editor language dropdown
	$('#language').on('change', function (e) {
		// get the new selected option
		var optionSelected = $("option:selected", this);
	    var val = this.value;
	    // update the 'mode' or coding language of the editor
	    editor.setOption("mode", val);
	    // emits event to socket.io server that the language has been changed
	    // server will broadcast to other sockets of this change
	    socket.emit('send-language-update', val);
	    // POST to server updating the session's language
		$.post('/session/language/update', { language: val, shortCode: session.shortCode, _csrf: csrf })
		.done(function(data){
			// nothing to do here
		});
	});

	// event listener for changes to the editor
	editor.on('change',function(cm){
		// if this client did not receive the change, but made the change itself,
		// emit event to server regarding this change
		// server will broadcast to other sockets regarding this change
		if (!receivingChange) {
			changeMade = true;
			socket.emit('send-code-update', cm.getValue());
		// if this socket/client is receiving the code change, don't send any event
		// otherwise there will be an infinite loop of one socket updating the other
		} else {
			receivingChange = false;
		}
	});

	// appends a message to the chat area and scrolls to bottom if there is overflow
	var updateChat = function(msg) {
		chat = $('#chat');
		chat.append('<p>' + msg + '</p>');
		chat.scrollTop(chat.prop("scrollHeight"));
	}

	// updates the editor's value (the code)
	// once a change broadcast is received from the socket.io server
	var updateCode = function(code) {
		receivingChange = true;
		editor.getDoc().setValue(code);
	}

	// updates the language of the editor and the dropdown
	// one a change broadcast is received from the socket.io server
	var updateLanguage = function(lang) {
		$('#language').val(lang);
		editor.setOption("mode", lang);
	}

	// shows the saving spinner
	var showSavingSpinner = function(){
		$('#saving-spinner').removeClass('hidden');
	}

	// hides the saving spinner
	var hideSavingSpinner = function(){
		$('#saving-spinner').addClass('hidden');
	}

	// saves the code of the editor to the session model
	var saveCodeEdits = function(forceSave){
		// forceSave is optional, so see if defined
		forceSave = typeof forceSave !== 'undefined' ? forceSave : false;
		// if a change was made by THIS client, or there was a force save (save button clicked)
		// then save the edit
		// 
		// this is to prevent changes that were received from the socket.io server
		// being saved twice, since the code will have been saved to the session model
		// already by the client making the change
		// 
		// if no change has been made since the last time this function was called
		// no POST will occur
		if (changeMade || forceSave){
			// show saving spinner
			showSavingSpinner();
			// hide spinner after 300 ms
			// just a visual effect so user knows code has been saved
			setTimeout(hideSavingSpinner, 300);
			// POST to server the updated code to update the session model
			$.post('/session/code/update', { code: editor.getValue(), shortCode: session.shortCode, _csrf: csrf })
			.done(function(data){
				// nothing
			});
			changeMade = false;
		}
	};
	// continuously try to save code edits every 5 seconds
	// for automatic saving in the background
	setInterval(saveCodeEdits, 5000);

	// get the appropriate color for the name in the chat area given the current
	// chosen chat theme
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