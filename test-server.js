// test-server.js - لاختبار الاتصال بالسيرفر
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api';

async function testServer() {
    console.log('🧪 بدء اختبار السيرفر...\n');

    try {
        // اختبار صفحة الترحيب
        console.log('1. 🔗 اختبار صفحة الترحيب...');
        const welcomeResponse = await fetch('http://localhost:3000');
        const welcomeData = await welcomeResponse.json();
        console.log('✅ صفحة الترحيب:', welcomeData.message);

        // اختبار الإحصائيات
        console.log('\n2. 📊 اختبار الإحصائيات...');
        const statsResponse = await fetch(`${BASE_URL}/statistics`);
        const statsData = await statsResponse.json();
        console.log('✅ الإحصائيات:', statsData);

        // اختبار المدارس العامة
        console.log('\n3. 🏫 اختبار المدارس العامة...');
        const schoolsResponse = await fetch(`${BASE_URL}/schools/public`);
        const schoolsData = await schoolsResponse.json();
        console.log(`✅ المدارس: ${schoolsData.length} مدرسة`);

        console.log('\n🎉 جميع الاختبارات نجحت! السيرفر يعمل بشكل صحيح.');

    } catch (error) {
        console.error('❌ فشل في اختبار السيرفر:', error.message);
        console.log('💡 تأكد من أن السيرفر يعمل على http://localhost:3000');
    }
}

testServer();