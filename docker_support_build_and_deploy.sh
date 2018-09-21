#!/bin/bash
# Only to be run from within the Docker instance
cp $HOME/.awscredentials $HOME/.aws/credentials
rm -rf ./node_modules
rm yarn.lock
yarn
yarn deploy
