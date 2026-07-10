const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'database.json');

app.use(cors());
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
app.use(express.json({ limit: '10mb' }));

const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// In-memory active sessions: token -> businessId
const activeSessions = new Map();

// Helper helper function to read db safely
function readDatabase() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error al leer la base de datos:', error);
    return {};
  }
}

// Helper to write db safely
function writeDatabase(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error al escribir en la base de datos:', error);
    return false;
  }
}

// Middleware to authenticate admin requests
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const businessId = req.params.id;

  if (!authHeader) {
    return res.status(401).json({ error: 'Acceso no autorizado. Token faltante.' });
  }

  const sessionBusinessId = activeSessions.get(authHeader);
  if (!sessionBusinessId || sessionBusinessId.toLowerCase() !== businessId.toLowerCase()) {
    return res.status(403).json({ error: 'Token inválido o expirado para este negocio.' });
  }

  req.businessId = sessionBusinessId;
  next();
}

// --- API ROUTES ---

// 1. Authenticate / Login
app.post('/api/auth/login', (req, res) => {
  const { businessId, password } = req.body;

  if (!businessId || !password) {
    return res.status(400).json({ error: 'ID de negocio y contraseña requeridos.' });
  }

  const db = readDatabase();
  const business = Object.keys(db).find(key => key.toLowerCase() === businessId.toLowerCase());

  if (!business) {
    return res.status(401).json({ error: 'Credenciales incorrectas.' });
  }

  const hash = db[business].password;
  const isMatch = bcrypt.compareSync(password, hash);

  if (!isMatch) {
    return res.status(401).json({ error: 'Credenciales incorrectas.' });
  }

  // Generate a random token
  const token = 'token_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  activeSessions.set(token, business);

  // Return data (exclude password)
  const businessData = { ...db[business] };
  delete businessData.password;

  res.json({
    token,
    businessId: business,
    data: businessData
  });
});

