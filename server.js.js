import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'quiz-system-secret-2024';

app.use(cors());
app.use(bodyParser.json());

// قاعدة بيانات مبسطة
let database = {
  teachers: {
    'chartgain2019@gmail.com': {
      email: 'chartgain2019@gmail.com',
      password: '123456',
      name: 'أ. عبدالله الشهري',
      school: 'مدرسة الوليد بن عمارة الابتدائية',
      stage: 'ابتدائية'
    }
  },
  schools: {},
  results: []
};

// 🔐 تسجيل الدخول
app.post('/api/login', (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('طلب دخول:', email);
    
    const teacher = database.teachers[email];
    
    if (!teacher) {
      return res.status(401).json({ error: 'البريد الإلكتروني غير مسجل' });
    }
    
    if (teacher.password !== password) {
      return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
    }
    
    const token = jwt.sign({ 
      email: teacher.email, 
      name: teacher.name 
    }, JWT_SECRET);
    
    res.json({
      success: true,
      token: token,
      user: {
        email: teacher.email,
        name: teacher.name,
        school: teacher.school,
        stage: teacher.stage
      }
    });
    
  } catch (error) {
    console.error('خطأ في تسجيل الدخول:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// 🔐 إنشاء حساب جديد
app.post('/api/register', (req, res) => {
  try {
    const { name, email, password, school, stage } = req.body;
    console.log('طلب تسجيل جديد:', email);
    
    if (database.teachers[email]) {
      return res.status(400).json({ error: 'البريد الإلكتروني مسجل مسبقاً' });
    }
    
    database.teachers[email] = {
      email: email,
      password: password,
      name: name,
      school: school,
      stage: stage
    };
    
    // إنشاء مدرسة تلقائياً
    const schoolId = 'school_' + Date.now();
    database.schools[schoolId] = {
      id: schoolId,
      name: school,
      teacher: name,
      tests: []
    };
    
    const token = jwt.sign({ email, name }, JWT_SECRET);
    
    res.json({
      success: true,
      token: token,
      user: {
        email: email,
        name: name,
        school: school,
        stage: stage
      }
    });
    
  } catch (error) {
    console.error('خطأ في التسجيل:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// 🏫 الحصول على المدارس
app.get('/api/schools', (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ error: 'مصادقة مطلوبة' });
    }
    
    const token = authHeader.split(' ')[1];
    const user = jwt.verify(token, JWT_SECRET);
    
    const userSchools = Object.values(database.schools).filter(
      school => school.teacher === user.name
    );
    
    res.json(userSchools);
  } catch (error) {
    res.status(401).json({ error: 'رمز غير صالح' });
  }
});

// 🏠 صفحة الترحيب
app.get('/', (req, res) => {
  res.json({
    message: '🚀 نظام الاختبارات التفاعلي يعمل بنجاح!',
    version: '2.0.0',
    endpoints: {
      login: 'POST /api/login',
      register: 'POST /api/register', 
      schools: 'GET /api/schools'
    },
    test_account: {
      email: 'chartgain2019@gmail.com',
      password: '123456'
    }
  });
});

// 🔍 صفحة لفحص حالة API
app.get('/api/status', (req, res) => {
  res.json({
    status: 'يعمل',
    teachers_count: Object.keys(database.teachers).length,
    schools_count: Object.keys(database.schools).length
  });
});

app.listen(PORT, () => {
  console.log('=================================');
  console.log('🚀 خادم نظام الاختبارات التشغيل!');
  console.log(`🔗 http://localhost:${PORT}`);
  console.log('=================================');
  console.log('👨‍🏫 حسابات تجريبية:');
  console.log('   - chartgain2019@gmail.com / 123456');
  console.log('=================================');
});
