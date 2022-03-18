#!/bin/bash

STUDENT_COUNT=10
SOURCE_FILE=submission.pdf
ASSIGNMENT_NAME=Assignment1

while getopts c:f:a: flag
do
    case "${flag}" in
        c) STUDENT_COUNT=${OPTARG};;
        a) ASSIGNMENT_NAME=${OPTARG};;
        f) SOURCE_FILE=${OPTARG};;
    esac
done

echo "Usage:"
echo ".\generate.sh [-a AssignmentName] [-c studentCount] [-f submission.pdf]"

mkdir "${ASSIGNMENT_NAME}"

for (( count=1; count<=STUDENT_COUNT; count++ ))
do
	echo "${ASSIGNMENT_NAME}/Student${count}_Surname${count}_s${count}_submission.pdf"
	cp "${SOURCE_FILE}" "${ASSIGNMENT_NAME}/Student${count}_Surname${count}_s${count}_submission.pdf"
done

zip "${ASSIGNMENT_NAME}.zip" "${ASSIGNMENT_NAME}"/*

rm -Rv "${ASSIGNMENT_NAME}"
