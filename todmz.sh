#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="internal-admin-front"
HOST="strukovd@192.168.50.83"
REMOTE_DIR="/opt/docker/services/internal-admin-front/scripts"

# increment (по умолчанию +1)
INC="${1:-1}"
if ! [[ "$INC" =~ ^[0-9]+$ ]]; then
  echo "INC must be a number (example: $0 1 or $0 5)"
  exit 1
fi

# Текущая версия из package.json (формат x.y.z)
PREV_VERSION="$(grep -oP '"version"\s*:\s*"\K[0-9]+\.[0-9]+\.[0-9]+' package.json | head -n1)"
if [[ -z "${PREV_VERSION}" ]]; then
  echo "Can't read version from package.json"
  exit 1
fi

# Инкрементим только patch (последнее число)
MAJOR_MINOR="$(echo "$PREV_VERSION" | grep -oP '^[0-9]+\.[0-9]+\.')"
PATCH="$(echo "$PREV_VERSION" | grep -oP '[0-9]+$')"
NEW_PATCH="$((PATCH + INC))"
CUR_VERSION="${MAJOR_MINOR}${NEW_PATCH}"

# Обновляем version в package.json
sed -i -E "s/(\"version\"[[:space:]]*:[[:space:]]*\")[0-9]+\.[0-9]+\.[0-9]+(\")/\1${CUR_VERSION}\2/" package.json
echo "Build version upgraded: ${PREV_VERSION} -> ${CUR_VERSION}"

# Обновляем assigneer (как у тебя)
GIT_USER="$(git config user.name || true)"
if [[ -n "${GIT_USER}" ]]; then
  sed -i -E "s/(\"assigneer\"[[:space:]]*:[[:space:]]*\").*(\",)/\1${GIT_USER}\2/" package.json
fi

# Билдим фронт
npm run build

# Docker build
echo "Docker build: ${SERVICE_NAME}:${CUR_VERSION}"
docker build -t "${SERVICE_NAME}:${CUR_VERSION}" \
  --label "git_user=${GIT_USER}" \
  --label "sys_info=$(uname -a)" \
  .

# Отправка образа на сервер DMZ
echo "Sending image to ${HOST}..."
docker save "${SERVICE_NAME}:${CUR_VERSION}" | ssh -C "${HOST}" docker load

# На сервере: обновляем .env + перезапуск
echo "Updating remote .env + restart..."
ssh -o BatchMode=yes "${HOST}" bash <<EOF
set -euo pipefail
cd '${REMOTE_DIR}'

if grep -qE '^VERSION=' .env; then
  sed -i -E 's/^VERSION=.*/VERSION=${CUR_VERSION}/' .env
else
  printf '\nVERSION=%s\n' '${CUR_VERSION}' >> .env
fi

echo "Remote VERSION now:"
grep -E '^VERSION=' .env

./stop.sh
./run.sh
./logs.sh
EOF

echo "Done: ${SERVICE_NAME}:${CUR_VERSION}"