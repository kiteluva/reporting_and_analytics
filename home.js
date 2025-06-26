// home.js
// This file contains logic specific to home.html, including CSV upload, data display, and distribution plotting.

import { showMessageBox } from './ui-components.js';
import {
    parseCSV,
    saveDataToIndexedDB,
    parsedData, // Global parsed data from data-handlers.js
    headers, // Global headers from data-handlers.js
    loadDataFromIndexedDB // Import to check if data is already present on load
} from './data-handlers.js';
import {
    populateAxisSelects,
    drawChart, // Still used for custom plotting (if implemented in main.js/charting.js for home page)
    clearChartInstances,
    renderSavedChartsTable, // Assuming you'll want to render saved charts on home page too
    loadSavedChart,
    deleteSavedChartById,
    myChartCanvas // Global reference to the main plotting canvas instance
} from './charting.js';

// --- DOM Elements specific to home.html ---
const csvFileInput = document.getElementById('csvFile');
const fileNameDisplay = document.getElementById('fileName'); // Displays file status

const showDataOverviewBtn = document.getElementById('showDataOverviewBtn');
const showPlottingSectionBtn = document.getElementById('showPlottingSectionBtn');

// Section references for visibility toggling
const dataHeadSection = document.getElementById('dataHeadSection');
const dataHeadTable = document.getElementById('dataHeadTable'); // Table inside dataHeadSection

const descriptiveStatisticsSection = document.getElementById('descriptiveStatisticsSection');
const statisticsTable = document.getElementById('statisticsTable'); // Table inside descriptiveStatisticsSection

const columnDistributionSection = document.getElementById('columnDistributionSection');
const distributionColumnSelect = document.getElementById('distributionColumnSelect');
const distributionChartCanvas = document.getElementById('distributionChartCanvas');

const chartingSection = document.getElementById('chartingSection'); // Custom plotting area
const mostRecentGraphSection = document.getElementById('mostRecentGraphSection');
const recentSavedChartCanvas = document.getElementById('recentSavedChartCanvas'); // Canvas for recent graph
const recentGraphDescription = document.getElementById('recentGraphDescription'); // Description for recent graph

const savedGraphsSection = document.getElementById('savedGraphsSection');
const savedGraphsTableBody = document.getElementById('savedGraphsTableBody'); // Table body for saved graphs


// --- Utility Functions (moved from main.js or other places if needed here) ---

// Function to handle CSV file input change
async function handleCSVFileUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        showMessageBox("No file selected.");
        fileNameDisplay.textContent = 'No file selected. Please upload a CSV to begin your analysis.';
        // Disable buttons and hide sections if no file is selected
        showDataOverviewBtn.disabled = true;
        showPlottingSectionBtn.disabled = true;
        hideAllAnalyticalSections(); // Helper function to hide all sections
        clearChartInstances(); // Clear any existing charts
        return;
    }

    if (file.type !== 'text/csv') {
        showMessageBox("Please upload a valid CSV file.");
        fileNameDisplay.textContent = 'Invalid file type. Please upload a CSV.';
        showDataOverviewBtn.disabled = true;
        showPlottingSectionBtn.disabled = true;
        return;
    }

    fileNameDisplay.textContent = `Loading ${file.name}...`;

    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                // Parse CSV and save to IndexedDB
                const { data, headers: hdrs } = parseCSV(e.target.result);
                // Update the globally imported parsedData and headers
                parsedData.splice(0, parsedData.length, ...data); // Clear and repopulate
                headers.splice(0, headers.length, ...hdrs);       // Clear and repopulate

                await saveDataToIndexedDB(parsedData, headers, file.name);

                fileNameDisplay.textContent = `File loaded: ${file.name}`;
                showMessageBox(`CSV file "${file.name}" loaded and saved!`);

                // Enable buttons after successful load
                showDataOverviewBtn.disabled = false;
                showPlottingSectionBtn.disabled = false;

                // Automatically show the data overview after successful upload
                // showDataOverviewBtn.click(); // Removed auto-click as per user request to separate actions

            } catch (error) {
                console.error("Error processing CSV:", error);
                showMessageBox(`Error processing CSV: ${error.message}`);
                fileNameDisplay.textContent = 'Error loading file.';
                showDataOverviewBtn.disabled = true;
                showPlottingSectionBtn.disabled = true;
            }
        };
        reader.readAsText(file);
    } catch (error) {
        console.error("File read error:", error);
        showMessageBox(`Failed to read file: ${error.message}`);
        fileNameDisplay.textContent = 'Error reading file.';
        showDataOverviewBtn.disabled = true;
        showPlottingSectionBtn.disabled = true;
    }
}

// Helper function to hide all analytical sections
function hideAllAnalyticalSections() {
    if (dataHeadSection) dataHeadSection.classList.add('hidden');
    if (descriptiveStatisticsSection) descriptiveStatisticsSection.classList.add('hidden');
    if (columnDistributionSection) columnDistributionSection.classList.add('hidden');
    if (chartingSection) chartingSection.classList.add('hidden');
    if (mostRecentGraphSection) mostRecentGraphSection.classList.add('hidden');
    if (savedGraphsSection) savedGraphsSection.classList.add('hidden');
}


