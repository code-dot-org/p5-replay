#!/bin/bash -e

# Builds binary dependencies using Docker.
# Optionally caches intermediate image layers if $REPO is provided.

# cd to script directory (shh, it's magic: https://stackoverflow.com/questions/6393551/what-is-the-meaning-of-0-in-a-bash-script)
cd "${0%/*}"

echo -e '\n---------- Creating node build container ----------\n'

if [ -n "${REPO}" ] ; then
  # Cache Docker-image layers from provided Docker repository.
  docker pull ${REPO}:build-${REF_NAME} || true
  OPTIONS="--cache-from ${REPO}:build-${REF_NAME} \
    --tag ${REPO}:build-${REF_NAME} \
    --tag ${REPO}:build-ref-${CODEBUILD_RESOLVED_SOURCE_VERSION}"
fi

docker build \
    --tag p5-replay/build-service \
    -f ./Dockerfile \
    ${OPTIONS} \
    .
echo -e '\n---------- Building node modules ----------\n'
rm -rf ./node_modules
rm -f yarn.lock
docker run \
    -v ${PWD}/src:/build/ \
    --rm \
    --user $UID:$UID \
    p5-replay/build-service

echo -e '\n---------- Creating ffmpeg build container ----------\n'

if [ -n "${REPO}" ] ; then
  # Cache Docker-image layers from provided Docker repository.
  docker pull ${REPO}:ffmpeg-${REF_NAME} || true
  OPTIONS="--cache-from ${REPO}:ffmpeg-${REF_NAME}
    --tag ${REPO}:ffmpeg-${REF_NAME} \
    --tag ${REPO}:ffmpeg-ref-${CODEBUILD_RESOLVED_SOURCE_VERSION}"
fi

docker build \
    --tag p5-replay/ffmpeg \
    -f ./ffmpeg.dockerfile \
    ${OPTIONS} \
    .
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

# Set fixed timestamps for idempotent Lambda packages.
find \
    src/binaries \
    src/node_modules \
    -type f \
    -exec \
    touch -d '2018-01-01T00:00:00Z' {} +
