# p5-replay
Generates a movie file based on a p5 animation replay file, and uploads it to S3.

### Based on [serverless-ffmpeg](https://github.com/kvaggelakos/serverless-ffmpeg)

## Building/deploying
* Make sure the Docker daemon is installed and running (https://docs.docker.com/install/)
* Copy the `.awscredentials.sample` file to `.awscredentials` and enter your credentials there
* \[TODO\] Don't change the `node-canvas` version away from 2.0.0-alpha.13 - later releases seem to cause `node-gyp` problems
* Run the `build_and_deploy.sh` script, which will create a Docker image to build the application and upload it to AWS Lambda using the Serverless framework
  * The first time this runs the Docker part will take a while to download, and there may be some red error text, but that's fine, it should complete quickly the next times it is run.
  * \[TODO\]: this may not fully work yet on the CDO account, where AWS credentials have limited permissions  

## Built With

* [Serverless](https://github.com/serverless/serverless) - The Serverless Framework
* [FFMPEG](https://github.com/FFmpeg/FFmpeg) - A collection of libraries and tools to process multimedia content such as audio, video, subtitles and related metadata.
* [node-canvas](https://github.com/Automattic/node-canvas)
* [Docker](https://www.docker.com)
