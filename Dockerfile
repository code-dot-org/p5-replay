FROM amazonlinux:latest
RUN curl --silent --location https://rpm.nodesource.com/setup_8.x | bash -
RUN curl --silent --location https://dl.yarnpkg.com/rpm/yarn.repo | tee /etc/yum.repos.d/yarn.repo
RUN yum install -y nodejs yarn
WORKDIR /build
ENV HOME=/build
CMD yarn --prod --cache-folder /tmp
