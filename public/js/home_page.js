$(document).ready(function() {
	var maxActiveUsers = $('#maxActiveUsers');
	var noLimitOnActiveUsers = $('#noLimitOnActiveUsers');

	function toggleMaxActiveUsersInput(noLimit) {
		if(noLimit) {
			maxActiveUsers.prop('disabled', true);
		} else {
			maxActiveUsers.prop('disabled', false);
		}
	}

	$('#openBeginSessionModal').on('click', function(){
		if (ownSession !== null){
			maxActiveUsers.val(ownSession.settings.maxActiveUsers);
			noLimitOnActiveUsers.prop('checked', ownSession.settings.noLimitOnActiveUsers);
			toggleMaxActiveUsersInput(ownSession.settings.noLimitOnActiveUsers);
			$('#isPrivate').prop('checked', ownSession.settings.private);
		} else {
			maxActiveUsers.val(2);
		}
	});

	noLimitOnActiveUsers.change(function(){
		toggleMaxActiveUsersInput(this.checked);
	});

	$('[data-toggle="tooltip"]').tooltip()
});