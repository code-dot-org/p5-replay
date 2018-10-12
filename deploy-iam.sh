#!/bin/bash -xe

# Deploys IAM-permissions CloudFormation stack.
# Requires admin access to create/modify IAM roles.

STACK=${STACK-'p5-replay-iam'}

TEMPLATE=iam.yml
aws cloudformation deploy \
  --template-file ${TEMPLATE} \
  --capabilities CAPABILITY_IAM \
  --stack-name ${STACK} \
  "$@"