// Function to populate the Data Head table
function populateDataHeadTable(tableElement, data, headers) {
    if (!tableElement) return;
    tableElement.innerHTML = ''; // Clear existing content

    // Create table header
    const thead = tableElement.createTHead();
    const headerRow = thead.insertRow();
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider';
        th.textContent = headerText;
        headerRow.appendChild(th);
    });

    // Create table body
    const tbody = tableElement.createTBody();
    // Show only the first 8 rows
    const rowsToShow = Math.min(data.length, 8);
    for (let i = 0; i < rowsToShow; i++) {
        const rowData = data[i];
        const tr = tbody.insertRow();
        tr.className = i % 2 === 0 ? 'bg-white' : 'bg-gray-50'; // Zebra stripping

        headers.forEach(header => {
            const td = tr.insertCell();
            td.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900';
            td.textContent = rowData[header];
        });
    }
}

// Function to calculate and populate descriptive statistics
function populateStatisticsTable(tableElement, data, headers) {
    if (!tableElement) return;
    tableElement.innerHTML = ''; // Clear existing content

    // Headers for statistics table
    const statsHeaders = ['', 'Count', 'Mean', 'Median', 'Mode', 'Std Dev', 'Min', 'Max'];
    const thead = tableElement.createTHead();
    const headerRow = thead.insertRow();
    statsHeaders.forEach(headerText => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider';
        th.textContent = headerText;
        headerRow.appendChild(th);
    });

    // Calculate and populate statistics
    const tbody = tableElement.createTBody();
    headers.forEach((header, index) => {
        // Only calculate for numerical columns
        const columnValues = data.map(row => row[header]).filter(value => typeof value === 'number');

        if (columnValues.length > 0) {
            const tr = tbody.insertRow();
            tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';

            tr.insertCell().outerHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${header}</td>`;

            const count = columnValues.length;
            const mean = count > 0 ? columnValues.reduce((sum, val) => sum + val, 0) / count : 0;

            const sortedValues = [...columnValues].sort((a, b) => a - b);
            let median = 0;
            if (count > 0) {
                const mid = Math.floor(count / 2);
                median = count % 2 === 0 ? (sortedValues[mid - 1] + sortedValues[mid]) / 2 : sortedValues[mid];
            }

            // Mode calculation (can have multiple modes)
            const frequencyMap = {};
            columnValues.forEach(val => {
                frequencyMap[val] = (frequencyMap[val] || 0) + 1;
            });
            let maxFreq = 0;
            let modes = [];
            for (const key in frequencyMap) {
                if (frequencyMap[key] > maxFreq) {
                    maxFreq = frequencyMap[key];
                    modes = [key];
                } else if (frequencyMap[key] === maxFreq) {
                    modes.push(key);
                }
            }
            const mode = modes.join(', '); // Join multiple modes with comma

            const stdDev = count > 1 ? Math.sqrt(columnValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (count - 1)) : 0;
            const min = count > 0 ? Math.min(...columnValues) : 0;
            const max = count > 0 ? Math.max(...columnValues) : 0;

            tr.insertCell().textContent = count.toFixed(0);
            tr.insertCell().textContent = mean.toFixed(2);
            tr.insertCell().textContent = median.toFixed(2);
            tr.insertCell().textContent = mode;
            tr.insertCell().textContent = stdDev.toFixed(2);
            tr.insertCell().textContent = min.toFixed(2);
            tr.insertCell().textContent = max.toFixed(2);
        }
    });
}

// Function to populate the column distribution select dropdown
function populateDistributionColumnSelect(selectElement, headers, data) {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">Select a column</option>'; // Default option
    headers.forEach(header => {
        // Only add numerical columns to the distribution select
        const isNumerical = data.some(row => typeof row[header] === 'number');
        if (isNumerical) {
            const option = document.createElement('option');
            option.value = header;
            option.textContent = header;
            selectElement.appendChild(option);
        }
    });
}

// Chart.js instance for distribution chart
let distributionChartInstance = null;

// Function to draw column distribution chart (Histogram/Density)
function drawColumnDistributionChart(data, columnName) {
    if (!columnName || !data || data.length === 0 || !distributionChartCanvas) {
        if (distributionChartInstance) {
            distributionChartInstance.destroy();
            distributionChartInstance = null;
        }
        return;
    }

    const numericalValues = data.map(row => row[columnName]).filter(value => typeof value === 'number');

    if (numericalValues.length === 0) {
        showMessageBox(`Column "${columnName}" contains no numerical data for distribution chart.`);
        if (distributionChartInstance) {
            distributionChartInstance.destroy();
            distributionChartInstance = null;
        }
        return;
    }

    // Destroy existing chart instance if it exists
    if (distributionChartInstance) {
        distributionChartInstance.destroy();
    }

    // Determine min and max for binning
    const minValue = Math.min(...numericalValues);
    const maxValue = Math.max(...numericalValues);
    const binCount = Math.ceil(Math.sqrt(numericalValues.length)); // Simple heuristic for bin count
    const binSize = (maxValue - minValue) / binCount;

    // Create bins
    const bins = Array(binCount).fill(0);
    const labels = [];

    for (let i = 0; i < binCount; i++) {
        const lowerBound = minValue + i * binSize;
        const upperBound = minValue + (i + 1) * binSize;
        labels.push(`${lowerBound.toFixed(2)}-${upperBound.toFixed(2)}`);
    }

    numericalValues.forEach(value => {
        let binIndex = Math.floor((value - minValue) / binSize);
        if (binIndex >= binCount) {
            binIndex = binCount - 1; // Put max value in the last bin
        }
        bins[binIndex]++;
    });

    const ctx = distributionChartCanvas.getContext('2d');
    distributionChartInstance = new Chart(ctx, {
        type: 'bar', // Histogram is typically a bar chart
        data: {
            labels: labels,
            datasets: [{
                label: `Frequency of ${columnName}`,
                data: bins,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: columnName
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Frequency'
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Frequency: ${context.raw}`;
                        }
                    }
                }
            }
        }
    });
}


