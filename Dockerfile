FROM amazonlinux:latest
ADD https://rpm.nodesource.com/setup_8.x ./setup.sh
RUN /bin/bash ./setup.sh
RUN yum install -y nodejs
WORKDIR /build
ENV HOME=/build
CMD npm install --production
