**Disclaimer:**
This is not an officially supported Google product. Written code can be used as a baseline, it's not meant for production usage.

## Translate-SRT

Translate-SRT is a demonstration of using Google Cloud Functions. The demo leverages the Google Translate API to translate a subtitle text file file in [SubRip format](https://en.wikipedia.org/wiki/SubRip) from one language to another once it is placed in a Google Cloud Storage bucket. Current code specifies from `en` (english) to `nl` (Dutch), but this is easily altered.

The Cloud Function is triggered when a new subtitle is stored in a predfined Cloud Storage bucket. After finishing the translation, a new subtitle file with the same timings is stored in a second predfined Cloud Storage bucket.

## Getting the sample code

Get the latest sample code from GitHub using Git or download the repository as a ZIP file.
([Download](https://github.com/pbavinck/Translate-SRT/archive/master.zip))

    git clone https://github.com/pbavinck/Translate-SRT.git


## Before you begin

1.  Download and install the [Google Cloud
    SDK](https://cloud.google.com/sdk/docs/), which includes the
    [gcloud](https://cloud.google.com/sdk/gcloud/) command-line tool

1.  Create a [new Google Cloud Platform project from the Cloud Console](https://console.cloud.google.com/project) or use an existing one

1.  Initialize `gcloud`, set your project ID and [authorize the Cloud SDK](https://cloud.google.com/sdk/docs/authorizing)

        gcloud init
       
1.  Enable the [Google Translate API in Cloud Console](https://console.cloud.google.com/apis/library)

1. Create three buckets on Google Cloud Storage. One for staging the Cloud Function code (staging bucket). One for the to be translated subtitle files, which is the bucket that triggers the Cloud Function (source bucket). And one for storing the translated subtitle files (target bucket).


## Run Locally

We assume you already have `nodeJS` and `npm` installed. Before you can run the code locally, which will still use the remote Google Cloud buckets and the remote Google Translate API, you need to do the following:

1. From within the Translate-SRT folder, install the required node dependencies:

        npm install

1. Copy the file `.env_sample` to a new file with the name `.env`

1. Enter your source and target bucket names in the environment variables `TEST_BUCKET` and `TARGET_BUCKET` in this new file

1. Put a sample text file in SubRip format in your source bucket

1. Run the test using the command:

        node test.js

If all goes well you should see output similar to:
```
Processing new text file: sample-en.txt (text/plain)
Lines read: 7954
2510 lines of text need translation
Batch size: 128
Performing 20 translation requests
Translations done.
20 segments returned
Writing translated file locally to /tmp/sample-nl.txt.
Uploading local file sample-nl.txt to bucket <<target bucket>
/tmp/sample-nl.txt uploaded to <<target buckey>
Deleting local file /tmp/sample-nl.txt
Finished.
```

## Deploying to Cloud Functions

1.  Use the following command to deploy the code to Google Cloud Function.

        gcloud beta functions deploy translateSRTFiles --stage-bucket <<staging bucket name>> --trigger-bucket <<source bucket name>>

1.  Congratulations!  Your Cloud Function is now live and receives events from your source bucket.

## Licensing

* See [LICENSE](LICENSE)

