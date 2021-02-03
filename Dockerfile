# Use latest node LTS base image
FROM node:lts

# Container config & data dir for volume sharing
# Defaults to filestorage with /data directory (passed through CMD below)
RUN mkdir /community-server && mkdir /config && mkdir /data

COPY . /community-server/

WORKDIR /community-server
RUN npm ci

# This is installed such that envsubst can be used within bootstrap.sh
RUN apt update && apt-get install gettext-base

# Informs Docker that the container listens on the specified network port at runtime
EXPOSE 3000

# Set command run by the container
ENTRYPOINT [ "sh", "/community-server/bin/bootstrap.sh" ]

