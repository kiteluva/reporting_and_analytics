// charting.js
// This file handles all Chart.js related logic, including plotting, aggregation, and display.

// Import necessary utility functions and data handlers
import { showMessageBox } from './ui-components.js';
import {
    saveSavedChart,
    loadSavedCharts,
    deleteSavedChartById, // This is correctly imported from data-handlers.js, not here
    parsedData,
    headers
} from './data-handlers.js';

// Export myChartCanvas so it can be accessed globally (e.g., by main.js for saving/exporting)
export let myChartCanvas = {
    chartInstance: null, // The Chart.js instance
    chartConfig: null,   // The config used to create the current chart
    canvasElement: null  // Reference to the actual canvas DOM element
};

let viewedSavedChartInstance = null; // For displaying a specific saved chart (viewedSavedChartCanvas)
let myDistributionChart = null; // For the distribution chart on home.html (not always present)

/**
 * Clears all active Chart.js instances.
 */
export function clearChartInstances() {
    if (myChartCanvas.chartInstance) {
        myChartCanvas.chartInstance.destroy();
        myChartCanvas.chartInstance = null;
        myChartCanvas.chartConfig = null;
    }
    if (viewedSavedChartInstance) {
        viewedSavedChartInstance.destroy();
        viewedSavedChartInstance = null;
    }
    if (myDistributionChart instanceof Chart) { // Check type to avoid errors if it's just a variable
        myDistributionChart.destroy();
        myDistributionChart = null;
    }
}


/**
 * Calculates the average of a numeric array.
 * @param {number[]} arr - The array of numbers.
 * @returns {number} The average.
 */
function calculateAverage(arr) {
    if (!arr || arr.length === 0) return 0;
    const sum = arr.reduce((a, b) => a + b, 0);
    return sum / arr.length;
}

/**
 * Calculates the sum of a numeric array.
 * @param {number[]} arr - The array of numbers.
 * @returns {number} The sum.
 */
function calculateSum(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0);
}

/**
 * Finds the minimum value in a numeric array.
 * @param {number[]} arr - The array of numbers.
 * @returns {number} The minimum value.
 */
function calculateMinimum(arr) {
    if (!arr || arr.length === 0) return 0;
    return Math.min(...arr);
}

/**
 * Finds the maximum value in a numeric array.
 * @param {number[]} arr - The array of numbers.
 * @returns {number} The maximum value.
 */
function calculateMaximum(arr) {
    if (!arr || arr.length === 0) return 0;
    return Math.max(...arr);
}

/**
 * Calculates the mode(s) of an array. Can return multiple modes if they have the same frequency.
 * For simplicity, we return the first mode found if there are multiple.
 * @param {Array} arr - The array.
 * @returns {any} The mode, or null if array is empty.
 */
function calculateMode(arr) {
    if (!arr || arr.length === 0) return null;
    const frequency = {};
    let maxFreq = 0;
    let mode = null;

    arr.forEach(item => {
        frequency[item] = (frequency[item] || 0) + 1;
        if (frequency[item] > maxFreq) {
            maxFreq = frequency[item];
            mode = item;
        }
    });
    return mode;
}

/**
 * Populates the X and Y axis select dropdowns with CSV headers.
 * It also attempts to pre-select sensible defaults based on page.
 * Includes population for Y-axis aggregation select.
 * @param {Array<Object>} prsdData - The parsed data array.
 * @param {Array<string>} hdrs - The headers array.
 */
