import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

app.use(cors());
app.use(bodyParser.json());

// قاعدة بيانات في الذاكرة (سيتم فقدانها عند إعادة التشغيل)
let database = {
  teachers: {
    'chartgain2019@gmail.com': {
      email: 'chartgain2019@gmail.com',
      password: '$2a$10$8K1p/a0dRTlR0dS.2T1nE.9z3jL8L8qL9kL8pL9kL8pL9kL8pL9kL', // 123456
      name: 'أ. عبدالله الشهري',
      school: 'مدرسة الوليد بن عمارة الابتدائية',
      stage: 'ابتدائية'
    }
  },
  schools: {
    'school_default': {
      id: 'school_default',
      name: 'مدرسة الوليد بن عمارة الابتدائية',
      teacher: 'أ. عبدالله الشهري',
      tests: [
        {
          id: 'test_1',
          name: 'اختبار الرياضيات الفصل الأول',
          subject: 'الرياضيات',
          grade: 'الرابع ابتدائي',
          timerPerQuestion: 30,
          difficulty: 'متوسط',
          description: 'اختبار الفصل الأول في مادة الرياضيات',
          questions: [
            {
              question: 'ما هو ناتج 15 + 27؟',
              options: ['42', '32', '52', '37'],
              correct: 0
            },
            {
              question: 'ما هو العدد الذي يمثل خمسة وعشرين؟',
              options: ['52', '25', '205', '250'],
              correct: 1
            }
          ]
        }
      ]
    }
  },
  results: []
};

// Middleware للمصادقة
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'رمز الوصول مطلوب' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'رمز وصول غير صالح' });
    }
    req.user = user;
    next();
  });
};

// 🔐 مسارات المصادقة
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, school, stage } = req.body;
    
    if (database.teachers[email]) {
      return res.status(400).json({ error: 'البريد الإلكتروني مسجل مسبقاً' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    database.teachers[email] = {
      email,
      password: hashedPassword,
      name,
      school,
      stage
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
    res.json({ success: true, token, user: { email, name, school, stage } });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const teacher = database.teachers[email];

    if (!teacher || !(await bcrypt.compare(password, teacher.password))) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }

    const token = jwt.sign({ email, name: teacher.name }, JWT_SECRET);
    res.json({ 
      success: true, 
      token, 
      user: { 
        email, 
        name: teacher.name, 
        school: teacher.school, 
        stage: teacher.stage 
      } 
    });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// 🏫 مسارات المدارس
app.get('/api/schools', authenticateToken, (req, res) => {
  const userSchools = Object.values(database.schools).filter(
    school => school.teacher === req.user.name
  );
  res.json(userSchools);
});

// 📝 مسارات الاختبارات
app.get('/api/tests/:schoolId', authenticateToken, (req, res) => {
  const school = database.schools[req.params.schoolId];
  if (!school || school.teacher !== req.user.name) {
    return res.status(404).json({ error: 'المدرسة غير موجودة' });
  }
  res.json(school.tests);
});

app.post('/api/tests/:schoolId', authenticateToken, (req, res) => {
  const school = database.schools[req.params.schoolId];
  if (!school || school.teacher !== req.user.name) {
    return res.status(404).json({ error: 'المدرسة غير موجودة' });
  }

  const newTest = {
    id: 'test_' + Date.now(),
    ...req.body,
    createdAt: new Date().toISOString()
  };

  school.tests.push(newTest);
  res.json({ success: true, test: newTest });
});

// 📊 مسارات النتائج
app.post('/api/results', authenticateToken, (req, res) => {
  const result = {
    id: Date.now(),
    ...req.body,
    teacher: req.user.name,
    timestamp: new Date().toISOString()
  };

  database.results.push(result);
  res.json({ success: true, result });
});

app.get('/api/results', authenticateToken, (req, res) => {
  const userResults = database.results.filter(
    result => result.teacher === req.user.name
  );
  res.json(userResults);
});

// 🏠 صفحة الترحيب
app.get('/', (req, res) => {
  res.json({ 
    message: 'مرحباً في نظام الاختبارات التفاعلي',
    version: '1.0.0',
    endpoints: {
      login: 'POST /api/login',
      register: 'POST /api/register',
      schools: 'GET /api/schools',
      tests: 'GET /api/tests/:schoolId'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
  console.log(`🔗 العنوان: http://localhost:${PORT}`);
});