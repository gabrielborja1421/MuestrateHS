# Creador de Landing Pages (Muestrate Builder)

Esta es una plataforma Full-Stack en Node.js y Express para crear, personalizar y alojar landing pages con subrutas dinámicas (ej: `muestrate.com.mx/HardSoft`), catálogo de productos (CRUD) y sistema de opiniones (reseñas) para clientes con moderación del lado del administrador.

---

## 🚀 Inicio Rápido (Local)

1. **Instalar Dependencias:**
   ```bash
   npm install
   ```
2. **Iniciar el Servidor:**
   ```bash
   npm start
   ```
3. **Acceder:**
   * **Landing Page de Pepe (HardSoft):** `http://localhost:3000/HardSoft`
   * **Panel de Administración (Login):** `http://localhost:3000/admin`
     * **Usuario:** `HardSoft`
     * **Contraseña:** `admin123`

---

## ☁️ Guía de Despliegue en AWS

Tienes dos formas de utilizar esta plataforma en AWS dependiendo de tus necesidades:

### Opción A: Desplegar toda la Plataforma (Node.js Backend) en AWS Elastic Beanstalk o EC2
*Recomendado para tener el panel de control activo, permitir nuevos registros de negocios, guardar cambios en base de datos y recibir reseñas en tiempo real.*

#### Despliegue en AWS Elastic Beanstalk (La forma más fácil):
1. **Preparar el Archivo ZIP:**
   Comprime todos los archivos del proyecto (excluyendo la carpeta `node_modules` y carpetas ocultas de Git) en un archivo `.zip`. Asegúrate de que `package.json` y `server.js` estén en la raíz del archivo ZIP.
2. **Crear una Aplicación en Elastic Beanstalk:**
   * Ve a la consola de AWS -> **Elastic Beanstalk**.
   * Haz clic en **Create Application**.
   * Elige la plataforma **Node.js** (deja la versión recomendada por defecto).
   * En **Application code**, selecciona **Upload your code** y sube el archivo `.zip` que creaste.
   * Selecciona el tipo de instancia (una instancia `t3.micro` o `t2.micro` de capa gratuita es más que suficiente).
3. **Configurar el Puerto (Opcional):**
   Elastic Beanstalk configura automáticamente el puerto en la variable de entorno `PORT`, por lo que el servidor Express funcionará de inmediato.
4. **Persistencia de la Base de Datos:**
   * *Nota Importante para AWS:* Como la base de datos se guarda en un archivo local (`data/database.json`), si la instancia de EC2 de Beanstalk se reinicia o escala, los cambios se perderán.
   * *Solución recomendada para AWS:* Para producción, puedes modificar las funciones `readDatabase` y `writeDatabase` en `server.js` para leer y escribir el archivo `database.json` en un **Bucket de AWS S3**, o conectar la aplicación a una base de datos **Amazon DynamoDB**.

---

### Opción B: Alojar la Landing Page Exportada en AWS S3 (Costo Casi Cero)
*Recomendado si Pepe edita su página localmente o en un entorno de desarrollo, exporta el archivo HTML y solo quiere subir la landing page final de HardSoft a un hosting estático en AWS.*

1. **Exportar la Landing:**
   Inicia sesión en `/admin` como `HardSoft`, haz tus cambios y haz clic en **Exportar Landing Page**. Se descargará un archivo llamado `HardSoft_landing_page.html`.
2. **Crear un Bucket en AWS S3:**
   * Ve a la consola de AWS -> **S3**.
   * Haz clic en **Create Bucket** y asígnale un nombre (ej: `hardsoft-landing`).
   * Desmarca la opción **Block all public access** (para permitir que los clientes accedan a la web).
3. **Habilitar Alojamiento de Sitios Web Estáticos:**
   * Entra al bucket -> Pestaña **Properties**.
   * Desplázate hasta abajo a **Static website hosting** y haz clic en **Edit**.
   * Selecciona **Enable**.
   * En **Index document**, escribe el nombre del archivo exportado o renombralo a `index.html` y colócalo ahí (ej: `index.html`).
   * Guarda los cambios.
4. **Subir los Archivos:**
   * Renombra `HardSoft_landing_page.html` a `index.html`.
   * Sube `index.html` a la raíz del bucket de S3.
   * Crea una carpeta `images` en el bucket y sube las imágenes que creaste (ej: `carrusel1.jpg`, `producto1.jpg`, etc.) para que se vean correctamente, o edita las URLs de tus imágenes en el panel antes de exportar para usar enlaces web públicos directos.
5. **Configurar Política de Acceso Público:**
   * Ve a la pestaña **Permissions** -> **Bucket Policy** e ingresa la siguiente política para hacer el contenido público:
     ```json
     {
         "Version": "2012-10-17",
         "Statement": [
             {
                 "Sid": "PublicReadGetObject",
                 "Effect": "Allow",
                 "Principal": "*",
                 "Action": "s3:GetObject",
                 "Resource": "arn:aws:s3:::TU-NOMBRE-DE-BUCKET/*"
             }
         ]
     }
     ```
6. **¡Listo!** El panel de propiedades de S3 te proporcionará una URL pública (ej: `http://hardsoft-landing.s3-website-us-east-1.amazonaws.com`) donde tus clientes podrán ver la landing page.
   * *Formulario de reseñas:* ¡Incluso alojado estáticamente en S3, el formulario de reseñas de los clientes enviará las opiniones directamente al servidor centralizado de Muestrate, actualizando el listado en tiempo real!

---

## 🛠️ Tecnologías Usadas
* **Backend:** Node.js, Express, BcryptJS.
* **Frontend:** Vanilla HTML5, Vanilla CSS3 (diseño responsivo con variables dinámicas, animaciones y glassmorphism), JavaScript interactivo (sin frameworks).
* **Base de Datos:** Almacenamiento JSON estructurado y persistente en el servidor.