// 2. Register Business
app.post('/api/auth/register', (req, res) => {
  const { businessId, password, title, subtitle } = req.body;

  if (!businessId || !password) {
    return res.status(400).json({ error: 'ID de negocio y contraseña requeridos.' });
  }

  // Basic validation for sub-path format
  if (!/^[a-zA-Z0-9_-]+$/.test(businessId)) {
    return res.status(400).json({ error: 'El ID del negocio solo puede contener letras, números, guiones y guiones bajos.' });
  }

  const db = readDatabase();
  const exists = Object.keys(db).find(key => key.toLowerCase() === businessId.toLowerCase());

  if (exists || ['admin', 'api', 'images', 'css', 'js'].includes(businessId.toLowerCase())) {
    return res.status(400).json({ error: 'El ID de negocio ya existe o está reservado.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);

  db[businessId] = {
    password: hashedPassword,
    theme: {
      primaryColor: '#2563eb',
      secondaryColor: '#3b82f6',
      backgroundColor: '#f8fafc',
      textColor: '#0f172a',
      navBgColor: '#ffffff',
      footerBgColor: '#0f172a',
      cardBgColor: '#ffffff',
      fontFamily: 'Plus Jakarta Sans',
      buttonStyle: 'rounded',
      carouselType: 'slide',
      visibleSections: {
        features: true,
        carousel: true,
        products: true,
        reviews: true
      }
    },
    info: {
      title: title || businessId,
      subtitle: subtitle || 'Bienvenidos a nuestro negocio',
      logoUrl: '',
      description: 'Edita esta descripción para contarle a tus clientes qué hace tu negocio.',
      email: '',
      phone: '',
      address: '',
      heroBgType: 'color',
      heroBgImage: '',
      heroTextAlign: 'center',
      ctaText: 'Ver Catálogo',
      socialFacebook: '',
      socialInstagram: '',
      socialWhatsapp: '',
      socialTwitter: ''
    },
    features: [
      {
        id: "feat_1",
        icon: "fa-star",
        title: "Calidad Garantizada",
        description: "Ofrecemos los mejores servicios con la más alta calidad del mercado."
      }
    ],
    carouselImages: [
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085',
      'https://images.unsplash.com/photo-1461749280684-dccba630e2f6'
    ],
    products: [],
    reviews: []
  };

  if (writeDatabase(db)) {
    res.status(201).json({ message: 'Negocio registrado con éxito. Ya puedes iniciar sesión.' });
  } else {
    res.status(500).json({ error: 'Error al registrar el negocio.' });
  }
});

// 3. Get Public Business Data
app.get('/api/business/:id', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  const key = Object.keys(db).find(k => k.toLowerCase() === id.toLowerCase());

  if (!key) {
    return res.status(404).json({ error: 'Negocio no encontrado.' });
  }

  const businessData = { ...db[key] };
  delete businessData.password; // security: never expose password hash
  res.json(businessData);
});

// 4. Save Business Changes
app.post('/api/business/:id/save', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { theme, info, features, carouselImages, products, videos } = req.body;
  const db = readDatabase();
  const key = Object.keys(db).find(k => k.toLowerCase() === id.toLowerCase());

  if (!key) {
    return res.status(404).json({ error: 'Negocio no encontrado.' });
  }

  // Update business configuration
  if (theme) db[key].theme = theme;
  if (info) db[key].info = info;
  if (features) db[key].features = features;
  if (carouselImages) db[key].carouselImages = carouselImages;
  if (products) db[key].products = products;
  if (videos) db[key].videos = videos;

  if (writeDatabase(db)) {
    const updatedData = { ...db[key] };
    delete updatedData.password;
    res.json({ message: 'Cambios guardados correctamente.', data: updatedData });
  } else {
    res.status(500).json({ error: 'Error al guardar los cambios en la base de datos.' });
  }
});

// 5. Submit client review
app.post('/api/business/:id/reviews', (req, res) => {
  const { id } = req.params;
  const { name, rating, comment, contact } = req.body;

  if (!name || rating === undefined || !comment || !contact) {
    return res.status(400).json({ error: 'Nombre, calificación, comentario e información de contacto son requeridos.' });
  }

  const numericRating = parseFloat(rating);
  if (isNaN(numericRating) || numericRating < 0 || numericRating > 5) {
    return res.status(400).json({ error: 'La calificación debe ser un número entre 0 y 5.' });
  }

  const db = readDatabase();
  const key = Object.keys(db).find(k => k.toLowerCase() === id.toLowerCase());

  if (!key) {
    return res.status(404).json({ error: 'Negocio no encontrado.' });
  }

  const newReview = {
    id: 'rev_' + Date.now() + Math.random().toString(36).substring(2, 6),
    name,
    rating: numericRating,
    comment,
    contact
  };

  db[key].reviews = db[key].reviews || [];
  db[key].reviews.unshift(newReview); // add to top of reviews

  if (writeDatabase(db)) {
    res.status(201).json({ message: 'Reseña agregada con éxito.', review: newReview });
  } else {
    res.status(500).json({ error: 'Error al guardar la reseña.' });
  }
});

// 6. Delete review (Admin only)
app.delete('/api/business/:id/reviews/:reviewId', authenticateToken, (req, res) => {
  const { id, reviewId } = req.params;
  const db = readDatabase();
  const key = Object.keys(db).find(k => k.toLowerCase() === id.toLowerCase());

  if (!key) {
    return res.status(404).json({ error: 'Negocio no encontrado.' });
  }

  const originalLength = db[key].reviews ? db[key].reviews.length : 0;
  db[key].reviews = (db[key].reviews || []).filter(r => r.id !== reviewId);

  if (db[key].reviews.length === originalLength) {
    return res.status(404).json({ error: 'Reseña no encontrada.' });
  }

  if (writeDatabase(db)) {
    res.json({ message: 'Reseña eliminada correctamente.' });
  } else {
    res.status(500).json({ error: 'Error al eliminar la reseña en la base de datos.' });
  }
});

// 7. Local image upload API
app.post('/api/upload', (req, res) => {
  const { name, type, data } = req.body;

  if (!data) {
    return res.status(400).json({ error: 'No se recibieron datos de archivo.' });
  }

  try {
    let ext = 'png';
    if (type) {
      const parts = type.split('/');
      if (parts.length > 1) ext = parts[1];
    } else if (name) {
      const parts = name.split('.');
      if (parts.length > 1) ext = parts.pop();
    }
    
    // Clean extension
    ext = ext.split('+')[0];

    const base64Data = data.split(',')[1] || data;
    const buffer = Buffer.from(base64Data, 'base64');

    const filename = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);

    fs.writeFileSync(filePath, buffer);

    res.json({ url: `/uploads/${filename}` });
  } catch (error) {
    console.error('Error al subir imagen:', error);
    res.status(500).json({ error: 'Error del servidor al procesar y guardar la imagen.' });
  }
});

// ==========================================================
// --- SUPER-ADMIN (MASTER) API ENDPOINTS ---
// ==========================================================

function authenticateSuperAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Acceso no autorizado. Token faltante.' });
  }
  const sessionBusinessId = activeSessions.get(authHeader);
  if (!sessionBusinessId || sessionBusinessId.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado: Se requiere rol de super-administrador.' });
  }
  req.businessId = sessionBusinessId;
  next();
}

// 1. List all businesses
app.get('/api/admin/businesses', authenticateSuperAdmin, (req, res) => {
  const db = readDatabase();
  const list = Object.keys(db)
    .filter(k => k.toLowerCase() !== 'admin')
    .map(key => {
      return {
        businessId: key,
        title: db[key].info ? db[key].info.title : key,
        subtitle: db[key].info ? db[key].info.subtitle : '',
        productsCount: db[key].products ? db[key].products.length : 0,
        featuresCount: db[key].features ? db[key].features.length : 0,
        reviewsCount: db[key].reviews ? db[key].reviews.length : 0
      };
    });
  res.json(list);
});

