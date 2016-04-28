@ECHO OFF
set f1=%~1
set f2=%~2
set f3=%~3
set f4=%~4
set fl1=1
set fl2=1
set fl3=1
set fl4=1

ECHO %f1%

IF "%f1%"=="x" (
	set fl1=0
)
IF EXIST %f1% ( set fl1=0)
IF "%f2%"=="x" (
	set fl2=0
)
IF EXIST %f2% ( set fl2=0)
IF "%f3%"=="x" (
	set fl3=0
)
IF EXIST %f3% ( set fl3=0)
IF "%f4%"=="x" (
	set fl4=0
)
IF EXIST %f4% ( set fl4=0)

set "fs=%fl1%%fl2%%fl3%%fl4%"
ECHO %fs%