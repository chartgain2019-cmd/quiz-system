import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'quiz-system-secret-2024';

app.use(cors());
app.use(bodyParser.json());

// قاعدة بيانات في الذاكرة مع استعادة تلقائية
let database = {
  teachers: {},
  schools: {},
  results: []
};

// نظام استعادة البيانات التلقائي المتقدم
function initializeDatabase() {
  console.log('🔄 جاري تهيئة قاعدة البيانات...');
  
  // إعادة تعيين إذا كانت تالفة
  if (!database.teachers || typeof database.teachers !== 'object') {
    database.teachers = {};
    console.log('🔄 تم إعادة تعيين بيانات المعلمين');
  }
  if (!database.schools || typeof database.schools !== 'object') {
    database.schools = {};
    console.log('🔄 تم إعادة تعيين بيانات المدارس');
  }
  if (!database.results || !Array.isArray(database.results)) {
    database.results = [];
    console.log('🔄 تم إعادة تعيين بيانات النتائج');
  }
  
  // البيانات الافتراضية - يتم استعادتها تلقائياً إذا فقدت
  const defaultTeacher = {
    email: 'chartgain2019@gmail.com',
    password: '123456',
    name: 'أ. عبدالله الشهري',
    school: 'مدرسة الوليد بن عمارة الابتدائية',
    stage: 'ابتدائية',
    createdAt: new Date()
  };
  
  const defaultSchool = {
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
          },
          {
            question: 'ما هو ناتج 8 × 7؟',
            options: ['54', '56', '64', '48'],
            correct: 1
          }
        ]
      },
      {
        id: 'test_2',
        name: 'اختبار العلوم الفصل الأول',
        subject: 'العلوم',
        grade: 'الرابع ابتدائي',
        timerPerQuestion: 30,
        difficulty: 'متوسط',
        description: 'اختبار الفصل الأول في مادة العلوم',
        questions: [
          {
            question: 'أي من هذه الكواكب أقرب إلى الشمس؟',
            options: ['الزهرة', 'المريخ', 'عطارد', 'الأرض'],
            correct: 2
          },
          {
            question: 'ما هي العملية التي تنتج بها النباتات غذاءها؟',
            options: ['التنفس', 'البناء الضوئي', 'التبخر', 'التكاثر'],
            correct: 1
          }
        ]
      }
    ],
    createdAt: new Date()
  };
  
  // إضافة إذا لم تكن موجودة
  if (!database.teachers[defaultTeacher.email]) {
    database.teachers[defaultTeacher.email] = defaultTeacher;
    console.log('✅ تم استعادة المعلم الافتراضي');
  }
  
  if (!database.schools[defaultSchool.id]) {
    database.schools[defaultSchool.id] = defaultSchool;
    console.log('✅ تم استعادة البيانات الافتراضية');
  }
  
  console.log(`📊 الإحصائيات: ${Object.keys(database.teachers).length} معلم, ${Object.keys(database.schools).length} مدرسة`);
}

