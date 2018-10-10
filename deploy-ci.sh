#!/bin/bash -xe

# Deploys the CI-service CloudFormation stack.

STACK=${STACK-'p5-replay-ci'}

TEMPLATE=ci.yml
aws cloudformation deploy \
  --template-file ${TEMPLATE} \
  --stack-name ${STACK} \
  "$@"
