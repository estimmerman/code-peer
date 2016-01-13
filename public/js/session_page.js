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

	// set proper themes as checked
	$('#chat-' + user.chatTheme + '-check').removeClass('hidden');
	$('#editor-' + user.editorTheme + '-check').removeClass('hidden');

	// determine if session user is the owner of the session
	var isOwner = user._id.toString() == session.user.toString();

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
	socket.on('user-connected', function(user_id, name, colors) {
		updateChat('<span style="color: ' + getColorOffTheme(colors) + '">' + name + '</span> has connected to the session.');
		updateActiveUsers(user_id, name, colors, true);
	});
	// event handler for a user leaving the sesion, prints message to chat area
	socket.on('user-disconnected', function(user_id, name, colors) {
		updateChat('<span style="color: ' + getColorOffTheme(colors) + '">' + name + '</span> has left the session.');
		updateActiveUsers(user_id, null, null, false);
	});
	// event handler for a user getting kicked from the session
	socket.on('kick-user', function(user_id) {
		// only kick user if this is the correct one
		if (user_id == user._id.toString()) {
			forceLeave('kick');
		}
	});
	// event handler for the owner of a session leaving, to force other users in the session to leave
	socket.on('owner-disconnected', function() {
		// there is a hidden form in session.jade which is submitted, calling
		// a POST to forceLeave
		forceLeave('default');
	});

	var forceLeave = function(reason) {
		if (reason == 'default') {
			$("#force-leave-default").prop("checked", true);
		} else  if (reason == 'kick') {
			$("#force-leave-kick").prop("checked", true);
		}
		$('#force-leave-button').click();
	}

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
		// get the new selected language
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

	// async POST for changing chat theme
	$('#chat-theme-form').on('submit', function() {
		var theme = this.theme.value;
		if (theme != user.chatTheme) {
			$.post('/theme/chat', { theme: theme, _csrf: csrf })
			.done(function(data){
				// update css class based off new chat theme, and checked value in dropdown
				$('#chat-' + user.chatTheme + '-check').addClass('hidden');

				var chatSection = $('#chat-section');
				chatSection.removeClass(user.chatTheme + '-theme');
				user.chatTheme = theme;
				var themeClass = theme + '-theme';
				chatSection.addClass(themeClass);

				$('#chat-' + user.chatTheme + '-check').removeClass('hidden');
			});
		}
		return false;
	});

	// async POST for changing editor theme
	$('#editor-theme-form').on('submit', function() {
		var theme = this.theme.value;
		if (theme != user.editorTheme) {
			$.post('/theme/editor', { theme: theme, _csrf: csrf })
			.done(function(data){
				// update editor theme and checked value in dropdown
				$('#editor-' + user.editorTheme + '-check').addClass('hidden');

				user.editorTheme = theme;
				editor.setOption("theme", theme);

				$('#editor-' + user.editorTheme + '-check').removeClass('hidden');
			});
		}
		return false;
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

	var activeUsersList = $('#active-users');
	// adds or removes a user from the active users list
	// if toAdd is false, it removes the specified user from the list
	var updateActiveUsers = function(user_id, name, toAdd) {
		if(toAdd && $('#user-' + user_id).length == 0){
			// if it's the owner, then have a kick user option next to each name
			// can't kick yourself
			if (isOwner && user_id != user._id.toString()){
				activeUsersList.append(
					'<li id="user-' + user_id + '" style="margin-left: -20px;">' +
						'<i class="fa fa-icon fa-user">' +
							'<span style="margin-left: 5px;">' + name + '</span>' + 
						'</i>' +
						'<i id="kick-user-' + user_id + '" class="fa fa-close pull-right cursor"></i>' +
					'</li>'
				);
				$('#kick-user-' + user_id).on('click', function() {
					socket.emit('send-kick-user', user_id);
				});
			} else {
				activeUsersList.append(
					'<li id=user-' + user_id + ' style="margin-left: -20px;">' +
						'<i class="fa fa-icon fa-user" style="color: black">' +
							'<span style="margin-left: 5px;">' + name + '</span>' + 
						'</i>' +
					'</li>'
				);
			}
		} else if (!toAdd && $('#user-' + user_id).length != 0){
			$('#user-' + user_id).remove();
		}
	}

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

	// gets the display name given a user's first and last name
	var getDisplayName = function(firstName, lastName) {
		return firstName + ' ' + lastName.substring(0,1);
	}

	$('#copyShareLink').on('click', function(){
		window.prompt('Copy and click enter.', 'http://localhost:3000/session/' + session.shortCode + '?key=' + session.privateKey);
	});

	/*
		Start edit session settings
	*/

	var maxActiveUsers = $('#maxActiveUsers');
	var noLimitOnActiveUsers = $('#noLimitOnActiveUsers');
	var sessionSettingsForm = $('#edit-session-settings-form');
	var sessionSettingsModal = $('#editSessionSettingsModal')
	var shareLinkButton = $('#openShareLinkModal');
	var shareLink = $('#shareLink');

	function toggleMaxActiveUsersInput(noLimit) {
		if(noLimit) {
			maxActiveUsers.prop('disabled', true);
		} else {
			maxActiveUsers.prop('disabled', false);
		}
	}

	$('#openEditSessionSettingsModal').on('click', function(){
		if (session !== null){
			maxActiveUsers.val(session.settings.maxActiveUsers);
			noLimitOnActiveUsers.prop('checked', session.settings.noLimitOnActiveUsers);
			toggleMaxActiveUsersInput(session.settings.noLimitOnActiveUsers);
			$('#isPrivate').prop('checked', session.settings.private);
		} else {
			maxActiveUsers.val(2);
		}
	});

	noLimitOnActiveUsers.change(function(){
		toggleMaxActiveUsersInput(this.checked);
	});

	sessionSettingsForm.on('submit', function(e){
		e.preventDefault();
		var values = {};
		$.each(sessionSettingsForm.serializeArray(), function(i, field) {
		    values[field.name] = field.value;
		});
		$.post('/session/settings/update', { 
			maxActiveUsers: values.maxActiveUsers, 
			noLimitOnActiveUsers: values.noLimitOnActiveUsers,
			isPrivate: values.isPrivate,
			shortCode: session.shortCode,
			_csrf: values._csrf 
		})
		.done(function(response){
			if (values.maxActiveUsers && !values.noLimitOnActiveUsers) {
				session.settings.maxActiveUsers = Math.round(parseInt(values.maxActiveUsers));
			}
			session.settings.noLimitOnActiveUsers = values.noLimitOnActiveUsers ? true : false;
			session.settings.private = values.isPrivate ? true : false;

			sessionSettingsModal.modal('hide');

			// session changed from public to private, so we must add the share link button, and update the link that will be shown
			if (response && response.data && response.data.newPrivateKey && session.settings.private) {
				session.privateKey = response.data.newPrivateKey;
				shareLink.text('http://localhost:3000/session/' + session.shortCode + '?key=' + session.privateKey);
				shareLinkButton.show();
			}

			// if session is public, check to make sure there is no share link button
			if (!session.settings.private) {
				shareLinkButton.hide();
			}
		});
	});

	$('[data-toggle="tooltip"]').tooltip();

	/*
		End edit session settings
	*/

	// initializes socket and it's locals regarding the user and the session
	socket.emit('set-user', user._id.toString(), getDisplayName(user.firstName, user.lastName), session.shortCode, session.user.toString());

	// populate active users list upon session joining
	for (var i = 0; i < session.activeUsers.length; i++) {
		var activeUser = session.activeUsers[i];
		updateActiveUsers(activeUser._id, getDisplayName(activeUser.firstName, activeUser.lastName), true);
	}
});