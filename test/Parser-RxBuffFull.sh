#!/bin/bash

OUTPUT="$( echo -ne "\x0f\xf8\x00\x01\x0b\xed\x04" | ./Parser )"
test "$OUTPUT" == "RxBuffFull from 0x00"