#!/bin/bash

echo "$@"

# replace environment variable(s) in root acl
envsubst < /community-server/templates/root/.acl-template > /community-server/templates/root/.acl
rm /community-server/templates/root/.acl-template

# replace environment variable(s) in pod template acl
envsubst < /community-server/templates/pod/.acl-template > /community-server/templates/pod/.acl
rm /community-server/templates/pod/.acl-template

node /community-server/bin/server.js "$@"