// --- Main Initialization for home.html elements ---
function initializeHomePage() {
    // Attach file input listener
    if (csvFileInput) {
        csvFileInput.addEventListener('change', handleCSVFileUpload);
    }

    // Attach button listeners for showing/hiding sections
    if (showDataOverviewBtn) {
        showDataOverviewBtn.addEventListener('click', () => {
            if (parsedData.length > 0) {
                hideAllAnalyticalSections();
                // Show data overview sections
                if (dataHeadSection) dataHeadSection.classList.remove('hidden');
                if (descriptiveStatisticsSection) descriptiveStatisticsSection.classList.remove('hidden');
                if (columnDistributionSection) columnDistributionSection.classList.remove('hidden');

                // Populate and draw relevant data if not already done or if data changed
                populateDataHeadTable(dataHeadTable, parsedData, headers);
                populateStatisticsTable(statisticsTable, parsedData, headers);
                populateDistributionColumnSelect(distributionColumnSelect, headers, parsedData);
                // Draw initial distribution chart if a column is selected
                if (distributionColumnSelect.value) {
                    drawColumnDistributionChart(parsedData, distributionColumnSelect.value);
                } else if (headers.length > 0) { // Select the first numerical column if available
                    const firstNumericalHeader = headers.find(h => parsedData.some(row => typeof row[h] === 'number'));
                    if (firstNumericalHeader) {
                        distributionColumnSelect.value = firstNumericalHeader;
                        drawColumnDistributionChart(parsedData, firstNumericalHeader);
                    }
                }

            } else {
                showMessageBox('No data loaded. Please upload a CSV file first.');
            }
        });
    }

    if (showPlottingSectionBtn) {
        showPlottingSectionBtn.addEventListener('click', () => {
            if (parsedData.length > 0) {
                hideAllAnalyticalSections();
                // Show plotting sections
                if (chartingSection) chartingSection.classList.remove('hidden');
                if (mostRecentGraphSection) mostRecentGraphSection.classList.remove('hidden');
                if (savedGraphsSection) savedGraphsSection.classList.remove('hidden');

                // Re-populate axis selects and attempt to draw active plot if any
                populateAxisSelects(parsedData, headers); // This function is from charting.js
                // The main.js file handles loading the active plot configuration
                // after the UI is initialized and data is ready.
            } else {
                showMessageBox('No data loaded. Please upload a CSV file first.');
            }
        });
    }

    if (distributionColumnSelect) {
        distributionColumnSelect.addEventListener('change', (event) => {
            drawColumnDistributionChart(parsedData, event.target.value);
        });
    }

    // Initial state: hide all analytical sections
    hideAllAnalyticalSections();

    // Initially disable buttons until data is loaded
    showDataOverviewBtn.disabled = true;
    showPlottingSectionBtn.disabled = true;

    // Check if data is already loaded (e.g., from IndexedDB on page refresh)
    // This part ensures persistence. main.js's initializeUIForCurrentPage
    // likely loads data into `parsedData` and `headers` from IndexedDB.
    // If data is present on load, enable buttons and show overview.
    loadDataFromIndexedDB().then(() => {
        if (parsedData.length > 0) {
            fileNameDisplay.textContent = `File loaded (from IndexedDB): ${localStorage.getItem('csvPlotterFileName') || 'Unnamed File'}`;
            showDataOverviewBtn.disabled = false;
            showPlottingSectionBtn.disabled = false;
            // Removed auto-click of showDataOverviewBtn.click() here as per user request
        }
    }).catch(error => {
        console.error("Error loading data from IndexedDB on page load:", error);
        // Do nothing specific, leave buttons disabled.
    });
}

// Attach the initialization function to the DOMContentLoaded event
// This will run after the DOM is fully loaded.
window.addEventListener('DOMContentLoaded', initializeHomePage);
