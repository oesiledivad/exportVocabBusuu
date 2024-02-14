## Export / Extract Vocabulary from Busuu Website in JSON
### Steps:
- Go to Review page: https://www.busuu.com/dashboard#/review
- Open browser console (Ctrl + Shift + J)
- MUTE THE TAB
- Copy/Paste and run the following code in the browser console:

``` javascript
const vocabularyData = [];

// Select all vocabulary list rows
const vocabularyRows = document.querySelectorAll('.vocab-list-row');

// Loop through each vocabulary row
vocabularyRows.forEach(row => {
    const wordData = {};

    // Trigger click event to reveal audio elements
    row.click();

    // Extract word text and translation
    const wordText = row.querySelector('.vocab-list-row__texts .vocab-list-row__course-language .font-face-lt').textContent.trim();
    const wordTranslation = row.querySelector('.vocab-list-row__texts .vocab-list-row__interface-language').textContent.trim();

    // Extract strength indicator
    const wordStrengthText = row.querySelector('.vocab-strength-indicator__text').textContent.trim();

    // Extract audioURL
    const audioElement = row.querySelector('.vocab-list-row__audio');
    audioElement.querySelector('button').click();
    const wordAudioURL = audioElement.querySelector('audio source');

    // Add extracted data to wordData object so far
    wordData.wordText = wordText;
    wordData.wordTranslation = wordTranslation;
    wordData.wordStrength = wordStrengthText;
    wordData.wordAudioURL = wordAudioURL;

    // Extract example sentence if it exists
    const keyphraseElement = row.querySelector('.vocab-list-row__keyphrase');
    if (keyphraseElement) {
        const exampleText = keyphraseElement.querySelector('.vocab-list-row__keyphrase-course .font-face-lt').textContent.trim();
        const exampleTranslation = keyphraseElement.querySelector('.vocab-list-row__keyphrase-interface').textContent.trim();
        const exampleAudioURL = keyphraseElement.querySelector('audio source').getAttribute('src');

        // Add example text, translation and audio to wordData object
        wordData.exampleText = exampleText;
        wordData.exampleTranslation = exampleTranslation;
        wordData.exampleAudioURL = exampleAudioURL;
    } else {
        // If example sentence doesn't exist, set to empty string
        wordData.exampleText = '';
        wordData.exampleTranslation = '';
        wordData.exampleAudioURL = '';
    }

    console.log(wordData);

    // Push wordData object to vocabularyData array
    vocabularyData.push(wordData);
});

// Convert vocabularyData to JSON
const jsonData = JSON.stringify(vocabularyData);

// Export JSON data
const blob = new Blob([jsonData], {
    type: 'application/json'
});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'vocabulary_data.json';
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);

console.log("Finished.");
```
- Wait for the download
