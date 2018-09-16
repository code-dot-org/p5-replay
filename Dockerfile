FROM amazonlinux:latest

RUN curl --silent --location https://rpm.nodesource.com/setup_8.x | bash -
RUN yum install -y nodejs zip
RUN npm install -g yarn
RUN npm install -g serverless
RUN yum groupinstall "Development Tools" -y
RUN yum install cairo-devel libjpeg-turbo-devel giflib-devel pango-devel -y

RUN mkdir -p /working
WORKDIR /working
ENV HOME=/working
COPY ./ /working/
COPY ./.awscredentials /working/.aws/credentials
ENTRYPOINT /bin/bash $HOME/docker_support_build_and_deploy.sh
