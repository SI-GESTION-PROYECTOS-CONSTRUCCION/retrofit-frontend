# Retrofit Frontend

Este es el proyecto frontend del sistema **Retrofit**, la interfaz principal para la gestión de proyectos de ingeniería, asignación de recursos y supervisión operativa de Retrofit Ingenieros Asociados SAC. Está construido utilizando **Angular 20**.

## 🚀 Tecnologías y Librerías Principales

- **Angular 20.1**: Framework web principal.
- **TypeScript**: Lenguaje base para un tipado fuerte y mayor seguridad.
- **RxJS**: Programación reactiva para el manejo de flujos de datos asíncronos y HTTP.
- **Chart.js**: Biblioteca utilizada para la generación de gráficos y estadísticas en tiempo real en los Dashboards.
- **DHTMLX Gantt**: Integración avanzada para la visualización y planificación de cronogramas y tareas de proyectos (Diagramas de Gantt).
- **Ng-Select**: Selectores y autocompletados modernos para formularios interactivos.

---

## 📂 Arquitectura del Proyecto

El código fuente principal está estructurado siguiendo las mejores prácticas de Angular (Módulos Standalone, estructura agrupada por características):

```text
src/app/
├── core/            # Elementos "singleton" que se instancian una sola vez
│   ├── guards/      # Guardias de rutas (ej. authGuard, guestGuard)
│   ├── interceptors/# Interceptores HTTP (ej. inyección del token JWT en cabeceras)
│   ├── models/      # Interfaces y tipos globales (DTOs del frontend)
│   ├── directives/  # Directivas estructurales globales (ej. *appHasPermission para control de acceso en la UI)
│   └── services/    # Servicios de conexión con la API y manejo de estado (Auth, User, etc.)
│
├── features/        # Módulos y páginas funcionales de la aplicación
│   ├── auth/        # Lógica de inicio de sesión y cambio de contraseña
│   ├── dashboard/   # Vistas principales de resumen
│   ├── gestion-*/   # Interfaces CRUD para usuarios, proyectos, recursos, etc.
│   └── ...
│
└── shared/          # Componentes visuales reutilizables "tontos" (Dumb Components)
    ├── components/  # Modales, loaders, skeleton screens
    └── pipes/       # Transformadores de datos en la UI
```

---

## 🔐 Seguridad y Rutas (Guards & Directives)

El Frontend interactúa de forma segura con el Backend a través de tokens JWT. 
- **authGuard / guestGuard**: Controlan que usuarios no autenticados no puedan entrar al dashboard y que usuarios logueados no vean el login (salvo que deban cambiar su contraseña por primera vez).
- **Directiva `*appHasPermission`**: Permite ocultar o mostrar de manera dinámica botones y secciones de la interfaz dependiendo de los permisos granulares (RBAC) que tiene asignado el perfil del usuario actual (ej. `USER_DELETE`, `USER_CREATE`).

---

## 🛠 Configuración del Entorno Local

Asegúrate de tener instalado **Node.js** (versión 20+ recomendada) y **Angular CLI** de forma global (`npm install -g @angular/cli`).

### 1. Instalación de Dependencias

Ejecuta el siguiente comando en la raíz del proyecto (donde se ubica este archivo `package.json`):

```bash
npm install
```

### 2. Variables de Entorno
Verifica el directorio `src/environments/`.
En desarrollo, se utiliza `environment.ts`, donde debe estar especificada la URL del servidor Backend local:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api/v1' // Ajustar si el backend corre en otro puerto
};
```

### 3. Servidor de Desarrollo

Para iniciar la aplicación, ejecuta:

```bash
ng serve
```

Navega a `http://localhost:4200/`. La aplicación se recargará automáticamente cada vez que cambies un archivo.

---

## 📦 Construcción para Producción

Para compilar el proyecto en una versión optimizada, lista para ser desplegada en un servidor web estático (Nginx, Apache, Vercel, Firebase Hosting, etc.):

```bash
ng build
```

Los artefactos finales se generarán en la carpeta `dist/retrofit-frontend/`.
