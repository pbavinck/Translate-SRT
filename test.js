require('dotenv').config();

var cloudfunction = require ('./index.js');

//Run local test
cloudfunction.translateSRTFiles({
  'data': {
    'name': 'sample-en.txt',
    'bucket': process.env.TEST_BUCKET,
    'resourceState': 'exists',
    'contentType': 'text/plain'
  }
});
