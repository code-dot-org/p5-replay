FROM amazonlinux:latest
ADD https://rpm.nodesource.com/setup_8.x ./setup.sh
RUN /bin/bash ./setup.sh
ADD https://dl.yarnpkg.com/rpm/yarn.repo /etc/yum.repos.d/yarn.repo
RUN yum install -y nodejs yarn
WORKDIR /build
ENV HOME=/build
CMD yarn --prod --cache-folder /tmp