export function populateAxisSelects(prsdData, hdrs) {
    if (typeof Chart === 'undefined') {
        console.error("[populateAxisSelects] Chart.js library is not loaded. Cannot populate axis selects.");
        return;
    }
    console.log(`[populateAxisSelects] called. Current parsedData length: ${prsdData.length}, Headers length: ${hdrs.length}`);

    const currentPage = window.location.pathname.split('/').pop();
    const isBranchesPage = currentPage === 'branches.html';
    const isEmployeesPage = currentPage === 'employees.html';
    const isTimeSeriesPage = currentPage === 'time-series.html';
    const isComplexStatsPage = currentPage === 'complex_stats.html';

    const xAxisSelect = document.getElementById('xAxisSelect');
    const yAxisSelect = document.getElementById('yAxisSelect');
    const chartTypeSelect = document.getElementById('chartTypeSelect');
    const yAxisAggregationSelect = document.getElementById('yAxisAggregationSelect');

    if (!xAxisSelect || !yAxisSelect || !chartTypeSelect || !yAxisAggregationSelect) {
        console.warn("[populateAxisSelects] Missing one or more axis/chart type select elements. Skipping population.");
        return;
    }

    xAxisSelect.innerHTML = '<option value="">Select X-Axis</option>';
    yAxisSelect.innerHTML = '<option value="">Select Y-Axis</option>';

    if (prsdData.length === 0 || hdrs.length === 0) {
        console.log("[populateAxisSelects] No data available (headers or parsedData empty), dropdowns will remain empty.");
        return;
    }

    const numericHeaders = hdrs.filter(header =>
        prsdData.some(row => typeof row[header] === 'number' && !isNaN(row[header]))
    );

    // For X-Axis, all headers can be options (numeric or categorical)
    hdrs.forEach(header => {
        const optionX = document.createElement('option');
        optionX.value = header;
        optionX.textContent = header;
        xAxisSelect.appendChild(optionX);
    });

    // For Y-Axis, typically only numeric headers are useful for most plots, especially with aggregation
    if (numericHeaders.length > 0) {
        numericHeaders.forEach(header => {
            const optionY = document.createElement('option');
            optionY.value = header;
            optionY.textContent = header;
            yAxisSelect.appendChild(optionY);
        });
    } else {
        // Fallback: If no purely numeric columns, allow selection of any for Y-axis, but warn
        hdrs.forEach(header => {
            const optionY = document.createElement('option');
            optionY.value = header;
            optionY.textContent = header;
            yAxisSelect.appendChild(optionY);
        });
        if (hdrs.length > 0) {
            showMessageBox("No purely numeric columns found. Y-Axis options may include non-numeric data, which might not be suitable for all chart types (e.g., aggregation).");
        }
    }


    chartTypeSelect.innerHTML = `
        <option value="bar">Bar Chart</option>
        <option value="line">Line Chart</option>
        <option value="scatter">Scatter Plot</option>
        <option value="pie">Pie Chart</option>
        <option value="doughnut">Doughnut Chart</option>
        <option value="polarArea">Polar Area Chart</option>
        <option value="radar">Radar Chart</option>
        <option value="histogram">Histogram</option>
        <option value="density">Density Plot</option>
    `;

    yAxisAggregationSelect.innerHTML = `
        <option value="none">None</option>
        <option value="sum">Sum</option>
        <option value="average">Average</option>
        <option value="count">Count</option>
        <option value="min">Minimum</option>
        <option value="max">Maximum</option>
        <option value="mode">Mode</option>
    `;
    yAxisAggregationSelect.value = 'average'; // Default aggregation

    let defaultX = '';
    let defaultY = '';
    let defaultChartType = 'bar'; // Default chart type for plotting pages

    // Logic for setting defaults based on page is complex and needs `prsdData` and `hdrs`
    // It's important that this logic is robust to missing data or headers.

    // Try to find a sensible default X-axis
    defaultX = hdrs.length > 0 ? hdrs[0] : '';
    // Try to find a sensible default Y-axis (prefer numeric)
    defaultY = numericHeaders.length > 0 ? numericHeaders[0] : (hdrs.length > 1 ? hdrs[1] : '');

    // Set page-specific defaults if elements exist on the page
    if (isBranchesPage) {
        defaultX = hdrs.find(h => h.toLowerCase().includes('branch') || h.toLowerCase().includes('location') || h.toLowerCase().includes('region')) || defaultX;
        defaultY = numericHeaders.find(h => h.toLowerCase().includes('amount') || h.toLowerCase().includes('value')) || defaultY;
        defaultChartType = 'bar';
    } else if (isEmployeesPage) {
        defaultX = hdrs.find(h => h.toLowerCase().includes('employee') || h.toLowerCase().includes('name') || h.toLowerCase().includes('staff')) || defaultX;
        defaultY = numericHeaders.find(h => h.toLowerCase().includes('salary') || h.toLowerCase().includes('pay')) || defaultY;
        defaultChartType = 'bar';
    } else if (isTimeSeriesPage) {
        defaultX = hdrs.find(h => h.toLowerCase().includes('date') || h.toLowerCase().includes('time') || h.toLowerCase().includes('period')) || defaultX;
        defaultY = numericHeaders.find(h => h.toLowerCase().includes('value') || h.toLowerCase().includes('amount')) || defaultY;
        defaultChartType = 'line';
    } else if (isComplexStatsPage) {
        // Defaults for complex stats might be more specific or left to user
        defaultX = numericHeaders.length > 0 ? numericHeaders[0] : defaultX;
        defaultY = numericHeaders.length > 1 ? numericHeaders[1] : defaultY;
        defaultChartType = 'scatter'; // Scatter for initial look at relationships
    }

    if (xAxisSelect) xAxisSelect.value = defaultX;
    if (yAxisSelect) yAxisSelect.value = defaultY;
    if (chartTypeSelect) chartTypeSelect.value = defaultChartType;

    // Handle filter inputs for specific pages (if they exist)
    if (isBranchesPage || isEmployeesPage) {
        const xAxisFilterInput = document.getElementById('xAxisFilterInput');
        if (xAxisFilterInput && defaultX) {
            const uniqueValues = [...new Set(prsdData.map(row => String(row[defaultX])))].filter(val => val !== undefined && val !== null && val !== '').sort();
            xAxisFilterInput.value = uniqueValues.join(', ');
        }
    } else if (isTimeSeriesPage) {
        const startDateInput = document.getElementById('startDateInput');
        const endDateInput = document.getElementById('endDateInput');
        if (startDateInput && endDateInput && defaultX) {
            const dateValues = prsdData
                .map(row => new Date(row[defaultX]))
                .filter(date => !isNaN(date.getTime()));

            if (dateValues.length > 0) {
                const minDate = new Date(Math.min(...dateValues)).toISOString().split('T')[0];
                const maxDate = new Date(Math.max(...dateValues)).toISOString().split('T')[0];
                startDateInput.value = minDate;
                endDateInput.value = maxDate;
            }
        }
    }

    // Special handling for complex_stats.html dropdowns (multi-selects)
    if (isComplexStatsPage) {
        const correlationColumnsSelect = document.getElementById('correlationColumnsSelect');
        const yAxisSelectMLR = document.getElementById('yAxisSelectMLR');
        const xAxisSelectMLR = document.getElementById('xAxisSelectMLR');

        if (correlationColumnsSelect) {
            correlationColumnsSelect.innerHTML = '';
            numericHeaders.forEach(header => {
                const option = document.createElement('option');
                option.value = header;
                option.textContent = header;
                correlationColumnsSelect.appendChild(option);
            });
        }

        if (yAxisSelectMLR) {
            yAxisSelectMLR.innerHTML = '<option value="">Select Dependent Variable (Y)</option>';
            numericHeaders.forEach(header => {
                const option = document.createElement('option');
                option.value = header;
                option.textContent = header;
                yAxisSelectMLR.appendChild(option);
            });
            if (numericHeaders.length > 0) yAxisSelectMLR.value = numericHeaders[0];
        }

        if (xAxisSelectMLR) {
            xAxisSelectMLR.innerHTML = '';
            numericHeaders.forEach(header => {
                const option = document.createElement('option');
                option.value = header;
                option.textContent = header;
                xAxisSelectMLR.appendChild(option);
            });
            // Pre-select all numeric headers except the default Y for MLR
            const defaultYMLR = yAxisSelectMLR ? yAxisSelectMLR.value : null;
            if (xAxisSelectMLR && numericHeaders.length > 0) {
                const optionsToSelect = Array.from(xAxisSelectMLR.options).filter(option =>
                    option.value !== defaultYMLR && numericHeaders.includes(option.value)
                );
                optionsToSelect.forEach(option => {
                    option.selected = true;
                });
            }
        }
    }

    console.log("[populateAxisSelects] completed. X-axis default:", xAxisSelect?.value, "Y-axis default:", yAxisSelect?.value, "Chart Type default:", chartTypeSelect?.value);
}