// 2. Create new business account
app.post('/api/admin/businesses', authenticateSuperAdmin, (req, res) => {
  const { businessId, password, title, subtitle } = req.body;
  if (!businessId || !password || !title) {
    return res.status(400).json({ error: 'ID de negocio, contraseña y título son obligatorios.' });
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(businessId)) {
    return res.status(400).json({ error: 'El ID del negocio solo puede contener letras, números, guiones y guiones bajos (sin espacios).' });
  }
  
  if (['admin', 'api', 'images', 'css', 'js'].includes(businessId.toLowerCase())) {
    return res.status(400).json({ error: 'El ID del negocio no puede usar nombres reservados por el sistema.' });
  }
  
  const db = readDatabase();
  const exists = Object.keys(db).some(k => k.toLowerCase() === businessId.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'El ID del negocio ya está registrado.' });
  }
  
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  db[businessId] = {
    password: hashedPassword,
    theme: {
      primaryColor: '#52750f',
      secondaryColor: '#a3e635',
      backgroundColor: '#f8fafc',
      textColor: '#0f172a',
      navBgColor: '#ffffff',
      footerBgColor: '#0f172a',
      cardBgColor: '#ffffff',
      fontFamily: 'Plus Jakarta Sans',
      buttonStyle: 'rounded',
      carouselType: 'slide',
      logoType: 'both',
      logoSize: 'medium',
      heroLogoSize: 'medium',
      cardSize: 'medium',
      fontSize: 'medium',
      carouselHeight: 'aspect',
      visibleSections: { features: true, carousel: true, products: true, reviews: true, heroLogo: true, videos: true }
    },
    info: {
      title: title,
      subtitle: subtitle || 'Bienvenidos a nuestro negocio',
      logoUrl: '',
      description: 'Bienvenidos a nuestra página comercial oficial. Ofrecemos los mejores servicios y productos adaptados a tus necesidades.',
      phone: '',
      whatsapp: '',
      facebook: '',
      instagram: '',
      twitter: '',
      address: '',
      mapEmbedUrl: '',
      email: '',
      heroBgType: 'color',
      heroBgImage: '',
      heroBgColor: '#0f172a',
      heroGradientStart: '#52750f',
      heroGradientEnd: '#0f172a',
      heroTextAlign: 'center',
      ctaText: 'Ver Catálogo'
    },
    features: [
      { id: 'f1', title: 'Atención 100% Personalizada', description: 'Nos adaptamos a las necesidades únicas de cada uno de nuestros clientes.' },
      { id: 'f2', title: 'Calidad Garantizada', description: 'Trabajamos bajo los más altos estándares utilizando materiales premium.' },
      { id: 'f3', title: 'Soporte y Respuestas Rápidas', description: 'Estamos listos para atender tus dudas al instante por WhatsApp o correo.' }
    ],
    carouselImages: [],
    products: [],
    videos: [],
    reviews: []
  };
  
  if (writeDatabase(db)) {
    res.status(201).json({ message: 'Cuenta de cliente creada correctamente.' });
  } else {
    res.status(500).json({ error: 'Error al escribir en la base de datos.' });
  }
});

// 3. Reset client password
app.post('/api/admin/businesses/:businessId/reset-password', authenticateSuperAdmin, (req, res) => {
  const { businessId } = req.params;
  const { newPassword } = req.body;
  
  if (!newPassword || newPassword.trim() === '') {
    return res.status(400).json({ error: 'La nueva contraseña no puede estar vacía.' });
  }
  
  const db = readDatabase();
  const key = Object.keys(db).find(k => k.toLowerCase() === businessId.toLowerCase());
  
  if (!key) {
    return res.status(404).json({ error: 'El negocio no existe.' });
  }
  
  db[key].password = bcrypt.hashSync(newPassword, 10);
  
  if (writeDatabase(db)) {
    res.json({ message: 'Contraseña actualizada correctamente.' });
  } else {
    res.status(500).json({ error: 'Error al escribir en la base de datos.' });
  }
});

// 4. Delete client business account
app.delete('/api/admin/businesses/:businessId', authenticateSuperAdmin, (req, res) => {
  const { businessId } = req.params;
  if (businessId.toLowerCase() === 'admin') {
    return res.status(400).json({ error: 'No se puede eliminar la cuenta master de administrador.' });
  }
  
  const db = readDatabase();
  const key = Object.keys(db).find(k => k.toLowerCase() === businessId.toLowerCase());
  
  if (!key) {
    return res.status(404).json({ error: 'El negocio no existe.' });
  }
  
  delete db[key];
  
  if (writeDatabase(db)) {
    res.json({ message: 'Cuenta de cliente eliminada correctamente.' });
  } else {
    res.status(500).json({ error: 'Error al escribir en la base de datos.' });
  }
});


// --- STATIC & SUB-PATH ROUTING ---

// Serve static assets from /public folder
app.use(express.static(path.join(__dirname, 'public')));

// Specific admin route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dynamic business route
app.get('/:businessId', (req, res) => {
  const { businessId } = req.params;
  const db = readDatabase();
  const exists = Object.keys(db).find(k => k.toLowerCase() === businessId.toLowerCase());

  if (exists) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    // Redirect unrecognized subpaths to register or error page
    res.status(404).send('Negocio no encontrado. Por favor verifica la URL.');
  }
});

// Server listener
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
