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

// middleware للمصادقة
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'رمز المصادقة مطلوب' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'رمز المصادقة غير صالح' });
        }
        req.user = user;
        next();
    });
};

// نظام استعادة البيانات التلقائي المحسن
function initializeDatabase() {
    console.log('🔄 جاري تهيئة قاعدة البيانات...');
    
    // إعادة تعيين إذا كانت تالفة
    if (!database.teachers || typeof database.teachers !== 'object') {
        database.teachers = {};
    }
    if (!database.schools || typeof database.schools !== 'object') {
        database.schools = {};
    }
    if (!database.results || !Array.isArray(database.results)) {
        database.results = [];
    }
    
    // البيانات الافتراضية
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
                    }
                ]
            }
        ],
        createdAt: new Date()
    };
    
    // تحديث البيانات الافتراضية مع الحفاظ على التغييرات
    if (!database.teachers[defaultTeacher.email]) {
        database.teachers[defaultTeacher.email] = defaultTeacher;
        console.log('✅ تم استعادة المعلم الافتراضي');
    }
    
    if (!database.schools[defaultSchool.id]) {
        database.schools[defaultSchool.id] = defaultSchool;
        console.log('✅ تم استعادة المدرسة الافتراضية');
    } else {
        const existingSchool = database.schools[defaultSchool.id];
        database.schools[defaultSchool.id] = {
            ...defaultSchool,
            ...existingSchool,
            tests: existingSchool.tests && existingSchool.tests.length > 0 ? 
                   existingSchool.tests : defaultSchool.tests
        };
    }
    
    console.log(`📊 الإحصائيات: ${Object.keys(database.teachers).length} معلم, ${Object.keys(database.schools).length} مدرسة`);
}

// 🔐 تسجيل الدخول
app.post('/api/login', (req, res) => {
    try {
        const { email, password } = req.body;
        
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
        
        const schoolId = 'school_' + Date.now();
        const newSchool = {
            id: schoolId,
            name: school,
            teacher: name,
            tests: [],
            createdAt: new Date()
        };
        
        database.schools[schoolId] = newSchool;
        
        const token = jwt.sign({ email, name }, JWT_SECRET);
        
        res.json({
            success: true,
            token: token,
            user: {
                email: email,
                name: name,
                school: school,
                stage: stage
            },
            school: newSchool
        });
        
    } catch (error) {
        console.error('❌ خطأ في التسجيل:', error);
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

// 👨‍🏫 الحصول على جميع المعلمين (جديد)
app.get('/api/teachers', (req, res) => {
    try {
        const teachers = Object.entries(database.teachers).map(([email, teacher]) => ({
            email: teacher.email,
            name: teacher.name,
            school: teacher.school,
            stage: teacher.stage,
            createdAt: teacher.createdAt
        }));
        res.json(teachers);
    } catch (error) {
        console.error('❌ خطأ في الحصول على المعلمين:', error);
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

// 🏫 الحصول على المدارس (مع مصادقة)
app.get('/api/schools', authenticateToken, (req, res) => {
    try {
        const userSchools = Object.values(database.schools).filter(
            school => school.teacher === req.user.name
        );
        res.json(userSchools);
    } catch (error) {
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

// 🏫 الحصول على جميع المدارس (للبحث - بدون مصادقة)
app.get('/api/schools/public', (req, res) => {
    try {
        const allSchools = Object.values(database.schools).map(school => ({
            id: school.id,
            name: school.name,
            teacher: school.teacher,
            testsCount: school.tests ? school.tests.length : 0
        }));
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

// ➕ إنشاء اختبار جديد (جديد)
app.post('/api/schools/:schoolId/tests', authenticateToken, (req, res) => {
    try {
        const school = database.schools[req.params.schoolId];
        if (!school) {
            return res.status(404).json({ error: 'المدرسة غير موجودة' });
        }
        
        const newTest = {
            id: 'test_' + Date.now(),
            ...req.body,
            createdAt: new Date()
        };
        
        if (!school.tests) school.tests = [];
        school.tests.push(newTest);
        
        res.json({ success: true, test: newTest });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في إنشاء الاختبار' });
    }
});

// ✏️ تحديث اختبار (جديد)
app.put('/api/schools/:schoolId/tests/:testId', authenticateToken, (req, res) => {
    try {
        const school = database.schools[req.params.schoolId];
        if (!school) {
            return res.status(404).json({ error: 'المدرسة غير موجودة' });
        }
        
        const testIndex = school.tests.findIndex(test => test.id === req.params.testId);
        if (testIndex === -1) {
            return res.status(404).json({ error: 'الاختبار غير موجود' });
        }
        
        school.tests[testIndex] = {
            ...school.tests[testIndex],
            ...req.body,
            updatedAt: new Date()
        };
        
        res.json({ success: true, test: school.tests[testIndex] });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في تحديث الاختبار' });
    }
});

// 🔐 تغيير كلمة المرور
app.post('/api/change-password', authenticateToken, (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const teacher = database.teachers[req.user.email];

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
app.get('/api/results', authenticateToken, (req, res) => {
    try {
        const userResults = database.results.filter(
            result => result.teacher === req.user.name
        );
        res.json(userResults);
    } catch (error) {
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

// 🗑️ حذف نتيجة (جديد)
app.delete('/api/results/:resultId', authenticateToken, (req, res) => {
    try {
        const resultId = parseInt(req.params.resultId);
        const resultIndex = database.results.findIndex(
            result => result.id === resultId && result.teacher === req.user.name
        );

        if (resultIndex === -1) {
            return res.status(404).json({ error: 'النتيجة غير موجودة' });
        }

        database.results.splice(resultIndex, 1);
        res.json({ success: true, message: 'تم حذف النتيجة' });
    } catch (error) {
        console.error('❌ خطأ في حذف النتيجة:', error);
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

// 🔄 مسار لاستعادة البيانات يدوياً
app.post('/api/reset-data', (req, res) => {
    try {
        database.teachers = {};
        database.schools = {};
        database.results = [];
        
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

// 📊 الحصول على إحصائيات عامة
app.get('/api/statistics', (req, res) => {
    try {
        const stats = {
            totalSchools: Object.keys(database.schools).length,
            totalTeachers: Object.keys(database.teachers).length,
            totalTests: Object.values(database.schools).reduce((sum, school) => 
                sum + (school.tests ? school.tests.length : 0), 0
            ),
            totalResults: database.results.length,
            activeTests: Object.values(database.schools).reduce((sum, school) => 
                sum + (school.tests ? school.tests.filter(test => test.questions && test.questions.length > 0).length : 0), 0
            )
        };
        
        res.json(stats);
    } catch (error) {
        console.error('❌ خطأ في الإحصائيات:', error);
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
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
            schools_public: 'GET /api/schools/public',
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
    console.log('🛡️ نظام المصادقة محسن');
    console.log('=================================');
});