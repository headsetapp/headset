#!/usr/bin/env bash

set -e

source="build/Headset-linux-x64"
ignoring="(bin|Procfile|sig|gh-pages)"

electron-packager . \
  --executable-name headset \
  --ignore $ignoring \
  --prune true \
  --out build/ \
  --overwrite \
  --asar \
  --platform=linux \
  --arch=x64

echo -e '\n\033[1mFixing various file permissions: \033[01;0m'
find $source -type f -exec chmod 0644 {} +
chmod 0755 $source/headset
chmod 0755 $source/resources
chmod 0755 $source/locales
echo -e 'Done'
