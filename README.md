# FitPulse

App de fitness para iOS hecha con **React Native + Expo SDK 57 + TypeScript**. Cuenta pasos con el podómetro nativo de Apple, estima si caminas o corres con el acelerómetro, calcula la distancia aproximada, cronometra sesiones y guarda un historial local.

> Estado de validación (honesto): el proyecto compila en TypeScript, las 44 pruebas unitarias de la lógica pasan, Metro genera el bundle de iOS y `expo prebuild` produce el `Info.plist` con el permiso de movimiento. **No se ha ejecutado en un iPhone real** (se desarrolló en un entorno Linux sin dispositivo). Usa la lista de la sección 8 para validar en tu teléfono.

---

## 1. Arquitectura y por qué funciona en iOS

| Necesidad | Solución | Notas |
|---|---|---|
| Pasos | `Pedometer` de `expo-sensors` (envuelve `CMPedometer` de Apple) | **No hace falta módulo Swift propio**: ya viene en `expo-sensors`. Funciona en Expo Go y en development builds. |
| Caminar / correr | `Accelerometer` de `expo-sensors` + clasificador propio | Ventana de 3 s, filtro EMA, detección de picos, umbrales configurables e histéresis. |
| Distancia | pasos × longitud de paso | Longitud = f(altura, actividad, cadencia). Es una **estimación**, no GPS. |
| Historial y ajustes | `@react-native-async-storage/async-storage` | Escrituras serializadas y validación de datos corruptos. |
| Navegación | Expo Router (3 pestañas) | La sesión vive en un contexto por encima de las pestañas. |
| Pantalla encendida | `expo-keep-awake` | Opcional, activo durante la sesión. |
| GPS | **No incluido** en esta versión | Evita permisos extra y consumo de batería. `expo-location` no se instala. |

**Sin doble conteo:** los pasos vienen de **una sola fuente por sesión**. El podómetro es la fuente normal. El acelerómetro solo cuenta pasos como *respaldo exclusivo* si el podómetro no existe o el permiso fue denegado (la app lo avisa en pantalla). En una sesión con podómetro, el acelerómetro solo clasifica la actividad.

**Pausar / reanudar:** al pausar se cancelan las suscripciones del podómetro y del acelerómetro. Al reanudar se crea una suscripción nueva (el podómetro empieza de 0) y sus incrementos se suman al total. Además, el reducer ignora pasos y actividad que lleguen mientras la sesión no está en `running`, así que ni los pasos ni la distancia ni el tiempo crecen en pausa.

## 2. Estructura

```
fitpulse/
├── app/                      # Pantallas (Expo Router)
│   ├── _layout.tsx           # Proveedores (ajustes, sesión) + pantalla de carga
│   └── (tabs)/
│       ├── _layout.tsx       # Barra de pestañas
│       ├── index.tsx         # Hoy: sesión en vivo
│       ├── history.tsx       # Historial
│       └── settings.tsx      # Altura, unidades, pantalla encendida
├── components/               # StatCard, ActivityBadge, IntensityMeter, PrimaryButton, ...
├── context/
│   ├── SessionContext.tsx    # Orquesta sensores, sesión, permisos e historial
│   └── SettingsContext.tsx
├── hooks/                    # useAccelerometer, usePedometerSteps, useNow
├── services/                 # Lógica pura y acceso a sensores/almacenamiento
│   ├── activityClassifier.ts # Reposo / caminando / corriendo (umbrales configurables)
│   ├── stepCounter.ts        # Respaldo por acelerómetro (solo si no hay podómetro)
│   ├── cadence.ts            # Cadencia a partir de pasos acumulados
│   ├── distance.ts           # Longitud de paso y conversiones
│   ├── sessionEngine.ts      # Reducer de la sesión
│   ├── sensors.ts            # Disponibilidad y permisos
│   ├── storage.ts            # AsyncStorage
│   └── signal.ts             # Filtro y detector de picos
├── types/ · utils/ · constants/
├── __tests__/                # 44 pruebas (Jest)
├── app.json · eas.json · tsconfig.json · package.json
```

