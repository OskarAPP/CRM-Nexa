# Security Hardening Roadmap

The critical and high findings were fixed in code. Items classified as "medios" and "bajos" have dedicated follow-up plans so they do not get lost.

| ID | Riesgo | Plan / Próximos pasos |
|----|--------|------------------------|
| 9  | Laravel 10 sin soporte extendido | Congelar dependencias actuales, luego planificar migración a Laravel 11 LTS durante Q1 2026. Crear rama `upgrade/laravel-11`, ejecutar `composer update`, ajustar breaking changes (routing, middleware aliases) y agregar pruebas de humo antes del despliegue. |
| 10 | React 19 muy nuevo | Fijar versiones exactas en `front/package.json` y preparar `yarn test` + `npm run lint` scripts para detectar regresiones. Evaluar regreso temporal a React 18 si aparecen issues en producción. |
| 11 | Falta validación de tamaño de archivos | El backend ahora valida y limita a 5 MB cuando se suben archivos en `/api/send-media`. Documentar límite en `README` del frontend y aplicar validaciones del lado del cliente para mostrar feedback inmediato. |
| 12 | Falta de tests automatizados | Incorporar PHPUnit y Vitest suites. Priorizar pruebas para autenticación, envío de mensajes y registro de credenciales. Integrar CI (GitHub Actions) que ejecute `composer test` y `npm run test` en cada pull request. |
| 13 | Código duplicado | Catalogar duplicaciones detectadas (p. ej. manejo de CSRF en múltiples componentes) y extraer utilidades compartidas (`src/lib/http.ts`). |
| 14 | AuthController muy grande | Dividir responsabilidades en clases dedicadas (`WhatsappSessionService`, `PasswordPolicyService`) y mover lógica de evolución a un servicio inyectable. |
| 15 | Información sensible en almacenamiento local | La capa de frontend ahora usa `sessionStorage` y limpieza automática, pero se completará la migración eliminando cualquier referencia residual y sustituyéndola por llamadas a `/api/me`. |
| 16 | Validación de números telefónicos | El backend valida números E.164 para todos los envíos. Próximo paso: añadir máscaras/ayuda visual en React para reducir errores de usuario. |

> Document updated: 2025-12-03
