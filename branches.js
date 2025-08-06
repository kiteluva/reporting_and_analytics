// branches.js
// This file contains logic specific to branches.html, focusing on plotting branch-related data and reports.

import { populateAxisSelects, drawChart, renderSavedChartsTable, loadSavedChart } from './charting.js';
import { showMessageBox, showPromptBox } from './ui-components.js';
import { parsedData, headers, saveSavedChart, loadSavedCharts, deleteSavedChartById } from './data-handlers.js'; // Import global data and save/load/delete functions
import { dataReadyPromise } from './main.js'; // Import dataReadyPromise

// --- IMPORTANT: Define your deployed backend proxy server URL here ---
const PROXY_SERVER_URL = 'https://csv-xls-data-analyzer.onrender.com';

// --- DOM Elements specific to branches.html ---
const xAxisFilterInput = document.getElementById('xAxisFilterInput'); // Example: for branch filtering

// Elements related to displaying data status and plotting controls
const fileNameDisplay = document.getElementById('fileNameDisplay'); // Assuming this ID for data status on this page
const plottingControlsSection = document.getElementById('plottingControlsSection'); // Assuming a wrapper for plotting controls
const plotGraphBtn = document.getElementById('plotGraphBtn'); // The main plot button for this page

// Selects for plotting
const xAxisSelect = document.getElementById('xAxisSelect');
const yAxisSelect = document.getElementById('yAxisSelect');
const chartTypeSelect = document.getElementById('chartTypeSelect');
const yAxisAggregationSelect = document.getElementById('yAxisAggregationSelect');
const myChartCanvas = document.getElementById('myChartCanvas'); // Assuming a canvas for plotting on this page

// Saved plots related elements
const saveGraphBtn = document.getElementById('saveGraphBtn');
const exportGraphBtn = document.getElementById('exportGraphBtn');
const mostRecentGraphSection = document.getElementById('mostRecentGraphSection');
const recentGraphDescription = document.getElementById('recentGraphDescription');
const recentSavedChartCanvas = document.getElementById('recentSavedChartCanvas');
const savedGraphsSection = document.getElementById('savedGraphsSection');
const savedGraphsTableBody = document.getElementById('savedGraphsTableBody');
const clearAllSavedGraphsBtn = document.getElementById('clearAllSavedGraphsBtn');
const viewedSavedGraphSection = document.getElementById('viewedSavedGraphSection');
const viewedGraphDescription = document.getElementById('viewedSavedChartCanvas');


// --- New DOM Elements for Reports Division ---
const reportsDivision = document.getElementById('reportsDivision');
const first10BranchesReportSection = document.getElementById('first10BranchesReportSection');
const first10BranchesTableBody = document.getElementById('first10BranchesTableBody');

const searchBranchReportSection = document.getElementById('searchBranchReportSection');
const branchSelect = document.getElementById('branchSelect');
const viewBranchReportBtn = document.getElementById('viewBranchReportBtn');
const exportBranchReportBtn = document.getElementById('exportBranchReportBtn');

const individualBranchReportDisplay = document.getElementById('individualBranchReportDisplay');
const individualBranchReportTitle = document.getElementById('individualBranchReportTitle');
const reportPeriod = document.getElementById('reportPeriod'); // New element for report period
const reportTotalCustomers = document.getElementById('reportTotalCustomers');
const reportSimCardsIssued = document.getElementById('reportSimCardsIssued');
const reportAppsIssued = document.getElementById('reportAppsIssued');
const reportSimCardsToppedUp = document.getElementById('reportSimCardsToppedUp');
const reportMBankingActivated = document.getElementById('reportMBankingActivated');
const reportAppTransactions = document.getElementById('reportAppTransactions');
const reportSimAppPerformance = document.getElementById('reportSimAppPerformance');
const reportTopUpMBankingPerformance = document.getElementById('reportTopUpMBankingPerformance');
const reportAppTransactionPerformance = document.getElementById('reportAppTransactionPerformance');
const reportNumberOfEmployees = document.getElementById('reportNumberOfEmployees'); // New element for employee count

const getAIGeneralPerformanceBtn = document.getElementById('getAIGeneralPerformanceBtn');
const aiGeneralPerformanceText = document.getElementById('aiGeneralPerformanceText');
const aiGeneralPerformanceLoading = document.getElementById('aiGeneralPerformanceLoading');

const getAIEmployeePerformanceBtn = document.getElementById('getAIEmployeePerformanceBtn');
const aiEmployeePerformanceText = document.getElementById('aiEmployeePerformanceText');
const aiEmployeePerformanceLoading = document.getElementById('aiEmployeePerformanceLoading');

// --- Date Filter Elements for Reports ---
const reportStartDateInput = document.getElementById('reportStartDateInput');
const reportEndDateInput = document.getElementById('reportEndDateInput');

// --- Global variable to store aggregated branch data ---
let aggregatedBranchData = {};
let currentBranchReportData = null; // To hold the data of the currently viewed branch report

/**
 * Helper function to find a column name case-insensitively.
 * @param {Array<string>} availableHeaders - The list of headers from the CSV.
 * @param {Array<string>} potentialNames - An array of possible column names (case-insensitive).
 * @returns {string|null} The actual column name if found, otherwise null.
 */
function findColumnNameCaseInsensitive(availableHeaders, potentialNames) {
    const lowerCaseHeaders = availableHeaders.map(h => h.toLowerCase());
    for (const name of potentialNames) {
        const index = lowerCaseHeaders.indexOf(name.toLowerCase());
        if (index !== -1) {
            return availableHeaders[index]; // Return the original case header
        }
    }
    return null;
}

/**
 * Helper function to set the visibility and enabled state of plotting and reports controls.
 * @param {boolean} enable - True to enable and show, false to disable and hide.
 */
