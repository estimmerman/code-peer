exports.getIdIndexInArray = function(id, arr) {
  for (var i = 0; i < arr.length; i++) {
    if (id.toString() == arr[i].toString()) return i;
  }
  return -1;
}

exports.getMinutesFromSessionStart = function(session) {
	var min = null;
	if (session.lastStartTime) {
		var diff = Math.abs(new Date() - session.lastStartTime);
		var minutes = Math.floor((diff/1000)/60);
		min = minutes;
	} else {
		min = "an unknown number of";
	}
	return min;
}

exports.getUsernameColor = function(username, colors) {
	// Compute hash code
	var hash = 7;
	for (var i = 0; i < username.length; i++) {
	   hash = username.charCodeAt(i) + (hash << 5) - hash;
	}
	// Calculate color
	var index = Math.abs(hash % colors.length);
	return colors[index];
}