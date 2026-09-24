@echo off
cd /d "%~dp0"
python -m unittest discover -s ml/tests -v
if errorlevel 1 goto failed
python ml/verify_inference.py
if errorlevel 1 goto failed
python ml/evaluate.py
if errorlevel 1 goto failed
cd backend
call mvnw.cmd -Dtest=NaiveBayesServiceTest,DiagnosisLogicTest test
if errorlevel 1 goto failed
cd /d "%~dp0frontend"
call npm ci
if errorlevel 1 goto failed
call npm run build
if errorlevel 1 goto failed
echo CHECKS PASSED. Start the backend and frontend, then follow the manual checklist.
pause
exit /b 0
:failed
echo A CHECK FAILED. Send the error above for review. Do not push yet.
pause
exit /b 1