function setControlsState(enable) {
    // Plotting controls
    if (plottingControlsSection) {
        if (enable) {
            plottingControlsSection.classList.remove('hidden');
        } else {
            plottingControlsSection.classList.add('hidden');
        }
    }
    const plotControls = [
        xAxisSelect, yAxisSelect, chartTypeSelect, yAxisAggregationSelect,
        plotGraphBtn, xAxisFilterInput, saveGraphBtn, exportGraphBtn
    ];
    plotControls.forEach(control => {
        if (control) {
            control.disabled = !enable;
            if (control === xAxisFilterInput) {
                if (!enable) control.classList.add('hidden');
            }
        }
    });
    if (myChartCanvas) {
        if (enable && parsedData.length > 0) {
            myChartCanvas.classList.remove('hidden');
        } else {
            myChartCanvas.classList.add('hidden');
        }
    }

    // Reports controls
    if (reportsDivision) {
        if (enable) {
            reportsDivision.classList.remove('hidden');
        } else {
            reportsDivision.classList.add('hidden');
        }
    }
    const reportControls = [
        branchSelect, viewBranchReportBtn, exportBranchReportBtn,
        getAIGeneralPerformanceBtn, getAIEmployeePerformanceBtn,
        reportStartDateInput, reportEndDateInput // Include date inputs here
    ];
    reportControls.forEach(control => {
        if (control) {
            control.disabled = !enable;
        }
    });

    if (first10BranchesReportSection) {
        if (enable) first10BranchesReportSection.classList.remove('hidden');
        else first10BranchesReportSection.classList.add('hidden');
    }
    if (searchBranchReportSection) {
        if (enable) searchBranchReportSection.classList.remove('hidden');
        else searchBranchReportSection.classList.add('hidden');
    }
    if (individualBranchReportDisplay) individualBranchReportDisplay.classList.add('hidden'); // Always hidden initially

    // Manage visibility of saved charts sections based on data presence and whether any charts are saved
    if (savedGraphsSection) savedGraphsSection.classList.add('hidden');
    if (mostRecentGraphSection) mostRecentGraphSection.classList.add('hidden');
    if (viewedSavedGraphSection) viewedSavedGraphSection.classList.add('hidden');
}

/**
 * Filters data based on a specified date range and date column.
 * @param {Array<Object>} data - The dataset to filter.
 * @param {string} dateColumn - The name of the column containing date values.
 * @param {string} startDateString - The start date string (e.g., 'YYYY-MM-DD').
 * @param {string} endDateString - The end date string (e.g., 'YYYY-MM-DD').
 * @returns {Array<Object>} The filtered data.
 */
function filterDataByDateRange(data, dateColumn, startDateString, endDateString) {
    if (!dateColumn || !startDateString || !endDateString) {
        return data; // No date filter applied if inputs are missing
    }

    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn("[Branches] Invalid start or end date provided for filtering. Returning unfiltered data.");
        return data;
    }
    // Set end date to end of the day for inclusive filtering
    endDate.setHours(23, 59, 59, 999);

    if (startDate.getTime() > endDate.getTime()) {
        showMessageBox("Start date cannot be after end date. No date filter applied.");
        return data; // Return unfiltered if dates are invalid
    }

    return data.filter(row => {
        const rowDate = new Date(row[dateColumn]);
        return !isNaN(rowDate.getTime()) && rowDate >= startDate && rowDate <= endDate;
    });
}


/**
 * Aggregates data by branch by summing metrics from all rows (assumed to be employee-level data)
 * associated with that branch.
 * Assumes column names like 'Branch ID', 'Branch Name', 'Branch', 'Customers', 'Sim Cards Issued', 'Apps Issued',
 * 'Sim Cards Topped Up', 'M-Banking Activated', 'App Transactions', 'Employee ID', 'Employee Name'.
 * @param {Array<Object>} data - The parsed CSV data.
 * @param {string} dateColumn - The name of the column containing date values for filtering.
 * @param {string} startDateString - The start date string for filtering.
 * @param {string} endDateString - The end date string for filtering.
 * @returns {Object} An object where keys are branch names and values are their aggregated stats.
 */
