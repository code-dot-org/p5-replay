#!/bin/bash -x
# Integration-test the asynchronous S3-event flow on a deployed application.
# Dependencies: bash, curl, jq, ffmpeg (ffplay)

DOMAIN=${DOMAIN?Required}

IFS='|' read uploadURL resultLocation < <(curl -sSL ${DOMAIN}/getS3UploadURL | jq -r '[.uploadURL, .resultLocation] | join("|")')
curl -sSL --upload-file src/test/fixtures/replay.json "$uploadURL"
URL="$DOMAIN$resultLocation"
until curl -X GET -fIL "$URL" >/dev/null 2>&1
do
  printf '.'
  sleep 1
done
curl -L "$URL" | ffplay -
