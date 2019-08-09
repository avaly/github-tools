#!/usr/bin/env node

require('dotenv').config();

const Octokit = require('@octokit/rest');
const dayjs = require('dayjs');
const config = require('./config');

const CLOSE = 'closed';
const OPEN = 'opened';
const CHORE = 'chore';
const DOCS = 'docs';
const FEAT = 'feat';
const FIX = 'fix';
const PERF = 'perf';
const REFACTOR = 'refactor';
const TEST = 'test';
const COMMIT_TYPE = /[\[(](chore|docs|feat|fix|perf|refactor|test)[)\]]/;
const PR = 'pr';
const SHIP = 'ship';
const PR_APPROVED = 'APPROVED';
const PR_COMMENTED = 'COMMENTED';
const PR_CHANGES_REQUESTED = 'CHANGES_REQUESTED';
const EMOJIS = {
	// status types
	[PR]: [':pr:'],
	[SHIP]: [':ship:', ':shipit:'],
	// reviews types
	[PR_APPROVED]: [':github_approved:'],
	[PR_CHANGES_REQUESTED]: [':github_denied:'],
	// commit types
	[CHORE]: [':wrench:'],
	[DOCS]: [':pencil:'],
	[FEAT]: [':sparkles:'],
	[FIX]: [':bug:'],
	[PERF]: [':zap:'],
	[REFACTOR]: [':recycle:'],
	[TEST]: [':white_check_mark:'],
};
const PULL_REQUEST_REVIEW_COMMENT_EVENT = 'PullRequestReviewCommentEvent';
const PULL_REQUEST_EVENT = 'PullRequestEvent';
const PUSH_EVENT = 'PushEvent';
const ALLOWED_EVENTS = [
	PULL_REQUEST_EVENT,
	PULL_REQUEST_REVIEW_COMMENT_EVENT,
	PUSH_EVENT,
];
const PR_ACTIONS = [PR_APPROVED, PR_CHANGES_REQUESTED];

const octokit = new Octokit({
	auth: process.env.GITHUB_ACCESS_TOKEN,
});

const delta = process.argv.length > 2 ? parseInt(process.argv[2], 10) : 1;
const statusDate = dayjs()
	.startOf('day')
	.subtract(delta, 'day');

function sortStatus(itemA, itemB) {
	if (itemA.repo !== itemB.repo) {
		return itemA.repo < itemB.repo ? -1 : 1;
	}
	if (itemA.action !== itemB.action) {
		return itemA.action === SHIP ? -1 : 1;
	}
	return itemA.number < itemB.number ? -1 : 1;
}

function random(list) {
	if (!list.length) {
		return '';
	}
	return list[Math.floor(Math.random() * list.length)];
}

function emoji(item) {
	const action = random(EMOJIS[item.action]);

	if (PR_ACTIONS.includes(item.action)) {
		return `:eyes:${action}`;
	}

	const match = item.text.match(COMMIT_TYPE);
	if (match) {
		return `${action}${random(EMOJIS[match[1]])}`;
	}

	return action;
}

(async () => {
	const username = (await octokit.users.getAuthenticated()).data.login;
	const status = [];

	const processEvent = async event => {
		if (dayjs(event.created_at).isAfter(statusDate, 'day')) {
			return;
		}
		if (dayjs(event.created_at).isBefore(statusDate, 'day')) {
			return true;
		}

		const { payload, type } = event;
		if (!ALLOWED_EVENTS.includes(type)) {
			return;
		}

		const [owner, repo] = event.repo.name.split('/');

		if (
			!config.statusRepos.some(pattern => event.repo.name.includes(pattern))
		) {
			return;
		}

		// Commits
		if (type === PUSH_EVENT) {
			const { commits, head, ref, size } = payload;
			const branch = ref.split('/').pop();

			if (!config.statusBranches.includes(branch) || size !== 1) {
				return;
			}

			const text = `[${repo}] ${commits[0].message.split('\n').shift()}`;

			const prIndex = status.findIndex(
				item => item.type === PULL_REQUEST_EVENT && item.revision === head,
			);
			if (prIndex === -1) {
				status.push({
					action: SHIP,
					repo,
					revision: head,
					text,
					type,
				});
			}
		}

		// PRs
		if (type === PULL_REQUEST_EVENT) {
			const { action, pull_request } = payload;
			const { number, merge_commit_sha } = pull_request;

			const text = `[${repo}] ${pull_request.title} <${pull_request.html_url}| #${number}>`;

			if (action === CLOSE) {
				const commitIndex = status.findIndex(
					item =>
						item.type === PUSH_EVENT && item.revision === merge_commit_sha,
				);
				if (commitIndex > -1) {
					status.splice(commitIndex, 1);
				}

				status.push({
					action: SHIP,
					number,
					repo,
					revision: merge_commit_sha,
					text,
					type,
				});
			} else if (action === OPEN) {
				const openedIndex = status.findIndex(
					item =>
						item.type === PULL_REQUEST_EVENT &&
						item.action === SHIP &&
						item.text === text,
				);
				if (openedIndex === -1) {
					status.push({
						action: PR,
						number,
						repo,
						text,
						type,
					});
				}
			}
		}

		// Reviews
		if (type === PULL_REQUEST_REVIEW_COMMENT_EVENT) {
			const { comment, pull_request } = payload;
			const { number } = pull_request;

			const reviews = await octokit.pulls.listReviews({
				owner,
				repo,
				pull_number: number,
			});

			const ownReviews = reviews.data.filter(
				item =>
					item.user.login === username &&
					dayjs(item.submitted_at).isSame(statusDate, 'day') &&
					item.state !== PR_COMMENTED,
			);
			if (!ownReviews.length) {
				return;
			}

			ownReviews.reverse();
			ownReviews.sort((itemA, itemB) => (itemA.state < itemB.state ? -1 : 1));

			const [review] = ownReviews;

			const text = `[${repo}] ${pull_request.title} <${pull_request.html_url}| #${number}>`;

			const reviewIndex = status.findIndex(
				item => item.type === type && item.text === text,
			);
			if (reviewIndex === -1) {
				status.push({
					action: review.state,
					number,
					repo,
					text,
					type,
				});
			}
		}
	};

	const options = octokit.activity.listEventsForUser.endpoint.merge({
		username,
	});

	let finished = false;
	for await (const eventsPage of octokit.paginate.iterator(options)) {
		for (const event of eventsPage.data) {
			if (await processEvent(event)) {
				finished = true;
				break;
			}
		}
		if (finished) {
			break;
		}
	}

	status.sort(sortStatus);

	console.info('');
	console.info(status.map(item => `${emoji(item)} ${item.text}`).join('\n'));
})();
