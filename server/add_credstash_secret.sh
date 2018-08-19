#!/usr/bin/env bash
set -e

if ! [ -x "$(command -v credstash)" ]; then
  echo "This script requires credstash to run."
  exit 1
fi

SECRET_NAME=$1
SECRET_VALUE=$2
ENVIRONMENT=$3

if [[ "$ENVIRONMENT" != "local" && "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  echo "Usage: ./add_credstash_secret <name> <value> <local|staging|production>"
  echo "$ENVIRONMENT is not a valid environment. Please specify local, staging, or production as the third argument to this script."
  exit 1
fi

AWS_PROFILE=peblio credstash -r us-east-1 put "$SECRET_NAME.$ENVIRONMENT" "$SECRET_VALUE" "environment=$ENVIRONMENT" -a
