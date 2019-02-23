#!/usr/bin/env node

const { execFileSync } = require('child_process');
const path = require('path');
const Octokit = require('@octokit/rest');
const { prompt } = require('enquirer');
const config = require('./config');

require('dotenv').config({
	path: path.resolve(__dirname, '.env'),
});

const octokit = new Octokit();

octokit.authenticate({
	type: 'token',
	token: process.env.GITHUB_ACCESS_TOKEN,
});

function getOrigin() {
	const url = execFileSync('git', ['remote', 'get-url', 'origin']).toString();
	const match = url.match(/github\.com:([^\/]+)\/([^\.]+)\.git/);

	if (match && match[1] && match[2]) {
		return {
			owner: match[1],
			repo: match[2],
		};
	}

	return {};
}

function getBranches() {
	let maxLength = 0;
	return execFileSync('git', ['branch'])
		.toString()
		.split('\n')
		.map(line => {
			const branch = line.replace(/^\*?\s*/, '');
			maxLength = Math.max(maxLength, branch.length);
			return branch;
		})
		.filter(
			branch =>
				branch.length && !['develop', 'master', 'production'].includes(branch),
		)
		.map(branch => {
			const log = execFileSync('git', [
				'--no-pager',
				'log',
				branch,
				'-n',
				'1',
				'--pretty=format:%s (%cr) <%an>',
				'--abbrev-commit',
				'--date=relative',
			])
				.toString()
				.replace('\n', '');
			return {
				name: branch,
				message: `${branch}${' '.repeat(maxLength + 3 - branch.length)}${log}`,
				value: branch,
			};
		});
}

(async () => {
	const { owner, repo } = getOrigin();
	const branches = getBranches();

	if (!branches.length) {
		console.info('No valid branches available for removal!');
		process.exit(0);
	}

	try {
		const answers = await prompt({
			type: 'multiselect',
			name: 'branches',
			message: 'Which branches do you want to remove?',
			choices: branches,
			limit: 40,
		});

		if (!answers.branches.length) {
			console.info('No branches were selected for removal.');
			process.exit(0);
		}

		await Promise.all(
			answers.branches.map(branch => {
				console.log(execFileSync('git', ['branch', '-D', branch]).toString());

				return octokit.gitdata
					.deleteReference({
						owner,
						ref: branch,
						repo,
					})
					.then(() => {
						console.info('Deleted remote branch:', branch);
					})
					.catch(err => {
						console.info('Remote branch does not exist:', branch);
					});
			}),
		);
	} catch (err) {
		// ignore
	}
})();
