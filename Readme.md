# p5-replay

## Based on serverless-ffmpeg (https://github.com/kvaggelakos/serverless-ffmpeg)

## Building/deploying
* Make sure the Docker daemon is installed and running (https://docs.docker.com/install/)
* Copy the `.awscredentials.sample` file to `.awscredentials` and enter your credentials there
* Run the `build_and_deploy.sh` script, which will create a Docker image to build the application and upload it to AWS Lambda using the Serverless framework

## Built With

* [Serverless](https://github.com/serverless/serverless) - The Serverless Framework
* [Webpack](https://github.com/webpack/webpack) - A bundler for javascript and friends
* [FFMPEG](https://github.com/FFmpeg/FFmpeg) - A collection of libraries and tools to process multimedia content such as audio, video, subtitles and related metadata.
