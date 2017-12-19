
/*eslint no-console: 0 */
'use strict';

/**
 * Google Cloud Function, single module, with single exported function.
 * @module index
 */

// The two main cloud API's used
const Storage = require('@google-cloud/storage');
const Translate = require('@google-cloud/translate');

// Some file system modules used
const fs = require('fs');
const path = require('path');

const TARGET_BUCKET = 'cclabs-translate-target';          // Change the bucket name to your own
const MAX_SEGMENT_SIZE = 128;                             // The max number of sentences to translate with single request
const SOURCE_LANGUAGE = 'en';                             // Language to translate from
const TARGET_LANGUAGE = 'nl';                             // Language to translate to

const REGEX_INDEX_LINE      = /^\d+$/;
const REGEX_TIMESTAMP_LINE  = /^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/;

// Construct clients for storage and translate services
const storage = new Storage();
const translate = new Translate();

exports.translateSRTFiles = (event) => {
  const object = event.data;
  
  // Exit if this is a deletion or a deploy event.
  if (object.resourceState === 'not_exists') {
    console.log('This is a deletion event.');

  } else if (!object.name) {
    console.log('This is a deploy event.');

  }

  const file = storage.bucket(object.bucket).file(object.name);

  // Construct the fiename of the output file
  const translatedFilename = path.parse(file.name).base.replace(`-${SOURCE_LANGUAGE}`,`-${TARGET_LANGUAGE}`);
  let content;
  
  console.log(`Processing new text file: ${object.name} (${object.contentType})`);
  return file.download()
    .then( data => {
      if (data)
        return data.toString('utf-8');
    })
    .then( data => {
      if (data) {
        // We have data, let's put it in a usable structure
        content = processData(data);

        // Only perform translation requests for sentences that are not an index, nor empty, nor a timestamp
        let filtered = content.sentences.filter( element => {
          let m = element.match(REGEX_INDEX_LINE);
          let n = element.match(REGEX_TIMESTAMP_LINE);
          return !( m || n || element === '');
        });
        
        console.log(`${filtered.length} lines of text need translation`);
        console.log(`Batch size: ${MAX_SEGMENT_SIZE}`);

        // Break up the translation request into multiple smaller requests
        let promises = [];
        let i = 0;
        while( i < filtered.length ) {
          let from = i;
          let to = Math.min(filtered.length-1, i+MAX_SEGMENT_SIZE-1);

          // console.log(`${from} -> ${to}`);
          promises.push(translate.translate(filtered.slice(from, to+1), TARGET_LANGUAGE));     // +1 because slice(start, end), end is not inclusive

          i += MAX_SEGMENT_SIZE;
        }
        
        console.log(`Performing ${promises.length} translation requests`);
        // Wait for all to finish using Promise.all()
        return Promise.all(promises)
          .then( results => {
            console.log('Translations done.');
            console.log(`${results.length} segments returned`);

            // Create a single array with all translations from the multiple translate requests
            let translations = [];
            results.forEach( segment => { translations = translations.concat(segment[0]); });

            // Insert the translations at the right place in the output
            content.requestLines.forEach( (position, i) => {
              content.output[position] = translations[i];
            });

          })
          .catch(err => {
            console.error(`Translation failed: ${err}`);
            return Promise.reject(`One or more translations failed (${err})`);
          });
    
      
      } else {
        console.error('Could not read data');
        return Promise.reject('Could not read data');
      }
    })
    .then( () => {
      let output = content.output.join('\n');
      let localFilename = `/tmp/${translatedFilename}`;
      
      //console.log(output);
      console.log(`Writing translated file locally to ${localFilename}.`);

      // Write the file.
      return new Promise((resolve, reject) => {
        fs.writeFile(localFilename, output, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    })
    .then( () => {
      let localFilename = `/tmp/${translatedFilename}`;
      console.log(`Uploading local file ${translatedFilename} to bucket ${TARGET_BUCKET}`);
      
      // Upload the file into the bucket.
      return storage
        .bucket(TARGET_BUCKET)
        .upload(localFilename, { destination: translatedFilename })
        .then( () => {
          console.log(`${localFilename} uploaded to ${TARGET_BUCKET}`);
        })
        .catch(err => {
          console.error('Error uploading translated file to bucket:', err);
        });
    })
    .then( () => {
      let localFilename = `/tmp/${translatedFilename}`;
      console.log(`Deleting local file ${localFilename}`);
      
      // Delete the temporary file.
      return new Promise((resolve, reject) => {
        fs.unlink(localFilename, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    })
    .then( () => {
      console.log('Finished.');
    })
    .catch( err => {
      console.error('Failed to download, translate or upload file.', err);
      return Promise.reject(err);
    });

};

/**
 * Puts the read data in a structure with info which lines require a translation request and a placeholder for output
 * @param {string} data UTF-8 string of read data from file on Google Cloud Storage
 */
function processData(data) {
  // Convert single string to array of individual lines
  let arrData = data.split(/\n/);

  // Prepare the structure
  let resultData = {
    sentences:    [],   // Array with the lines original read SRT file
    requestLines: [],   // Array containing indices of lines that need translation
    output:       []    // Array with the lines of the translated SRT file
  };
  
  // Fill the data structure and detect lines that need translation
  arrData.forEach( (element, index) => {
    let m = element.match(REGEX_INDEX_LINE);
    if(m) {
      //console.log(`Line number: ${m[0]}`);
      resultData.sentences.push(m[0]);
      resultData.output.push(m[0]);
      return;
    }
  
    m = element.match(REGEX_TIMESTAMP_LINE);
    if(m) {
      //console.log(`Timestamp ${m[0]}`);
      resultData.sentences.push(m[0]);
      resultData.output.push(m[0]);
      return;
    }
  
    if(element === '') {
      //console.log('Empty:');
      resultData.sentences.push('');
      resultData.output.push('');
      return;
    } else {
      //console.log(`Translatable: ${element}`);
      resultData.sentences.push(element);
      resultData.output.push(element);      // default the untranslated string in the output
      resultData.requestLines.push(index); 
      return;
    }

  });
  //console.log(resultData.join('\n'));
  console.log(`Lines read: ${resultData.sentences.length}`);
  return resultData;
}

/*
{
  'name': 'sample-en.txt',
  'bucket': 'cclabs-translate',
  'contentType': 'text/plain'
}
*/

/* gcloud beta functions deploy translateTxtFiles --stage-bucket gs://cclabs-functions-staging --trigger-bucket gs://cclabs-translate */