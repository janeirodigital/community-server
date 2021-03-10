#!/bin/bash

echo "Bootstrapping CSS"
echo "Parameters Provided: $@"

# replace environment variable(s) in root acl
envsubst < /community-server/templates/root/.acl-template > /community-server/templates/root/.acl
rm /community-server/templates/root/.acl-template

# replace environment variable(s) in pod root template acl
envsubst < /community-server/templates/pod/.acl-template > /community-server/templates/pod/.acl
rm /community-server/templates/pod/.acl-template

# replace environment variable(s) in pod profile template acl
envsubst < /community-server/templates/pod/profile/.acl-template > /community-server/templates/pod/profile/.acl
rm /community-server/templates/pod/profile/.acl-template


node /community-server/bin/server.js "$@"
