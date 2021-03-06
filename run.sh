#!/usr/bin/env bash

set -euo pipefail

cd $(dirname $0)

docker \
    run \
    --tty \
    --interactive \
    --rm \
    --env CI \
    --env DRY \
    --env CF_USERNAME \
    --env CF_PASSWORD \
    --env CF_ORG \
    --env CF_SPACE \
    --volume $(pwd)/cfpush.log:/cfpush/cfpush.log \
    mamachanko/cfpush:latest $@