function aggregateBranchData(data, dateColumn, startDateString, endDateString) {
    let dataToAggregate = data;

    // Apply date filtering if a date column and date range are provided
    if (dateColumn && startDateString && endDateString) {
        dataToAggregate = filterDataByDateRange(data, dateColumn, startDateString, endDateString);
    }

    const branchData = {};

    // Define potential column names for each metric (case-insensitive)
    const branchIdNames = ['Branch ID', 'Branch Name', 'Branch', 'Branch_ID', 'Branch_Name'];
    const customerNames = ['Customers', 'Total Customers', 'Daily Customers', 'Customer Count', 'Total_Customers', 'Daily_Customers', 'Customer_Count'];
    const simCardsIssuedNames = ['Sim Cards Issued', 'Sims Issued', 'SIM Issued', 'SIM_Issued', 'SimCardsIssued', 'Sims_Issued', 'SIM_Cards_Issued', 'SIM_Card_Issued', 'Simcard_Issued', 'Sim Cards']; // Added 'Sim Cards'
    const appsIssuedNames = ['Apps Issued', 'Applications Issued', 'Apps', 'App_Issued', 'AppsIssued', 'Applications_Issued', 'Application_Issued', 'App_s_Issued'];
    const simCardsToppedUpNames = ['Sim Cards Topped Up', 'Sims Topped Up', 'SIM Topped Up', 'SIM_Topped_Up', 'SimCardsToppedUp', 'Sims_Topped_Up', 'SIM_Cards_Topped_Up', 'SIM_Card_Topped_Up', 'Simcard_Topped_Up', 'Sim Cards Topped Up']; // Added 'Sim Cards Topped Up'
    const mBankingActivatedNames = ['M-Banking Activated', 'Mobile Banking Activated', 'MBanking Activated', 'M_Banking_Activated', 'MBankingActivated', 'Mobile_Banking_Activated', 'MobileBankingActivated', 'M-Banking Activated']; // Added 'M-Banking Activated'
    const appTransactionsNames = ['App Transactions', 'App Transacted', 'Application Transactions', 'App_Transactions', 'AppTransactions', 'Application_Transactions', 'App_Transacted', 'Apps Transacted']; // Added 'Apps Transacted'
    const employeeIdNames = ['Employee ID', 'Employee Name', 'Employee(s)', 'Employee', 'Employee_ID', 'Employee_Name'];

    dataToAggregate.forEach(row => {
        // Find the actual branch identifier column name
        const actualBranchCol = findColumnNameCaseInsensitive(headers, branchIdNames);
        let branchName = 'Unknown Branch';
        if (actualBranchCol && row[actualBranchCol]) {
            branchName = String(row[actualBranchCol]).trim();
        } else {
            // console.warn(`[Branches] Could not find a suitable branch identifier column among: ${branchIdNames.join(', ')}. Using 'Unknown Branch'.`);
        }

        if (!branchData[branchName]) {
            branchData[branchName] = {
                totalCustomers: 0,
                simCardsIssued: 0,
                appsIssued: 0,
                simCardsToppedUp: 0,
                mBankingActivated: 0,
                appTransactions: 0,
                uniqueEmployees: new Set() // To store unique employee identifiers
            };
        }

        // Helper to safely get numeric values from potentially varying column names
        const getNumericValue = (row, potentialColNames) => {
            const actualCol = findColumnNameCaseInsensitive(headers, potentialColNames);
            if (actualCol && row[actualCol] !== undefined && row[actualCol] !== null) {
                const value = Number(row[actualCol]);
                if (!isNaN(value)) {
                    // console.log(`[Branches] Found value for ${potentialColNames[0]} using column '${actualCol}': ${value}`);
                    return value;
                } else {
                    // console.warn(`[Branches] Non-numeric value found for column '${actualCol}' (potential: ${potentialColNames.join(', ')}): '${row[actualCol]}'. Treating as 0.`);
                }
            } else {
                // console.log(`[Branches] Column not found or value is undefined/null for potential names: ${potentialColNames.join(', ')}`);
            }
            return 0;
        };

        // Sum numerical values from each row, ensuring they are numbers and handling missing values
        branchData[branchName].totalCustomers += getNumericValue(row, customerNames);
        branchData[branchName].simCardsIssued += getNumericValue(row, simCardsIssuedNames);
        branchData[branchName].appsIssued += getNumericValue(row, appsIssuedNames);
        branchData[branchName].simCardsToppedUp += getNumericValue(row, simCardsToppedUpNames);
        branchData[branchName].mBankingActivated += getNumericValue(row, mBankingActivatedNames);
        branchData[branchName].appTransactions += getNumericValue(row, appTransactionsNames);

        // Collect unique employee identifiers for the branch
        const actualEmployeeIdCol = findColumnNameCaseInsensitive(headers, employeeIdNames);
        let employeeIdentifier = null;
        if (actualEmployeeIdCol && row[actualEmployeeIdCol]) {
            employeeIdentifier = String(row[actualEmployeeIdCol]).trim();
        }

        if (employeeIdentifier && employeeIdentifier !== 'Unknown Employee') {
            branchData[branchName].uniqueEmployees.add(employeeIdentifier);
        }
    });

    // Convert Set of unique employees to a count
    for (const branchName in branchData) {
        branchData[branchName].numberOfEmployees = branchData[branchName].uniqueEmployees.size;
        delete branchData[branchName].uniqueEmployees; // Remove the Set after counting
    }


    // Calculate performance classifications based on aggregated branch metrics
    for (const branchName in branchData) {
        const branch = branchData[branchName];

        // 1. Sim/App Issuance Performance
        // Base the ratio on totalCustomers for the branch
        const simAppIssuanceRatio = branch.totalCustomers > 0 ? (branch.simCardsIssued + branch.appsIssued) / branch.totalCustomers : 0;
        if (simAppIssuanceRatio < 0.1) branch.simAppPerformance = 'Poor';
        else if (simAppIssuanceRatio < 0.25) branch.simAppPerformance = 'Not Good';
        else if (simAppIssuanceRatio <= 0.5) branch.simAppPerformance = 'Good';
        else branch.simAppPerformance = 'Great';
        branch.simAppIssuanceRatio = simAppIssuanceRatio; // Store ratio for display

        // 2. Top-up/M-Banking Activation Performance
        const totalIssuedForTopUp = (branch.simCardsIssued + branch.appsIssued);
        const topUpMBankingRatio = totalIssuedForTopUp > 0 ? (branch.simCardsToppedUp + branch.mBankingActivated) / totalIssuedForTopUp : 0;
        if (topUpMBankingRatio < 0.5) branch.topUpMBankingPerformance = 'Poor';
        else if (topUpMBankingRatio < 0.75) branch.topUpMBankingPerformance = 'Not Good';
        else if (topUpMBankingRatio <= 0.85) branch.topUpMBankingPerformance = 'Good';
        else branch.topUpMBankingPerformance = 'Great';
        branch.topUpMBankingRatio = topUpMBankingRatio; // Store ratio for display

        // 3. App Transaction Performance
        const appTransactionRatio = branch.appsIssued > 0 ? branch.appTransactions / branch.appsIssued : 0;
        if (appTransactionRatio < 0.5) branch.appTransactionPerformance = 'Poor';
        else if (appTransactionRatio < 0.75) branch.appTransactionPerformance = 'Not Good';
        else if (appTransactionRatio <= 0.85) branch.appTransactionPerformance = 'Good';
        else branch.appTransactionPerformance = 'Great';
        branch.appTransactionRatio = appTransactionRatio; // Store ratio for display
    }

    return branchData;
}


/**
 * Renders the table for the first 10 branches in the reports division.
 * @param {Object} branchesData - Aggregated data for all branches.
 * @param {string} reportPeriodString - The string describing the report period.
 */