// 🔐 تسجيل الدخول
app.post('/api/login', (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔐 محاولة دخول:', email);
    
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
    console.error('❌ خطأ في تسجيل الدخول:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// 🔐 إنشاء حساب جديد
app.post('/api/register', (req, res) => {
  try {
    const { name, email, password, school, stage } = req.body;
    console.log('👨‍🏫 طلب تسجيل جديد:', email);
    
    if (database.teachers[email]) {
      return res.status(400).json({ error: 'البريد الإلكتروني مسجل مسبقاً' });
    }
    
    database.teachers[email] = {
      email: email,
      password: password,
      name: name,
      school: school,
      stage: stage,
      createdAt: new Date()
    };
    
    // إنشاء مدرسة تلقائياً
    const schoolId = 'school_' + Date.now();
    database.schools[schoolId] = {
      id: schoolId,
      name: school,
      teacher: name,
      tests: [],
      createdAt: new Date()
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
    console.error('❌ خطأ في التسجيل:', error);
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

// 🏫 الحصول على جميع المدارس (للبحث - بدون مصادقة)
app.get('/api/all-schools', (req, res) => {
  try {
    const allSchools = Object.values(database.schools).map(school => ({
      id: school.id,
      name: school.name,
      teacher: school.teacher
    }));
    
    console.log(`📊 إرجاع ${allSchools.length} مدرسة للبحث`);
    res.json(allSchools);
  } catch (error) {
    console.error('❌ خطأ في الحصول على المدارس:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// 📝 الحصول على اختبارات مدرسة
app.get('/api/tests/:schoolId', (req, res) => {
  try {
    const school = database.schools[req.params.schoolId];
    if (!school) {
      return res.status(404).json({ error: 'المدرسة غير موجودة' });
    }
    res.json(school.tests || []);
  } catch (error) {
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// 🔐 تغيير كلمة المرور
app.post('/api/change-password', (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ error: 'مصادقة مطلوبة' });
    }

    const token = authHeader.split(' ')[1];
    const user = jwt.verify(token, JWT_SECRET);
    
    const { currentPassword, newPassword } = req.body;
    const teacher = database.teachers[user.email];

    if (!teacher) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    
    if (teacher.password !== currentPassword) {
      return res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }
    
    teacher.password = newPassword;
    
    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح'
    });
    
  } catch (error) {
    console.error('❌ خطأ في تغيير كلمة المرور:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// 📊 حفظ النتائج
app.post('/api/results', (req, res) => {
  try {
    const result = {
      id: Date.now(),
      ...req.body,
      timestamp: new Date().toISOString()
    };

    database.results.push(result);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في حفظ النتيجة' });
  }
});

// 📊 الحصول على النتائج
app.get('/api/results', (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'مصادقة مطلوبة' });
    
    const token = authHeader.split(' ')[1];
    const user = jwt.verify(token, JWT_SECRET);
    
    const userResults = database.results.filter(
      result => result.teacher === user.name
    );
    
    res.json(userResults);
  } catch (error) {
    res.status(401).json({ error: 'رمز غير صالح' });
  }
});

// 🔄 مسار لاستعادة البيانات يدوياً
app.post('/api/reset-data', (req, res) => {
  try {
    // مسح البيانات الحالية
    database.teachers = {};
    database.schools = {};
    database.results = [];
    
    // إعادة التهيئة
    initializeDatabase();
    
    res.json({
      success: true,
      message: 'تم استعادة البيانات الافتراضية بنجاح',
      stats: {
        teachers: Object.keys(database.teachers).length,
        schools: Object.keys(database.schools).length,
        tests: database.schools['school_default']?.tests?.length || 0
      }
    });
  } catch (error) {
    console.error('❌ خطأ في استعادة البيانات:', error);
    res.status(500).json({ error: 'خطأ في الاستعادة' });
  }
});

// 🔍 مسار لفحص البيانات
app.get('/api/debug/data', (req, res) => {
  res.json({
    teachers: Object.keys(database.teachers),
    schools: Object.keys(database.schools),
    stats: {
      teachers_count: Object.keys(database.teachers).length,
      schools_count: Object.keys(database.schools).length,
      results_count: database.results.length,
      tests_count: database.schools['school_default']?.tests?.length || 0
    }
  });
});

// 🏠 صفحة الترحيب
app.get('/', (req, res) => {
  res.json({
    message: '🚀 نظام الاختبارات التفاعلي - الإصدار المحسن',
    version: '3.0.0',
    features: ['استعادة تلقائية', 'بيانات دائمة', 'أداء عالي'],
    endpoints: {
      login: 'POST /api/login',
      register: 'POST /api/register',
      schools: 'GET /api/schools',
      change_password: 'POST /api/change-password',
      reset_data: 'POST /api/reset-data',
      debug: 'GET /api/debug/data'
    },
    test_account: {
      email: 'chartgain2019@gmail.com',
      password: '123456'
    }
  });
});

// التهيئة عند البدء
initializeDatabase();

app.listen(PORT, () => {
  console.log('=================================');
  console.log('🚀 نظام الاختبارات - الإصدار المحسن');
  console.log(`🔗 http://localhost:${PORT}`);
  console.log('💾 نظام الاستعادة التلقائي مفعل');
  console.log('💰 الخادم المدفوع - أداء ممتاز');
  console.log('=================================');
});
