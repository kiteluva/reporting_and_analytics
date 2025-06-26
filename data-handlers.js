// data-handlers.js
// This file manages all data-related operations, including CSV parsing and IndexedDB interactions.

import { showMessageBox } from './ui-components.js'; // Import the message box utility

// --- IndexedDB Constants ---
const DB_NAME = 'CSVPlotterDB';
const DB_VERSION = 5; // Increased version for `mode` aggregation and data head rows
const STORE_NAME_CSV_DATA = 'csvDataStore';
const STORE_NAME_SAVED_CHARTS = 'savedCharts';
const STORE_NAME_LOADED_DATASETS = 'loadedDatasets'; // Not currently used, but kept for future
const STORE_NAME_ACTIVE_PLOT_CONFIG = 'activePlotConfig';

// --- Local Storage Constants (only for filename, as it's a small string) ---
const LOCAL_STORAGE_KEY_FILENAME = 'csvPlotterFileName';

let db; // Global IndexedDB instance

// Global variables for parsed data and headers (will be updated by functions that load/save data)
export let parsedData = [];
export let headers = [];

/**
 * Opens or creates the IndexedDB database.
 * This function is asynchronous and returns a Promise.
 * @returns {Promise<IDBDatabase>} A promise that resolves with the IDBDatabase instance.
 */
export function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            console.log('[IndexedDB] Upgrade needed. Creating/updating object stores...');
            if (!db.objectStoreNames.contains(STORE_NAME_CSV_DATA)) {
                db.createObjectStore(STORE_NAME_CSV_DATA, { keyPath: 'id' });
                console.log(`[IndexedDB] Object store '${STORE_NAME_CSV_DATA}' created.`);
            }
            if (!db.objectStoreNames.contains(STORE_NAME_SAVED_CHARTS)) {
                db.createObjectStore(STORE_NAME_SAVED_CHARTS, { keyPath: 'id', autoIncrement: true });
                console.log(`[IndexedDB] Object store '${STORE_NAME_SAVED_CHARTS}' created.`);
            }
            if (!db.objectStoreNames.contains(STORE_NAME_LOADED_DATASETS)) {
                db.createObjectStore(STORE_NAME_LOADED_DATASETS, { keyPath: 'id', autoIncrement: true });
                console.log(`[IndexedDB] Object store '${STORE_NAME_LOADED_DATASETS}' created.`);
            }
            if (!db.objectStoreNames.contains(STORE_NAME_ACTIVE_PLOT_CONFIG)) {
                db.createObjectStore(STORE_NAME_ACTIVE_PLOT_CONFIG, { keyPath: 'pageId' });
                console.log(`[IndexedDB] Object store '${STORE_NAME_ACTIVE_PLOT_CONFIG}' created.`);
            }
            console.log('[IndexedDB] Database upgrade complete.');
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('[IndexedDB] Database opened successfully.');
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('[IndexedDB] Error:', event.target.errorCode, event.target.error);
            showMessageBox('Error opening database for offline storage. Your browser might be in private mode or storage is full.');
            reject(new Error('IndexedDB error'));
        };
    });
}

/**
 * Saves parsed data (parsedData array and headers array) to IndexedDB.
 * This function will overwrite any existing CSV data stored under the fixed 'id'.
 * This is for the *currently active* dataset, used universally across tabs.
 * @param {Array<Object>} data - The parsed CSV data (array of objects).
 * @param {Array<string>} hdrs - The CSV headers (array of strings).
 * @returns {Promise<void>} A promise that resolves when data is successfully saved.
 */
export async function saveDataToIndexedDB(data, hdrs) {
    try {
        if (!db) {
            await openDatabase();
        }
        const transaction = db.transaction([STORE_NAME_CSV_DATA], 'readwrite');
        const store = transaction.objectStore(STORE_NAME_CSV_DATA);

        const dataToStore = {
            id: 'csv_content', // Fixed ID so there's only one active dataset
            parsedData: data,
            headers: hdrs
        };
        store.put(dataToStore);

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => {
                console.log('[IndexedDB] Active CSV Data saved to IndexedDB successfully.');
                parsedData = data; // Update global state
                headers = hdrs;     // Update global state
                resolve();
            };
            transaction.onerror = (event) => {
                console.error('[IndexedDB] Save transaction error (csvDataStore):', event.target.error);
                showMessageBox('Error saving active CSV data to database. It might be too large or corrupted.');
                reject(event.target.error);
            };
        });
    } catch (e) {
        console.error('[IndexedDB] Error in saveDataToIndexedDB execution:', e);
        showMessageBox('Could not save CSV data. Database might not be ready or another error occurred.');
    }
}

/**
 * Loads the active parsed data (parsedData array and headers array) from IndexedDB.
 * @returns {Promise<Object|null>} A promise that resolves with an object { parsedData, headers }
 * or null if no data is found.
 */
