// employees.js
// This file contains logic specific to employees.html, focusing on plotting employee-related data and reports.

import { populateAxisSelects, drawChart, renderSavedChartsTable, loadSavedChart } from './charting.js';
import { showMessageBox, showPromptBox } from './ui-components.js';
import { parsedData, headers, saveSavedChart, loadSavedCharts, deleteSavedChartById } from './data-handlers.js'; // Import global data and save/load/delete functions
import { dataReadyPromise } from './main.js'; // Import dataReadyPromise

// --- IMPORTANT: Define your deployed backend proxy server URL here ---
const PROXY_SERVER_URL = 'https://reporting0and0analytics.vercel.app';

// --- DOM Elements specific to employees.html ---
const xAxisFilterInput = document.getElementById('xAxisFilterInput'); // Example: for employee filtering

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
const first10EmployeesReportSection = document.getElementById('first10EmployeesReportSection');
const first10EmployeesTableBody = document.getElementById('first10EmployeesTableBody');

const searchEmployeeReportSection = document.getElementById('searchEmployeeReportSection');
const employeeSelect = document.getElementById('employeeSelect');
const viewEmployeeReportBtn = document.getElementById('viewEmployeeReportBtn');
const exportEmployeeReportBtn = document.getElementById('exportEmployeeReportBtn');

const individualEmployeeReportDisplay = document.getElementById('individualEmployeeReportDisplay');
const individualEmployeeReportTitle = document.getElementById('individualEmployeeReportTitle');
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

const getAIGeneralPerformanceBtn = document.getElementById('getAIGeneralPerformanceBtn');
const aiGeneralPerformanceText = document.getElementById('aiGeneralPerformanceText');
const aiGeneralPerformanceLoading = document.getElementById('aiGeneralPerformanceLoading');

const getAIEmployeePerformanceBtn = document.getElementById('getAIEmployeePerformanceBtn');
const aiEmployeePerformanceText = document.getElementById('aiEmployeePerformanceText');
const aiEmployeePerformanceLoading = document.getElementById('aiEmployeePerformanceLoading');

// --- Date Filter Elements for Reports ---
const reportStartDateInput = document.getElementById('reportStartDateInput');
const reportEndDateInput = document.getElementById('reportEndDateInput');

// --- Global variable to store aggregated employee data ---
let aggregatedEmployeeData = {};
let currentEmployeeReportData = null; // To hold the data of the currently viewed employee report

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
        employeeSelect, viewEmployeeReportBtn, exportEmployeeReportBtn,
        getAIGeneralPerformanceBtn, getAIEmployeePerformanceBtn,
        reportStartDateInput, reportEndDateInput // Include date inputs here
    ];
    reportControls.forEach(control => {
        if (control) {
            control.disabled = !enable;
        }
    });

    if (first10EmployeesReportSection) {
        if (enable) first10EmployeesReportSection.classList.remove('hidden');
        else first10EmployeesReportSection.classList.add('hidden');
    }
    if (searchEmployeeReportSection) {
        if (enable) searchEmployeeReportSection.classList.remove('hidden');
        else searchEmployeeReportSection.classList.add('hidden');
    }
    if (individualEmployeeReportDisplay) individualEmployeeReportDisplay.classList.add('hidden'); // Always hidden initially

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
        console.warn("[Employees] Invalid start or end date provided for filtering. Returning unfiltered data.");
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
 * Aggregates data by employee by summing metrics from all rows (assumed to be individual transactions)
 * associated with that employee.
 * Assumes column names like 'Employee ID', 'Employee Name', 'Customers', 'Sim Cards Issued', 'Apps Issued',
 * 'Sim Cards Topped Up', 'M-Banking Activated', 'App Transactions'.
 * @param {Array<Object>} data - The parsed CSV data.
 * @param {string} dateColumn - The name of the column containing date values for filtering.
 * @param {string} startDateString - The start date string for filtering.
 * @param {string} endDateString - The end date string for filtering.
 * @returns {Object} An object where keys are employee names/IDs and values are their aggregated stats.
 */
