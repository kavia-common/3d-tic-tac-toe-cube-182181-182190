#!/bin/bash
cd /home/kavia/workspace/code-generation/3d-tic-tac-toe-cube-182181-182190/frontend_ui
npx eslint
ESLINT_EXIT_CODE=$?
npm run build
BUILD_EXIT_CODE=$?
if [ $ESLINT_EXIT_CODE -ne 0 ] || [ $BUILD_EXIT_CODE -ne 0 ]; then
   exit 1
fi