export async function loadDataFromIndexedDB() {
    try {
        if (!db) {
            await openDatabase();
        }
        const transaction = db.transaction([STORE_NAME_CSV_DATA], 'readonly');
        const store = transaction.objectStore(STORE_NAME_CSV_DATA);

        const request = store.get('csv_content');

        return new Promise((resolve, reject) => {
            request.onsuccess = (event) => {
                const result = event.target.result;
                if (result) {
                    parsedData = result.parsedData; // Update global parsedData
                    headers = result.headers;     // Update global headers
                    console.log(`[IndexedDB] Active CSV Data loaded from IndexedDB. Data points: ${parsedData.length}, Headers: ${headers.length}`);
                    console.log("[IndexedDB] Loaded headers:", headers);
                    resolve({ parsedData: parsedData, headers: headers });
                } else {
                    console.log('[IndexedDB] No active CSV data found in IndexedDB (result was null).');
                    parsedData = []; // Ensure global arrays are reset
                    headers = [];
                    resolve(null);
                }
            };
            request.onerror = (event) => {
                console.error('[IndexedDB] Load request error (csvDataStore):', event.target.error);
                showMessageBox('Error loading active CSV data from database. It might be corrupted.');
                reject(event.target.error);
            };
        });
    } catch (e) {
        console.error('[IndexedDB] Error in loadDataFromIndexedDB execution:', e);
        return null;
    }
}

/**
 * Clears the active CSV data from IndexedDB.
 * This effectively removes the stored active CSV data.
 * @returns {Promise<void>} A promise that resolves when data is cleared.
 */
export async function clearCSVDataFromIndexedDB() {
    try {
        if (!db) {
            await openDatabase();
        }
        const transaction = db.transaction([STORE_NAME_CSV_DATA], 'readwrite');
        const store = transaction.objectStore(STORE_NAME_CSV_DATA);
        store.clear();

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => {
                console.log('[IndexedDB] Active CSV Data in IndexedDB cleared successfully.');
                parsedData = [];
                headers = [];
                localStorage.removeItem(LOCAL_STORAGE_KEY_FILENAME);
                resolve();
            };
            transaction.onerror = (event) => {
                console.error('[IndexedDB] Clear transaction error (csvDataStore):', event.target.error);
                reject(event.target.error);
            };
        });
    } catch (e) {
        console.error('[IndexedDB] Error in clearCSVDataFromIndexedDB execution:', e);
    }
}

/**
 * Saves a chart configuration to IndexedDB.
 * @param {Object} chartConfig - The chart configuration object to save.
 * @returns {Promise<number>} A promise that resolves with the ID of the saved chart.
 */
export async function saveSavedChart(chartConfig) {
    try {
        if (!db) {
            await openDatabase();
        }
        const transaction = db.transaction([STORE_NAME_SAVED_CHARTS], 'readwrite');
        const store = transaction.objectStore(STORE_NAME_SAVED_CHARTS);
        const request = store.add(chartConfig);

        return new Promise((resolve, reject) => {
            request.onsuccess = (event) => {
                console.log('[IndexedDB] Chart saved successfully with ID:', event.target.result);
                resolve(event.target.result);
            };
            request.onerror = (event) => {
                console.error('[IndexedDB] Error saving chart:', event.target.error);
                reject(event.target.error);
            };
        });
    } catch (e) {
        console.error('[IndexedDB] Error in saveSavedChart execution:', e);
        throw e;
    }
}

/**
 * Loads all saved chart configurations from IndexedDB.
 * @returns {Promise<Array<Object>>} A promise that resolves with an array of saved chart configurations.
 */
export async function loadSavedCharts() {
    try {
        if (!db) {
            await openDatabase();
        }
        const transaction = db.transaction([STORE_NAME_SAVED_CHARTS], 'readonly');
        const store = transaction.objectStore(STORE_NAME_SAVED_CHARTS);
        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            request.onerror = (event) => {
                console.error('[IndexedDB] Error loading saved charts:', event.target.error);
                reject(event.target.error);
            };
        });
    } catch (e) {
        console.error('[IndexedDB] Error in loadSavedCharts execution:', e);
        return [];
    }
}

/**
 * Deletes a saved chart by its ID.
 * @param {number} chartId - The ID of the chart to delete.
 * @returns {Promise<void>} A promise that resolves when the chart is deleted.
 */
export async function deleteSavedChartById(chartId) {
    try {
        if (!db) {
            await openDatabase();
        }
        const transaction = db.transaction([STORE_NAME_SAVED_CHARTS], 'readwrite');
        const store = transaction.objectStore(STORE_NAME_SAVED_CHARTS);
        const request = store.delete(chartId);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                console.log('[IndexedDB] Chart deleted successfully:', chartId);
                resolve();
            };
            request.onerror = (event) => {
                console.error('[IndexedDB] Error deleting chart:', event.target.error);
                reject(event.target.error);
            };
        });
    } catch (e) {
        console.error('[IndexedDB] Error in deleteSavedChartById execution:', e);
        throw e;
    }
}

