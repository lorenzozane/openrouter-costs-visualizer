export const elements = {
	file: document.getElementById('csvFile'),
	dropZone: document.getElementById('dropZone'),
	filesList: document.getElementById('filesList'),
	filesContainer: document.getElementById('filesContainer'),
	fileFeedback: document.getElementById('fileFeedback'),
	filesCount: document.querySelector('.files-count'),
	uniqueRecords: document.getElementById('uniqueRecords'),
	clearAllFiles: document.getElementById('clearAllFiles'),

	from: document.getElementById('fromDate'),
	to: document.getElementById('toDate'),

	modelFilter: document.getElementById('modelFilter'),
	modelBtn: document.getElementById('modelFilterBtn'),
	modelPanel: document.getElementById('modelFilterPanel'),
	modelList: document.getElementById('modelList'),
	modelSearch: document.getElementById('modelSearch'),
	modelAll: document.getElementById('modelSelectAll'),
	modelNone: document.getElementById('modelSelectNone'),

	colBtn: document.getElementById('colFilterBtn'),
	colPanel: document.getElementById('colFilterPanel'),
	colList: document.getElementById('colList'),
	colAll: document.getElementById('colSelectAll'),
	colNone: document.getElementById('colSelectNone'),

	btnApply: document.getElementById('applyFilters'),
	btnReset: document.getElementById('resetFilters'),

	kpiOpenRouterCost: document.getElementById('kpiOpenRouterCost'),
	kpiTotalCost: document.getElementById('kpiTotalCost'),
	kpiReq: document.getElementById('kpiRequests'),
	kpiAvg: document.getElementById('kpiAvgCost'),
	kpiWin: document.getElementById('kpiWindow'),

	tableBody: document.querySelector('#costTable tbody'),
	costTable: document.getElementById('costTable'),
	dataEmptyState: document.getElementById('dataEmptyState'),
	emptyStateTitle: document.getElementById('emptyStateTitle'),
	emptyStateDetail: document.getElementById('emptyStateDetail'),
	chartEmptyStates: document.querySelectorAll('.chart-empty'),
	barCanvas: document.getElementById('barCostByModel'),
	lineCanvas: document.getElementById('lineCostOverTime'),
	tableTooltip: document.getElementById('tableTooltip')
};
