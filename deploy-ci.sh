#!/bin/bash -xe

STACK=${STACK-'p5-replay-ci'}

TEMPLATE=ci.yml
aws cloudformation deploy \
  --template-file ${TEMPLATE} \
  --stack-name ${STACK} \
  "$@"
