---
target: app/pages/me.vue
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/anorak/Code/microservices-college/conecta-nexus/frontend/app/pages/me.vue"
target_fingerprint: "sha256:c38f37bc041d75e98fb1a8dc2108a1c2925b9cc2e9e362da04722a282f0042a6"
target_path: /home/anorak/Code/microservices-college/conecta-nexus/frontend/app/pages/me.vue
timestamp: 2026-10-21T04-34-01Z
slug: app-pages-me-vue
closed: true
---
Method: dual-agent (A: 8f48d92a-5feb-47f8-bf32-25ea407a1285 · B: c61bcac5-028d-48af-87e0-addbab7e1641)

#### Design Health Score

| # | Heuristic | Score (0–4) | Key Issue / Observation |
|---|---|:---:|---|
| 1 | **Visibility of System Status** | 3 | Estados de carga reactivos y badges de verificación; toast flotante usa `animate-bounce` continuo distractor. |
| 2 | **Match System / Real World** | 2 | Fuga de jerga técnica y backend ("API Gateway", "RS256 2048-bit", "UUID") en vez de lenguaje universitario y empresarial. |
| 3 | **User Control and Freedom** | 3 | Cancelación y restauración de estado claras; botones duplicados de edición y falta de acceso al texto de Ley 1581. |
| 4 | **Consistency and Standards** | 2 | Botón "Editar" duplicado en cabecera y tarjeta; rojo institucional malgastado en "Cerrar Sesión"; skills en texto plano delimitado por comas. |
| 5 | **Error Prevention** | 3 | Campos inmutables protegidos (código, NIT); semestre acotado a 6°-10°. Falta autocompletado y validación de chips para skills. |
| 6 | **Recognition Rather Than Recall** | 2 | Habilidades técnicas exigen recordar de memoria sin sugerencias de stack (Python, Vue, Docker) ni pills predeterminadas. |
| 7 | **Flexibility and Efficiency** | 2 | Sin atajos de teclado (Enter para agregar tags, Esc para cancelar) ni accesos rápidos a retos postulados o publicados. |
| 8 | **Aesthetic and Minimalist Design** | 2 | Sobrecarga de telemetría de desarrollo innecesaria (UUID, RS256); jerarquía de botones en conflicto en el banner superior. |
| 9 | **Error Recovery** | 3 | Extracción precisa de errores de API sin pérdida de formulario; mensajes sin enlaces a acciones de remediación directa. |
| 10 | **Help and Documentation** | 2 | Ausencia de tooltips explicativos sobre por qué el código es inmutable, cómo ejercer derechos ARCO o a quién acudir para correcciones. |
| **Total** | | **24 / 40** | **Aceptable (50%–67%: Requiere refinamiento sustancial antes de entrega)** |

#### Design Specificity Verdict

* **LLM Assessment:** La interfaz actual es funcionalmente sólida y respeta la paleta neobrutalista (bordes negros de 2px, sombras planas de 0px blur, tonos pastel), pero estructuralmente es **intercambiable con cualquier panel de cuenta genérico SaaS**. No transmite la identidad de un "Puente Académico-Empresarial UFPS": para el estudiante es una ficha administrativa fría en lugar de un expediente de competencias e ingeniería; para la empresa es una tarjeta de contacto en lugar de un centro de vinculación y retos regionales. Además, sufre de filtración de telemetría interna ("tokens criptográficos RS256", "API Gateway", "UUIDs") que no aporta valor al usuario final.
* **Deterministic Scan (`impeccable detect`):** 0 errores críticos primarios, 4 advertencias de calidad y slop:
  - `bounce-easing` (línea 183): El toast de notificación usa `animate-bounce` continuo de Tailwind, generando una animación distractora e inquieta que riñe con la estabilidad neobrutalista.
  - `design-system-font-size` (líneas 353, 365, 587): Uso de clases arbitrarias `text-[10px]` para los badges de inmutabilidad, saliéndose de la rampa tipográfica formal de `DESIGN.md`.
