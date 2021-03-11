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

# run the migration at the startup
echo "Running DB Migrations"
db-migrate up --config database/database.json -e prod --migrations-dir database/migrations --verbose

# run CSS
echo "Starting CSS"
node /community-server/bin/server.js "$@"
