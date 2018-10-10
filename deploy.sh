#!/bin/bash -xe

export OUTPUT_TEMPLATE=${OUTPUT_TEMPLATE-$(mktemp)}
./package.sh

STACK=${STACK-'p5-replay'}

aws cloudformation deploy \
  --template-file ${OUTPUT_TEMPLATE} \
  --stack-name ${STACK} \
  "$@"
