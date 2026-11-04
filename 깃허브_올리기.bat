@echo off
chcp 65001 >nul
cd /d "%~dp0"
where git >nul 2>nul || (echo [오류] git이 없습니다. & pause & exit /b 1)
if not exist .git (
  git init
  git checkout -b main
  git remote add origin https://github.com/yallo3328/asgard-ko.git
)
git add -A
git commit -m "Korean dictionary update"
git push -u origin main || (echo [오류] push 실패. 위 메시지를 복사해서 알려주세요. & pause & exit /b 1)
echo.
echo 업로드 완료!
pause