function renderFirst10BranchesTable(branchesData, reportPeriodString) {
    if (!first10BranchesTableBody) return;

    first10BranchesTableBody.innerHTML = ''; // Clear existing rows

    const branchNames = Object.keys(branchesData).sort(); // Sort alphabetically for consistent display
    const branchesToDisplay = branchNames.slice(0, 10); // Get first 10 branches

    // Update the section title to include the report period
    const sectionTitleElement = first10BranchesReportSection.querySelector('.section-title');
    if (sectionTitleElement) {
        sectionTitleElement.textContent = `First 10 Branches Overview (${reportPeriodString})`;
    }


    if (branchesToDisplay.length === 0) {
        first10BranchesTableBody.innerHTML = '<tr><td colspan="11" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center italic">No branch data available for overview in the selected period.</td></tr>';
        return;
    }

    // Update table headers to reflect individual employee metrics
    const tableHeadRow = first10BranchesTableBody.previousElementSibling.querySelector('tr');
    if (tableHeadRow) {
        tableHeadRow.innerHTML = `
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Branch ID/Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Employees</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Customers</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Sim Cards Issued</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Apps Issued</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Sim Cards Topped Up</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">M-Banking Activated</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">App Transactions</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Sim/App Performance</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Top-up/M-Banking Performance</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">App Transaction Performance</th>
        `;
    }

    branchesToDisplay.forEach(branchName => {
        const branch = branchesData[branchName];
        const row = first10BranchesTableBody.insertRow();
        row.className = 'hover:bg-blue-50';

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${branchName}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${branch.numberOfEmployees}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${branch.totalCustomers.toFixed(0)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${branch.simCardsIssued.toFixed(0)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${branch.appsIssued.toFixed(0)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${branch.simCardsToppedUp.toFixed(0)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${branch.mBankingActivated.toFixed(0)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${branch.appTransactions.toFixed(0)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold ${getPerformanceColorClass(branch.simAppPerformance)}">${branch.simAppPerformance} (${(branch.simAppIssuanceRatio * 100).toFixed(1)}%)</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold ${getPerformanceColorClass(branch.topUpMBankingPerformance)}">${branch.topUpMBankingPerformance} (${(branch.topUpMBankingRatio * 100).toFixed(1)}%)</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold ${getPerformanceColorClass(branch.appTransactionPerformance)}">${branch.appTransactionPerformance} (${(branch.appTransactionRatio * 100).toFixed(1)}%)</td>
        `;
    });
}

/**
 * Helper to get Tailwind CSS class for performance coloring.
 * @param {string} performance - The performance string (e.g., 'Good', 'Poor').
 * @returns {string} Tailwind CSS class.
 */
function getPerformanceColorClass(performance) {
    switch (performance) {
        case 'Great': return 'text-green-600';
        case 'Good': return 'text-blue-600';
        case 'Not Good': return 'text-yellow-600';
        case 'Poor': return 'text-red-600';
        default: return 'text-gray-600';
    }
}


/**
 * Populates the branch select dropdown for individual report search.
 * @param {Object} branchesData - Aggregated data for all branches.
 */
function populateBranchSelect(branchesData) {
    if (!branchSelect) return;

    branchSelect.innerHTML = '<option value="">Select a Branch</option>';
    const branchNames = Object.keys(branchesData).sort();

    if (branchNames.length === 0) {
        branchSelect.disabled = true;
        viewBranchReportBtn.disabled = true;
        return;
    }

    branchNames.forEach(branchName => {
        const option = document.createElement('option');
        option.value = branchName;
        option.textContent = branchName;
        branchSelect.appendChild(option);
    });

    branchSelect.disabled = false;
    viewBranchReportBtn.disabled = false;
}


/**
 * Handles viewing an individual branch report.
 */
async function handleViewBranchReport() {
    const selectedBranchName = branchSelect.value;
    if (!selectedBranchName) {
        showMessageBox("Please select a branch to view its report.");
        return;
    }

    // Re-aggregate data based on current date selection before displaying a single branch report
    const dateColumn = findColumnNameCaseInsensitive(headers, ['Date', 'TransactionDate', 'ActivityDate', 'Period']);
    if (!dateColumn) {
        showMessageBox("No suitable date column found in your data to filter the report. Please ensure your CSV has a 'Date' or similar column.");
        return;
    }

    const startDate = reportStartDateInput.value;
    const endDate = reportEndDateInput.value;

    if (!startDate || !endDate) {
        showMessageBox("Please select a start and end date for the report period.");
        return;
    }

    // Aggregate data for the selected period
    aggregatedBranchData = aggregateBranchData(parsedData, dateColumn, startDate, endDate);
    currentBranchReportData = aggregatedBranchData[selectedBranchName];

    if (!currentBranchReportData) {
        showMessageBox(`Report for branch "${selectedBranchName}" not found for the selected period. It might not have data in this range.`);
        // Hide the report display if no data is found for the selected branch and period
        individualBranchReportDisplay.classList.add('hidden');
        exportBranchReportBtn.classList.add('hidden');
        getAIGeneralPerformanceBtn.classList.add('hidden');
        getAIEmployeePerformanceBtn.classList.add('hidden');
        return;
    }

    // Populate the display elements
    individualBranchReportTitle.textContent = `Report for ${selectedBranchName}`;
    reportPeriod.textContent = `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`; // Display the selected period
    reportNumberOfEmployees.textContent = currentBranchReportData.numberOfEmployees; // Display employee count
    reportTotalCustomers.textContent = currentBranchReportData.totalCustomers.toFixed(0);
    reportSimCardsIssued.textContent = currentBranchReportData.simCardsIssued.toFixed(0);
    reportAppsIssued.textContent = currentBranchReportData.appsIssued.toFixed(0);
    reportSimCardsToppedUp.textContent = currentBranchReportData.simCardsToppedUp.toFixed(0);
    reportMBankingActivated.textContent = currentBranchReportData.mBankingActivated.toFixed(0);
    reportAppTransactions.textContent = currentBranchReportData.appTransactions.toFixed(0);

    reportSimAppPerformance.textContent = `${currentBranchReportData.simAppPerformance} (${(currentBranchReportData.simAppIssuanceRatio * 100).toFixed(1)}%)`;
    reportSimAppPerformance.className = `font-semibold ${getPerformanceColorClass(currentBranchReportData.simAppPerformance)}`;

    reportTopUpMBankingPerformance.textContent = `${currentBranchReportData.topUpMBankingPerformance} (${(currentBranchReportData.topUpMBankingRatio * 100).toFixed(1)}%)`;
    reportTopUpMBankingPerformance.className = `font-semibold ${getPerformanceColorClass(currentBranchReportData.topUpMBankingPerformance)}`;

    reportAppTransactionPerformance.textContent = `${currentBranchReportData.appTransactionPerformance} (${(currentBranchReportData.appTransactionRatio * 100).toFixed(1)}%)`;
    reportAppTransactionPerformance.className = `font-semibold ${getPerformanceColorClass(currentBranchReportData.appTransactionPerformance)}`;

    // Reset AI insight texts
    aiGeneralPerformanceText.textContent = 'Click "Get AI Insights" to generate performance summary.';
    aiEmployeePerformanceText.textContent = 'Click "Get AI Insights" to generate employee performance comparison.';

    individualBranchReportDisplay.classList.remove('hidden');
    exportBranchReportBtn.classList.remove('hidden');
    getAIGeneralPerformanceBtn.classList.remove('hidden');
    getAIEmployeePerformanceBtn.classList.remove('hidden');
}


/**
 * Handles exporting the currently viewed branch report.
 */
function handleExportBranchReport() {
    if (!currentBranchReportData) {
        showMessageBox("No branch report is currently displayed to export.");
        return;
    }

    const branchName = branchSelect.value;
    const reportPeriodString = reportPeriod.textContent;
    let reportContent = `Branch Report: ${branchName}\nReport Period: ${reportPeriodString}\n\n`;
    reportContent += `Number of Employees: ${currentBranchReportData.numberOfEmployees}\n`; // Include employee count
    reportContent += `Total Customers: ${currentBranchReportData.totalCustomers.toFixed(0)}\n`;
    reportContent += `Sim Cards Issued: ${currentBranchReportData.simCardsIssued.toFixed(0)}\n`;
    reportContent += `Apps Issued: ${currentBranchReportData.appsIssued.toFixed(0)}\n`;
    reportContent += `Sim Cards Topped Up: ${currentBranchReportData.simCardsToppedUp.toFixed(0)}\n`;
    reportContent += `M-Banking Activated: ${currentBranchReportData.mBankingActivated.toFixed(0)}\n`;
    reportContent += `App Transactions: ${currentBranchReportData.appTransactions.toFixed(0)}\n`;
    reportContent += `Sim/App Issuance Performance: ${currentBranchReportData.simAppPerformance} (${(currentBranchReportData.simAppIssuanceRatio * 100).toFixed(1)}%)\n`;
    reportContent += `Top-up/M-Banking Performance: ${currentBranchReportData.topUpMBankingPerformance} (${(currentBranchReportData.topUpMBankingRatio * 100).toFixed(1)}%)\n`;
    reportContent += `App Transaction Performance: ${currentBranchReportData.appTransactionPerformance} (${(currentBranchReportData.appTransactionRatio * 100).toFixed(1)}%)\n`;

    // Add AI insights if available
    if (aiGeneralPerformanceText.textContent && !aiGeneralPerformanceText.textContent.includes('Click "Get AI Insights"')) {
        reportContent += `\nAI Insights (General Performance):\n${aiGeneralPerformanceText.textContent}\n`;
    }
    if (aiEmployeePerformanceText.textContent && !aiEmployeePerformanceText.textContent.includes('Click "Get AI Insights"')) {
        reportContent += `\nAI Insights (Employee Performance Comparison):\n${aiEmployeePerformanceText.textContent}\n`;
    }


    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.href = url;
    a.download = `${branchName}_Report.txt`;
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // Clean up
    showMessageBox('Branch report exported as text file!', false);
}


/**
 * Gets AI interpretation for general branch performance.
 */
async function getAIGeneralPerformance() {
    if (!currentBranchReportData) {
        showMessageBox("Please view a branch report first to get AI insights.");
        return;
    }

    aiGeneralPerformanceText.textContent = '';
    aiGeneralPerformanceLoading.classList.remove('hidden');

    const branchName = branchSelect.value;
    const reportPeriodString = reportPeriod.textContent;
    const prompt = `Given the following performance data for branch "${branchName}" for the period ${reportPeriodString}:
    Number of Employees: ${currentBranchReportData.numberOfEmployees}
    Total Customers: ${currentBranchReportData.totalCustomers}
    Sim Cards Issued: ${currentBranchReportData.simCardsIssued}
    Apps Issued: ${currentBranchReportData.appsIssued}
    Sim Cards Topped Up: ${currentBranchReportData.simCardsToppedUp}
    M-Banking Activated: ${currentBranchReportData.mBankingActivated}
    App Transactions: ${currentBranchReportData.appTransactions}
    Sim/App Issuance Performance: ${currentBranchReportData.simAppPerformance} (${(currentBranchReportData.simAppIssuanceRatio * 100).toFixed(1)}%)
    Top-up/M-Banking Performance: ${currentBranchReportData.topUpMBankingPerformance} (${(currentBranchReportData.topUpMBankingRatio * 100).toFixed(1)}%)
    App Transaction Performance: ${currentBranchReportData.appTransactionPerformance} (${(currentBranchReportData.appTransactionRatio * 100).toFixed(1)}%)

    Provide a concise summary of this branch's general performance, highlighting its strengths, weaknesses, and overall standing based on the provided metrics and performance classifications.`;

    try {
        let chatHistory = [];
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });
        const payload = { contents: chatHistory };

        const response = await fetch(`${PROXY_SERVER_URL}/api/gemini-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            aiGeneralPerformanceText.textContent = result.candidates[0].content.parts[0].text;
        } else {
            aiGeneralPerformanceText.textContent = 'Could not retrieve AI insights. Please try again.';
            console.error("Unexpected AI response structure:", result);
        }
    } catch (error) {
        console.error("Error fetching AI general performance insights:", error);
        aiGeneralPerformanceText.textContent = `Error: ${error.message}`;
        showMessageBox("Failed to get AI insights. Please check your network connection or try again.");
    } finally {
        aiGeneralPerformanceLoading.classList.add('hidden');
    }
}


/**
 * Gets AI interpretation for employee performance comparison within the selected branch.
 */
async function getAIEmployeePerformance() {
    if (!currentBranchReportData) {
        showMessageBox("Please view a branch report first to get AI insights.");
        return;
    }

    aiEmployeePerformanceText.textContent = '';
    aiEmployeePerformanceLoading.classList.remove('hidden');

    const branchName = branchSelect.value;
    const reportPeriodString = reportPeriod.textContent;
    const prompt = `Given the aggregated performance data for branch "${branchName}" for the period ${reportPeriodString} (
    Number of Employees: ${currentBranchReportData.numberOfEmployees},
    Sim Cards Issued by Employees: ${currentBranchReportData.simCardsIssued},
    Apps Issued by Employees: ${currentBranchReportData.appsIssued},
    Sim Cards Topped Up by Employees: ${currentBranchReportData.simCardsToppedUp},
    M-Banking Activated by Employees: ${currentBranchReportData.mBankingActivated},
    App Transactions by Employees: ${currentBranchReportData.appTransactions},
    Sim/App Issuance Performance: ${currentBranchReportData.simAppPerformance} (${(currentBranchReportData.simAppIssuanceRatio * 100).toFixed(1)}%),
    Top-up/M-Banking Performance: ${currentBranchReportData.topUpMBankingPerformance} (${(currentBranchReportData.topUpMBankingRatio * 100).toFixed(1)}%),
    App Transaction Performance: ${currentBranchReportData.appTransactionPerformance} (${(currentBranchReportData.appTransactionRatio * 100).toFixed(1)}%)
    ), provide insights on how the collective performance of employees in this branch impacts the overall branch metrics. Suggest potential areas for improvement or recognition for this employee group based on common scenarios in branch performance.`;


    try {
        let chatHistory = [];
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });
        const payload = { contents: chatHistory };

        const response = await fetch(`${PROXY_SERVER_URL}/ai-insights`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            aiEmployeePerformanceText.textContent = result.candidates[0].content.parts[0].text;
        } else {
            aiEmployeePerformanceText.textContent = 'Could not retrieve AI insights. Please try again.';
            console.error("Unexpected AI response structure:", result);
        }
    } catch (error) {
        console.error("Error fetching AI employee performance insights:", error);
        aiEmployeePerformanceText.textContent = `Error: ${error.message}`;
        showMessageBox("Failed to get AI insights. Please check your network connection or try again.");
    } finally {
        aiEmployeePerformanceLoading.classList.add('hidden');
    }
}


/**
 * Initializes the UI and event listeners for the branches page.
 * This runs after main.js's DOMContentLoaded.
 */
async function initializeBranchesPage() {
    console.log("[Branches.js] Initializing branches page UI and listeners.");

    // Await the dataReadyPromise to ensure parsedData and headers are loaded from IndexedDB
    await dataReadyPromise;

    if (parsedData.length > 0 && headers.length > 0) {
        // Data is loaded and available!
        if (fileNameDisplay) {
            const loadedFileName = localStorage.getItem('csvPlotterFileName') || 'Unnamed File';
            fileNameDisplay.textContent = `Data loaded: ${loadedFileName} (${parsedData.length} rows)`;
            fileNameDisplay.classList.remove('text-red-500'); // Remove error styling if present
            fileNameDisplay.classList.add('text-green-700'); // Add success styling
        }

        setControlsState(true); // Enable and show plotting and reports controls

        // Populate common axis selects from charting.js
        populateAxisSelects(parsedData, headers);

        // Attempt to pre-select X-axis based on priority: 'Branch ID', 'Branch Name', 'Branch'
        if (xAxisSelect) {
            const branchIdCol = findColumnNameCaseInsensitive(headers, ['Branch ID', 'Branch Name', 'Branch']);
            if (branchIdCol) {
                xAxisSelect.value = branchIdCol;
            }
        }
        // Example: pre-select 'Customers' for Y-axis if that column exists and is numeric
        if (yAxisSelect) {
            const customersCol = findColumnNameCaseInsensitive(headers, ['Customers', 'Total Customers', 'Daily Customers']);
            if (customersCol && parsedData.some(row => typeof row[customersCol] === 'number')) {
                yAxisSelect.value = customersCol;
            }
        }

        // Populate the xAxisFilterInput with unique values of the currently selected X-axis column
        if (xAxisFilterInput && xAxisSelect.value) {
            const uniqueValues = [...new Set(parsedData.map(row => String(row[xAxisSelect.value]).trim()))]
                                .filter(val => val !== '').sort();
            xAxisFilterInput.value = uniqueValues.join(', ');
            xAxisFilterInput.classList.remove('hidden'); // Ensure it's visible if data is loaded
        } else if (xAxisFilterInput) {
            xAxisFilterInput.classList.add('hidden'); // Hide if no data or no relevant column
        }

        // --- Branches-specific Event Listeners for Plotting ---
        if (plotGraphBtn) {
            plotGraphBtn.removeEventListener('click', handlePlotGraph); // Prevent duplicate listeners
            plotGraphBtn.addEventListener('click', handlePlotGraph);
        }

        // --- Reports Division Initialization ---
        // Find a suitable date column for the reports
        const reportDateColumn = findColumnNameCaseInsensitive(headers, ['Date', 'TransactionDate', 'ActivityDate', 'Period']);
        if (reportDateColumn) {
            const dateValues = parsedData
                .map(row => new Date(row[reportDateColumn]))
                .filter(date => !isNaN(date.getTime()));

            if (dateValues.length > 0) {
                const minDate = new Date(Math.min(...dateValues)).toISOString().split('T')[0];
                const maxDate = new Date(Math.max(...dateValues)).toISOString().split('T')[0];
                reportStartDateInput.value = minDate;
                reportEndDateInput.value = maxDate;
            }
        } else {
            showMessageBox("No suitable date column found for reports. Date filtering will not be available.");
            if (reportStartDateInput) reportStartDateInput.disabled = true;
            if (reportEndDateInput) reportEndDateInput.disabled = true;
        }

        // Initial aggregation based on default/initial date range
        aggregatedBranchData = aggregateBranchData(parsedData, reportDateColumn, reportStartDateInput.value, reportEndDateInput.value);
        renderFirst10BranchesTable(aggregatedBranchData, `${new Date(reportStartDateInput.value).toLocaleDateString()} - ${new Date(reportEndDateInput.value).toLocaleDateString()}`);
        populateBranchSelect(aggregatedBranchData);

        // Add event listeners for date range inputs to re-render reports
        if (reportStartDateInput) {
            reportStartDateInput.removeEventListener('change', handleReportDateChange);
            reportStartDateInput.addEventListener('change', handleReportDateChange);
        }
        if (reportEndDateInput) {
            reportEndDateInput.removeEventListener('change', handleReportDateChange);
            reportEndDateInput.addEventListener('change', handleReportDateChange);
        }


        if (branchSelect) {
            branchSelect.removeEventListener('change', () => {
                individualBranchReportDisplay.classList.add('hidden'); // Hide previous report on new selection
                exportBranchReportBtn.classList.add('hidden');
                getAIGeneralPerformanceBtn.classList.add('hidden');
                getAIEmployeePerformanceBtn.classList.add('hidden');
            });
            branchSelect.addEventListener('change', () => {
                individualBranchReportDisplay.classList.add('hidden'); // Hide previous report on new selection
                exportBranchReportBtn.classList.add('hidden');
                getAIGeneralPerformanceBtn.classList.add('hidden');
                getAIEmployeePerformanceBtn.classList.add('hidden');
            });
        }

        if (viewBranchReportBtn) {
            viewBranchReportBtn.removeEventListener('click', handleViewBranchReport);
            viewBranchReportBtn.addEventListener('click', handleViewBranchReport);
        }
        if (exportBranchReportBtn) {
            exportBranchReportBtn.removeEventListener('click', handleExportBranchReport);
            exportBranchReportBtn.addEventListener('click', handleExportBranchReport);
        }
        if (getAIGeneralPerformanceBtn) {
            getAIGeneralPerformanceBtn.removeEventListener('click', getAIGeneralPerformance);
            getAIGeneralPerformanceBtn.addEventListener('click', getAIGeneralPerformance);
        }
        if (getAIEmployeePerformanceBtn) {
            getAIEmployeePerformanceBtn.removeEventListener('click', getAIEmployeePerformance);
            getAIEmployeePerformanceBtn.addEventListener('click', getAIEmployeePerformance);
        }

        // Saved Graphs Listeners and rendering
        if (saveGraphBtn) {
            saveGraphBtn.removeEventListener('click', handleSaveGraph);
            saveGraphBtn.addEventListener('click', handleSaveGraph);
        }
        if (exportGraphBtn) {
            exportGraphBtn.removeEventListener('click', handleExportGraph);
            exportGraphBtn.addEventListener('click', handleExportGraph);
        }
        if (clearAllSavedGraphsBtn) {
            clearAllSavedGraphsBtn.removeEventListener('click', handleClearAllSavedGraphs);
            clearAllSavedGraphsBtn.addEventListener('click', handleClearAllSavedGraphs);
        }

        // Initial render of saved charts table on page load
        if (savedGraphsTableBody) {
             await renderSavedChartsTable(savedGraphsTableBody, loadSavedChart, deleteSavedChartById);
             // After rendering, check if there are any saved charts to show the section
             const savedCharts = await loadSavedCharts();
             if (savedCharts.length > 0) {
                 savedGraphsSection.classList.remove('hidden');
                 // Load and display the most recent saved chart if it exists
                 const mostRecentChart = savedCharts.sort((a, b) => new Date(b.dateSaved) - new Date(a.dateSaved))[0];
                 if (mostRecentChart && mostRecentGraphSection && recentSavedChartCanvas) {
                     mostRecentGraphSection.classList.remove('hidden');
                     recentGraphDescription.textContent = `Description: ${mostRecentChart.description || 'N/A'} (Saved: ${new Date(mostRecentChart.dateSaved).toLocaleString()})`;
                     drawChart(mostRecentChart.chartConfig.chartConfig, parsedData, mostRecentChart.chartConfig.chartType, recentSavedChartCanvas);
                 }
             } else {
                 savedGraphsSection.classList.add('hidden');
             }
        }


    } else {
        // No data loaded. Display appropriate message and disable controls.
        if (fileNameDisplay) {
            fileNameDisplay.textContent = 'No file selected. Please upload a CSV on the Home page.';
            fileNameDisplay.classList.remove('text-green-700');
            fileNameDisplay.classList.add('text-red-500');
        }
        showMessageBox("No data loaded. Please upload a CSV file on the Home page first to perform analysis.");
        setControlsState(false); // Disable and hide all controls
        // Also clear any existing chart instances specific to this page
        if (myChartCanvas && myChartCanvas.chartInstance) {
            myChartCanvas.chartInstance.destroy();
            myChartCanvas.chartInstance = null;
        }
        if (recentSavedChartCanvas && recentSavedChartCanvas.chartInstance) {
            recentSavedChartCanvas.chartInstance.destroy();
            recentSavedChartCanvas.chartInstance = null;
        }
        if (viewedSavedChartCanvas && viewedSavedChartCanvas.chartInstance) {
            viewedSavedChartCanvas.chartInstance.destroy();
            viewedSavedChartCanvas.chartInstance = null;
        }
    }
}

/**
 * Handles the plotting of the graph for the branches page.
 */
function handlePlotGraph() {
    if (parsedData.length === 0) {
        showMessageBox("No data available to plot. Please upload a CSV file on the Home tab.");
        return;
    }

    const xAxisCol = xAxisSelect.value;
    const yAxisCol = yAxisSelect.value;
    const chartType = chartTypeSelect.value;
    const yAxisAggregation = yAxisAggregationSelect.value;

    if (!xAxisCol || !yAxisCol) {
        showMessageBox("Please select both X and Y axis columns for plotting.");
        return;
    }

    // Apply filtering based on xAxisFilterInput
    let filteredData = [...parsedData];
    if (xAxisFilterInput && xAxisFilterInput.value && xAxisSelect.value) {
        const selectedXValues = xAxisFilterInput.value.split(',').map(s => s.trim()).filter(s => s !== '');
        if (selectedXValues.length > 0) {
            filteredData = filteredData.filter(row => selectedXValues.includes(String(row[xAxisSelect.value])));
        }
    }

    if (filteredData.length === 0) {
        showMessageBox("No data matches the selected filters. Please adjust your selections.");
        // Clear the canvas if no data matches
        if (myChartCanvas.chartInstance) {
            myChartCanvas.chartInstance.destroy();
            myChartCanvas.chartInstance = null;
        }
        return;
    }

    const currentChartConfig = { xAxisCol, yAxisCol, chartType, yAxisAggregation, page: 'branches' }; // Added page tag
    drawChart(currentChartConfig, filteredData, chartType, myChartCanvas);
}

/**
 * Handles saving the currently plotted graph.
 */
async function handleSaveGraph() {
    if (!myChartCanvas || !myChartCanvas.chartInstance || !myChartCanvas.chartConfig) {
        showMessageBox("No chart is currently plotted to save.");
        return;
    }

    let description = await showPromptBox("Enter a description for your chart (optional):");
    if (description === null) { // User clicked Cancel
        return;
    }
    if (description.trim() === "") {
        description = "Untitled Branch Chart";
    }

    try {
        const chartId = await saveSavedChart({
            chartConfig: { ...myChartCanvas.chartConfig, page: 'branches' }, // Ensure page tag is saved
            description: description,
            dateSaved: new Date().toISOString()
        });

        showMessageBox(`Chart "${description}" saved successfully!`);
        console.log("Chart saved with ID:", chartId);

        // Re-render the saved charts table and update visibility
        if (savedGraphsTableBody) {
            await renderSavedChartsTable(savedGraphsTableBody, loadSavedChart, deleteSavedChartById);
            savedGraphsSection.classList.remove('hidden'); // Ensure section is visible
        }
    } catch (error) {
        console.error("Error saving chart:", error);
        showMessageBox(`Error saving chart: ${error.message}`);
    }
}

/**
 * Handles exporting the currently plotted graph as an image.
 */
function handleExportGraph() {
    if (!myChartCanvas || !myChartCanvas.chartInstance) {
        showMessageBox("No chart is currently plotted to export.");
        return;
    }

    const a = document.createElement('a');
    document.body.appendChild(a);
    a.href = myChartCanvas.chartInstance.toBase64Image('image/png', 1);
    a.download = 'branch_chart.png';
    a.click();
    document.body.removeChild(a);
    showMessageBox('Chart exported as PNG!', false);
}

/**
 * Handles clearing all saved graphs for this page.
 */
async function handleClearAllSavedGraphs() {
    const confirmClear = await showPromptBox("Are you sure you want to clear ALL saved graphs on this page? This action cannot be undone.");
    if (confirmClear) {
        try {
            const savedCharts = await loadSavedCharts();
            // Filter for charts specifically tagged for 'branches' page
            const pageSpecificCharts = savedCharts.filter(chart => chart.chartConfig && chart.chartConfig.page === 'branches');
            for (const chart of pageSpecificCharts) {
                await deleteSavedChartById(chart.id);
            }
            // Re-render the saved charts table (which will now be empty)
            await renderSavedChartsTable(savedGraphsTableBody, loadSavedChart, deleteSavedChartById);
            const remainingCharts = await loadSavedCharts(); // Check if any charts remain (from other pages)
            if (remainingCharts.length === 0) {
                savedGraphsSection.classList.add('hidden'); // Hide if no charts left at all
            }
            showMessageBox("All saved graphs on this page have been cleared!");
        } catch (error) {
            console.error("Error clearing saved graphs:", error);
            showMessageBox(`Error clearing saved graphs: ${error.message}`);
        }
    } else {
        showMessageBox("Clear saved graphs operation cancelled.");
    }
}

/**
 * Handles changes in the report date range inputs.
 * Re-aggregates data and re-renders the first 10 branches table and clears the individual report.
 */
async function handleReportDateChange() {
    if (parsedData.length === 0 || headers.length === 0) {
        showMessageBox("No data loaded to filter. Please upload a CSV file on the Home page.");
        return;
    }

    const dateColumn = findColumnNameCaseInsensitive(headers, ['Date', 'TransactionDate', 'ActivityDate', 'Period']);
    if (!dateColumn) {
        showMessageBox("No suitable date column found in your data to filter the report. Please ensure your CSV has a 'Date' or similar column.");
        return;
    }

    const startDate = reportStartDateInput.value;
    const endDate = reportEndDateInput.value;

    if (!startDate || !endDate) {
        // If dates are cleared, re-aggregate with all data
        aggregatedBranchData = aggregateBranchData(parsedData, null, null, null);
        renderFirst10BranchesTable(aggregatedBranchData, "All Time");
        populateBranchSelect(aggregatedBranchData);
        // Hide individual report if dates are cleared
        individualBranchReportDisplay.classList.add('hidden');
        exportBranchReportBtn.classList.add('hidden');
        getAIGeneralPerformanceBtn.classList.add('hidden');
        getAIEmployeePerformanceBtn.classList.add('hidden');
        return;
    }

    // Validate dates
    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    if (isNaN(sDate.getTime()) || isNaN(eDate.getTime()) || sDate.getTime() > eDate.getTime()) {
        showMessageBox("Invalid date range. Please select a valid start and end date.");
        return;
    }

    // Re-aggregate data based on the new date range
    aggregatedBranchData = aggregateBranchData(parsedData, dateColumn, startDate, endDate);
    renderFirst10BranchesTable(aggregatedBranchData, `${sDate.toLocaleDateString()} - ${eDate.toLocaleDateString()}`);
    populateBranchSelect(aggregatedBranchData);

    // If an individual report was being viewed, hide it as the underlying data has changed
    individualBranchReportDisplay.classList.add('hidden');
    exportBranchReportBtn.classList.add('hidden');
    getAIGeneralPerformanceBtn.classList.add('hidden');
    getAIEmployeePerformanceBtn.classList.add('hidden');
}


// Attach the initialization function to the DOMContentLoaded event
window.addEventListener('DOMContentLoaded', initializeBranchesPage);
