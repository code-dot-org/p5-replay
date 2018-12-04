# p5-replay

[![travis-ci](https://travis-ci.org/code-dot-org/p5-replay.svg?branch=master)](https://travis-ci.org/code-dot-org/p5-replay/builds)

Generates a movie file based on a p5 animation replay file, and uploads it to S3.

### Based on [serverless-ffmpeg](https://github.com/kvaggelakos/serverless-ffmpeg)

## Building/deploying
* Make sure the Docker daemon is installed and running (https://docs.docker.com/install/)
* The bucket name specified in `template.yml` *must be unique globally* because of S3's global bucket namespace - you might need to change it if it already exists (an error will occur when deploying if so)
* \[TODO\] Don't change the `node-canvas` version away from 2.0.0-alpha.13 - later releases seem to cause `node-gyp` problems
* Run the `build.sh` script, which will create a Docker image to build the application binaries
  * The first time this runs the Docker part will take a while to download, and there may be some red error text, but that's fine, it should complete quickly the next times it is run.
* Run the `deploy.sh` script to deploy the application CloudFormation stack.

## Local Testing
Local testing is possible via [`sam local`](https://github.com/awslabs/aws-sam-cli) and Docker:

* [Install](https://github.com/awslabs/aws-sam-cli/blob/develop/docs/installation.rst) the `AWS SAM CLI`
* `npm run test`

## Remote Testing
The Serverless deploy should display two endpoints after completion:

* GET - `https://[UNIQUE_ID].execute-api.us-east-1.amazonaws.com/dev/runTest`
* POST - `https://[UNIQUE_ID].execute-api.us-east-1.amazonaws.com/dev/render`

The `runTest` endpoint will generate a video based on the `replay.json` file deployed; `render` is a POST method that uses the body of the request. You can use the `replay.json` contents as the content of the POST request, just make sure the content type is `application/json` (use `raw` mode if you're sending requests via Postman).

## Sample Data
`node ./scripts/generateData.js number_of_frames number_of_sprites > ./test/fixtures/replay.json` will generate some random sample animation data with a given frame and sprite count.

## Built With

* [FFMPEG](https://github.com/FFmpeg/FFmpeg)
* [node-canvas](https://github.com/Automattic/node-canvas)
* [Docker](https://www.docker.com)
