# GitHub Tools

A set of tools to automate some GitHub workflows.

## `mark-read`

Automatically read notifications of watched repositories based on some rules:

```
$ ./mark-read.js
```

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
};
```
