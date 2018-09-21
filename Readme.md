# p5-replay
Generates a movie file based on a p5 animation replay file, and uploads it to S3.

### Based on [serverless-ffmpeg](https://github.com/kvaggelakos/serverless-ffmpeg)

## Building/deploying
* Make sure the Docker daemon is installed and running (https://docs.docker.com/install/)
* The bucket name specified in `serverless.yml` *must be unique globally* because of S3's global bucket namespace - you might need to change it if it already exists (an error will occur when deploying if so)
* Copy the `.awscredentials.sample` file to `.awscredentials` and enter your credentials there
* \[TODO\] Don't change the `node-canvas` version away from 2.0.0-alpha.13 - later releases seem to cause `node-gyp` problems
* Run the `build_and_deploy.sh` script, which will create a Docker image to build the application and upload it to AWS Lambda using the Serverless framework
  * The first time this runs the Docker part will take a while to download, and there may be some red error text, but that's fine, it should complete quickly the next times it is run.
  * \[TODO\]: this may not fully work yet on the CDO account, where AWS credentials have limited permissions. For testing and development, the AWS free tier should have enough resources to temporarily develop against a personal account.  

## Local Testing
Local testing is possible on OS X, but not yet end-to-end (in the future we could pull in `serverless-offline` to make this possible). The local test does not use the same `ffmpeg` binaries as the ones run on AWS, so be aware that behavior may differ.

* `brew install pkg-config cairo pango libpng jpeg giflib` (dependencies need to be installed locally)
* `yarn install`
* `node localTest.js` will generate a video locally based on `test/fixtures/replay.json`

## Remote Testing
The Serverless deploy should display two endpoints after completion:

* GET - `https://[UNIQUE_ID].execute-api.us-east-1.amazonaws.com/dev/runTest`
* POST - `https://[UNIQUE_ID].execute-api.us-east-1.amazonaws.com/dev/render`

The `runTest` endpoint will generate a video based on the `replay.json` file deployed; `render` is a POST method that uses the body of the request. You can use the `replay.json` contents as the content of the POST request, just make sure the content type is `application/json` (use `raw` mode if you're sending requests via Postman).

## Sample Data
`node generateData.js number_of_frames number_of_sprites > ./test/fixtures/replay.json` will generate some random sample animation data with a given frame and sprite count.

## Built With

* [Serverless](https://github.com/serverless/serverless) - The Serverless Framework
* [FFMPEG](https://github.com/FFmpeg/FFmpeg) - A collection of libraries and tools to process multimedia content such as audio, video, subtitles and related metadata.
* [node-canvas](https://github.com/Automattic/node-canvas)
* [Docker](https://www.docker.com)
