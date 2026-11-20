# EcoVital — Formato de video v2 ("Estudio 3D")

Desde el 2026-11-16 este formato es la BASE y el nivel mínimo de los videos diarios (Juan David: no todos tienen que ser iguales, se puede ir cambiando de formato, pero cada vez mejor) (pedido de Juan David: "mucho más editados, más organizados, más completos, más bonitos", replicando los reels virales de @curiosfer, @lynxstudiosbcn y @carlosbarcoc). El formato viejo (scene.html, ilustración plana) queda solo como respaldo.

## Qué copiamos de los reels virales
| Reel | Qué funciona | Cómo lo aplicamos |
|---|---|---|
| @lynxstudiosbcn "Higgsfield vs Claude" (20 mil likes, 13 mil comentarios, 10,7 mil envíos) | Marcas convertidas en personajes 3D que se enfrentan; un enemigo y un precio; etiquetas con línea ("Claude"); pedestal con neón; kit visible | Plantilla `versus` (frasco EcoVital vs aerosol con aluminio u otro rival genérico, sin marcas reales), `pedestal`, `etiqueta` |
| @carlosbarcoc "Haz esto antes del lunes" | Urgencia con fecha; reloj de arena desde el cuadro 0; contador 1-5 visible arriba; un ejemplo visual por punto; termina igual que empieza (bucle) | `pasos` en el guion (bolitas 1·2·3 arriba), `contador`, `paso`, `reloj`; última escena que conecta con la primera |
| @curiosfer "Mientras duermo…" | Fantasía + proceso mostrado, no explicado; cambio de pantalla cada 3–4 s; números como prueba; subtítulos con la palabra activa en caja | Subtítulos karaoke con caja de color en la palabra que se dice; `chip`s con cifras; transición rápida (whip) en cada cambio |
| Los tres | Escena oscura de estudio con UN color de acento; palabra clave para comentar | Paletas oscuras con un acento (`bosque`, `lila`, `noche`, `menta`, `terracota`, `arena`); `comentario` con la barra que escribe la palabra clave |

## Reglas del formato
1. Gancho en el cuadro 0: la primera escena ya muestra personajes/objeto y el subtítulo arranca desde la primera palabra. Nada de entradas lentas.
2. Escenas de 2,5–4,5 s, 7–9 escenas, 28–40 s en total. Cada escena tiene movimiento de cámara (las plantillas ya lo traen) y un elemento que entra a mitad (etiqueta, chip, sticker).
3. Contador de pasos (`"pasos": 3` y `"paso": n` en cada escena) cuando el video es una lista ("3 diferencias", "3 errores", "5 cosas"). Anunciar al inicio que el último es el mejor.
4. Palabras clave resaltadas: lista `resaltar` (sin tildes ni signos no importa; se compara en minúsculas). 4–10 palabras por video.
5. Bucle: la última frase conecta con la primera.
6. Promos: `"marca": true` (muestra @ecovital_7 arriba), abren con problema/rival, el producto entra como personaje, cierre con CTA NUEVO cada vez (plantillas `entrega`, `regalo`, `celular` con chat/pedido, `comentario`…) + "Envíos a toda Colombia y pagas al recibir".
7. Tips: `"marca": false`, sin producto, sin EcoVital, sin @ecovital_7, sin CTA de venta; pueden cerrar con pregunta (plantilla `comentario` con la palabra de la pregunta, p. ej. "YO NO SABÍA", o `sello` REALIDAD). Usan `dato`, `contador`, `paso`, `sello`, `persona`, `split`, `reloj` con `OBJETOS` del tema (añadir objetos nuevos en el `custom` del guion).
8. Variedad: no repetir la misma combinación de plantillas/escenario/paleta dos días seguidos; rotar paletas; personas distintas (tono 0–4, peinado corto/largo/moño/rizos/calvo, barba, ropa) y escenarios (`baño`, `gimnasio`, `oficina`, `habitacion`, `calle`, `cocina`).
9. Palabra clave de comentario en promos: elegir entre dos ("Comenta LAVANDA o CITRONELA") — no prometer mandar nada por DM salvo que Juan David lo active.