/**
 * Draws the chart using Chart.js based on selected options, including filtering and aggregation.
 * This function now takes a chartConfig object directly, making it more flexible.
 * It also takes an optional targetCanvasElement to draw on, defaulting to myChartCanvas.canvasElement.
 * @param {Object} chartConfig - Object containing xAxisCol, yAxisCol, chartType, yAxisAggregation.
 * @param {Array<Object>} data - The parsed data array.
 * @param {string} typeOverride - Optional: Override chartType from config (e.g., for density).
 * @param {HTMLCanvasElement} [targetCanvasElement] - Optional: The specific canvas element to draw on.
 */
export function drawChart(chartConfig, data, typeOverride = null, targetCanvasElement = null) {
    if (typeof Chart === 'undefined') {
        console.error("[drawChart] Chart.js library is not loaded. Cannot draw chart.");
        showMessageBox("Error: Charting library not loaded. Please refresh the page. If the problem persists, your browser might have issues loading external scripts.");
        return;
    }

    const currentPage = window.location.pathname.split('/').pop();
    const isBranchesPage = currentPage === 'branches.html';
    const isEmployeesPage = currentPage === 'employees.html';
    const isTimeSeriesPage = currentPage === 'time-series.html';

    // Determine which canvas to use
    let canvasToUse = targetCanvasElement || document.getElementById('myChartCanvas');

    if (!canvasToUse) {
        console.error("[drawChart] Target canvas element not found.");
        return;
    }

    const ctx = canvasToUse.getContext('2d');

    // Destroy existing chart instance on this canvas if it exists
    if (canvasToUse.chartInstance) {
        canvasToUse.chartInstance.destroy();
        canvasToUse.chartInstance = null;
    }

    // Clear the global myChartCanvas reference if this is the main canvas being drawn
    if (canvasToUse.id === 'myChartCanvas') {
        clearChartInstances(); // Clears main myChartCanvas.chartInstance
        myChartCanvas.canvasElement = canvasToUse; // Ensure myChartCanvas has the correct DOM reference
    }

    // Hide viewed saved graph section when plotting a new main chart
    const viewedSavedGraphSection = document.getElementById('viewedSavedGraphSection');
    if (viewedSavedGraphSection) viewedSavedGraphSection.classList.add('hidden');


    if (data.length === 0 || headers.length === 0) { // Using global headers as drawChart takes `data` as parameter
        showMessageBox("No data available to plot. Please upload a CSV file on the Home tab.");
        // Hide save/export buttons only if it's the main plotting canvas
        if (canvasToUse.id === 'myChartCanvas') {
            const saveGraphBtn = document.getElementById('saveGraphBtn');
            const exportGraphBtn = document.getElementById('exportGraphBtn');
            if (saveGraphBtn) saveGraphBtn.classList.add('hidden');
            if (exportGraphBtn) exportGraphBtn.classList.add('hidden');
        }
        return;
    }

    const { xAxisCol, yAxisCol, chartType: configChartType, yAxisAggregation } = chartConfig;
    const actualChartType = typeOverride || configChartType; // Use override if provided

    // Validate columns
    if (!xAxisCol || !yAxisCol || !headers.includes(xAxisCol) || !headers.includes(yAxisCol)) {
        showMessageBox("Please select valid X and Y axis columns.");
        if (canvasToUse.id === 'myChartCanvas') {
            const saveGraphBtn = document.getElementById('saveGraphBtn');
            const exportGraphBtn = document.getElementById('exportGraphBtn');
            if (saveGraphBtn) saveGraphBtn.classList.add('hidden');
            if (exportGraphBtn) exportGraphBtn.classList.add('hidden');
        }
        return;
    }

    let filteredData = [...data];

    // Apply filtering based on page and available filter inputs
    const xAxisFilterInput = document.getElementById('xAxisFilterInput');
    const startDateInput = document.getElementById('startDateInput');
    const endDateInput = document.getElementById('endDateInput');

    if ((isBranchesPage || isEmployeesPage) && xAxisFilterInput) {
        if (xAxisFilterInput.value) {
            const selectedXValues = xAxisFilterInput.value.split(',').map(s => s.trim()).filter(s => s !== '');
            if (selectedXValues.length > 0) {
                filteredData = filteredData.filter(row => selectedXValues.includes(String(row[xAxisCol])));
            }
        }
    } else if (isTimeSeriesPage && startDateInput && endDateInput) {
        if (startDateInput.value && endDateInput.value) {
            const startDate = new Date(startDateInput.value);
            const endDate = new Date(endDateInput.value);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                showMessageBox("Invalid start or end date for time series filtering.");
                return;
            }
            if (startDate.getTime() > endDate.getTime()) {
                showMessageBox("Start date cannot be after end date.");
                return;
            }

            filteredData = filteredData.filter(row => {
                const rowDate = new Date(row[xAxisCol]);
                return !isNaN(rowDate.getTime()) && rowDate >= startDate && rowDate <= endDate;
            });
        }
    }

    if (filteredData.length === 0) {
        showMessageBox("No data matches the selected filters. Please adjust your selections.");
        if (canvasToUse.id === 'myChartCanvas') {
            const saveGraphBtn = document.getElementById('saveGraphBtn');
            const exportGraphBtn = document.getElementById('exportGraphBtn');
            if (saveGraphBtn) saveGraphBtn.classList.add('hidden');
            if (exportGraphBtn) exportGraphBtn.classList.add('hidden');
        }
        return;
    }

    let labels;
    let values;
    let dataLabelSuffix = "";
    let finalChartConfig; // The chart config for the new Chart.js instance

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: xAxisCol,
                    color: '#1f2937',
                    font: { size: 14, weight: 'bold' }
                },
                ticks: {
                    color: '#1f2937'
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)' // Light grid lines
                }
            },
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: yAxisCol,
                    color: '#1f2937',
                    font: { size: 14, weight: 'bold' }
                },
                ticks: {
                    color: '#1f2937'
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)' // Light grid lines
                }
            }
        },
        plugins: {
            tooltip: {
                callbacks: {
                    label: function (context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== undefined) {
                            label += new Intl.NumberFormat().format(context.parsed.y);
                        } else if (context.parsed.pie !== undefined) {
                            label += context.formattedValue;
                        } else if (context.raw !== undefined && (actualChartType === 'pie' || actualChartType === 'doughnut' || actualChartType === 'polarArea')) {
                            label += new Intl.NumberFormat().format(context.raw);
                        }
                        return label;
                    }
                }
            },
            legend: {
                display: true,
                labels: {
                    color: '#1f2937'
                }
            },
            title: {
                display: true,
                text: `${yAxisCol}${dataLabelSuffix} by ${xAxisCol} (${actualChartType.charAt(0).toUpperCase() + actualChartType.slice(1)} Chart)`,
                color: '#1f2937',
                font: { size: 16, weight: 'bold' }
            }
        }
    };


    if (['pie', 'doughnut', 'polarArea'].includes(actualChartType)) {
        const counts = {};
        const isYNumeric = data.some(row => typeof row[yAxisCol] === 'number' && !isNaN(row[yAxisCol]));

        filteredData.forEach(row => {
            const category = String(row[xAxisCol]);
            if (isYNumeric) {
                const value = typeof row[yAxisCol] === 'number' && !isNaN(row[yAxisCol]) ? row[yAxisCol] : 0;
                counts[category] = (counts[category] || 0) + value;
            } else {
                counts[category] = (counts[category] || 0) + 1; // Count occurrences
            }
        });

        labels = Object.keys(counts);
        values = Object.values(counts);

        const backgroundColors = labels.map((_, i) => `hsl(${i * 30 % 360}, 70%, 50%)`);

        finalChartConfig = {
            type: actualChartType,
            data: {
                labels: labels,
                datasets: [{
                    label: isYNumeric ? `${yAxisCol} Sum` : `Count of ${xAxisCol}`,
                    data: values,
                    backgroundColor: backgroundColors,
                    borderColor: '#fff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: commonOptions.plugins.tooltip,
                    legend: {
                        position: 'right',
                        labels: { color: '#1f2937' }
                    },
                    title: {
                        display: true,
                        text: isYNumeric ? `Sum of ${yAxisCol} by ${xAxisCol}` : `Distribution of ${xAxisCol}`,
                        color: '#1f2937',
                        font: { size: 16, weight: 'bold' }
                    }
                },
                scales: {} // No scales for these chart types
            }
        };
        dataLabelSuffix = "";
    } else if (actualChartType === 'histogram' || actualChartType === 'density') {
        const numericValues = filteredData
            .map(row => row[yAxisCol]) // Use Y-axis for histogram values
            .filter(val => typeof val === 'number' && !isNaN(val))
            .sort((a, b) => a - b);

        if (numericValues.length === 0) {
            showMessageBox(`Cannot create a ${actualChartType} for non-numeric or empty data in '${yAxisCol}' after filtering.`);
            if (canvasToUse.id === 'myChartCanvas') {
                const saveGraphBtn = document.getElementById('saveGraphBtn');
                const exportGraphBtn = document.getElementById('exportGraphBtn');
                if (saveGraphBtn) saveGraphBtn.classList.add('hidden');
                if (exportGraphBtn) exportGraphBtn.classList.add('hidden');
            }
            return;
        }

        const numBins = Math.min(20, Math.max(5, Math.ceil(Math.sqrt(numericValues.length))));
        const minVal = numericValues[0];
        const maxVal = numericValues[numericValues.length - 1];
        const range = maxVal - minVal;
        const binSize = range === 0 ? 1 : range / numBins;

        const bins = Array(numBins).fill(0);
        labels = [];

        for (let i = 0; i < numBins; i++) {
            const lowerBound = minVal + i * binSize;
            const upperBound = minVal + (i + 1) * binSize;
            labels.push(`${lowerBound.toFixed(2)} - ${upperBound.toFixed(2)}`);
        }

        numericValues.forEach(value => {
            let binIndex = Math.floor((value - minVal) / binSize);
            if (binIndex >= numBins) binIndex = numBins - 1;
            if (binIndex < 0) binIndex = 0;
            bins[binIndex]++;
        });

        const chartData = bins;
        dataLabelSuffix = " (Frequency)";

        finalChartConfig = {
            type: 'bar', // Histogram is usually a bar chart
            data: {
                labels: labels,
                datasets: [{
                    label: `${yAxisCol}${dataLabelSuffix}`,
                    data: chartData,
                    backgroundColor: 'rgba(79, 70, 229, 0.7)',
                    borderColor: 'rgba(79, 70, 229, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                ...commonOptions,
                scales: {
                    x: {
                        ...commonOptions.scales.x,
                        title: {
                            display: true,
                            text: `${yAxisCol} Bins`,
                            color: '#1f2937',
                            font: { size: 14, weight: 'bold' }
                        },
                        ticks: {
                            color: '#1f2937'
                        },
                        barPercentage: 1.0, // Bars touch
                        categoryPercentage: 1.0 // Bars touch
                    },
                    y: {
                        ...commonOptions.scales.y,
                        title: {
                            display: true,
                            text: 'Frequency',
                            color: '#1f2937',
                            font: { size: 14, weight: 'bold' }
                        },
                        ticks: {
                            color: '#1f2937'
                        }
                    }
                }
            }
        };

        if (actualChartType === 'density') {
            finalChartConfig.type = 'line'; // For density, use line chart
            finalChartConfig.data.datasets[0].fill = true;
            finalChartConfig.data.datasets[0].tension = 0.4;
            finalChartConfig.data.datasets[0].backgroundColor = 'rgba(79, 70, 229, 0.3)';
            dataLabelSuffix = " (Density)";
        }
        // Update chart title based on actual chart type and aggregation
        if (finalChartConfig.options && finalChartConfig.options.plugins && finalChartConfig.options.plugins.title) {
            finalChartConfig.options.plugins.title.text = `${yAxisCol}${dataLabelSuffix} Distribution`;
        }

    } else if (actualChartType === 'scatter') {
        const isXNumeric = data.some(row => typeof row[xAxisCol] === 'number' && !isNaN(row[xAxisCol]));
        const isYNumeric = data.some(row => typeof row[yAxisCol] === 'number' && !isNaN(row[yAxisCol]));

        if (!isXNumeric || !isYNumeric) {
            showMessageBox(`For a Scatter Plot, both X-Axis ('${xAxisCol}') and Y-Axis ('${yAxisCol}') must contain numeric data.`);
            if (canvasToUse.id === 'myChartCanvas') {
                const saveGraphBtn = document.getElementById('saveGraphBtn');
                const exportGraphBtn = document.getElementById('exportGraphBtn');
                if (saveGraphBtn) saveGraphBtn.classList.add('hidden');
                if (exportGraphBtn) exportGraphBtn.classList.add('hidden');
            }
            return;
        }

        const scatterData = filteredData.map(row => ({
            x: row[xAxisCol],
            y: row[yAxisCol]
        })).filter(point => typeof point.x === 'number' && typeof point.y === 'number' && !isNaN(point.x) && !isNaN(point.y));

        if (scatterData.length === 0) {
            showMessageBox(`Cannot create a Scatter plot for non-numeric or empty data in '${xAxisCol}' or '${yAxisCol}' after filtering.`);
            return;
        }

        finalChartConfig = {
            type: 'scatter',
            data: {
                datasets: [{
                    label: `${yAxisCol} vs ${xAxisCol}`,
                    data: scatterData,
                    backgroundColor: 'rgba(79, 70, 229, 0.7)',
                    borderColor: 'rgba(79, 70, 229, 1)',
                    borderWidth: 1
                }]
            },
            options: commonOptions
        };
        // Update chart title based on actual chart type and aggregation
        if (finalChartConfig.options && finalChartConfig.options.plugins && finalChartConfig.options.plugins.title) {
            finalChartConfig.options.plugins.title.text = `${yAxisCol} vs ${xAxisCol} (Scatter Plot)`;
        }

    } else { // Bar, Line, Radar
        const groupedData = {};

        filteredData.forEach(row => {
            const key = String(row[xAxisCol]);
            const metricValue = row[yAxisCol];
            // Only aggregate if Y-axis value is numeric
            if (typeof metricValue === 'number' && !isNaN(metricValue)) {
                if (!groupedData[key]) {
                    groupedData[key] = [];
                }
                groupedData[key].push(metricValue);
            } else if (yAxisAggregation === 'count') {
                // If Y-axis is non-numeric, but aggregation is count, we can still count occurrences of X-axis categories
                if (!groupedData[key]) {
                    groupedData[key] = [];
                }
                groupedData[key].push(1); // Push a dummy value to count
            } else if (yAxisAggregation === 'none') {
                // If aggregation is 'none', and there's only one value per category, use that value.
                // If multiple, this scenario should ideally be handled by scatter or another plot type.
                // For now, if multiple, sum them as a fallback.
                if (!groupedData[key]) {
                    groupedData[key] = [];
                }
                groupedData[key].push(metricValue);
            }
            else {
                console.warn(`[drawChart] Non-numeric value found for Y-axis '${yAxisCol}' in group '${key}'. Skipping for aggregation unless 'count' or 'none' is selected.`);
                // For non-numeric values, if aggregation is not 'count', skip them.
                // Or you might want to default to 'count' for non-numeric Y-axis if no other aggregation is picked.
            }
        });

        labels = Object.keys(groupedData).sort();
        values = labels.map(key => {
            const group = groupedData[key];
            if (!group || group.length === 0) return 0; // Should not happen if filteredData is not empty

            const numericGroup = group.filter(val => typeof val === 'number' && !isNaN(val));

            switch (yAxisAggregation) {
                case 'sum':
                    dataLabelSuffix = " (Sum)";
                    return calculateSum(numericGroup);
                case 'average':
                    dataLabelSuffix = " (Average)";
                    return calculateAverage(numericGroup);
                case 'count':
                    dataLabelSuffix = " (Count)";
                    return group.length; // Count all, including non-numeric for 'count' aggregation
                case 'min':
                    dataLabelSuffix = " (Min)";
                    return calculateMinimum(numericGroup);
                case 'max':
                    dataLabelSuffix = " (Max)";
                    return calculateMaximum(numericGroup);
                case 'mode':
                    dataLabelSuffix = " (Mode)";
                    return calculateMode(group); // Mode can be for any data type
                case 'none':
                default:
                    // If 'none' and multiple values, sum them (fallback for now, ideally handle differently)
                    if (numericGroup.length > 1) {
                        console.warn(`[drawChart] Multiple numeric values for X-axis category '${key}' with 'none' aggregation. Summing them as a fallback.`);
                        dataLabelSuffix = " (Sum)";
                        return calculateSum(numericGroup);
                    }
                    dataLabelSuffix = "";
                    return numericGroup[0]; // If only one value, use it.
            }
        });

        const backgroundColors = labels.map((_, i) => `hsl(${i * 30 % 360}, 70%, 50%)`);

        finalChartConfig = {
            type: actualChartType,
            data: {
                labels: labels,
                datasets: [{
                    label: `${yAxisCol}${dataLabelSuffix}`,
                    data: values,
                    backgroundColor: backgroundColors,
                    borderColor: 'rgba(79, 70, 229, 1)',
                    borderWidth: 1
                }]
            },
            options: commonOptions
        };
        // Update chart title based on actual chart type and aggregation
        if (finalChartConfig.options && finalChartConfig.options.plugins && finalChartConfig.options.plugins.title) {
            finalChartConfig.options.plugins.title.text = `${yAxisCol}${dataLabelSuffix} by ${xAxisCol} (${actualChartType.charAt(0).toUpperCase() + actualChartType.slice(1)} Chart)`;
        }
    }

    // Set the chart instance and config on the myChartCanvas export object
    // This allows main.js to access the currently plotted chart
    if (canvasToUse.id === 'myChartCanvas') { // Only update for the main interactive canvas
        myChartCanvas.chartInstance = new Chart(ctx, finalChartConfig);
        myChartCanvas.chartConfig = {
            xAxisCol,
            yAxisCol,
            chartType: actualChartType, // Save the actual type drawn
            yAxisAggregation,
            chartConfig: finalChartConfig // Store the full Chart.js config for saving
        };

        // Make save/export buttons visible if a chart is drawn on the main canvas
        const saveGraphBtn = document.getElementById('saveGraphBtn');
        const exportGraphBtn = document.getElementById('exportGraphBtn');
        if (saveGraphBtn) saveGraphBtn.classList.remove('hidden');
        if (exportGraphBtn) exportGraphBtn.classList.remove('hidden');

        // Update recent graph description (if applicable to the main chart)
        const recentGraphDescription = document.getElementById('recentGraphDescription');
        if (recentGraphDescription) {
            recentGraphDescription.textContent = `Displaying: ${finalChartConfig.options.plugins.title.text}`;
        }
    } else { // For other canvases like recentSavedChartCanvas, just create the instance
        canvasToUse.chartInstance = new Chart(ctx, finalChartConfig);
    }

    // Render to a persistent canvas (recentSavedChartCanvas) if it's not the current canvas and needed
    const recentSavedChartCanvas = document.getElementById('recentSavedChartCanvas');
    if (recentSavedChartCanvas && canvasToUse.id !== 'recentSavedChartCanvas' && canvasToUse.id === 'myChartCanvas') {
        const recentCtx = recentSavedChartCanvas.getContext('2d');
        if (recentSavedChartCanvas.chartInstance) { // Destroy previous instance if exists
            recentSavedChartCanvas.chartInstance.destroy();
        }
        // Clone the config to avoid modifying the active chart's config
        const recentChartConfig = JSON.parse(JSON.stringify(finalChartConfig));
        recentSavedChartCanvas.chartInstance = new Chart(recentCtx, recentChartConfig);
    }
    console.log("[drawChart] Chart drawn successfully.");
}


/**
 * Renders the table of saved charts.
 * @param {HTMLTableSectionElement} savedGraphsTableBody - The tbody element of the saved graphs table.
 * @param {Function} loadChartCallback - Callback function to load a chart.
 * @param {Function} deleteChartCallback - Callback function to delete a chart.
 */
export async function renderSavedChartsTable(savedGraphsTableBody, loadChartCallback, deleteChartCallback) {
    if (!savedGraphsTableBody) return;
    savedGraphsTableBody.innerHTML = ''; // Clear existing rows

    try {
        const savedCharts = await loadSavedCharts(); // Load all saved charts

        if (savedCharts.length === 0) {
            // Updated colspan to 5 for the added 'Entry #' column
            savedGraphsTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500 italic">No graphs saved yet. Plot a graph above and click "Save Graph"!</td></tr>';
            return;
        }

        savedCharts.sort((a, b) => new Date(b.dateSaved) - new Date(a.dateSaved)); // Sort by most recent

        savedCharts.forEach(chart => {
            // Safely access chartConfig properties to get x and y axis names
            // Use optional chaining and fallback for robustness
            const xAxisLabel = chart.chartConfig?.xAxisCol || 'N/A';
            const yAxisLabel = chart.chartConfig?.yAxisCol || 'N/A';
            const chartType = chart.chartConfig?.chartType || 'N/A';
            const yAxisAggregationDisplay = chart.chartConfig?.yAxisAggregation || 'None';

            const row = savedGraphsTableBody.insertRow();
            row.className = 'hover:bg-blue-50'; // Tailwind class for hover effect
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${chart.id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${xAxisLabel}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${yAxisLabel} (${yAxisAggregationDisplay})</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${chartType.charAt(0).toUpperCase() + chartType.slice(1)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button class="text-indigo-600 hover:text-indigo-900 view-chart-btn" data-chart-id="${chart.id}">View</button>
                    <button class="ml-4 text-red-600 hover:text-red-900 delete-chart-btn" data-chart-id="${chart.id}">Delete</button>
                </td>
            `;

            // Attach event listeners to the new buttons
            row.querySelector('.view-chart-btn').addEventListener('click', () => {
                loadChartCallback(chart.id);
            });
            row.querySelector('.delete-chart-btn').addEventListener('click', () => {
                showMessageBox(
                    `Are you sure you want to delete the graph: "${chart.description}"?`,
                    true, // isConfirm
                    async () => { // onConfirm
                        await deleteChartCallback(chart.id);
                        renderSavedChartsTable(savedGraphsTableBody, loadChartCallback, deleteChartCallback); // Re-render table
                        showMessageBox("Graph deleted successfully!");
                    }
                );
            });
        });
        console.log("[Charting] Saved charts table rendered.");
    } catch (error) {
        console.error("Error rendering saved charts table:", error);
        showMessageBox("Error rendering saved charts table. Check console for details."); // Added user feedback
        // Updated colspan to 5 for the added 'Entry #' column
        savedGraphsTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-red-500">Error loading saved graphs.</td></tr>';
    }
}

/**
 * Loads and displays a previously saved chart in the dedicated viewer section.
 * @param {number} chartId - The ID of the chart to load from IndexedDB.
 */
export async function loadSavedChart(chartId) {
    console.log(`[Charting] Attempting to load saved chart with ID: ${chartId}`);
    try {
        const savedCharts = await loadSavedCharts(); // Load all charts
        const chartToLoad = savedCharts.find(chart => chart.id === chartId);

        if (!chartToLoad) {
            showMessageBox("Saved chart not found.");
            return;
        }

        const viewedSavedChartCanvas = document.getElementById('viewedSavedChartCanvas');
        const viewedSavedGraphSection = document.getElementById('viewedSavedGraphSection');
        const viewedGraphDescription = document.getElementById('viewedGraphDescription');

        if (!viewedSavedChartCanvas || !viewedSavedGraphSection || !viewedGraphDescription) {
            console.error("[Charting] Missing DOM elements for viewing saved charts.");
            showMessageBox("Error: Required elements for viewing saved charts are missing.");
            return;
        }

        if (viewedSavedChartInstance) {
            viewedSavedChartInstance.destroy(); // Destroy previous instance
        }

        viewedSavedGraphSection.classList.remove('hidden');
        viewedGraphDescription.textContent = `Viewing: ${chartToLoad.description} (Saved on: ${new Date(chartToLoad.dateSaved).toLocaleString()})`;

        const ctx = viewedSavedChartCanvas.getContext('2d');

        // Recreate the chart using the saved config
        // Note: Chart.js config needs to be parsed if stored as a string or cloned to avoid reference issues
        const chartConfig = JSON.parse(JSON.stringify(chartToLoad.chartConfig.chartConfig)); // Access the nested chartConfig

        viewedSavedChartInstance = new Chart(ctx, chartConfig);
        console.log(`[Charting] Loaded and displayed saved chart with ID: ${chartId}`);

        // If on a main plotting page, hide the interactive chart section temporarily
        const mostRecentGraphSection = document.getElementById('mostRecentGraphSection');
        if (mostRecentGraphSection) mostRecentGraphSection.classList.add('hidden');

    } catch (error) {
        console.error("Error loading saved chart:", error);
        showMessageBox("Error loading saved chart. It might be corrupted or missing.");
    }
}
