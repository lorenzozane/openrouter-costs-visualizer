let COL = {};

export function escapeHTML(s) {
	return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export function toNum(v) {
	if (v == null || v === '') return 0;
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
}

function parseLine(parts) {
	const ts = parts[COL.created]?.trim();
	let d = ts ? new Date(ts.replace(' ', 'T')) : null;
	if (d && isNaN(+d)) d = null;

	const genTime = toNum(parts[COL.genTime]);
	const ttft = toNum(parts[COL.ttft]);

	return {
		id: parts[COL.id],
		date: d,
		model: (parts[COL.model] || '').trim(),
		total: toNum(parts[COL.total]),
		web: toNum(parts[COL.web]),
		cache: toNum(parts[COL.cache]),
		file: toNum(parts[COL.file]),
		byok: toNum(parts[COL.byok]),
		tp: Math.trunc(toNum(parts[COL.tokPrompt])),
		tc: Math.trunc(toNum(parts[COL.tokCompletion])),
		tr: Math.trunc(toNum(parts[COL.tokReasoning])),
		genTime,
		ttft
	};
}

export function parseCSV(csvText) {
	const lines = String(csvText ?? '').trim().split('\n');
	if (lines.length < 2) return { rows: [], models: new Set() };

	const header = lines[0].split(',').map(s => s.trim());
	COL = {
		id: header.indexOf('generation_id'),
		created: header.indexOf('created_at'),
		total: header.indexOf('cost_total'),
		web: header.indexOf('cost_web_search'),
		cache: header.indexOf('cost_cache'),
		file: header.indexOf('cost_file_processing'),
		byok: header.indexOf('byok_usage_inference'),
		tokPrompt: header.indexOf('tokens_prompt'),
		tokCompletion: header.indexOf('tokens_completion'),
		tokReasoning: header.indexOf('tokens_reasoning'),
		model: header.indexOf('model_permaslug'),
		provider: header.indexOf('provider_name'),
		genTime: header.indexOf('generation_time_ms'),
		ttft: header.indexOf('time_to_first_token_ms')
	};

	if (COL.id === -1 || COL.created === -1 || COL.model === -1 || COL.total === -1) {
		throw new Error('CSV is missing a required column: generation_id, created_at, model_permaslug, or cost_total');
	}

	const out = [];
	const models = new Set();

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;
		const parts = line.split(',');
		const r = parseLine(parts);
		if (!r || !r.id || !r.date || !r.model) continue;
		out.push(r);
		models.add(r.model);
	}

	return {
		rows: out.sort((a, b) => a.date - b.date),
		models
	};
}

export function mergeAndDeduplicateData(files) {
	// files: [{ id, name, data: rows[] }]
	if (!Array.isArray(files) || files.length === 0) return { rows: [], models: new Set() };

	const unique = new Map();
	const models = new Set();

	for (const f of files) {
		for (const r of (f.data || [])) {
			if (r.id && !unique.has(r.id)) {
				unique.set(r.id, r);
				if (r.model) models.add(r.model);
			}
		}
	}

	const rows = Array.from(unique.values()).sort((a, b) => a.date - b.date);
	return { rows, models };
}
