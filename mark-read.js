#!/usr/bin/env node

require('dotenv').config();

const Octokit = require('@octokit/rest');
const config = require('./config');

const octokit = new Octokit();

octokit.authenticate({
	type: 'token',
	token: process.env.GITHUB_ACCESS_TOKEN,
});

async function paginate(operation) {
	let response = await operation;
	let { data } = response;

	while (octokit.hasNextPage(response)) {
		response = await octokit.getNextPage(response);
		data = data.concat(response.data);
	}

	return data;
}

async function markRead(notification) {
	const { id, repository, subject } = notification;
	const repo = repository.full_name;

	if (
		!config.readRepositories.includes(repo) &&
		!config.filterRepositories[repo]
	) {
		return false;
	}
	if (!config.readTypes.includes(subject.type)) {
		return false;
	}
	if (
		config.filterRepositories[repo] &&
		config.filterRepositories[repo].some(item => subject.title.includes(item))
	) {
		return false;
	}

	console.info('Marking as read:', repo, subject.type, subject.title);

	await octokit.activity.markNotificationThreadAsRead({ thread_id: id });

	return true;
}

(async () => {
	const notifications = await paginate(octokit.activity.getNotifications({}));
	console.info('Total notifications:', notifications.length);

	let read = 0;
	for (const notification of notifications) {
		if (markRead(notification)) {
			read++;
		}
	}

	console.info('Total read notifications:', read);
})();
