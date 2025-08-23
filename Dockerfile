FROM node:slim

# ビルド引数でホストのUID/GIDを受け取る（デフォルト: 1000）
ARG UID=1000
ARG GID=1000
ARG USERNAME=nodeapp

# 必要ツールのインストールとユーザー/グループ作成
RUN set -eux; \
    groupadd -g ${GID} ${USERNAME} || groupmod -n ${USERNAME} $(getent group ${GID} | cut -d: -f1) || true; \
    useradd -m -u ${UID} -g ${GID} -s /bin/bash ${USERNAME} || true

WORKDIR /src

# 実行ユーザー切替
USER ${USERNAME}

