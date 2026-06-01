# Sistema de Reporte de Incidentes UNIAMAZONIA

Aplicación web construida con React y Vite para registrar, consultar y dar seguimiento a incidentes dentro de la Universidad de la Amazonia. El proyecto integra autenticación con Firebase, persistencia en Firestore y almacenamiento de archivos con Supabase.

## Funcionalidades

- Página principal con presentación del sistema y efectos visuales/sonoros.
- Registro e inicio de sesión de usuarios con Firebase Authentication.
- Creación de perfil de usuario en Firestore al registrarse.
- Panel principal para reportar incidentes con formulario, ubicación, categorías y evidencia fotográfica.
- Uso de mapa interactivo con Leaflet para seleccionar ubicación.
- Consulta de incidentes con listado, filtros por estado y vista detallada.
- Manejo de notificaciones y roles de usuario desde Firestore.
- Integración con Supabase para la carga de archivos multimedia.

## Tecnologías

- React 19
- Vite
- Firebase Auth
- Firestore
- Supabase JS
- React Leaflet / Leaflet
- AOS para animaciones
- ESLint

## Estructura principal

- `src/App.jsx`: controla la navegación por hash y el acceso a login, registro y dashboard.
- `src/Components/Header`: encabezado con sesión activa y acciones de usuario.
- `src/Components/Main`: pantalla de bienvenida.
- `src/Pages/Login`: formulario de acceso.
- `src/Pages/Register`: formulario de registro.
- `src/Pages/Dashboard`: panel principal para reportar y administrar incidentes.
- `src/Pages/ConsultaIncidentes`: vista de consulta y detalle de incidentes.
- `src/Firebase/Config.js`: configuración de Firebase.
- `src/Supabase/supabaseClient.js`: cliente de Supabase.

## Requisitos

- Node.js 18 o superior.
- npm.
- Credenciales de Firebase configuradas.
- Variables de entorno de Supabase.

## Instalación

1. Instala dependencias:

```bash
npm install
```

2. Crea un archivo `.env` en la raíz del proyecto con estas variables:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
VITE_SUPABASE_BUCKET_NAME=incidentes
```

3. Inicia el proyecto en modo desarrollo:

```bash
npm run dev
```

4. Compila la versión de producción:

```bash
npm run build
```

5. Previsualiza la build:

```bash
npm run preview
```

## Configuración de Firebase

La inicialización de Firebase está en `src/Firebase/Config.js`. Ahí se usan los datos del proyecto Firebase y se exportan `auth` y `db` para autenticación y Firestore.

Si cambias de proyecto Firebase, actualiza esa configuración y asegúrate de que las colecciones usadas por la app existan o se creen al registrar usuarios e incidentes.

## Flujo general

1. El usuario entra a la pantalla principal.
2. Puede registrarse o iniciar sesión.
3. Al autenticarse, accede al panel para reportar incidentes.
4. Los incidentes se guardan en Firestore y, si corresponde, pueden incluir evidencia en Supabase.
5. Desde la vista de consulta se pueden revisar los reportes y su estado.

## Autores

- Maria Alejandra Ortiz Salazar
- Stefanny Gisell Moreno Rivera
- Juan Carlos Aroca Valenzuela

## Licencia

Proyecto académico para fines educativos.