## Guion JSON v2
```json
{ "formato": "v2", "tipo": "promo|tip", "paleta": "bosque", "pasos": 3, "marca": true,
  "resaltar": ["aluminio", "lavanda"],
  "custom": "opcional: código JS que recibe API (API.def('miPlantilla', p => {...}); API.OBJETOS.pina = p => {...})",
  "scenes": [ { "id": "e1", "plantilla": "versus", "text": "lo que dice la voz", "paso": 0, "paleta": "opcional", "p": { ... } } ] }
```
`durations` y `words` los llena `narrar.py` (voz clonada). Sin voz, render3d.py estima duraciones.

## Plantillas (p = parámetros)
- `gancho` — {heroe, titulo (HTML, <b> = acento), sub, aroma, expr}
- `versus` — {a, b, etA, etB, aromaA, aromaB, colorA, colorB}  · héroes: frasco, frasco2, aerosol, nube, reloj, persona, o cualquier clave de OBJETOS
- `pedestal` — {heroe, aroma, color, chips:[html]}
- `persona` — {escenario, accion: hablar|sorpresa|oler|señalar|celebrar|pensar|asco|mostrar|sostener, persona:{tono 0-4, peinado, barba, ropa, pelo}, frasco, aroma, sudor, olor, sticker, stickerY, zoom:'out', lado}
- `contador` — {numero} o {desde, hasta, prefijo, sufijo}, palabra, etiqueta
- `paso` — {n, heroe, titulo, heroeX}
- `split` — {antes, despues, persona, accionIzq, accionDer, frasco:false}
- `celular` — {pantalla: chat|comentarios|pedido, mensajes:[['c'|'e', texto]], coments:[...], titulo, lineas, persona, accion}
- `reloj` — {color, etiqueta, sticker, k0}
- `regalo` — {color, cinta, aroma, sticker}
- `entrega` — {sticker, cliente:{...persona}}
- `comentario` — {heroe, palabra, encima}
- `ingredientes` — {aroma, chips}
- `sello` — {heroe, texto: MITO|REALIDAD|..., tipo: mito|realidad, frase}
- `dato` — {objeto (OBJETOS: hoja, lavanda, manzanilla, gota, limon, manzana, cerebro, corazon, sol, frasco, camiseta, zanahoria, zanahorias o nuevo), grande, etiqueta, chips, pedestal, escala, y, giro (usar 0.1–0.2 si el objeto tiene un frente que se debe ver)}
- `quiz` — {pregunta (HTML, <b> = acento), opciones:[2–3 textos], correcta: índice, heroe, revela: segundo opcional} · tarjeta de pregunta tipo encuesta de historias + opciones A/B/C que entran una por una; a mitad de escena se revela la correcta (✓ en color de acento, las demás se apagan con ✗) con golpe de cámara y sonido. Ideal en la escena 2 para que la gente se quede a ver la respuesta.
- `mapa` (2026-11-18) — {ciudades:[Barranquilla, Medellín, Bucaramanga, Cali, Pasto, Leticia, Cartagena, Pereira, Cúcuta, Villavicencio, Santa Marta, Neiva, Bogotá], centro:'Bogotá', titulo (html abajo), sticker, frasco:true|false, aroma, escalaMapa} · mapa 3D de Colombia con borde neón, pines que caen uno por uno con onda, rutas en arco que se dibujan desde el centro y nombres con etiqueta. Cierre ideal para "envíos a toda Colombia".
- `lupa` (2026-11-18) — {titulo (encabezado rojo de la etiqueta), lineas:[...], clave: índice de la línea a marcar, heroe opcional, sticker} · etiqueta de ingredientes + lupa dorada 3D que baja hasta la línea clave y la subraya con marcador (golpe de cámara). Formato "voltea el empaque / lee la letra pequeña".
- `sigueSol` (2026-11-18) — {adulto:true|false, sticker} · el sol cruza el cielo en arco (oriente → occidente), el cielo cambia de color y un girasol gira la cabeza siguiéndolo (adulto: se queda mirando al oriente). Sirve para cualquier dato de plantas y luz.
- `empaque` (2026-11-19) — {aroma, ciudad, guia:'PAGO CONTRA|ENTREGA' (| = salto), sticker, titulo, colorCaja} · caja de envío de cartón abierta: el frasco cae adentro con rebote (y caen hojitas/flores de relleno), se agacha, las 4 solapas se cierran (laterales primero), la cinta se pega de lado a lado y la guía de envío cae con golpe de cámara. Cierre de promo "lo empacamos y te llega". Sonidos propios (pop, whoosh, cinta, golpe).
- `celular` con `pantalla:'rastreo'` (2026-11-19) — {titulo, sub, pasos:[4 textos], final} · lista de pasos con línea verde que se llena, checks que se encienden uno por uno (pop por paso) y caja final verde ("Pagas al recibir 💵"). Úsala como checklist del proceso de compra (no prometer rastreo en vivo).
- Objetos nuevos (2026-11-19): `arbol` {vapor:false} (copa facetada en 3 verdes que se mece + vapor que sube: "el árbol suda"), `estomas` (hoja de cerca con poros que se abren y cierran y sueltan vapor), `cajaEnvio` (caja cerrada con cinta). Los objetos pueden traer `userData.tick(t)` y `dato`, los héroes y `persona` lo llaman en cada cuadro (objetos animados).
- `persona` acepta `objeto` (clave de OBJETOS), `objetoPos` [x,y,z] y `objetoEscala` para poner un objeto junto a la persona (p. ej. un árbol en la calle). Héroes de OBJETOS aceptan `giroHeroe` (velocidad de giro).
- `botones` (2026-11-20) — {frase (html, tarjeta abajo), a:'MITO', b:'REALIDAD', correcta: 0|1, resultado (texto del sello), revela: s, heroe opcional detrás, colorA, colorB} · formato concurso "¿MITO o REALIDAD?": consola 3D con 2 botones gigantes con texto; a mitad de escena se hunde el correcto, se enciende con haz de luz, el otro se apaga a gris, golpe de cámara + sello. Sirve también para elegir (a:'LAVANDA', b:'CITRONELA'). Ideal en rondas alternadas con una escena de explicación.
- `maleta` (2026-11-20) — {modo:'sacar'|'guardar', item (frasco, toalla, botella o cualquier OBJETOS), aroma, etiqueta, sticker, stickerY, escalaItem, colorMaleta} · formato "¿qué hay en mi maleta?": maleta de gimnasio 3D (tapa en arco, asas, cremallera con tirador dorado); 'sacar' abre la tapa y el objeto sale con chispas; 'guardar' mete el frasco, cierra la tapa, corre la cremallera y rebota (cierre de promo).
- `pago` (2026-11-20) — {sticker, stickerY, titulo (html abajo), aroma, colorCaja} · cierre de promo: caja de envío cerrada + frasco que celebra + billetes genéricos ("$ PAGO", sin imitar billetes reales) que caen revoloteando y se apilan + sello PAGAS AL RECIBIR con golpe.
- Objetos nuevos (2026-11-20): `aguacate` (piel Hass con textura de granitos), `aguacateAbierto` (mitad con pulpa en 2 tonos y semilla), `aguacates` (entero + mitad), `aguacatero` (árbol con aguacates colgando que se mecen), `banano`, `bolsaPapel` (bolsa con aguacate y banano + gas etileno que sube), `toalla` (enrollada con espiral), `botella` (agua, vidrio/plástico translúcido). En el API: `maletaGym`, `aguacate`, `banano`, `toalla`, `botella`, `bolsaPapel`.
- `SFX` (2026-11-19): registro de sonidos por plantilla `API.SFX.miPlantilla = (inicio, dur, p) => [{t, tipo:'pop'|'whoosh'|'golpe'|'teclas', d}]`; también se puede llenar desde `custom`.
- `versus` acepta `yA`, `yB` (altura de cada héroe) y `etY` (altura de las etiquetas) para objetos flotantes (gota vs nube, etc.).
- Héroes de OBJETOS aceptan `escalaHeroe` (p. ej. girasol en `comentario` con 0.62).
- Objetos nuevos (2026-11-18): `girasol` {joven, alto, inclina} (semillas en espiral de filotaxis, 2 coronas de pétalos), `bacteria` {color, grupo} (3 bacterias simpáticas con cilios), `abeja`.
- `contador` acepta `size` (tamaño del número 3D; usar 1.5–1.8 para textos largos como "XVII").
- Objetos nuevos: `camiseta` {mancha:true|false, color}, `zanahoria` {color}, `zanahorias` {colores:[...]}.

