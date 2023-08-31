FROM debian:bullseye

SHELL ["/bin/bash", "-c"]

ARG ASDF_VERSION=v0.11.1
ARG DIRENV_VERSION=2.32.2
ARG GO_VERSION=1.21.0
ARG NODE_VERSION=18.13.0
ARG SRC_MODULE=github.com/mkaiho/go-notice-slack-sample

RUN apt-get update -y && apt-get install -y \
  curl gcc make git zip unzip jq openssl ca-certificates gnupg lsb-release groff default-mysql-client pass gnupg2 iproute2 iputils-ping

RUN curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg \
  && echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
  && apt-get update -y && apt-get -y install docker-ce docker-ce-cli containerd.io docker-compose-plugin

RUN mkdir -p /go/src/$SRC_MODULE && chmod -R 777 /go
RUN chsh -s /bin/bash

WORKDIR /go/src/$SRC_MODULE

RUN git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch ${ASDF_VERSION} \
  && echo '. ~/.asdf/asdf.sh' >> ~/.bash_profile \
  && echo '. ~/.asdf/completions/asdf.bash' >> ~/.bash_profile \
  && echo 'asdf direnv setup --shell bash --version ${DIRENV_VERSION}' >> ~/.bash_profile \
  && . ~/.asdf/asdf.sh \
  && . ~/.asdf/completions/asdf.bash \
  && asdf plugin-add direnv https://github.com/asdf-community/asdf-direnv.git \
  && asdf direnv setup --shell bash --version ${DIRENV_VERSION} \
  && asdf global direnv ${DIRENV_VERSION} \
  && asdf plugin-add awscli https://github.com/MetricMike/asdf-awscli.git \
  && asdf install awscli latest:2 \
  && asdf global awscli latest \
  && asdf plugin-add aws-vault https://github.com/karancode/asdf-aws-vault.git \
  && asdf install aws-vault latest \
  && asdf global aws-vault latest \
  && asdf plugin-add golang https://github.com/kennyp/asdf-golang.git \
  && asdf install golang ${GO_VERSION} \
  && asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git \
  && asdf install nodejs ${NODE_VERSION}