* **Visual Overlays:** Ejecución estática completada; el detector validó el árbol AST y el sistema de tokens frente a `DESIGN.md`.

#### Overall Impression

`app/pages/me.vue` tiene cimientos de ingeniería excelentes (inmutabilidad estricta de código estudiantil y NIT, manejo dual estudiante/empresa, resiliencia ante errores de microservicios). Sin embargo, se lee como un panel de depuración para desarrolladores antes que como un "Lanzador Académico" para estudiantes y empresarios de la región. Purgar la jerga técnica, redistribuir el rojo institucional hacia las acciones principales, consolidar los botones duplicados y transformar el ingreso de habilidades en chips interactivos elevará drásticamente la experiencia.

#### What's Working

1. **Gobernanza de Datos e Inmutabilidad Institucional:** Cumplimiento riguroso de RB-08 y RF10. El código de estudiante, la carrera académica y el NIT de la empresa están protegidos con candados `🔒 Inmutable`, garantizando la integridad legal y académica sin ambigüedades.
2. **Tokens y Paleta Visual Fieles al Manifiesto:** Implementación consistente de bordes de tinta de 2px, sombras sólidas (`shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]`) y acentos cromáticos pastel anclados a cada rol (Ice Blue para estudiantes, Pastel Coral para empresas, Pastel Mint para cumplimiento legal).
3. **Manejo de Estado y Resiliencia en Errores:** Manejo limpio del ciclo de carga, preservación de datos en el formulario ante fallos de red (`extractApiErrorMessage`) y separación clara entre los flujos de lectura y edición (`PATCH`).

#### Priority Issues

* **[P1] Fuga de Telemetría de Desarrollo y Jerga Criptográfica**
  * *Qué:* El banner de bienvenida anuncia *"Sesión validada por el API Gateway mediante tokens criptográficos RS256"*, y la barra lateral expone *"Identificador UUID"* y *"Seguridad Token: RS256 2048-bit"*.
  * *Por qué importa:* Viola la heurística #2 de Nielsen y confunde a los usuarios (especialmente a dueños de PYMEs locales). Exponer detalles arquitectónicos internos genera ruido cognitivo sin aportar utilidad funcional.
  * *Solución:* Sustituir el texto por un mensaje universitario cálido (*"Conectado al campus virtual UFPS · Periodo Académico Activo"*). Ocultar o reubicar los metadatos técnicos en un detalle secundario colapsable.
  * *Comando sugerido:* `/impeccable clarify app/pages/me.vue`

* **[P1] Jerarquía de Acciones Rota y Malgasto del Rojo Institucional UFPS**
  * *Qué:* El botón "Editar Datos" aparece duplicado al mismo tiempo (en el banner superior y en la tarjeta de expediente). Al mismo tiempo, el botón "Cerrar Sesión" absorbe el rojo institucional (`bg-institutional-500`) en el banner principal.
  * *Por qué importa:* Viola la "Regla del 10% Carmesí" de `DESIGN.md`. El rojo UFPS debe reservarse para avances primarios y anclas de marca, nunca para acciones de salida o destructivas. Los botones duplicados provocan parálisis de decisión.
  * *Solución:* Consolidar la edición en un único botón contextual en la tarjeta. Estilar "Cerrar Sesión" como botón neutro o contorno discreto, reservando el carmesí para "Guardar Cambios".
  * *Comando sugerido:* `/impeccable layout app/pages/me.vue`