## Comandos
```
cd estudio && python3 render3d.py guion.json salida --preview 0.5,4,9     # capturas: MIRARLAS siempre
EXAG=0.85 CFG=0.3 TEMP=0.8 TEMPO=1.3 PAUSA=0.08 python3 narrar.py guion.json voz_juan.wav guion_voz.wav   # voz "estilo reels" (desde la carpeta pipeline)
python3 render3d.py guion.json video.mp4 --voice guion_voz.wav         # ~0,8 s por cuadro → 30 s ≈ 18 min
```
No correr el render ni las capturas al mismo tiempo que narrar.py (2 CPU / 8 GB: se vuelve 10 veces más lento). Render real: ≈1,2 s por cuadro (30 s de video ≈ 18 min).
Portada: cover.py sigue sirviendo, pero con el render nuevo usar `python3 portada3d.py guion.json portada.jpg --title "L1|L2" --tipo tip|promo --t <s>`.

## Voz
Desde el 2026-11-16 la voz es la de Juan David clonada pero con estilo de los reels virales (aprobada por él): más rápida (1.3x), más expresiva y casi sin pausas entre escenas: `EXAG=0.85 CFG=0.3 TEMP=0.8 TEMPO=1.3 PAUSA=0.08`. Nunca copiar la voz de otro creador.

