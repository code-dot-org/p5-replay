#!/bin/bash -e

# cd to script directory (shh, it's magic: https://stackoverflow.com/questions/6393551/what-is-the-meaning-of-0-in-a-bash-script)
cd "${0%/*}"

echo -e '\n---------- Creating build container ----------\n'
docker build -t p5-replay/ffmpeg -f ./Dockerfile .
echo -e '\n---------- Extracting binary ----------\n'
docker run -v ${PWD}/:/root/ --rm --entrypoint cp --user $UID:$UID p5-replay/build ffmpeg/build/ffmpeg /root/
