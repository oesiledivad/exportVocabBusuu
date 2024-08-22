document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('start');
    const includeImagesCheckbox = document.getElementById('include-images');
    
    if (startButton) {
        startButton.addEventListener('click', async () => {
            // Hide the start button to prevent multiple clicks
            startButton.style.display = 'none';

            try {
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                const tabId = tabs[0].id;

                // Mute the tab
                await new Promise((resolve, reject) => {
                    chrome.tabs.update(tabId, { muted: true }, () => {
                        if (chrome.runtime.lastError) {
                            console.error('Error muting tab:', chrome.runtime.lastError);
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve();
                        }
                    });
                });

                // Introduce a small delay to ensure the page is fully ready
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Execute the scraping function
                const includeImages = includeImagesCheckbox.checked;
                const results = await new Promise((resolve, reject) => {
                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        func: scrapePage,
                        args: [includeImages]
                    }, (results) => {
                        if (chrome.runtime.lastError) {
                            console.error('Error executing script:', chrome.runtime.lastError);
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve(results);
                        }
                    });
                });

                if (results && results[0] && results[0].result) {
                    const { files, csvData, filePrefix } = results[0].result;
                    //console.log('Sending message with files and CSV data');
                    chrome.runtime.sendMessage({ action: 'downloadFiles', files, csvData, filePrefix });
                } else {
                    console.error('Failed to retrieve data from the content script.');
                }
            } catch (error) {
                console.error('Error in processing:', error);
            } finally {
                // Re-enable the button after processing
                startButton.style.display = 'block'; // Make sure to re-display the button if needed
            }
        });
    } else {
        console.error('Start button not found in popup.');
    }
});

async function scrapePage(includeImages) {
    const files = [];
    const vocabularyData = [];
    
    const filePrefix = document.querySelector('p.vocab-list__header-course')?.innerText.trim() || '';

    function getFileExtension(url) {
        return url.substring(url.lastIndexOf('.'));
    }

    const vocabularyRows = document.querySelectorAll('.vocab-list-row');

    async function simulateClicksParallel(rows) {
        const clickPromises = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const clickPromise = new Promise((resolve) => {
                const imageClickElement = row?.childNodes[2]?.firstChild?.firstChild?.lastChild?.firstChild;
                const audioClickElement = row?.childNodes[6]?.firstChild?.lastChild;
                
                if (imageClickElement) imageClickElement.click();
                if (audioClickElement) audioClickElement.click();
                
                resolve();
            });

            clickPromises.push(clickPromise);
        }

        await Promise.all(clickPromises);
        await new Promise(resolve => setTimeout(resolve, 500)); // Adjust time as needed
    }

    function extractDataFromRow(row, index) {
        const wordData = {
            id: index,
            wordText: '',
            wordTranslation: '',
            wordStrength: '',
            wordAudioURL: '',
            wordImageURL: '',
            exampleText: '',
            exampleTranslation: '',
            exampleAudioURL: ''
        };

        if (includeImages) {
            const imageElement = row.querySelector('.vocab-list-row__image-wrap img');
            const imageURL = imageElement ? imageElement.getAttribute('src') : '';

            if (imageURL) {
                const imageFileName = `Busuu_${filePrefix}_image_${index}${getFileExtension(imageURL)}`;
                files.push({
                    url: imageURL,
                    filename: `Busuu_${filePrefix}/files/${imageFileName}`
                });

                wordData.wordImageURL = imageFileName;
            }
        }

        const audioSource = row.querySelector('.vocab-list-row__audio audio source');
        const audioURL = audioSource ? audioSource.getAttribute('src') : '';

        if (audioURL) {
            const audioFileName = `Busuu_${filePrefix}_audio_${index}${getFileExtension(audioURL)}`;
            files.push({
                url: audioURL,
                filename: `Busuu_${filePrefix}/files/${audioFileName}`
            });

            wordData.wordAudioURL = audioFileName;
        }

        const keyphraseElement = row.querySelector('.vocab-list-row__keyphrase');
        if (keyphraseElement) {
            const exampleAudioSource = keyphraseElement.querySelector('audio source');
            const exampleAudioURL = exampleAudioSource ? exampleAudioSource.getAttribute('src') : '';

            if (exampleAudioURL) {
                const exampleAudioFileName = `Busuu_${filePrefix}_audio_example_${index}${getFileExtension(exampleAudioURL)}`;
                files.push({
                    url: exampleAudioURL,
                    filename: `Busuu_${filePrefix}/files/${exampleAudioFileName}`
                });

                wordData.exampleAudioURL = exampleAudioFileName;
            }

            wordData.exampleText = keyphraseElement.querySelector('.vocab-list-row__keyphrase-course .font-face-lt')?.textContent.trim() || '';
            wordData.exampleTranslation = keyphraseElement.querySelector('.vocab-list-row__keyphrase-interface')?.textContent.trim() || '';
        }

        wordData.wordText = row.querySelector('.vocab-list-row__texts .vocab-list-row__course-language .font-face-lt')?.textContent.trim() || '';
        wordData.wordTranslation = row.querySelector('.vocab-list-row__texts .vocab-list-row__interface-language')?.textContent.trim() || '';
        wordData.wordStrength = row.querySelector('.vocab-strength-indicator__text')?.textContent.trim() || '';

        return wordData;
    }

    await simulateClicksParallel(vocabularyRows);

    for (let i = 0; i < vocabularyRows.length; i++) {
        const row = vocabularyRows[i];
        const wordData = extractDataFromRow(row, i);
        vocabularyData.push(wordData);
    }

    function convertToCSV(data) {
        const header = [
            '#separator:comma',
            '#html:true',
            '#tags column:10',
            '#columns:ID,wordText,wordTranslation,wordStrength,wordImage,wordAudio,exampleText,exampleTranslation,exampleAudio,Level tags'
        ];
        
        const rows = data.map(item => {
            const wordImageHTML = includeImages && item.wordImageURL ? `<img src='${item.wordImageURL}'>` : '';
            const wordAudioTag = item.wordAudioURL ? `[sound:${item.wordAudioURL}]` : '';
            const exampleAudioTag = item.exampleAudioURL ? `[sound:${item.exampleAudioURL}]` : '';

            return [
                item.id,
                item.wordText,
                item.wordTranslation,
                item.wordStrength,
                wordImageHTML,
                wordAudioTag,
                item.exampleText,
                item.exampleTranslation,
                exampleAudioTag,
                `Busuu_${filePrefix}`
            ].map(value => `"${value}"`).join(',');
        });

        return [...header, ...rows].join('\n');
    }

    const csvData = convertToCSV(vocabularyData);
    //console.log('CSV Data:', csvData);

    return { files, csvData, filePrefix };
}