## Mejoras (una por día, con fecha)
- 2026-11-16: versión inicial (15 plantillas, frasco personaje, personas 3D, subtítulos con caja, contador, stickers, comentario, portada3d).
- 2026-11-16: voz estilo reels (1.3x, expresividad 0.85, pausas mínimas).
- 2026-11-17: plantilla nueva `quiz` (pregunta + opciones A/B/C + revelación con ✓/✗, golpe de cámara y sonidos pop/golpe); objetos 3D `camiseta` (con manchas amarillas en las axilas) y `zanahoria`/`zanahorias` (de colores); `versus` re-encuadrado (los dos personajes ya no se cortan y las etiquetas quedan pegadas a ellos); `contador` con `size`; franja oscura superior más fuerte para que los subtítulos se lean sobre fondos claros (cocina, oficina).
- 2026-11-18: plantillas nuevas `mapa` (Colombia 3D con pines y rutas: cierre de envíos), `lupa` (etiqueta de ingredientes + lupa que subraya la palabra clave) y `sigueSol` (sol que cruza el cielo + girasol que lo sigue); objetos `girasol`, `bacteria`, `abeja`; sonidos pop por cada pin del mapa y golpe al marcar con la lupa; chat del celular con letra más grande (se lee en el teléfono); `versus` con alturas configurables; arreglo: las etiquetas proyectadas ahora usan la cámara del cuadro actual (antes quedaban corridas cuando la cámara se movía mucho).
- 2026-11-19: plantilla nueva `empaque` (caja de envío 3D que se llena, se cierra con solapas, cinta y guía "PAGO CONTRA ENTREGA" con golpe) y pantalla de celular `rastreo` (checklist de compra con línea que se llena); objetos animados `arbol` (con vapor: transpiración), `estomas` (poros que se abren/cierran) y `cajaEnvio`; objetos con `userData.tick(t)` (animación propia por cuadro); `persona` con objeto al lado; registro `SFX` de sonidos por plantilla (también desde `custom`).
- 2026-11-20: plantillas nuevas `botones` (concurso MITO/REALIDAD con botones 3D que se hunden, haz de luz y sello), `maleta` ("¿qué hay en mi maleta?": saca objetos o guarda el frasco y cierra la cremallera) y `pago` (billetes que caen junto a la caja + PAGAS AL RECIBIR); objetos `aguacate`, `aguacateAbierto`, `aguacates`, `aguacatero`, `banano`, `bolsaPapel` (gas etileno animado), `toalla`, `botella`; sonidos propios (SFX) para las 3 plantillas.
