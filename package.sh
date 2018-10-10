#!/bin/bash -xe

if [ -z "$S3_BUCKET" ]; then
  echo 'S3_BUCKET is not defined' > /dev/stderr
  exit 1
fi

TEMPLATE=template.yml
OUTPUT_TEMPLATE=${OUTPUT_TEMPLATE-$(mktemp)}

aws cloudformation package \
  --template-file ${TEMPLATE} \
  --s3-bucket ${S3_BUCKET} \
  --output-template-file ${OUTPUT_TEMPLATE}
