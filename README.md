# GitHub Tools

A set of tools to automate some GitHub workflows.

## `clean-branches`

Select multiple local git branches and remove them both from local and remote.

```
$ ./clean-branches.js
```

## `mark-read`

Automatically read notifications of watched repositories based on some rules:

```
$ ./mark-read.js
```

## `status`

Automatically generates a status of your activity for a specific day:

```
$ ./status.js [DELTA_DAYS]
```

`DELTA_DAYS` is the number of days to look back in time for status events. Defaults to `1` (yesterday)

Configuration:

```js
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
	statusBranches: ['master', 'develop'],
	// Select which repositories prefixes to use for status updates
	statusRepos: ['org-a/', 'org-b/'],
};
```
