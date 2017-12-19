var cloudfunction = require ('./index.js');

//Run local test
cloudfunction.translateSRTFiles({
  'data': {
    'name': 'sample-en.txt',
    'bucket': 'cclabs-translate',
    'resourceState': 'exists',
    'contentType': 'text/plain'
  }
});
