# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

## Sistema de Gestión de Pacientes PSI

Este proyecto incluye un sistema completo de gestión de pacientes para profesionales de la psicología, con autenticación, CRUD de pacientes, sistema de citas, pagos y seguimiento de deudas.

### Características principales:
- ✅ Autenticación de usuarios
- ✅ Gestión completa de pacientes (CRUD)
- ✅ Sistema de citas/turnos con estados
- ✅ Gestión de pagos y contribuciones
- ✅ Cálculo automático de deudas
- ✅ Visualización de próxima cita por paciente
- ✅ Diseño responsive y móvil-friendly

### Scripts SQL de Supabase

Para optimizar las consultas de la base de datos, se incluyen varios scripts SQL que deben ejecutarse en la consola SQL de Supabase:

#### 1. Configuración de Autenticación
- `src/sql/auth_check_secure.sql`: Función principal de autenticación segura
- `src/sql/auth_check_dev.sql`: Función para desarrollo (menos segura)
- `src/sql/auth_check.sql`: Función básica de verificación de autenticación

#### 2. Consultas de Pacientes Optimizadas
- `src/sql/get_patients_with_debt_summary.sql`: RPC para obtener pacientes con resumen de deuda
- `src/sql/patients_with_next_appointment.sql`: **RPC optimizada** que incluye deuda y próxima cita en una sola consulta

**¡IMPORTANTE!** Para obtener el mejor rendimiento, ejecuta el script `patients_with_next_appointment.sql` en la consola SQL de Supabase. Este script crea una función RPC optimizada que reduce significativamente el número de consultas necesarias para mostrar la información completa de pacientes.

### Estructura del Proyecto
```
src/
├── components/         # Componentes reutilizables
├── pages/             # Páginas principales
├── lib/               # Configuraciones y utilidades
├── sql/               # Scripts SQL para Supabase
├── styles/            # Estilos CSS
└── utils/             # Funciones auxiliares
```

### Despliegue
El frontend está optimizado para desplegarse en Vercel de manera gratuita. Simplemente conecta tu repositorio de GitHub a Vercel y el despliegue será automático.
