npm ci
docker build . -t solid-community-server:development
docker tag solid-community-server:development repo.janeirodigital.com:20443/xformativ-docker/solid-community-server:development
docker push repo.janeirodigital.com:20443/xformativ-docker/solid-community-server:development