## 3. Requisitos

- Windows con **Node.js 20 o 22 LTS** y npm.
- Un iPhone físico (el simulador de iOS no tiene podómetro ni acelerómetro).
- No necesitas una Mac.

## 4. Instalación y ejecución

Descomprime el proyecto y, en PowerShell o la terminal que prefieras, dentro de la carpeta `fitpulse`:

```powershell
# 1. Instala todas las dependencias (obligatorio antes de correr la app)
npm install

# 2. (Opcional) Verifica tipos y corre pruebas
npm run typecheck
npm test
```

### Alternativa A: Expo Go (la más rápida, sin cuenta de Apple)

1. Instala **Expo Go** desde la App Store en el iPhone o Android.
2. En la terminal, levanta el servidor de desarrollo (asegúrate de haber corrido `npm install` primero):
   ```powershell
   npm start
   # o alternativamente: npx expo start
   ```
3. Escanea el QR con la cámara del iPhone (misma red Wi‑Fi) o desde la app Expo Go en Android. Si la red bloquea la conexión: `npx expo start --tunnel`.
4. Pulsa **Iniciar sesión**; iOS pedirá el permiso de *Movimiento y Fitness* (aparecerá a nombre de Expo Go).

Limitaciones: Expo Go debe soportar el SDK 57. Si al escanear dice que el proyecto es incompatible, usa la Alternativa B. No es una app independiente: el nombre, el ícono y los permisos son los de Expo Go.

### Alternativa B: development build con EAS Build (app propia, sin Mac)

**Requiere una cuenta de Apple Developer de pago (99 USD/año)** para firmar e instalar en un iPhone físico. Con un Apple ID gratuito solo se puede instalar desde Xcode en una Mac (certificado de 7 días), así que sin Mac no es una opción. El plan gratuito de Expo/EAS tiene un cupo limitado de compilaciones; revisa los límites vigentes en expo.dev/pricing.

1. Cambia `ios.bundleIdentifier` en `app.json` por uno único tuyo (por ejemplo `com.tunombre.fitpulse`).
2. En el iPhone (iOS 16 o superior): *Ajustes → Privacidad y seguridad → Modo de desarrollador* → activar y reiniciar.
3. Comandos, en este orden:
   ```powershell
   npm install -g eas-cli
   eas login
   eas init
   eas device:create          # registra tu iPhone (abre un enlace en el teléfono)
   eas build --profile development --platform ios
   ```
   Cuando termine, instala la app desde el enlace/QR que muestra EAS en el iPhone.
4. Arranca el servidor de desarrollo y abre la app instalada:
   ```powershell
   npx expo start --dev-client
   ```
5. Para una versión sin servidor (pruebas internas): `eas build --profile preview --platform ios`.

## 5. Permisos y configuración iOS

El permiso lo declara el plugin de `expo-sensors` en `app.json` (`motionPermission`). Se verificó con `expo prebuild` que el `Info.plist` resultante contiene `NSMotionUsageDescription` con tu texto. El permiso se solicita cuando el usuario pulsa **Iniciar sesión** por primera vez, no al abrir la app. Si lo deniega, la app usa el acelerómetro como respaldo y muestra un botón para abrir los Ajustes de iOS.

## 6. Segundo plano y pantalla bloqueada

- `CMPedometer` deja de entregar eventos en segundo plano. Al volver a primer plano, `expo-sensors` reanuda la suscripción y recibe el **acumulado** desde el inicio, por lo que los pasos dados en ese lapso se recuperan (mientras el sistema no haya cerrado la app).
- El **acelerómetro no se actualiza** en segundo plano: la actividad (reposo/caminando/corriendo) y su indicador no se actualizan con la pantalla bloqueada.
- El cronómetro cuenta tiempo real transcurrido de los tramos activos.
- Esta versión **no promete seguimiento continuo en segundo plano**. Por eso existe el ajuste *Mantener pantalla encendida* (activo por defecto).
- Si iOS cierra la app mientras la sesión está activa, la sesión en curso se pierde (no hay recuperación de sesión tras cierre forzado).

