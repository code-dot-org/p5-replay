#!/bin/bash
# Only to be run from within the Docker instance
cp $HOME/.awscredentials $HOME/.aws/credentials
yarn
yarn deploy