* **[P2] Fricción en el Ingreso de Habilidades Técnicas y Áreas de Interés**
  * *Qué:* Las habilidades y áreas se editan a través de un único campo de texto plano separado por comas (`Python, FastAPI, Docker`).
  * *Por qué importa:* Viola la heurística #6. Exige recordar de memoria y escribir manualmente la puntuación. Propicia errores tipográficos, duplicados y problemas de formato.
  * *Solución:* Implementar un componente de tags/chips interactivos con pills predeterminadas de sugerencia (Python, Vue, Docker, Java, PostgreSQL) con acción de agregar con Enter y eliminar con un clic.
  * *Comando sugerido:* `/impeccable harden app/pages/me.vue`

* **[P2] Animación Incoherente `animate-bounce` en Notificaciones Toast**
  * *Qué:* El toast de notificación utiliza `animate-bounce`, saltando continuamente en la esquina inferior durante 4 segundos.
  * *Por qué importa:* Viola las directrices de movimiento de `DESIGN.md`. El sistema neobrutalista exige dinamismo táctil y sólido, no rebotes caricaturescos continuos que provocan fatiga visual y problemas de accesibilidad.
  * *Solución:* Cambiar `animate-bounce` por una transición limpia de deslizamiento suave (`translate-y` con `ease-out`) que se fije con firmeza mediante una sombra plana de 4px.
  * *Comando sugerido:* `/impeccable polish app/pages/me.vue`

* **[P3] Tarjeta de Habeas Data (Ley 1581) Inerte y Sin Enlace a Políticas**
  * *Qué:* La tarjeta de cumplimiento legal muestra la versión y fecha de aceptación, pero no permite consultar el texto de la política ni ofrece información sobre el ejercicio de derechos ARCO.
  * *Por qué importa:* La Ley 1581 de 2012 exige acceso transparente a los términos de tratamiento y canales de atención de datos personales.
  * *Solución:* Añadir un enlace institucional accesible (*"Ver Política de Tratamiento de Datos ↗"*) e información de contacto del oficial de protección de datos de la UFPS.
  * *Comando sugerido:* `/impeccable clarify app/pages/me.vue`

#### Persona Red Flags

* **Alex (Estudiante de Ingeniería / Power User):**
  * *Fricción:* Editar habilidades técnicas se siente como editar un CSV en un bloc de notas; no hay atajos de teclado ni sugerencias de tecnologías comunes.
  * *Desconexión:* El perfil no muestra vinculación con retos aplicados ni estado de avance curricular práctico.
  * *Riesgo:* Un clic erróneo en el llamativo botón rojo superior cierra su sesión de inmediato sin confirmación.
* **Jordan (Dueño de PYME Aliada / Primer Ingreso):**
  * *Alarma:* Ve advertencias de *"API Gateway"* y *"RS256 2048-bit"* y asume que su cuenta requiere soporte técnico o que el registro quedó a medias.
  * *Incertidumbre:* No tiene claro cómo visualizan los estudiantes su ficha empresarial ni cuál es el siguiente paso para publicar un reto.
* **Docente / Evaluador Académico:**
  * *Vacío:* No hay visualización de materias cursadas ni trazabilidad de proyectos o retos aprobados bajo su supervisión.

#### Minor Observations

* **Avatar estático:** Se limita a un emoji estático (🎓 o 🏢) sin posibilidad futura de iniciales elegantes o soporte de avatar/logo empresarial.
* **Rampa tipográfica:** Las etiquetas de inmutabilidad usan `text-[10px]`, rompiendo la coherencia de escala tipográfica (`text-xs`).
* **Área táctil en móvil:** El botón de cierre del toast (`px-2 py-1`) está por debajo de los 44×44px recomendados para dispositivos táctiles.

#### Questions to Consider

* *¿Por qué el perfil de un futuro ingeniero parece una pantalla de configuración genérica en lugar de un escaparate de retos resueltos y competencias verificadas?*
* *Si el Rojo Carmesí Institucional es nuestro ancla de identidad y máxima jerarquía, ¿por qué está asignado al botón de salir?*
* *¿Qué tal si seleccionar habilidades técnicas se sintiera como armar una caja de herramientas de ingeniería con chips táctiles interactivos?*