function aggregateEmployeeData(data, dateColumn, startDateString, endDateString) {
    let dataToAggregate = data;

    // Apply date filtering if a date column and date range are provided
    if (dateColumn && startDateString && endDateString) {
        dataToAggregate = filterDataByDateRange(data, dateColumn, startDateString, endDateString);
    }

    const employeeData = {};

    // Define potential column names for each metric (case-insensitive)
    const employeeIdNames = ['Employee ID', 'Employee Name', 'Employee(s)', 'Employee', 'Employee_ID', 'Employee_Name'];
    const customerNames = ['Customers', 'Total Customers', 'Daily Customers', 'Customer Count', 'Total_Customers', 'Daily_Customers', 'Customer_Count'];
    const simCardsIssuedNames = ['Sim Cards Issued', 'Sims Issued', 'SIM Issued', 'SIM_Issued', 'SimCardsIssued', 'Sims_Issued', 'SIM_Cards_Issued', 'SIM_Card_Issued', 'Simcard_Issued', 'Sim Cards']; // Added 'Sim Cards'
    const appsIssuedNames = ['Apps Issued', 'Applications Issued', 'Apps', 'App_Issued', 'AppsIssued', 'Applications_Issued', 'Application_Issued', 'App_s_Issued'];
    const simCardsToppedUpNames = ['Sim Cards Topped Up', 'Sims Topped Up', 'SIM Topped Up', 'SIM_Topped_Up', 'SimCardsToppedUp', 'Sims_Topped_Up', 'SIM_Cards_Topped_Up', 'SIM_Card_Topped_Up', 'Simcard_Topped_Up', 'Sim Cards Topped Up']; // Added 'Sim Cards Topped Up'
    const mBankingActivatedNames = ['M-Banking Activated', 'Mobile Banking Activated', 'MBanking Activated', 'M_Banking_Activated', 'MBankingActivated', 'Mobile_Banking_Activated', 'MobileBankingActivated', 'M-Banking Activated']; // Added 'M-Banking Activated'
    const appTransactionsNames = ['App Transactions', 'App Transacted', 'Application Transactions', 'App_Transactions', 'AppTransactions', 'Application_Transactions', 'App_Transacted', 'Apps Transacted']; // Added 'Apps Transacted'

    dataToAggregate.forEach(row => {
        // Find the actual employee identifier column name
        const actualEmployeeCol = findColumnNameCaseInsensitive(headers, employeeIdNames);
        let employeeIdentifier = 'Unknown Employee';
        if (actualEmployeeCol && row[actualEmployeeCol]) {
            employeeIdentifier = String(row[actualEmployeeCol]).trim();
        } else {
            // console.warn(`[Employees] Could not find a suitable employee identifier column among: ${employeeIdNames.join(', ')}. Using 'Unknown Employee'.`);
        }

        if (!employeeData[employeeIdentifier]) {
            employeeData[employeeIdentifier] = {
                totalCustomers: 0,
                simCardsIssued: 0,
                appsIssued: 0,
                simCardsToppedUp: 0,
                mBankingActivated: 0,
                appTransactions: 0
            };
        }

        // Helper to safely get numeric values from potentially varying column names
        const getNumericValue = (row, potentialColNames) => {
            const actualCol = findColumnNameCaseInsensitive(headers, potentialColNames);
            if (actualCol && row[actualCol] !== undefined && row[actualCol] !== null) {
                const value = Number(row[actualCol]);
                if (!isNaN(value)) {
                    // console.log(`[Employees] Found value for ${potentialColNames[0]} using column '${actualCol}': ${value}`);
                    return value;
                } else {
                    // console.warn(`[Employees] Non-numeric value found for column '${actualCol}' (potential: ${potentialColNames.join(', ')}): '${row[actualCol]}'. Treating as 0.`);
                }
            } else {
                // console.log(`[Employees] Column not found or value is undefined/null for potential names: ${potentialColNames.join(', ')}`);
            }
            return 0;
        };

        // Sum numerical values from each row
        employeeData[employeeIdentifier].totalCustomers += getNumericValue(row, customerNames);
        employeeData[employeeIdentifier].simCardsIssued += getNumericValue(row, simCardsIssuedNames);
        employeeData[employeeIdentifier].appsIssued += getNumericValue(row, appsIssuedNames);
        employeeData[employeeIdentifier].simCardsToppedUp += getNumericValue(row, simCardsToppedUpNames);
        employeeData[employeeIdentifier].mBankingActivated += getNumericValue(row, mBankingActivatedNames);
        employeeData[employeeIdentifier].appTransactions += getNumericValue(row, appTransactionsNames);
    });

    // Calculate performance classifications based on aggregated employee metrics
    for (const employeeId in employeeData) {
        const employee = employeeData[employeeId];

        // 1. Sim/App Issuance Performance
        // Base the ratio on totalCustomers for the employee
        const simAppIssuanceRatio = employee.totalCustomers > 0 ? (employee.simCardsIssued + employee.appsIssued) / employee.totalCustomers : 0;
        if (simAppIssuanceRatio < 0.1) employee.simAppPerformance = 'Poor';
        else if (simAppIssuanceRatio < 0.25) employee.simAppPerformance = 'Not Good';
        else if (simAppIssuanceRatio <= 0.5) employee.simAppPerformance = 'Good';
        else employee.simAppPerformance = 'Great';
        employee.simAppIssuanceRatio = simAppIssuanceRatio; // Store ratio for display

        // 2. Top-up/M-Banking Activation Performance
        const totalIssuedForTopUp = (employee.simCardsIssued + employee.appsIssued);
        const topUpMBankingRatio = totalIssuedForTopUp > 0 ? (employee.simCardsToppedUp + employee.mBankingActivated) / totalIssuedForTopUp : 0;
        if (topUpMBankingRatio < 0.5) employee.topUpMBankingPerformance = 'Poor';
        else if (topUpMBankingRatio < 0.75) employee.topUpMBankingPerformance = 'Not Good';
        else if (topUpMBankingRatio <= 0.85) employee.topUpMBankingPerformance = 'Good';
        else employee.topUpMBankingPerformance = 'Great';
        employee.topUpMBankingRatio = topUpMBankingRatio; // Store ratio for display

        // 3. App Transaction Performance
        const appTransactionRatio = employee.appsIssued > 0 ? employee.appTransactions / employee.appsIssued : 0;
        if (appTransactionRatio < 0.5) employee.appTransactionPerformance = 'Poor';
        else if (appTransactionRatio < 0.75) employee.appTransactionPerformance = 'Not Good';
        else if (appTransactionRatio <= 0.85) employee.appTransactionPerformance = 'Good';
        else employee.appTransactionPerformance = 'Great';
        employee.appTransactionRatio = appTransactionRatio; // Store ratio for display
    }

    return employeeData;
}


