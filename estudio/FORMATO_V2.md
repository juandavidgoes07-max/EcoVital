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
- `dato` — {objeto (OBJETOS: hoja, lavanda, manzanilla, gota, limon, manzana, cerebro, corazon, sol, frasco o nuevo), grande, etiqueta, chips, pedestal, escala, y, giro}

## Comandos
```
cd estudio && python3 render3d.py guion.json salida --preview 0.5,4,9     # capturas: MIRARLAS siempre
python3 ../pipeline/narrar.py guion.json voz_juan.wav guion_voz.wav     # voz (desde la carpeta pipeline)
python3 render3d.py guion.json video.mp4 --voice guion_voz.wav         # ~0,8 s por cuadro → 30 s ≈ 18 min
```
No correr el render ni las capturas al mismo tiempo que narrar.py (2 CPU / 8 GB: se vuelve 10 veces más lento). Render real: ≈1,2 s por cuadro (30 s de video ≈ 18 min).
Portada: cover.py sigue sirviendo, pero con el render nuevo usar `python3 portada3d.py guion.json portada.jpg --title "L1|L2" --tipo tip|promo --t <s>`.

## Mejoras (una por día, con fecha)
- 2026-11-16: versión inicial (15 plantillas, frasco personaje, personas 3D, subtítulos con caja, contador, stickers, comentario, portada3d).
