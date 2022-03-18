# powershell -ExecutionPolicy Bypass -File .\generate.ps1
param ([int]$c=10, $a="Assignment1", $f="submission.pdf")

$STUDENT_COUNT=${c}
$SOURCE_FILE=${f}
$ASSIGNMENT_NAME=${a}

Write-Host "Usage:"
Write-Host "generate.ps1 [-a AssignmentName] [-c studentCount] [-f submission.pdf]"


New-Item -Path "." -Name $ASSIGNMENT_NAME -ItemType "directory"

for ( $count=1; $count -le $STUDENT_COUNT; $count++ ){
	Write-Host "${ASSIGNMENT_NAME}/Student${count}_Surname${count}_s${count}_submission.pdf"
	Copy-Item -Path ${SOURCE_FILE} -Destination "${ASSIGNMENT_NAME}/Student${count}_Surname${count}_s${count}_submission.pdf"
}

Compress-Archive -Path ${ASSIGNMENT_NAME}\* -DestinationPath ".\${ASSIGNMENT_NAME}.zip"
Remove-Item -recurse ${ASSIGNMENT_NAME}
