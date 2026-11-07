---
description: "Actualizar la base de conocimiento de PSI Manager después de crear o modificar una funcionalidad importante. Usar después de completar una feature o refactor significativo."
name: "Actualizar Knowledge Base"
argument-hint: "Describe la funcionalidad nueva o modificada"
---

# Actualizar Knowledge Base de PSI Manager

Actualiza el archivo `.github/psi-knowledge-base.md` con la información de la nueva funcionalidad o modificación.

## Pasos

1. Lee `.github/psi-knowledge-base.md`
2. Identifica la sección correcta para actualizar:
   - **Nuevo componente**: Añadir a "Componentes Documentados"
   - **Nueva feature**: Añadir a "Features Recientes"
   - **Nuevo patrón**: Añadir a "Patrones de Código"
   - **Nueva regla de negocio**: Añadir a "Reglas de Negocio"
   - **Nueva decisión técnica**: Añadir a "Decisiones Técnicas"
   - **Nuevo problema conocido**: Añadir a "Troubleshooting Conocido"
3. Actualizar la fecha de "Última actualización"

## Formato para nuevos componentes

```markdown
### NombreComponente (`src/components/ruta/`)
- **Propósito**: Descripción clara
- **Features**: Lista de capacidades
- **Dependencias**: Qué importa, qué contextos usa
- **Patrones**: Patrones aplicados
- **Creado**: Fecha
```

## Formato para features recientes

```markdown
### YYYY-MM-DD - Nombre Feature
- **Descripción**: Qué hace
- **Archivos**: Lista de archivos modificados/creados
- **Patrones usados**: Lista de patrones
- **Decisiones**: Por qué se implementó así
```
