#!/bin/bash -e

# cd to script directory (shh, it's magic: https://stackoverflow.com/questions/6393551/what-is-the-meaning-of-0-in-a-bash-script)
cd "${0%/*}"

echo -e '\n---------- Creating build/deploy container ----------\n'
docker build -t deploy-service-container -f ./Dockerfile .
echo -e '\n---------- Deploying to AWS ----------\n'
docker run -v ${PWD}/:/root/ deploy-service-container
