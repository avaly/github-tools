module.exports = {
	// Repositories to mark as read all messages (matching the types below)
	readRepositories: ['foo/bar'],
	// Repositories to mark as read messages which do not contain the following strings
	filterRepositories: {
		'flow-typed/flow-typed': ['react-redux'],
	},
	// Control the types of notifications to read
	readTypes: ['Issue', 'PullRequest'],
};