/**
 * Clears all saved chart configurations from IndexedDB.
 * @returns {Promise<void>} A promise that resolves when all saved charts are cleared.
 */
export async function clearAllSavedCharts() {
    try {
        if (!db) {
            await openDatabase();
        }
        const transaction = db.transaction([STORE_NAME_SAVED_CHARTS], 'readwrite');
        const store = transaction.objectStore(STORE_NAME_SAVED_CHARTS);
        store.clear();

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => {
                console.log('[IndexedDB] All saved charts cleared successfully.');
                resolve();
            };
            transaction.onerror = (event) => {
                console.error('[IndexedDB] Error clearing all saved charts:', event.target.error);
                reject(event.target.error);
            };
        });
    } catch (e) {
        console.error('[IndexedDB] Error in clearAllSavedCharts execution:', e);
        throw e;
    }
}

/**
 * Saves the active plot configuration for a specific page.
 * @param {string} pageId - The ID of the current page (e.g., 'home.html').
 * @param {Object} config - The plot configuration to save.
 * @returns {Promise<void>}
 */
export async function saveActivePlotConfig(pageId, config) {
    try {
        if (!db) await openDatabase();
        const transaction = db.transaction([STORE_NAME_ACTIVE_PLOT_CONFIG], 'readwrite');
        const store = transaction.objectStore(STORE_NAME_ACTIVE_PLOT_CONFIG);
        const dataToStore = { pageId: pageId, ...config };
        store.put(dataToStore);
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => {
                console.log(`[IndexedDB] Active plot config for ${pageId} saved.`);
                resolve();
            };
            transaction.onerror = (event) => {
                console.error(`[IndexedDB] Error saving active plot config for ${pageId}:`, event.target.error);
                reject(event.target.error);
            };
        });
    } catch (e) {
        console.error('[IndexedDB] Error in saveActivePlotConfig execution:', e);
    }
}

/**
 * Loads the active plot configuration for a specific page.
 * @param {string} pageId - The ID of the current page.
 * @returns {Promise<Object|null>}
 */
export async function loadActivePlotConfig(pageId) {
    try {
        if (!db) await openDatabase();
        const transaction = db.transaction([STORE_NAME_ACTIVE_PLOT_CONFIG], 'readonly');
        const store = transaction.objectStore(STORE_NAME_ACTIVE_PLOT_CONFIG);
        const request = store.get(pageId);
        return new Promise((resolve, reject) => {
            request.onsuccess = (event) => {
                resolve(event.target.result || null);
            };
            request.onerror = (event) => {
                console.error(`[IndexedDB] Error loading active plot config for ${pageId}:`, event.target.error);
                reject(event.target.error);
            };
        });
    } catch (e) {
        console.error('[IndexedDB] Error in loadActivePlotConfig execution:', e);
        return null;
    }
}

/**
 * Clears the active plot configuration for all pages.
 * @returns {Promise<void>}
 */
export async function clearActivePlotConfig() {
    try {
        if (!db) await openDatabase();
        const transaction = db.transaction([STORE_NAME_ACTIVE_PLOT_CONFIG], 'readwrite');
        const store = transaction.objectStore(STORE_NAME_ACTIVE_PLOT_CONFIG);
        store.clear();
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => {
                console.log('[IndexedDB] All active plot configurations cleared.');
                resolve();
            };
            transaction.onerror = (event) => {
                console.error('[IndexedDB] Error clearing active plot configurations:', event.target.error);
                reject(event.target.error);
            };
        });
    } catch (e) {
        console.error('[IndexedDB] Error in clearActivePlotConfig execution:', e);
    }
}


/**
 * Parses a CSV string into an object containing an array of objects for data and an array for headers.
 * Assumes the first row is headers. Handles potential malformed rows by skipping them.
 * @param {string} csvString - The CSV data as a string.
 * @returns {{data: Array<Object>, headers: Array<string>}} An object containing the parsed data and headers.
 * @throws {Error} If the CSV file is empty.
 */
export function parseCSV(csvString) {
    const lines = csvString.trim().split('\n');
    if (lines.length === 0) {
        throw new Error("The CSV file is empty.");
    }

    const hdrs = lines[0].split(',').map(header => header.trim());
    const dataRows = lines.slice(1);

    const prsdData = dataRows.map((row, rowIndex) => {
        const values = row.split(',').map(value => value.trim());
        if (values.length !== hdrs.length) {
            console.warn(`[CSV Parse] Skipping malformed row ${rowIndex + 2}: Mismatch in column count. Expected ${hdrs.length}, got ${values.length}. Row: "${row}"`);
            return null; // Return null for malformed rows
        }
        const rowObject = {};
        hdrs.forEach((header, index) => {
            // Attempt to convert to number if possible, otherwise keep as string
            rowObject[header] = isNaN(Number(values[index])) || values[index].trim() === '' ? values[index] : Number(values[index]);
        });
        return rowObject;
    }).filter(row => row !== null); // Filter out any nulls from malformed rows

    return { data: prsdData, headers: hdrs };
}