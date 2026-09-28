import { fetchCurrentKey, keyDetails } from '../services/key-checker.js';

const byId = id => document.getElementById(id);

export function initKeyChecker() {
	const input = byId('checkKey');
	const status = byId('keyStatus');
	const results = byId('keyResults');
	const grid = byId('keyResultGrid');
	const submit = byId('keyCheckBtn');
	let busy = false;
	let revision = 0;
	// Remove keys saved by earlier versions of the checker.
	try { localStorage.removeItem('openrouter-checker-remembered-key'); } catch { /* Storage may be unavailable. */ }

	function showStatus(message, kind) {
		status.textContent = message;
		status.className = `key-status ${kind}`;
		status.hidden = !message;
	}
	function clearResult() {
		revision++;
		results.hidden = true;
		grid.replaceChildren();
		showStatus('', '');
	}
	input.addEventListener('input', clearResult);
	byId('keyVisibilityBtn').addEventListener('click', event => {
		const visible = input.type === 'password';
		input.type = visible ? 'text' : 'password';
		event.currentTarget.textContent = visible ? 'Hide' : 'Show';
		event.currentTarget.setAttribute('aria-label', visible ? 'Hide key' : 'Show key');
		event.currentTarget.setAttribute('aria-pressed', String(visible));
	});

	byId('keyCheckForm').addEventListener('submit', async event => {
		event.preventDefault();
		if (busy) return;
		const key = input.value.trim();
		if (!key) { showStatus('Enter an API key to check.', 'error'); return; }
		input.value = '';
		input.type = 'password';
		const visibility = byId('keyVisibilityBtn');
		visibility.textContent = 'Show';
		visibility.setAttribute('aria-label', 'Show key');
		visibility.setAttribute('aria-pressed', 'false');
		clearResult();
		const currentRevision = revision;
		busy = true;
		submit.disabled = true;
		submit.textContent = 'Checking…';
		showStatus('Checking key with OpenRouter…', 'pending');
		try {
			const data = await fetchCurrentKey(key);
			if (currentRevision !== revision) return;
			if (data.is_management_key || data.is_provisioning_key) {
				throw new Error('This is a management or provisioning key. Enter a regular OpenRouter API key.');
			}
			for (const [label, value] of keyDetails(data)) {
				const item = document.createElement('div');
				item.className = 'key-detail';
				const caption = document.createElement('span');
				caption.className = 'key-detail-label';
				caption.textContent = label;
				const content = document.createElement('strong');
				content.className = 'key-detail-value';
				content.textContent = value;
				item.append(caption, content);
				grid.append(item);
			}
			results.hidden = false;
			showStatus('Key is valid', 'success');
		} catch (error) {
			if (currentRevision === revision) {
				showStatus(error instanceof TypeError
					? 'Could not reach OpenRouter from this browser. Check your connection or browser cross-origin restrictions.'
					: error.message, 'error');
			}
		} finally {
			busy = false;
			submit.disabled = false;
			submit.textContent = 'Check key';
		}
	});
}
