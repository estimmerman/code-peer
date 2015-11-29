$(document).on('ready', function(){
	var headerHeight = $('.navbar').height();
	var footerHeight = $('footer').height();
	var bottomPadding = 75;
	var textareaHeight = $(window).height() - headerHeight - footerHeight - bottomPadding;
	$('#code').css('height', textareaHeight);
	$('#chat').css('height', textareaHeight);
});