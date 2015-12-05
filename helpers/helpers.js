// Helper file with helper methods

// sees if an element is in an array
// specifically created for determining if a user id is in the activeUsers array
// in a CodeSession
// must use toString() to test for equality since MongoDB id's are of a special object type
exports.getIdIndexInArray = function(id, arr) {
  for (var i = 0; i < arr.length; i++) {
    if (id.toString() == arr[i].toString()) return i;
  }
  return -1;
}

// given a session, determines how many minutes ago the session was created
// used for display in the session list
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

// given a name and an array of colors, chooses a color through hashing the name
// used for getting the color for a user in the chat area
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