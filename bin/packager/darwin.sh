#!/usr/bin/env bash

set -e

# if [[ -n "${CERT_PASSWORD}" && "${GITHUB_REPOSITORY:-false}" == "headsetapp/headset-electron" && "${GITHUB_REF:-false}" == refs/tags/* ]]; then
if [[ -n "${CERT_PASSWORD}" ]]; then
  key_chain=mac-build.keychain
  dir="${GITHUB_WORKSPACE:?}/sig"
  # dir="${PWD}/sig"
  password=headset

  echo "Creating default keychain"
  security create-keychain -p "${password}" "${key_chain}"
  # Make the keychain the default so identities are found
  security default-keychain -s "${key_chain}"
  # Unlock the keychain
  security unlock-keychain -p "${password}" "${key_chain}"
  # Set keychain locking timeout to 3600 seconds
  security set-keychain-settings -t 3600 -u "${key_chain}"

  # Add certificates to keychain and allow codesign to access them
  security import "${dir}/DeveloperIDG2CA-macos.cer" -k "${key_chain}" -A -T /usr/bin/codesign
  security import "${dir}/headset-macos.cer" -k "${key_chain}" -A -T /usr/bin/codesign
  security import "${dir}/headset-macos.p12" -k "${key_chain}" -P "${CERT_PASSWORD:?}" -A -T /usr/bin/codesign

  echo "Add keychain to keychain-list"
  security list-keychains -s "${key_chain}"

  echo "Settting key partition list"
  security set-key-partition-list -S apple-tool:,apple: -s -k "${password}" "${key_chain}"
else
  printf "\x1b[33m%s\x1b[0m\n" "The package will not be signed"
fi

OS=darwin DEBUG=electron-osx-sign node bin/packager/packager.js
