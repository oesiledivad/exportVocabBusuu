chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'downloadFiles') {
        const { files, csvData, filePrefix } = message;

        //console.log('Received files for download:', files);
        //console.log('Received CSV data:', csvData);
        console.log('Received file prefix:', filePrefix);

        // Download CSV data
        downloadCSV(csvData, filePrefix);

        // Download other files
        files.forEach(file => {
            chrome.downloads.download({
                url: file.url,
                filename: file.filename,
                conflictAction: 'uniquify'
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.error(`Download failed for file ${file.filename}:`, chrome.runtime.lastError);
                } else {
                    console.log(`Download started with ID: ${downloadId} for file ${file.filename}`);
                }
            });
        });
    }
});

function downloadCSV(csvData, filePrefix) {
    try {
        // Create a Blob from the CSV data
        const csvBlob = new Blob([csvData], { type: 'text/csv' });
        const reader = new FileReader();

        // Convert the Blob to a data URL
        reader.onload = function(event) {
            const dataUrl = event.target.result;

            // Start the download
            chrome.downloads.download({
                url: dataUrl,
                filename: `Busuu_${filePrefix}/Busuu_${filePrefix}_vocabulary.csv`,
                conflictAction: 'uniquify'
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.error('CSV download failed:', chrome.runtime.lastError);
                } else {
                    console.log(`CSV download started with ID: ${downloadId}`);
                }
            });
        };
        reader.readAsDataURL(csvBlob);
    } catch (error) {
        console.error('Error creating or using data URL for CSV download:', error);
    }
}