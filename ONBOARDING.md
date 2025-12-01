# 🚀 Sistema de Onboarding Interactivo

## 📋 Descripción

Sistema de guía interactiva que ayuda a los usuarios nuevos a configurar su tienda y AI Agent paso a paso. Se activa automáticamente cuando un usuario se registra por primera vez.

## ✨ Características

- **Automático**: Se inicia automáticamente para usuarios nuevos
- **Interactivo**: Overlay con pasos guiados y navegación automática
- **Visual**: Resalta elementos específicos de la interfaz
- **Progreso**: Barra de progreso y contador de pasos
- **Flexible**: Se puede saltar o reiniciar en cualquier momento
- **Persistente**: Guarda el estado en la base de datos

## 🎯 Flujo de Onboarding

### Paso 1: Bienvenida 🎉
- Mensaje de bienvenida
- Explicación del proceso

### Paso 2: Productos 📦
- Navega a `/products`
- Resalta el botón "Nuevo Producto"
- Guía para crear 2-3 productos de prueba

### Paso 3: WhatsApp 📱
- Navega a `/whatsapp`
- Resalta la sección de configuración
- Guía para conectar WhatsApp Business

### Paso 4: AI Agent 🤖
- Navega a `/ai-agent`
- Resalta la configuración del agente
- Guía para personalizar el asistente de IA

### Paso 5: Pruebas 💬
- Navega a `/chats`
- Muestra sección de pruebas
- Instrucciones para enviar mensaje de prueba

### Paso 6: Finalización 🎊
- Mensaje de felicitaciones
- Confirmación de configuración completa

## 🏗️ Arquitectura

### Componentes Principales

1. **`useOnboarding.tsx`**: Hook y contexto principal
   - Maneja el estado global del onboarding
   - Controla la navegación entre pasos
   - Persiste el progreso en la base de datos

2. **`OnboardingOverlay.tsx`**: Componente visual
   - Overlay con backdrop oscuro
   - Tarjeta flotante con información
   - Resaltado de elementos específicos
   - Botones de navegación

3. **`OnboardingButton.tsx`**: Botones de control
   - Botón para reiniciar onboarding
   - Botón de ayuda en el dashboard

### Base de Datos

```sql
-- Tabla: user_profiles
ALTER TABLE user_profiles 
ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
```

### Integración en App

```tsx
<OnboardingProvider>
  <App />
  <OnboardingOverlay />
</OnboardingProvider>
```

## 🎨 Personalización

### Modificar Pasos

Editar el array `ONBOARDING_STEPS` en `useOnboarding.tsx`:

```tsx
{
  id: 'step-id',
  title: 'Título del paso',
  description: 'Descripción detallada',
  page: 'nombre-de-pagina',
  targetSelector: '[data-testid="elemento"]',
  position: 'top' | 'bottom' | 'left' | 'right' | 'center',
  action: 'click' | 'navigate' | 'highlight' | 'wait',
  nextPage?: '/ruta-siguiente'
}
```

### Añadir Elementos Destacables

Agregar `data-testid` a elementos HTML:

```tsx
<Button data-testid="new-product-button">
  Nuevo Producto
</Button>
```

### Personalizar Estilos

Modificar clases CSS en `OnboardingOverlay.tsx`:

- **Backdrop**: `bg-black/60 backdrop-blur-sm`
- **Highlight**: `border-4 border-primary shadow-lg`
- **Card**: `shadow-2xl border-2 border-primary/20`

## 🔧 Configuración

### Activar/Desactivar

```tsx
// Desactivar onboarding automático
const { startOnboarding } = useOnboarding();

// Activar manualmente
startOnboarding();
```

### Reiniciar para Usuario

```sql
UPDATE user_profiles 
SET onboarding_completed = false 
WHERE id = 'user-id';
```

## 📱 Responsividad

- **Mobile**: Tarjeta adaptable con `max-width: 90vw`
- **Desktop**: Posicionamiento preciso según elementos
- **Tablets**: Diseño intermedio con buena legibilidad

## 🐛 Debugging

### Logs Disponibles

- Estado del onboarding en `useOnboarding`
- Posicionamiento de elementos en `OnboardingOverlay`
- Errores de base de datos en consola

### Problemas Comunes

1. **Elemento no encontrado**: Verificar `data-testid`
2. **Navegación no funciona**: Revisar rutas en `ONBOARDING_STEPS`
3. **No se guarda progreso**: Verificar conexión a Supabase

## 🚀 Próximas Mejoras

- [ ] Animaciones suaves entre pasos
- [ ] Soporte para múltiples idiomas
- [ ] Analytics de completación
- [ ] Onboarding condicional por tipo de usuario
- [ ] Integración con sistema de ayuda

## 📞 Soporte

Para problemas o mejoras del sistema de onboarding, revisar:

1. Logs de la consola del navegador
2. Estado de la base de datos en Supabase
3. Configuración de rutas en React Router
4. Elementos con `data-testid` en las páginas
