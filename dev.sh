#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 22 > /dev/null 2>&1
cd /home/bellum/finance-tracker
exec npx next dev --turbopack --hostname 0.0.0.0
