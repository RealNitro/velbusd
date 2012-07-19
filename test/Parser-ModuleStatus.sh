#!/bin/bash

OUTPUT="$( echo -ne "\x0f\xfb\x85\x05\xed\x01\x00\x00\x00\x7e\x04" | ./Parser )"
test "$OUTPUT" == "ModuleStatusRequest to 0x85: Blind=1"
if [ $? -ne 0 ]; then
	echo "Wrong output: $OUTPUT"
	exit 1
fi

OUTPUT="$( echo -ne "\x0f\xfb\x85\x07\xed\x00\x03\xff\x00\x00\x00\x7b\x04" | ./Parser )"
test "$OUTPUT" == "ModuleStatusRequest to 0x85: Blind=1"
if [ $? -ne 0 ]; then
	echo "Wrong output: $OUTPUT"
	exit 1
fi
