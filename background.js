chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'downloadFiles') {
        const { files, csvData, filePrefix } = message;

        console.log('Received files for download:', files);
        console.log('Received CSV data:', csvData);
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
                    console.error('Download failed:', chrome.runtime.lastError);
                } else {
                    console.log(`Download started with ID: ${downloadId}`);
                }
            });
        });
    }
});

function downloadCSV(csvData, filePrefix) {
    // Convert CSV data to a data URL
    const csvBlob = new Blob([csvData], { type: 'text/csv' });
    const reader = new FileReader();

    reader.onload = function(event) {
        const dataUrl = event.target.result;

        chrome.downloads.download({
            url: dataUrl,
            filename: `Busuu_${filePrefix}/Busuu_${filePrefix}_vocabulary.csv`
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error('CSV download failed:', chrome.runtime.lastError);
            } else {
                console.log(`CSV download started with ID: ${downloadId}`);
            }
        });
    };

    reader.readAsDataURL(csvBlob);
}
