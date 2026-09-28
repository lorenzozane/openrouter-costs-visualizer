const KEY_URL = 'https://openrouter.ai/api/v1/key';

export async function fetchCurrentKey(key, fetcher = fetch) {
	const response = await fetcher(KEY_URL, {
		method: 'GET',
		headers: { Authorization: `Bearer ${key}` },
		cache: 'no-store'
	});
	if (response.status === 401 || response.status === 403) {
		throw new Error('This key was rejected by OpenRouter. Check that it is a valid regular API key.');
	}
	if (!response.ok) {
		throw new Error(response.status === 429
			? 'OpenRouter is rate limiting requests. Please try again later.'
			: `OpenRouter could not check this key (HTTP ${response.status}). Please try again later.`);
	}
	const payload = await response.json();
	if (!payload?.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) {
		throw new Error('OpenRouter returned an unexpected key response.');
	}
	return payload.data;
}

export function keyDetails(data) {
	const money = value => typeof value === 'number' && Number.isFinite(value)
		? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
		: '—';
	const usage = data.limit_reset === 'daily' ? data.usage_daily
		: data.limit_reset === 'weekly' ? data.usage_weekly
		: data.limit_reset === 'monthly' ? data.usage_monthly : data.usage;
	const details = [
		['Label', data.label || '—'],
		['Tier', data.is_free_tier === true ? 'Free' : data.is_free_tier === false ? 'Paid' : '—'],
		[data.limit_reset ? `Usage (${data.limit_reset})` : 'Usage', money(usage)],
		['Spending limit', data.limit == null ? 'No key limit' : money(data.limit)],
		['Remaining on key', data.limit == null ? 'No key limit' : money(data.limit_remaining)]
	];
	if (data.rate_limit && typeof data.rate_limit.requests === 'number' && data.rate_limit.interval) {
		details.push(['Reported rate limit (deprecated)', `${data.rate_limit.requests} requests / ${data.rate_limit.interval}`]);
	}
	if (data.expires_at) {
		const expiry = new Date(data.expires_at);
		if (!Number.isNaN(expiry.getTime())) details.push(['Expires', expiry.toLocaleString()]);
	}
	if (data.free_model_daily_requests && typeof data.free_model_daily_requests === 'object') {
		const { remaining, limit } = data.free_model_daily_requests;
		if (typeof remaining === 'number' && typeof limit === 'number') {
			details.push(['Free model requests today', `${remaining} of ${limit} remaining`]);
		}
	}
	return details;
}
