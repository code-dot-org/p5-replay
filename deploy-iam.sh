#!/bin/bash -xe

STACK=${STACK-'p5-replay-iam'}

TEMPLATE=iam.yml
aws cloudformation deploy \
  --template-file ${TEMPLATE} \
  --capabilities CAPABILITY_IAM \
  --stack-name ${STACK} \
  "$@"
