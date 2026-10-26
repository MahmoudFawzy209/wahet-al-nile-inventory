#!/usr/bin/env bash
# ========================================================
# برنامج إدارة مخزون مطعم واحة النيل - تشغيل محلي (Mac / Linux)
# ========================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

# 1. التحقق من Node.js
if ! command -v node &> /dev/null; then
    echo "خطأ: محرك Node.js غير مثبت. يرجى تثبيته من https://nodejs.org"
    exit 1
fi

# 2. تشغيل السيرفر إن لم يكن يعمل
if ! lsof -i:3005 > /dev/null 2>&1; then
    echo "جارٍ تشغيل السيرفر المحلي..."
    npm run start > /dev/null 2>&1 &
    sleep 2
fi

# 3. فتح البرنامج في المتصفح أو كنافذة تطبيق
echo "جارٍ فتح البرنامج..."
if command -v open &> /dev/null; then
    # نظام macOS
    open -a "Google Chrome" --args --app=http://localhost:3005 2>/dev/null || open "http://localhost:3005"
elif command -v google-chrome &> /dev/null; then
    # نظام Linux مع كروم
    google-chrome --app=http://localhost:3005 2>/dev/null &
elif command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:3005"
else
    echo "افتح الرابط التالي في متصفحك: http://localhost:3005"
fi