/**
 * Renders the table for the first 10 employees in the reports division.
 * @param {Object} employeesData - Aggregated data for all employees.
 * @param {string} reportPeriodString - The string describing the report period.
 */
function renderFirst10EmployeesTable(employeesData, reportPeriodString) {
    if (!first10EmployeesTableBody) return;

    first10EmployeesTableBody.innerHTML = ''; // Clear existing rows

    const employeeIdentifiers = Object.keys(employeesData).sort(); // Sort alphabetically for consistent display
    const employeesToDisplay = employeeIdentifiers.slice(0, 10); // Get first 10 employees

    // Update the section title to include the report period
    const sectionTitleElement = first10EmployeesReportSection.querySelector('.section-title');
    if (sectionTitleElement) {
        sectionTitleElement.textContent = `First 10 Employees Overview (${reportPeriodString})`;
    }

    if (employeesToDisplay.length === 0) {
        first10EmployeesTableBody.innerHTML = '<tr><td colspan="10" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center italic">No employee data available for overview in the selected period.</td></tr>';
        return;
    }

    // Update table headers
    const tableHeadRow = first10EmployeesTableBody.previousElementSibling.querySelector('tr');
    if (tableHeadRow) {
        tableHeadRow.innerHTML = `
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Employee ID/Name</th>
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

    employeesToDisplay.forEach(employeeId => {
        const employee = employeesData[employeeId];
        const row = first10EmployeesTableBody.insertRow();
        row.className = 'hover:bg-blue-50';

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${employeeId}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${employee.totalCustomers.toFixed(0)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${employee.simCardsIssued.toFixed(0)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${employee.appsIssued.toFixed(0)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${employee.simCardsToppedUp.toFixed(0)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${employee.mBankingActivated.toFixed(0)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${employee.appTransactions.toFixed(0)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold ${getPerformanceColorClass(employee.simAppPerformance)}">${employee.simAppPerformance} (${(employee.simAppIssuanceRatio * 100).toFixed(1)}%)</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold ${getPerformanceColorClass(employee.topUpMBankingPerformance)}">${employee.topUpMBankingPerformance} (${(employee.topUpMBankingRatio * 100).toFixed(1)}%)</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold ${getPerformanceColorClass(employee.appTransactionPerformance)}">${employee.appTransactionPerformance} (${(employee.appTransactionRatio * 100).toFixed(1)}%)</td>
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
 * Populates the employee select dropdown for individual report search.
 * @param {Object} employeesData - Aggregated data for all employees.
 */
function populateEmployeeSelect(employeesData) {
    if (!employeeSelect) return;

    employeeSelect.innerHTML = '<option value="">Select an Employee</option>';
    const employeeIdentifiers = Object.keys(employeesData).sort();

    if (employeeIdentifiers.length === 0) {
        employeeSelect.disabled = true;
        viewEmployeeReportBtn.disabled = true;
        return;
    }

    employeeIdentifiers.forEach(employeeId => {
        const option = document.createElement('option');
        option.value = employeeId;
        option.textContent = employeeId;
        employeeSelect.appendChild(option);
    });

    employeeSelect.disabled = false;
    viewEmployeeReportBtn.disabled = false;
}

/**
 * Handles viewing an individual employee report.
 */
async function handleViewEmployeeReport() {
    const selectedEmployeeId = employeeSelect.value;
    if (!selectedEmployeeId) {
        showMessageBox("Please select an employee to view their report.");
        return;
    }

    // Re-aggregate data based on current date selection before displaying a single employee report
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
    aggregatedEmployeeData = aggregateEmployeeData(parsedData, dateColumn, startDate, endDate);
    currentEmployeeReportData = aggregatedEmployeeData[selectedEmployeeId];

    if (!currentEmployeeReportData) {
        showMessageBox(`Report for employee "${selectedEmployeeId}" not found for the selected period. They might not have data in this range.`);
        // Hide the report display if no data is found for the selected employee and period
        individualEmployeeReportDisplay.classList.add('hidden');
        exportEmployeeReportBtn.classList.add('hidden');
        getAIGeneralPerformanceBtn.classList.add('hidden');
        getAIEmployeePerformanceBtn.classList.add('hidden');
        return;
    }

    // Populate the display elements
    individualEmployeeReportTitle.textContent = `Report for ${selectedEmployeeId}`;
    reportPeriod.textContent = `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`; // Display the selected period
    reportTotalCustomers.textContent = currentEmployeeReportData.totalCustomers.toFixed(0);
    reportSimCardsIssued.textContent = currentEmployeeReportData.simCardsIssued.toFixed(0);
    reportAppsIssued.textContent = currentEmployeeReportData.appsIssued.toFixed(0);
    reportSimCardsToppedUp.textContent = currentEmployeeReportData.simCardsToppedUp.toFixed(0);
    reportMBankingActivated.textContent = currentEmployeeReportData.mBankingActivated.toFixed(0);
    reportAppTransactions.textContent = currentEmployeeReportData.appTransactions.toFixed(0);

    reportSimAppPerformance.textContent = `${currentEmployeeReportData.simAppPerformance} (${(currentEmployeeReportData.simAppIssuanceRatio * 100).toFixed(1)}%)`;
    reportSimAppPerformance.className = `font-semibold ${getPerformanceColorClass(currentEmployeeReportData.simAppPerformance)}`;

    reportTopUpMBankingPerformance.textContent = `${currentEmployeeReportData.topUpMBankingPerformance} (${(currentEmployeeReportData.topUpMBankingRatio * 100).toFixed(1)}%)`;
    reportTopUpMBankingPerformance.className = `font-semibold ${getPerformanceColorClass(currentEmployeeReportData.topUpMBankingPerformance)}`;

    reportAppTransactionPerformance.textContent = `${currentEmployeeReportData.appTransactionPerformance} (${(currentEmployeeReportData.appTransactionRatio * 100).toFixed(1)}%)`;
    reportAppTransactionPerformance.className = `font-semibold ${getPerformanceColorClass(currentEmployeeReportData.appTransactionPerformance)}`;

    // Reset AI insight texts
    aiGeneralPerformanceText.textContent = 'Click "Get AI Insights" to generate performance summary.';
    aiEmployeePerformanceText.textContent = 'Click "Get AI Insights" to generate employee performance comparison.';

    individualEmployeeReportDisplay.classList.remove('hidden');
    exportEmployeeReportBtn.classList.remove('hidden');
    getAIGeneralPerformanceBtn.classList.remove('hidden');
    getAIEmployeePerformanceBtn.classList.remove('hidden');
}


/**
 * Handles exporting the currently viewed employee report.
 */
function handleExportEmployeeReport() {
    if (!currentEmployeeReportData) {
        showMessageBox("No employee report is currently displayed to export.");
        return;
    }

    const employeeId = employeeSelect.value;
    const reportPeriodString = reportPeriod.textContent;
    let reportContent = `Employee Report: ${employeeId}\nReport Period: ${reportPeriodString}\n\n`;
    reportContent += `Total Customers: ${currentEmployeeReportData.totalCustomers.toFixed(0)}\n`;
    reportContent += `Sim Cards Issued: ${currentEmployeeReportData.simCardsIssued.toFixed(0)}\n`;
    reportContent += `Apps Issued: ${currentEmployeeReportData.appsIssued.toFixed(0)}\n`;
    reportContent += `Sim Cards Topped Up: ${currentEmployeeReportData.simCardsToppedUp.toFixed(0)}\n`;
    reportContent += `M-Banking Activated: ${currentEmployeeReportData.mBankingActivated.toFixed(0)}\n`;
    reportContent += `App Transactions: ${currentEmployeeReportData.appTransactions.toFixed(0)}\n`;
    reportContent += `Sim/App Issuance Performance: ${currentEmployeeReportData.simAppPerformance} (${(currentEmployeeReportData.simAppIssuanceRatio * 100).toFixed(1)}%)\n`;
    reportContent += `Top-up/M-Banking Performance: ${currentEmployeeReportData.topUpMBankingPerformance} (${(currentEmployeeReportData.topUpMBankingRatio * 100).toFixed(1)}%)\n`;
    reportContent += `App Transaction Performance: ${currentEmployeeReportData.appTransactionPerformance} (${(currentEmployeeReportData.appTransactionRatio * 100).toFixed(1)}%)\n`;

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
    a.download = `${employeeId}_Report.txt`;
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // Clean up
    showMessageBox('Employee report exported as text file!', false);
}


/**
 * Gets AI interpretation for general employee performance.
 */
async function getAIGeneralPerformance() {
    if (!currentEmployeeReportData) {
        showMessageBox("Please view an employee report first to get AI insights.");
        return;
    }

    aiGeneralPerformanceText.textContent = '';
    aiGeneralPerformanceLoading.classList.remove('hidden');

    const employeeId = employeeSelect.value;
    const reportPeriodString = reportPeriod.textContent;
    const prompt = `Given the following performance data for employee "${employeeId}" for the period ${reportPeriodString}:
    Total Customers: ${currentEmployeeReportData.totalCustomers}
    Sim Cards Issued: ${currentEmployeeReportData.simCardsIssued}
    Apps Issued: ${currentEmployeeReportData.appsIssued}
    Sim Cards Topped Up: ${currentEmployeeReportData.simCardsToppedUp}
    M-Banking Activated: ${currentEmployeeReportData.mBankingActivated}
    App Transactions: ${currentEmployeeReportData.appTransactions}
    Sim/App Issuance Performance: ${currentEmployeeReportData.simAppPerformance} (${(currentEmployeeReportData.simAppIssuanceRatio * 100).toFixed(1)}%)
    Top-up/M-Banking Performance: ${currentEmployeeReportData.topUpMBankingPerformance} (${(currentEmployeeReportData.topUpMBankingRatio * 100).toFixed(1)}%)
    App Transaction Performance: ${currentEmployeeReportData.appTransactionPerformance} (${(currentEmployeeReportData.appTransactionRatio * 100).toFixed(1)}%)

    Provide a concise summary of this employee's general performance, highlighting their strengths, weaknesses, and overall standing based on the provided metrics and performance classifications.`;

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
 * Gets AI interpretation for employee performance comparison.
 */
async function getAIEmployeePerformance() {
    if (!currentEmployeeReportData) {
        showMessageBox("Please view an employee report first to get AI insights.");
        return;
    }

    aiEmployeePerformanceText.textContent = '';
    aiEmployeePerformanceLoading.classList.remove('hidden');

    const employeeId = employeeSelect.value;
    const reportPeriodString = reportPeriod.textContent;
    const prompt = `Given the performance data for employee "${employeeId}" for the period ${reportPeriodString}:
    Total Customers: ${currentEmployeeReportData.totalCustomers}
    Sim Cards Issued: ${currentEmployeeReportData.simCardsIssued}
    Apps Issued: ${currentEmployeeReportData.appsIssued}
    Sim Cards Topped Up: ${currentEmployeeReportData.simCardsToppedUp}
    M-Banking Activated: ${currentEmployeeReportData.mBankingActivated}
    App Transactions: ${currentEmployeeReportData.appTransactions}
    Sim/App Issuance Performance: ${currentEmployeeReportData.simAppPerformance} (${(currentEmployeeReportData.simAppIssuanceRatio * 100).toFixed(1)}%)
    Top-up/M-Banking Performance: ${currentEmployeeReportData.topUpMBankingPerformance} (${(currentEmployeeReportData.topUpMBankingRatio * 100).toFixed(1)}%)
    App Transaction Performance: ${currentEmployeeReportData.appTransactionPerformance} (${(currentEmployeeReportData.appTransactionRatio * 100).toFixed(1)}%)

    Compare this employee's performance to general expectations for an employee in this role over the given period. Highlight areas where they excel and areas where there might be room for improvement. Provide actionable suggestions for performance enhancement or recognition.`;

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
 * Initializes the UI and event listeners for the employees page.
 * This runs after main.js's DOMContentLoaded.
 */
async function initializeEmployeesPage() {
    console.log("[Employees.js] Initializing employees page UI and listeners.");

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

        // Attempt to pre-select X-axis based on priority: 'Employee ID', 'Employee Name', 'Employee(s)'
        if (xAxisSelect) {
            const employeeIdCol = findColumnNameCaseInsensitive(headers, ['Employee ID', 'Employee Name', 'Employee(s)']);
            if (employeeIdCol) {
                xAxisSelect.value = employeeIdCol;
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

        // --- Employees-specific Event Listeners for Plotting ---
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
        aggregatedEmployeeData = aggregateEmployeeData(parsedData, reportDateColumn, reportStartDateInput.value, reportEndDateInput.value);
        renderFirst10EmployeesTable(aggregatedEmployeeData, `${new Date(reportStartDateInput.value).toLocaleDateString()} - ${new Date(reportEndDateInput.value).toLocaleDateString()}`);
        populateEmployeeSelect(aggregatedEmployeeData);

        // Add event listeners for date range inputs to re-aggregate and re-render reports
        if (reportStartDateInput) {
            reportStartDateInput.removeEventListener('change', handleReportDateChange);
            reportStartDateInput.addEventListener('change', handleReportDateChange);
        }
        if (reportEndDateInput) {
            reportEndDateInput.removeEventListener('change', handleReportDateChange);
            reportEndDateInput.addEventListener('change', handleReportDateChange);
        }

        if (employeeSelect) {
            employeeSelect.removeEventListener('change', () => {
                individualEmployeeReportDisplay.classList.add('hidden'); // Hide previous report on new selection
                exportEmployeeReportBtn.classList.add('hidden');
                getAIGeneralPerformanceBtn.classList.add('hidden');
                getAIEmployeePerformanceBtn.classList.add('hidden');
            });
            employeeSelect.addEventListener('change', () => {
                individualEmployeeReportDisplay.classList.add('hidden'); // Hide previous report on new selection
                exportEmployeeReportBtn.classList.add('hidden');
                getAIGeneralPerformanceBtn.classList.add('hidden');
                getAIEmployeePerformanceBtn.classList.add('hidden');
            });
        }

        if (viewEmployeeReportBtn) {
            viewEmployeeReportBtn.removeEventListener('click', handleViewEmployeeReport);
            viewEmployeeReportBtn.addEventListener('click', handleViewEmployeeReport);
        }
        if (exportEmployeeReportBtn) {
            exportEmployeeReportBtn.removeEventListener('click', handleExportEmployeeReport);
            exportGraphBtn.addEventListener('click', handleExportEmployeeReport);
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
 * Handles the plotting of the graph for the employees page.
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

    const currentChartConfig = { xAxisCol, yAxisCol, chartType, yAxisAggregation, page: 'employees' }; // Added page tag
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
        description = "Untitled Employee Chart";
    }

    try {
        const chartId = await saveSavedChart({
            chartConfig: { ...myChartCanvas.chartConfig, page: 'employees' }, // Ensure page tag is saved
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
    a.download = 'employee_chart.png';
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
            // Filter for charts specifically tagged for 'employees' page
            const pageSpecificCharts = savedCharts.filter(chart => chart.chartConfig && chart.chartConfig.page === 'employees');
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
 * Re-aggregates data and re-renders the first 10 employees table and clears the individual report.
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
        aggregatedEmployeeData = aggregateEmployeeData(parsedData, null, null, null);
        renderFirst10EmployeesTable(aggregatedEmployeeData, "All Time");
        populateEmployeeSelect(aggregatedEmployeeData);
        // Hide individual report if dates are cleared
        individualEmployeeReportDisplay.classList.add('hidden');
        exportEmployeeReportBtn.classList.add('hidden');
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
    aggregatedEmployeeData = aggregateEmployeeData(parsedData, dateColumn, startDate, endDate);
    renderFirst10EmployeesTable(aggregatedEmployeeData, `${sDate.toLocaleDateString()} - ${eDate.toLocaleDateString()}`);
    populateEmployeeSelect(aggregatedEmployeeData);

    // If an individual report was being viewed, hide it as the underlying data has changed
    individualEmployeeReportDisplay.classList.add('hidden');
    exportEmployeeReportBtn.classList.add('hidden');
    getAIGeneralPerformanceBtn.classList.add('hidden');
    getAIEmployeePerformanceBtn.classList.add('hidden');
}


// Attach the initialization function to the DOMContentLoaded event
window.addEventListener('DOMContentLoaded', initializeEmployeesPage);
