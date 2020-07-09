module.exports = {
	// Repositories to mark as read all messages (matching the types below)
	readRepositories: ['foo/bar'],
	// Repositories to mark as read messages which do not contain the following strings
	filterRepositories: {
		'flow-typed/flow-typed': ['react-redux'],
	},
	// Control the types of notifications to read
	readTypes: ['Issue', 'PullRequest'],
	// Select which branches to use for status updates (direct commits on these branches will be included)
	statusBranches: ['master'],
	// Select which repositories prefixes to use for status updates
	statusRepos: ['foo/'],
	// Replace repositories name prefixes
	statusReposPrefix: ['some-prefix-to-remove'],
};
