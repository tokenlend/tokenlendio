#!/bin/bash

PID=`lsof -t -i:8545`

if [[ "" != $PID ]]; then
  kill -9 $PID
fi

./scripts/run_testrpc.sh 2> /dev/null > ./log/truffle_test.log &
truffle test --network development