#!/bin/bash -e

# cd to script directory (shh, it's magic: https://stackoverflow.com/questions/6393551/what-is-the-meaning-of-0-in-a-bash-script)
cd "${0%/*}"

echo -e '\n---------- Creating node build container ----------\n'
docker build -t p5-replay/build-service -f ./Dockerfile .
echo -e '\n---------- Building node modules ----------\n'
rm -rf ./node_modules
rm -f yarn.lock
docker run \
    -v ${PWD}/src:/build/ \
    --rm \
    --user $UID:$UID \
    p5-replay/build-service

echo -e '\n---------- Creating ffmpeg build container ----------\n'
docker build -t p5-replay/ffmpeg -f ./ffmpeg.dockerfile .
echo -e '\n---------- Extracting binary ----------\n'
rm -rf src/binaries/ffmpeg
mkdir -p src/binaries/ffmpeg
docker run \
    -v ${PWD}/src:/root/ \
    --rm \
    --entrypoint cp \
    --user $UID:$UID \
    p5-replay/ffmpeg \
    ffmpeg/build/ffmpeg \
    /root/binaries/ffmpeg/
