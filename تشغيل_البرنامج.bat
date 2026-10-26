@echo off
chcp 65001 > nul
title برنامج إدارة مخزون مطعم واحة النيل
color 0E

echo ========================================================
echo   برنامج إدارة مخزون مطعم واحة النيل
echo   المندي والمأكولات اليمنية الأصيلة - فرع سوهاج
echo ========================================================
echo   جارٍ فحص البيئة وتشغيل البرنامج محلياً...
echo ========================================================

cd /d "%~dp0"

REM 1. التحقق من وجود Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [تنبيه هام]:
    echo لم يتم العثور على محرك Node.js على هذا الجهاز.
    echo لتشغيل البرنامج محلياً، يرجى تحميل وتثبيت Node.js (مرة واحدة فقط مجاناً):
    echo https://nodejs.org/en/download
    echo.
    echo بعد التثبيت، اضغط على هذا الملف مرة أخرى وسيعمل تلقائياً.
    pause
    exit /b
)

REM 2. التحقق من تشغيل الخادم المحلي على المنفذ 3005
netstat -ano | findstr :3005 >nul 2>nul
if %errorlevel% neq 0 (
    echo   جارٍ تشغيل السيرفر المحلي في الخلفية...
    start "سيرفر المخزون - مطعم واحة النيل" /min cmd /c "npm run start"
    timeout /t 2 /nobreak > nul
)

echo   جارٍ فتح نافذة البرنامج...
echo ========================================================

REM 3. فتح البرنامج كنافذة تطبيق سطح مكتب مستقلة (Desktop App Mode)
start msedge --app=http://localhost:3005 2>nul
if %errorlevel% neq 0 (
    start chrome --app=http://localhost:3005 2>nul
    if %errorlevel% neq 0 (
        start http://localhost:3005
    )
)

exit