## 7. Precisión y limitaciones

- **Pasos:** el podómetro de Apple es la fuente más fiable. El respaldo por acelerómetro puede errar entre 10 y 25 %.
- **Distancia:** estimada con longitud de paso (≈0.41 × altura al caminar, hasta ≈0.85 × altura corriendo, ajustada por cadencia). Puede diferir de la distancia real; no es una medición GPS.
- **Caminar vs. correr:** es una estimación basada en la energía y la frecuencia del movimiento. Varía con el dispositivo, la posición del teléfono (bolsillo, mano, brazalete) y la forma de caminar.
- **Umbrales:** los valores por defecto están en `DEFAULT_CLASSIFIER_CONFIG` (`services/activityClassifier.ts`) y **no se han calibrado con un iPhone real**. Ajusta `restStd`, `runStd`, `runCadence` y `minWalkCadence` según tus pruebas.
- **Actividad predominante** del historial: la más frecuente entre caminar y correr durante la sesión; si no hubo movimiento clasificado, "En reposo".

## 8. Pruebas

### Automáticas (ya ejecutadas)

```powershell
npm run typecheck    # TypeScript estricto
npm test             # 44 pruebas: clasificador, distancia, cadencia, sesión, almacenamiento
npx expo export --platform ios   # compila el bundle con Metro
```

Cubren: reposo / caminar / correr con señales sintéticas, ignorar sacudidas aisladas, histéresis, vuelta a reposo, pausa y reanudación sin reinicios, distancia que no crece en pausa, pasos tardíos ignorados, guardado y recuperación del historial, datos corruptos y escrituras simultáneas.

### Que requieren un iPhone físico

1. **Permiso:** al pulsar *Iniciar sesión* aparece el diálogo de Movimiento y Fitness; aceptar y ver que los pasos suben.
2. **Conteo:** camina 50 pasos contándolos; la cifra debe quedar cerca de 50 (no ~100, lo que indicaría doble conteo).
3. **Pausa:** pausa, camina 20 pasos y comprueba que pasos, distancia y tiempo no cambian; al reanudar continúan desde los valores anteriores.
4. **Actividad:** quieto → "En reposo" (en ~3 s); caminar → "Caminando" (en ~2 s); trotar → "Corriendo". Levantar el teléfono o agitarlo una vez no debe cambiar el estado.
5. **Navegación:** cambia entre pestañas con la sesión activa; el conteo sigue.
6. **Guardado:** finaliza con *Guardar*, revisa el Historial, cierra la app por completo, ábrela y comprueba que la sesión sigue ahí.
7. **Ajustes:** cambia la altura (150 vs. 190 cm) y las unidades (km / mi); la distancia por paso y el formato cambian.
8. **Permiso denegado:** desactiva *Movimiento y Fitness* para la app en Ajustes de iOS, inicia una sesión y comprueba el aviso de respaldo y el botón *Abrir Ajustes de iOS*.
9. **Segundo plano:** con la sesión activa, bloquea la pantalla 30 s caminando y vuelve; los pasos dados deben aparecer.
10. **Distancia real:** camina una distancia conocida (por ejemplo, 400 m en una pista) y compara; si hace falta, ajusta la altura.

## 9. Partir de cero (opcional)

El proyecto ya está completo. Si prefieres recrearlo:

```powershell
npx create-expo-app@latest fitpulse
cd fitpulse
npx expo install expo-sensors expo-keep-awake expo-router expo-font expo-system-ui expo-splash-screen @react-native-async-storage/async-storage
```

y copia las carpetas `app`, `components`, `context`, `hooks`, `services`, `types`, `utils`, `constants`, `assets` y los archivos `app.json` y `tsconfig.json` de este proyecto.
